from django.urls import path
from .views import (
    PrescriptionListView, CreatePrescriptionView,
    MedicalRecordListView, CreateMedicalRecordView,
    AuditLogListView,
)

urlpatterns = [
    path('prescriptions/', PrescriptionListView.as_view(), name='prescription-list'),
    path('prescriptions/create/', CreatePrescriptionView.as_view(), name='prescription-create'),
    path('records/', MedicalRecordListView.as_view(), name='record-list'),
    path('records/create/', CreateMedicalRecordView.as_view(), name='record-create'),
    path('records/audit/', AuditLogListView.as_view(), name='audit-log'),
]