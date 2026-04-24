"""
email_service.py
Central email service for the Poblacion Danao Bohol Clinic system.
All emails are sent in background threads — never block the main request.

Triggered by:
  Register        → Welcome email with account details
  Book appt       → Patient + Doctor both notified
  Confirm appt    → Patient notified
  Cancel appt     → Depends on who cancelled
  New record      → Patient notified
  New prescription→ Patient notified
  Password reset  → User gets new password by email
  Deactivate acct → User notified
  Restore acct    → User notified
  Bulk email      → Admin sends to all/doctors/patients/specific
"""

import threading
from django.core.mail import send_mail
from django.conf import settings


CLINIC_NAME = 'Poblacion Danao Bohol Clinic'
LOGIN_URL = 'http://localhost:5173/login'
DIVIDER = '─' * 44

CLINIC_FOOTER = (
    f'\n\n{DIVIDER}\n'
    f'{CLINIC_NAME}\n'
    f'This is an automated message. Please do not reply.\n'
    f'{DIVIDER}'
)


def _send(subject, body, recipient_email):
    """
    Internal helper — sends one email.
    Returns True on success, False on failure.
    Never raises an exception.
    """
    try:
        if not settings.EMAIL_HOST_USER:
            return False
        if not recipient_email:
            return False

        send_mail(
            subject=subject,
            message=body + CLINIC_FOOTER,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        return True
    except Exception:
        return False


def _send_async(subject, body, recipient_email):
    """
    Sends a single email in a background thread.
    Non-blocking — the main request is never delayed.
    """
    thread = threading.Thread(
        target=_send,
        args=(subject, body, recipient_email),
        daemon=True,
    )
    thread.start()


def _send_many_async(subject, body, recipient_emails, log_id=None):
    """
    Sends email to multiple recipients in a background thread.
    Updates EmailNotificationLog when finished if log_id is provided.
    """
    def worker():
        success = 0
        failed = 0
        failed_list = []

        for email in recipient_emails:
            ok = _send(subject, body, email)
            if ok:
                success += 1
            else:
                failed += 1
                failed_list.append(email)

        # Update the log record if provided
        if log_id:
            try:
                from django.utils import timezone
                from notifications.models import EmailNotificationLog
                log = EmailNotificationLog.objects.get(id=log_id)
                log.success_count = success
                log.failed_count = failed
                log.failed_emails = failed_list
                log.completed_at = timezone.now()
                if failed == 0:
                    log.status = 'completed'
                elif success == 0:
                    log.status = 'failed'
                else:
                    log.status = 'partial'
                log.save()
            except Exception:
                pass

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()


# ─────────────────────────────────────────────────────
# PUBLIC EMAIL FUNCTIONS — called from views
# ─────────────────────────────────────────────────────


def send_welcome_email(user):
    """
    Sent after successful patient or doctor registration.
    Includes full account details and Patient ID if applicable.
    """
    full_name = user.get_full_name() or user.username

    patient_id_line = ''
    if user.role == 'patient':
        try:
            pid = getattr(user.patient_profile, 'patient_id', None)
            if pid:
                patient_id_line = f'\nPatient ID    : {pid}'
        except Exception:
            pass

    specialization_line = ''
    if user.role == 'doctor':
        try:
            spec = getattr(user.doctor_profile, 'specialization', None)
            if spec:
                specialization_line = f'\nSpecialization: {spec}'
        except Exception:
            pass

    body = (
        f'Dear {full_name},\n\n'
        f'Welcome! Your account has been successfully created at\n'
        f'{CLINIC_NAME}.\n\n'
        f'{DIVIDER}\n'
        f'YOUR ACCOUNT DETAILS\n'
        f'{DIVIDER}\n'
        f'Full Name  : {full_name}\n'
        f'Username   : {user.username}\n'
        f'Email      : {user.email}\n'
        f'Role       : {user.role.capitalize()}'
        f'{patient_id_line}'
        f'{specialization_line}\n\n'
        f'{DIVIDER}\n'
        f'You can now log in at:\n'
        f'{LOGIN_URL}\n\n'
        f'If you did not create this account, '
        f'please contact the clinic immediately.'
    )

    _send_async(
        subject=f'Welcome to {CLINIC_NAME} — Registration Successful',
        body=body,
        recipient_email=user.email,
    )


def send_appointment_booked_patient(patient, doctor, date, time):
    """Sent to patient after they successfully book an appointment."""
    full_name = patient.get_full_name() or patient.username
    doctor_name = doctor.get_full_name() or doctor.username

    body = (
        f'Dear {full_name},\n\n'
        f'Your appointment has been booked successfully.\n\n'
        f'{DIVIDER}\n'
        f'APPOINTMENT DETAILS\n'
        f'{DIVIDER}\n'
        f'Doctor : Dr. {doctor_name}\n'
        f'Date   : {date}\n'
        f'Time   : {time}\n'
        f'Status : Pending (awaiting confirmation)\n\n'
        f'You will receive another email once the doctor confirms '
        f'your appointment.\n\n'
        f'View your appointments at:\n{LOGIN_URL}'
    )

    _send_async(
        subject=f'Appointment Booked — {CLINIC_NAME}',
        body=body,
        recipient_email=patient.email,
    )


def send_appointment_booked_doctor(doctor, patient, date, time):
    """Sent to doctor when a patient books an appointment with them."""
    doctor_name = doctor.get_full_name() or doctor.username
    patient_name = patient.get_full_name() or patient.username

    body = (
        f'Dear Dr. {doctor_name},\n\n'
        f'A new appointment has been booked with you.\n\n'
        f'{DIVIDER}\n'
        f'APPOINTMENT DETAILS\n'
        f'{DIVIDER}\n'
        f'Patient : {patient_name}\n'
        f'Date    : {date}\n'
        f'Time    : {time}\n'
        f'Status  : Pending\n\n'
        f'Please log in to confirm or cancel this appointment:\n'
        f'{LOGIN_URL}'
    )

    _send_async(
        subject=f'New Patient Appointment — {CLINIC_NAME}',
        body=body,
        recipient_email=doctor.email,
    )


def send_appointment_confirmed(patient, doctor, date, time):
    """Sent to patient when their appointment is confirmed."""
    full_name = patient.get_full_name() or patient.username
    doctor_name = doctor.get_full_name() or doctor.username

    body = (
        f'Dear {full_name},\n\n'
        f'Great news! Your appointment has been confirmed.\n\n'
        f'{DIVIDER}\n'
        f'CONFIRMED APPOINTMENT\n'
        f'{DIVIDER}\n'
        f'Doctor : Dr. {doctor_name}\n'
        f'Date   : {date}\n'
        f'Time   : {time}\n'
        f'Status : Confirmed\n\n'
        f'Please arrive on time. If you need to cancel, '
        f'please log in as soon as possible:\n{LOGIN_URL}'
    )

    _send_async(
        subject=f'Appointment Confirmed — {CLINIC_NAME}',
        body=body,
        recipient_email=patient.email,
    )


def send_appointment_cancelled_patient(
    patient, doctor, date, time, cancelled_by
):
    """Sent to patient when appointment is cancelled."""
    full_name = patient.get_full_name() or patient.username
    doctor_name = doctor.get_full_name() or doctor.username

    if cancelled_by == 'patient':
        by_line = 'by yourself'
    else:
        by_line = f'by Dr. {doctor_name}'

    body = (
        f'Dear {full_name},\n\n'
        f'Your appointment has been cancelled {by_line}.\n\n'
        f'{DIVIDER}\n'
        f'CANCELLED APPOINTMENT\n'
        f'{DIVIDER}\n'
        f'Doctor : Dr. {doctor_name}\n'
        f'Date   : {date}\n'
        f'Time   : {time}\n'
        f'Status : Cancelled\n\n'
        f'You can book a new appointment at:\n{LOGIN_URL}'
    )

    _send_async(
        subject=f'Appointment Cancelled — {CLINIC_NAME}',
        body=body,
        recipient_email=patient.email,
    )


def send_appointment_cancelled_doctor(doctor, patient, date, time):
    """Sent to doctor when a patient cancels their appointment."""
    doctor_name = doctor.get_full_name() or doctor.username
    patient_name = patient.get_full_name() or patient.username

    body = (
        f'Dear Dr. {doctor_name},\n\n'
        f'A patient has cancelled their appointment with you.\n\n'
        f'{DIVIDER}\n'
        f'CANCELLED APPOINTMENT\n'
        f'{DIVIDER}\n'
        f'Patient : {patient_name}\n'
        f'Date    : {date}\n'
        f'Time    : {time}\n'
        f'Status  : Cancelled\n\n'
        f'Log in to view your updated schedule:\n{LOGIN_URL}'
    )

    _send_async(
        subject=f'Appointment Cancelled by Patient — {CLINIC_NAME}',
        body=body,
        recipient_email=doctor.email,
    )


def send_new_prescription(patient, doctor):
    """Sent to patient when a doctor adds a prescription."""
    full_name = patient.get_full_name() or patient.username
    doctor_name = doctor.get_full_name() or doctor.username

    body = (
        f'Dear {full_name},\n\n'
        f'Dr. {doctor_name} has added a new prescription for you.\n\n'
        f'Log in to view your prescriptions:\n{LOGIN_URL}\n\n'
        f'Go to: Dashboard → Prescriptions'
    )

    _send_async(
        subject=f'New Prescription Added — {CLINIC_NAME}',
        body=body,
        recipient_email=patient.email,
    )


def send_new_medical_record(patient, doctor, record_title):
    """Sent to patient when a doctor creates a medical record."""
    full_name = patient.get_full_name() or patient.username
    doctor_name = doctor.get_full_name() or doctor.username

    body = (
        f'Dear {full_name},\n\n'
        f'Dr. {doctor_name} has added a new medical record for you.\n\n'
        f'{DIVIDER}\n'
        f'Record Title: {record_title}\n'
        f'{DIVIDER}\n\n'
        f'Log in to view your medical records:\n{LOGIN_URL}\n\n'
        f'Go to: Dashboard → Records'
    )

    _send_async(
        subject=f'New Medical Record Added — {CLINIC_NAME}',
        body=body,
        recipient_email=patient.email,
    )


def send_password_reset(user, new_password):
    """Sent to user when admin resets their password."""
    full_name = user.get_full_name() or user.username

    body = (
        f'Dear {full_name},\n\n'
        f'Your password has been reset by the clinic administrator.\n\n'
        f'{DIVIDER}\n'
        f'YOUR NEW LOGIN CREDENTIALS\n'
        f'{DIVIDER}\n'
        f'Username     : {user.username}\n'
        f'New Password : {new_password}\n\n'
        f'Please log in and change your password immediately:\n'
        f'{LOGIN_URL}\n\n'
        f'If you did not request this change, '
        f'contact the clinic immediately.'
    )

    _send_async(
        subject=f'Password Reset — {CLINIC_NAME}',
        body=body,
        recipient_email=user.email,
    )


def send_account_deactivated(user):
    """Sent to user when admin deactivates their account."""
    full_name = user.get_full_name() or user.username

    body = (
        f'Dear {full_name},\n\n'
        f'Your account at {CLINIC_NAME} has been deactivated.\n\n'
        f'If you believe this is a mistake, '
        f'please contact the clinic directly.\n\n'
        f'Username: {user.username}'
    )

    _send_async(
        subject=f'Account Deactivated — {CLINIC_NAME}',
        body=body,
        recipient_email=user.email,
    )


def send_account_restored(user):
    """Sent to user when admin restores their account."""
    full_name = user.get_full_name() or user.username

    body = (
        f'Dear {full_name},\n\n'
        f'Your account at {CLINIC_NAME} has been restored.\n\n'
        f'You can now log in again at:\n{LOGIN_URL}\n\n'
        f'Username: {user.username}'
    )

    _send_async(
        subject=f'Account Restored — {CLINIC_NAME}',
        body=body,
        recipient_email=user.email,
    )


def send_new_message_notification(receiver, sender):
    """Sent to user when they receive a new message."""
    receiver_name = receiver.get_full_name() or receiver.username
    sender_name = sender.get_full_name() or sender.username

    body = (
        f'Dear {receiver_name},\n\n'
        f'You have a new message from {sender_name}.\n\n'
        f'Log in to read and reply:\n{LOGIN_URL}\n\n'
        f'Go to: Dashboard → Messages'
    )

    _send_async(
        subject=f'New Message from {sender_name} — {CLINIC_NAME}',
        body=body,
        recipient_email=receiver.email,
    )


def send_bulk_email(subject, message, recipient_emails, log_id=None):
    """
    Admin bulk email sender.
    Sends to a list of recipients asynchronously.
    Updates EmailNotificationLog when complete.
    """
    full_body = (
        f'{message}\n\n'
        f'This is an official notification from the clinic administrator.'
    )

    _send_many_async(
        subject=subject,
        body=full_body,
        recipient_emails=recipient_emails,
        log_id=log_id,
    )