from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Prescription, MedicalRecord, MedicalRecordAuditLog
from .serializers import (
    PrescriptionSerializer, CreatePrescriptionSerializer,
    MedicalRecordSerializer, AuditLogSerializer,
)
from accounts.models import CustomUser
from notifications.utils import send_notification

PAGE_SIZE = 5


class PrescriptionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'patient':
            qs = Prescription.objects.filter(
                patient=user
            ).select_related('doctor', 'patient')
        elif user.role == 'doctor':
            patient_id = request.query_params.get('patient_id')
            qs = Prescription.objects.filter(
                doctor=user
            ).select_related('doctor', 'patient')
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
        elif user.role == 'admin':
            qs = Prescription.objects.all().select_related('doctor', 'patient')
        else:
            qs = Prescription.objects.none()

        serializer = PrescriptionSerializer(qs, many=True)
        return Response(serializer.data)


class CreatePrescriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'doctor':
            return Response(
                {'error': 'Only doctors can create prescriptions.'},
                status=403
            )
        serializer = CreatePrescriptionSerializer(data=request.data)
        if serializer.is_valid():
            prescription = serializer.save(doctor=request.user)
            send_notification(
                prescription.patient,
                f'Dr. {request.user.get_full_name()} added a new prescription for you.',
                notif_type='new_prescription',
                extra={'prescription_id': prescription.id},
            )
            return Response(
                PrescriptionSerializer(prescription).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MedicalRecordListView(APIView):
    """
    Returns paginated medical records.
    Doctor: only their assigned patients.
    Admin: only after selecting a specific patient (patient_user_id required).
    Patient: only their own records.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        page = int(request.query_params.get('page', 1))

        if user.role == 'patient':
            qs = MedicalRecord.objects.filter(
                patient=user
            ).select_related('patient', 'created_by')

            # Log view
            MedicalRecordAuditLog.objects.create(
                accessed_by=user,
                action='view',
                notes='Patient viewed own records',
            )

        elif user.role == 'doctor':
            patient_id = request.query_params.get('patient_id')
            if not patient_id:
                return Response(
                    {'error': 'patient_id is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Doctor can only access their assigned patients
            from appointments.models import Appointment
            assigned_ids = Appointment.objects.filter(
                doctor=user
            ).values_list('patient_id', flat=True).distinct()

            if int(patient_id) not in list(assigned_ids):
                return Response(
                    {'error': 'This patient is not assigned to you.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            qs = MedicalRecord.objects.filter(
                patient_id=patient_id
            ).select_related('patient', 'created_by')

            # Log view
            MedicalRecordAuditLog.objects.create(
                accessed_by=user,
                action='view',
                notes=f'Doctor viewed records for patient_id={patient_id}',
            )

        elif user.role == 'admin':
            patient_user_id = request.query_params.get('patient_user_id')
            if not patient_user_id:
                # Admin must search and select a patient first
                return Response({
                    'results': [],
                    'count': 0,
                    'total_pages': 0,
                    'current_page': 1,
                    'message': 'Search for a patient to view their records.',
                })

            qs = MedicalRecord.objects.filter(
                patient_id=patient_user_id
            ).select_related('patient', 'created_by')

            # Log admin view
            MedicalRecordAuditLog.objects.create(
                accessed_by=user,
                action='view',
                notes=f'Admin viewed records for patient_user_id={patient_user_id}',
            )

        else:
            return Response({'error': 'Unauthorized.'}, status=403)

        # Pagination
        paginator = Paginator(qs, PAGE_SIZE)
        total_pages = paginator.num_pages

        try:
            page_obj = paginator.page(page)
        except Exception:
            page_obj = paginator.page(1)

        serializer = MedicalRecordSerializer(page_obj.object_list, many=True)

        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'total_pages': total_pages,
            'current_page': page,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        })


class CreateMedicalRecordView(APIView):
    """
    Only doctors can create records.
    Admins are strictly read-only.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # STRICT: Admin cannot create records
        if request.user.role == 'admin':
            return Response(
                {'error': 'Admins cannot create medical records. Read-only access only.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role != 'doctor':
            return Response(
                {'error': 'Only doctors can create medical records.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient_id = request.data.get('patient')
        record_title = request.data.get('record_title', 'Medical Record')
        diagnosis = request.data.get('diagnosis', '').strip()
        notes = request.data.get('notes', '').strip()
        prescription = request.data.get('prescription', '').strip()

        if not patient_id:
            return Response(
                {'error': 'Patient ID is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not diagnosis:
            return Response(
                {'error': 'Diagnosis is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = get_object_or_404(CustomUser, pk=patient_id)

        # Verify doctor is assigned to this patient
        from appointments.models import Appointment
        assigned = Appointment.objects.filter(
            doctor=request.user, patient=patient
        ).exists()
        if not assigned:
            return Response(
                {'error': 'You can only create records for your assigned patients.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        record = MedicalRecord(
            patient=patient,
            record_title=record_title,
            created_by=request.user,
        )
        record.set_diagnosis(diagnosis)
        record.set_notes(notes)
        record.set_prescription(prescription)
        record.save()

        # Audit log
        MedicalRecordAuditLog.objects.create(
            record=record,
            accessed_by=request.user,
            action='create',
            notes=f'Doctor created record for patient {patient.username}',
        )

        # Notify patient
        send_notification(
            patient,
            f'Dr. {request.user.get_full_name()} has added a new medical record for you.',
            notif_type='new_record',
            extra={'record_id': record.id},
        )

        return Response(
            MedicalRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


class AuditLogListView(APIView):
    """Admin-only: view audit logs with pagination."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)

        page = int(request.query_params.get('page', 1))
        qs = MedicalRecordAuditLog.objects.all().select_related(
            'accessed_by', 'record'
        ).order_by('-timestamp')

        paginator = Paginator(qs, 10)
        try:
            page_obj = paginator.page(page)
        except Exception:
            page_obj = paginator.page(1)

        serializer = AuditLogSerializer(page_obj.object_list, many=True)
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page,
        })