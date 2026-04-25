from django.conf import settings
from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, DoctorProfile, PatientProfile
from .serializers import RegisterSerializer, UserSerializer
from clinic.email_service import (
    send_welcome_email,
    send_password_reset,
    send_account_deactivated,
    send_account_restored,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['username'] = user.username
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            try:
                send_welcome_email(user)
            except Exception:
                pass
            return Response(
                {
                    'message': (
                        'Registration successful! '
                        'A confirmation email has been sent to '
                        f'{user.email}. Please log in.'
                    )
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(username=username, password=password)
        if user is None or not user.is_active or user.role == 'admin':
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = get_tokens_for_user(user)
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'role': user.role,
            'user_id': user.id,
            'username': user.username,
            'full_name': user.get_full_name(),
        })


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        special_code = request.data.get('special_code', '').strip()

        if not username or not password or not special_code:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if special_code != settings.ADMIN_SPECIAL_CODE:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(username=username, password=password)
        if user is None or not user.is_active or user.role != 'admin':
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = get_tokens_for_user(user)
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'role': user.role,
            'user_id': user.id,
            'username': user.username,
            'full_name': user.get_full_name(),
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully.'})


class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get('role', None)
        search = self.request.query_params.get('search', None)

        if user.role == 'admin':
            qs = CustomUser.objects.all().order_by('role', 'username')
        elif user.role == 'patient':
            qs = CustomUser.objects.filter(role='doctor', is_active=True)
        elif user.role == 'doctor':
            from appointments.models import Appointment
            patient_ids = Appointment.objects.filter(
                doctor=user
            ).values_list('patient_id', flat=True).distinct()
            qs = CustomUser.objects.filter(id__in=patient_ids)
        else:
            qs = CustomUser.objects.none()

        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return qs


class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()


class SearchPatientView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('admin', 'doctor'):
            return Response(
                {'results': [], 'total_patients_found': 0, 'error': 'Unauthorized.'},
                status=200
            )

        query = request.query_params.get('q', '').strip()

        if not query or len(query) < 2:
            return Response({
                'results': [], 'total_patients_found': 0, 'query': query,
            })

        try:
            patients = CustomUser.objects.filter(role='patient').filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(username__icontains=query) |
                Q(email__icontains=query)
            ).distinct()

            if not patients.exists():
                try:
                    patients = CustomUser.objects.filter(
                        role='patient',
                        patient_profile__patient_id__icontains=query
                    ).distinct()
                except Exception:
                    patients = CustomUser.objects.none()

            if not patients.exists():
                words = query.split()
                if len(words) >= 2:
                    combined = Q()
                    for word in words:
                        combined |= Q(first_name__icontains=word)
                        combined |= Q(last_name__icontains=word)
                    patients = CustomUser.objects.filter(
                        role='patient'
                    ).filter(combined).distinct()

            if not patients.exists():
                return Response({
                    'results': [], 'total_patients_found': 0, 'query': query,
                })

            results = []
            for patient in patients:
                try:
                    patient_data = UserSerializer(patient).data
                    records_data = []
                    try:
                        from records.models import MedicalRecord
                        from records.serializers import MedicalRecordSerializer
                        records = MedicalRecord.objects.filter(
                            patient=patient
                        ).order_by('-created_at')
                        records_data = MedicalRecordSerializer(records, many=True).data
                    except Exception:
                        records_data = []

                    results.append({
                        'patient': patient_data,
                        'medical_records': records_data,
                        'total_records': len(records_data),
                    })
                except Exception:
                    continue

            return Response({
                'results': results,
                'total_patients_found': len(results),
                'query': query,
            })

        except Exception as e:
            return Response({
                'results': [], 'total_patients_found': 0,
                'query': query, 'debug': str(e),
            }, status=200)


class SoftDeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            user = CustomUser.objects.get(pk=pk)
            user.is_active = False
            user.save()
            try:
                send_account_deactivated(user)
            except Exception:
                pass
            return Response({'message': f'User {user.username} deactivated.'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class RestoreUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            user = CustomUser.objects.get(pk=pk)
            user.is_active = True
            user.save()
            try:
                send_account_restored(user)
            except Exception:
                pass
            return Response({'message': f'User {user.username} restored.'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class DeleteUserView(APIView):
    """
    Permanently delete a user from the system.
    Admin only. Cannot delete own account.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)

        # Prevent admin from deleting their own account
        if str(request.user.pk) == str(pk):
            return Response(
                {'error': 'You cannot delete your own admin account.'},
                status=400,
            )

        try:
            user = CustomUser.objects.get(pk=pk)

            # Prevent deleting other admins
            if user.role == 'admin':
                return Response(
                    {'error': 'Admin accounts cannot be deleted.'},
                    status=400,
                )

            username = user.username
            user.delete()
            return Response({
                'message': f'User "{username}" has been permanently deleted.'
            })
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class ResetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can reset passwords.'}, status=403
            )
        new_password = request.data.get('new_password', '').strip()
        if not new_password or len(new_password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = CustomUser.objects.get(pk=pk)
            user.set_password(new_password)
            user.save()
            try:
                send_password_reset(user, new_password)
            except Exception:
                pass
            return Response({
                'message': (
                    f'Password for {user.username} reset successfully. '
                    f'Email notification sent.'
                )
            })
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)