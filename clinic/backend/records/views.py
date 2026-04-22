from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404

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
            try:
                send_notification(
                    prescription.patient,
                    f'Dr. {request.user.get_full_name()} added a new prescription for you.',
                    notif_type='new_prescription',
                    extra={'prescription_id': prescription.id},
                )
            except Exception:
                pass
            return Response(
                PrescriptionSerializer(prescription).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MedicalRecordListView(APIView):
    """
    Returns paginated medical records.

    RULES:
    - Patient: sees only their own records
    - Doctor: can view records of ANY registered patient
              (no appointment restriction)
    - Admin:  can view records of ANY patient
              but ONLY after searching and selecting a patient
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        page = int(request.query_params.get('page', 1))

        # ── PATIENT ──
        if user.role == 'patient':
            qs = MedicalRecord.objects.filter(
                patient=user
            ).select_related('patient', 'created_by')
            try:
                MedicalRecordAuditLog.objects.create(
                    accessed_by=user,
                    action='view',
                    notes='Patient viewed own records',
                )
            except Exception:
                pass

        # ── DOCTOR ──
        # Doctor can view records of ANY patient in the system
        # No appointment restriction
        elif user.role == 'doctor':
            patient_id = request.query_params.get('patient_id')
            if not patient_id:
                return Response(
                    {'error': 'patient_id is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Verify the patient exists
            try:
                patient = CustomUser.objects.get(
                    pk=patient_id, role='patient'
                )
            except CustomUser.DoesNotExist:
                return Response(
                    {'error': 'Patient not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            qs = MedicalRecord.objects.filter(
                patient=patient
            ).select_related('patient', 'created_by')

            try:
                MedicalRecordAuditLog.objects.create(
                    accessed_by=user,
                    action='view',
                    notes=f'Doctor viewed records for patient_id={patient_id}',
                )
            except Exception:
                pass

        # ── ADMIN ──
        # Admin can view records of any patient
        # but must select a patient first (patient_user_id required)
        elif user.role == 'admin':
            patient_user_id = request.query_params.get('patient_user_id')
            if not patient_user_id:
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

            try:
                MedicalRecordAuditLog.objects.create(
                    accessed_by=user,
                    action='view',
                    notes=f'Admin viewed records for patient_user_id={patient_user_id}',
                )
            except Exception:
                pass

        else:
            return Response({'error': 'Unauthorized.'}, status=403)

        # Paginate
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
    RULES:
    - Doctor: can create records for ANY registered patient
              No appointment needed
    - Admin:  STRICTLY READ-ONLY — cannot create records
    - Patient: cannot create records
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Admin is strictly read-only
        if request.user.role == 'admin':
            return Response(
                {'error': 'Admins cannot create records. View only.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Only doctors can create
        if request.user.role != 'doctor':
            return Response(
                {'error': 'Only doctors can create medical records.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient_id = request.data.get('patient')
        record_title = request.data.get('record_title', '').strip()
        diagnosis = request.data.get('diagnosis', '').strip()
        notes = request.data.get('notes', '').strip()
        prescription = request.data.get('prescription', '').strip()

        # Validate required fields
        if not patient_id:
            return Response(
                {'error': 'Patient is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not diagnosis:
            return Response(
                {'error': 'Diagnosis is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find patient — must be registered as a patient
        try:
            patient = CustomUser.objects.get(pk=patient_id, role='patient')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Patient not found in the system.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create and encrypt the record
        try:
            record = MedicalRecord(
                patient=patient,
                record_title=record_title if record_title else 'Medical Record',
                created_by=request.user,
            )
            record.set_diagnosis(diagnosis)
            if notes:
                record.set_notes(notes)
            if prescription:
                record.set_prescription(prescription)
            record.save()

        except Exception as e:
            return Response(
                {'error': f'Failed to save record. Please run migrations. Detail: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Audit log — failure does not block save
        try:
            MedicalRecordAuditLog.objects.create(
                record=record,
                accessed_by=request.user,
                action='create',
                notes=f'Dr. {request.user.get_full_name()} created record for {patient.get_full_name()}',
            )
        except Exception:
            pass

        # Notify patient — failure does not block save
        try:
            send_notification(
                patient,
                f'Dr. {request.user.get_full_name()} has added a new medical record for you.',
                notif_type='new_record',
                extra={'record_id': record.id},
            )
        except Exception:
            pass

        return Response(
            MedicalRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


class AuditLogListView(APIView):
    """Admin only — view audit logs."""
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