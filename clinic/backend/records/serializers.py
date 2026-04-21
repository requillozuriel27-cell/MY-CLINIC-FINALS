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
        return obj.doctor.get_full_name()

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_doctor_specialization(self, obj):
        if hasattr(obj.doctor, 'doctor_profile'):
            return obj.doctor.doctor_profile.specialization
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
    # Keep data for backward compat with old records
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
        return obj.patient.get_full_name()

    def get_patient_id_number(self, obj):
        if hasattr(obj.patient, 'patient_profile'):
            return obj.patient.patient_profile.patient_id
        return None

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ''

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
        # Legacy field for old records
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
        return obj.accessed_by.get_full_name() if obj.accessed_by else 'Unknown'

    def get_record_title(self, obj):
        return obj.record.record_title if obj.record else '—'