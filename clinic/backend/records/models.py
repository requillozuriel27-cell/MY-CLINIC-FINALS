from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
from accounts.models import CustomUser
from appointments.models import Appointment


def get_fernet():
    key = settings.FERNET_KEY
    if not key:
        key = Fernet.generate_key().decode()
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


class Prescription(models.Model):
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE,
        related_name='prescriptions', null=True, blank=True,
    )
    doctor = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='doctor_prescriptions'
    )
    patient = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='patient_prescriptions'
    )
    diagnosis = models.TextField()
    medicines = models.TextField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Rx by Dr.{self.doctor.username} for {self.patient.username}"


class MedicalRecord(models.Model):
    patient = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='medical_records'
    )
    # Encrypted fields stored as binary
    _encrypted_diagnosis = models.BinaryField(
        db_column='encrypted_diagnosis', null=True, blank=True
    )
    _encrypted_notes = models.BinaryField(
        db_column='encrypted_notes', null=True, blank=True
    )
    _encrypted_prescription = models.BinaryField(
        db_column='encrypted_prescription', null=True, blank=True
    )
    # Keep old encrypted_data for backward compatibility
    _encrypted_data = models.BinaryField(
        db_column='encrypted_data', null=True, blank=True
    )
    record_title = models.CharField(max_length=255, default='Medical Record')
    created_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL,
        null=True, related_name='created_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    # ── Diagnosis ──
    def set_diagnosis(self, text):
        if text:
            self._encrypted_diagnosis = get_fernet().encrypt(text.encode())

    def get_diagnosis(self):
        if self._encrypted_diagnosis:
            try:
                return get_fernet().decrypt(bytes(self._encrypted_diagnosis)).decode()
            except Exception:
                return ''
        return ''

    # ── Notes ──
    def set_notes(self, text):
        if text:
            self._encrypted_notes = get_fernet().encrypt(text.encode())

    def get_notes(self):
        if self._encrypted_notes:
            try:
                return get_fernet().decrypt(bytes(self._encrypted_notes)).decode()
            except Exception:
                return ''
        return ''

    # ── Prescription ──
    def set_prescription(self, text):
        if text:
            self._encrypted_prescription = get_fernet().encrypt(text.encode())

    def get_prescription(self):
        if self._encrypted_prescription:
            try:
                return get_fernet().decrypt(
                    bytes(self._encrypted_prescription)
                ).decode()
            except Exception:
                return ''
        return ''

    # ── Legacy data field (backward compat) ──
    def set_data(self, plain_text):
        self._encrypted_data = get_fernet().encrypt(plain_text.encode())

    def get_data(self):
        if self._encrypted_data:
            try:
                return get_fernet().decrypt(bytes(self._encrypted_data)).decode()
            except Exception:
                return '[Unable to decrypt]'
        return ''

    def __str__(self):
        return f"Record[{self.record_title}] – {self.patient.username}"


class MedicalRecordAuditLog(models.Model):
    ACTION_CHOICES = [
        ('view', 'Viewed'),
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
    ]
    record = models.ForeignKey(
        MedicalRecord, on_delete=models.CASCADE,
        related_name='audit_logs', null=True, blank=True,
    )
    accessed_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL,
        null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    patient_searched = models.CharField(max_length=100, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.accessed_by} {self.action} at {self.timestamp}"
    