from django.urls import path
from .views import (
    NotificationListView,
    MarkNotificationReadView,
    MarkAllReadView,
    SendEmailNotificationView,
    EmailNotificationLogListView,
    EmailNotificationLogDetailView,
    DeleteEmailLogView,
    RateLimitStatusView,
)

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification-read'),
    path('notifications/mark-all-read/', MarkAllReadView.as_view(), name='notifications-mark-all'),
    path('email-notifications/send/', SendEmailNotificationView.as_view(), name='email-send'),
    path('email-notifications/logs/', EmailNotificationLogListView.as_view(), name='email-logs'),
    path('email-notifications/logs/<int:pk>/', EmailNotificationLogDetailView.as_view(), name='email-log-detail'),
    path('email-notifications/logs/<int:pk>/delete/', DeleteEmailLogView.as_view(), name='email-log-delete'),
    path('rate-limit/status/', RateLimitStatusView.as_view(), name='rate-limit-status'),
]