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
                    f'Dr. {request.user.get_full_name()} added a new prescription.',
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        page = int(request.query_params.get('page', 1))

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

        elif user.role == 'doctor':
            patient_id = request.query_params.get('patient_id')
            if not patient_id:
                return Response(
                    {'error': 'patient_id is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                patient = CustomUser.objects.get(pk=patient_id, role='patient')
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role == 'admin':
            return Response(
                {'error': 'Admins cannot create records. View only.'},
                status=status.HTTP_403_FORBIDDEN,
            )
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

        try:
            patient = CustomUser.objects.get(pk=patient_id, role='patient')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Patient not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

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
                {'error': f'Failed to save: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            MedicalRecordAuditLog.objects.create(
                record=record,
                accessed_by=request.user,
                action='create',
                notes=f'Dr. {request.user.get_full_name()} created record for {patient.get_full_name()}',
            )
        except Exception:
            pass

        try:
            send_notification(
                patient,
                f'Dr. {request.user.get_full_name()} added a new medical record for you.',
                notif_type='new_record',
                extra={'record_id': record.id},
            )
        except Exception:
            pass

        return Response(
            MedicalRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


class UpdateMedicalRecordView(APIView):
    """Doctor can edit a record they created."""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        if request.user.role != 'doctor':
            return Response(
                {'error': 'Only doctors can edit records.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            record = MedicalRecord.objects.get(pk=pk)
        except MedicalRecord.DoesNotExist:
            return Response(
                {'error': 'Record not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Doctor can only edit records they created
        if record.created_by != request.user:
            return Response(
                {'error': 'You can only edit records you created.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        record_title = request.data.get('record_title', '').strip()
        diagnosis = request.data.get('diagnosis', '').strip()
        notes = request.data.get('notes', '').strip()
        prescription = request.data.get('prescription', '').strip()

        if not diagnosis:
            return Response(
                {'error': 'Diagnosis is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if record_title:
                record.record_title = record_title
            record.set_diagnosis(diagnosis)
            record.set_notes(notes)
            record.set_prescription(prescription)
            record.save()
        except Exception as e:
            return Response(
                {'error': f'Failed to update: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            MedicalRecordAuditLog.objects.create(
                record=record,
                accessed_by=request.user,
                action='update',
                notes=f'Dr. {request.user.get_full_name()} updated record {record.record_title}',
            )
        except Exception:
            pass

        try:
            send_notification(
                record.patient,
                f'Dr. {request.user.get_full_name()} updated your medical record: {record.record_title}.',
                notif_type='record_updated',
                extra={'record_id': record.id},
            )
        except Exception:
            pass

        return Response(MedicalRecordSerializer(record).data)


class DeleteMedicalRecordView(APIView):
    """
    Doctor can delete a record they created.
    Admin cannot delete — read only.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        # Admin cannot delete
        if request.user.role == 'admin':
            return Response(
                {'error': 'Admins cannot delete records.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role != 'doctor':
            return Response(
                {'error': 'Only doctors can delete records.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            record = MedicalRecord.objects.get(pk=pk)
        except MedicalRecord.DoesNotExist:
            return Response(
                {'error': 'Record not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Doctor can only delete records they created
        if record.created_by != request.user:
            return Response(
                {'error': 'You can only delete records you created.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient = record.patient
        record_title = record.record_title

        # Log before deleting
        try:
            MedicalRecordAuditLog.objects.create(
                record=None,
                accessed_by=request.user,
                action='delete',
                notes=f'Dr. {request.user.get_full_name()} deleted record '
                      f'"{record_title}" for patient {patient.get_full_name()}',
            )
        except Exception:
            pass

        # Notify patient
        try:
            send_notification(
                patient,
                f'Dr. {request.user.get_full_name()} removed a medical record: {record_title}.',
                notif_type='record_deleted',
                extra={},
            )
        except Exception:
            pass

        record.delete()

        return Response({
            'message': f'Record "{record_title}" deleted successfully.'
        }, status=status.HTTP_200_OK)


class AuditLogListView(APIView):
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