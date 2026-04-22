from rest_framework import serializers
from .models import Prescription, MedicalRecord, MedicalRecordAuditLog


class PrescriptionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'doctor', 'patient',
            'doctor_name', 'patient_name', 'doctor_specialization',
            'diagnosis', 'medicines', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['doctor', 'created_at', 'updated_at']

    def get_doctor_name(self, obj):
        try:
            return obj.doctor.get_full_name()
        except Exception:
            return ''

    def get_patient_name(self, obj):
        try:
            return obj.patient.get_full_name()
        except Exception:
            return ''

    def get_doctor_specialization(self, obj):
        try:
            if hasattr(obj.doctor, 'doctor_profile'):
                return obj.doctor.doctor_profile.specialization
            return ''
        except Exception:
            return ''


class CreatePrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ['appointment', 'patient', 'diagnosis', 'medicines', 'notes']


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_id_number = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    diagnosis = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    prescription = serializers.SerializerMethodField()
    data = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_name', 'patient_id_number',
            'record_title', 'diagnosis', 'notes', 'prescription',
            'data', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['patient', 'created_by', 'created_at']

    def get_patient_name(self, obj):
        try:
            return obj.patient.get_full_name()
        except Exception:
            return ''

    def get_patient_id_number(self, obj):
        # Safe — handles missing profile and missing patient_id field
        try:
            profile = getattr(obj.patient, 'patient_profile', None)
            if profile is None:
                return None
            # Use getattr with default None so it never crashes
            return getattr(profile, 'patient_id', None)
        except Exception:
            return None

    def get_created_by_name(self, obj):
        try:
            return obj.created_by.get_full_name() if obj.created_by else ''
        except Exception:
            return ''

    def get_diagnosis(self, obj):
        try:
            return obj.get_diagnosis()
        except Exception:
            return ''

    def get_notes(self, obj):
        try:
            return obj.get_notes()
        except Exception:
            return ''

    def get_prescription(self, obj):
        try:
            return obj.get_prescription()
        except Exception:
            return ''

    def get_data(self, obj):
        # Legacy field for old records created before the new fields
        try:
            return obj.get_data()
        except Exception:
            return ''


class AuditLogSerializer(serializers.ModelSerializer):
    accessed_by_name = serializers.SerializerMethodField()
    record_title = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecordAuditLog
        fields = [
            'id', 'record', 'record_title', 'accessed_by',
            'accessed_by_name', 'action', 'patient_searched',
            'timestamp', 'notes',
        ]

    def get_accessed_by_name(self, obj):
        try:
            return obj.accessed_by.get_full_name() if obj.accessed_by else 'Unknown'
        except Exception:
            return 'Unknown'

    def get_record_title(self, obj):
        try:
            return obj.record.record_title if obj.record else '—'
        except Exception:
            return '—'