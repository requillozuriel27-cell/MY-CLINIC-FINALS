from django.db import models
from accounts.models import CustomUser


class Notification(models.Model):
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='notifications'
    )
    message = models.TextField()
    notif_type = models.CharField(max_length=50, default='general')
    is_read = models.BooleanField(default=False)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:60]}"


class EmailNotificationLog(models.Model):
    """
    Stores history of all admin-sent email notifications.
    Tracks status, recipients, and timestamps.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sending', 'Sending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partial Success'),
    ]

    TARGET_CHOICES = [
        ('all', 'All Users'),
        ('patients', 'Patients Only'),
        ('doctors', 'Doctors Only'),
        ('specific', 'Specific User'),
    ]

    sent_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL,
        null=True, related_name='sent_email_notifications'
    )
    subject = models.CharField(max_length=255)
    message = models.TextField()
    target_group = models.CharField(
        max_length=20, choices=TARGET_CHOICES, default='all'
    )
    specific_user = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='received_email_notifications'
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    total_recipients = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    failed_emails = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"Email [{self.target_group}] by {self.sent_by} "
            f"— {self.subject[:40]} [{self.status}]"
        )