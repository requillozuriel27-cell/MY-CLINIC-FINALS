from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers

from .models import Notification, EmailNotificationLog
from accounts.models import CustomUser
from clinic.email_service import send_bulk_email


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'message', 'notif_type',
            'is_read', 'extra_data', 'created_at',
        ]


class EmailNotificationLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()
    specific_user_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailNotificationLog
        fields = [
            'id', 'sent_by', 'sent_by_name',
            'subject', 'message', 'target_group',
            'specific_user', 'specific_user_name',
            'status', 'total_recipients',
            'success_count', 'failed_count',
            'failed_emails', 'created_at',
            'completed_at', 'error_message',
        ]

    def get_sent_by_name(self, obj):
        return obj.sent_by.get_full_name() if obj.sent_by else 'Unknown'

    def get_specific_user_name(self, obj):
        return obj.specific_user.get_full_name() if obj.specific_user else None


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50]
        return Response(NotificationSerializer(notifs, many=True).data)


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
        return Response({'message': 'Marked as read.'})


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


class SendEmailNotificationView(APIView):
    """Admin only — send bulk email notifications."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can send email notifications.'},
                status=403,
            )

        subject = request.data.get('subject', '').strip()
        message = request.data.get('message', '').strip()
        target_group = request.data.get('target_group', 'all').strip()
        specific_user_id = request.data.get('specific_user_id', None)

        if not subject:
            return Response({'error': 'Subject is required.'}, status=400)
        if not message:
            return Response({'error': 'Message is required.'}, status=400)
        if target_group not in ['all', 'patients', 'doctors', 'specific']:
            return Response(
                {'error': 'target_group must be: all, patients, doctors, or specific'},
                status=400,
            )
        if target_group == 'specific' and not specific_user_id:
            return Response(
                {'error': 'specific_user_id is required for specific target.'},
                status=400,
            )

        # Check email is configured
        if not settings.EMAIL_HOST_USER:
            return Response(
                {
                    'error': (
                        'Email is not configured. '
                        'Please add EMAIL_HOST_USER and EMAIL_HOST_PASSWORD '
                        'to your .env file.'
                    )
                },
                status=500,
            )

        # Fetch recipients
        specific_user = None
        try:
            if target_group == 'all':
                users = CustomUser.objects.filter(
                    is_active=True
                ).exclude(email='')
            elif target_group == 'patients':
                users = CustomUser.objects.filter(
                    role='patient', is_active=True
                ).exclude(email='')
            elif target_group == 'doctors':
                users = CustomUser.objects.filter(
                    role='doctor', is_active=True
                ).exclude(email='')
            elif target_group == 'specific':
                specific_user = CustomUser.objects.get(
                    pk=specific_user_id, is_active=True
                )
                if not specific_user.email:
                    return Response(
                        {'error': 'This user has no email address.'},
                        status=400,
                    )
                users = CustomUser.objects.filter(pk=specific_user.pk)

            recipients = [u.email for u in users if u.email]

        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch recipients: {str(e)}'},
                status=500,
            )

        if not recipients:
            return Response(
                {'error': 'No recipients with email addresses found.'},
                status=400,
            )

        # Create log entry
        log = EmailNotificationLog.objects.create(
            sent_by=request.user,
            subject=subject,
            message=message,
            target_group=target_group,
            specific_user=specific_user,
            status='pending',
            total_recipients=len(recipients),
        )

        # Send in background via email_service
        try:
            send_bulk_email(
                subject=subject,
                message=message,
                recipient_emails=recipients,
                log_id=log.id,
            )
        except Exception as e:
            log.status = 'failed'
            log.error_message = str(e)
            log.completed_at = timezone.now()
            log.save()
            return Response(
                {'error': f'Failed to queue emails: {str(e)}'},
                status=500,
            )

        return Response({
            'message': (
                f'Email queued successfully. '
                f'Sending to {len(recipients)} recipient(s) in background.'
            ),
            'log_id': log.id,
            'total_recipients': len(recipients),
            'target_group': target_group,
            'status': 'pending',
        }, status=202)


class EmailNotificationLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)
        logs = EmailNotificationLog.objects.all().select_related(
            'sent_by', 'specific_user'
        ).order_by('-created_at')[:50]
        return Response(EmailNotificationLogSerializer(logs, many=True).data)


class EmailNotificationLogDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)
        try:
            log = EmailNotificationLog.objects.get(pk=pk)
            return Response(EmailNotificationLogSerializer(log).data)
        except EmailNotificationLog.DoesNotExist:
            return Response({'error': 'Log not found.'}, status=404)


class RateLimitStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.core.cache import cache
        import time

        identifier = f'user_{request.user.id}'
        cache_key = f'ratelimit_{identifier}'
        window_key = f'ratelimit_window_{identifier}'
        max_requests = getattr(settings, 'RATE_LIMIT_REQUESTS', 100)
        window = getattr(settings, 'RATE_LIMIT_WINDOW', 60)

        count = cache.get(cache_key, 0)
        window_start = cache.get(window_key)
        current_time = int(time.time())
        time_remaining = 0
        if window_start:
            time_remaining = max(0, window - (current_time - window_start))

        return Response({
            'requests_made': count,
            'requests_limit': max_requests,
            'requests_remaining': max(0, max_requests - count),
            'window_seconds': window,
            'window_resets_in': time_remaining,
        })