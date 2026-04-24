from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q

from .models import Appointment
from .serializers import AppointmentSerializer
from accounts.models import CustomUser
from notifications.utils import send_notification
from clinic.email_service import (
    send_appointment_booked_patient,
    send_appointment_booked_doctor,
    send_appointment_confirmed,
    send_appointment_cancelled_patient,
    send_appointment_cancelled_doctor,
)


class AppointmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()

        if user.role == 'patient':
            qs = Appointment.objects.filter(
                patient=user
            ).select_related('patient', 'doctor')
        elif user.role == 'doctor':
            qs = Appointment.objects.filter(
                doctor=user
            ).select_related('patient', 'doctor')
        elif user.role == 'admin':
            qs = Appointment.objects.all().select_related('patient', 'doctor')
        else:
            qs = Appointment.objects.none()

        if search:
            qs = qs.filter(
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search) |
                Q(patient__username__icontains=search) |
                Q(doctor__first_name__icontains=search) |
                Q(doctor__last_name__icontains=search)
            )

        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = AppointmentSerializer(qs.order_by('-date', '-time'), many=True)
        return Response(serializer.data)


class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'patient':
            return Response(
                {'error': 'Only patients can book appointments.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        doctor_id = request.data.get('doctor')
        date = request.data.get('date')
        time = request.data.get('time')
        notes = request.data.get('notes', '')

        if not all([doctor_id, date, time]):
            return Response(
                {'error': 'Doctor, date and time are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            doctor = CustomUser.objects.get(pk=doctor_id, role='doctor')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Doctor not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        appointment = Appointment.objects.create(
            patient=request.user,
            doctor=doctor,
            date=date,
            time=time,
            notes=notes,
            status='pending',
        )

        # In-app notifications
        try:
            send_notification(
                doctor,
                f'{request.user.get_full_name()} booked an appointment on {date} at {time}.',
                notif_type='new_appointment',
                extra={'appointment_id': appointment.id},
            )
        except Exception:
            pass

        # Email notifications — patient and doctor
        try:
            send_appointment_booked_patient(request.user, doctor, date, time)
        except Exception:
            pass

        try:
            send_appointment_booked_doctor(doctor, request.user, date, time)
        except Exception:
            pass

        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CancelAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        user = request.user

        # Permission check
        if user.role == 'patient' and appointment.patient != user:
            return Response({'error': 'Unauthorized.'}, status=403)
        if user.role == 'doctor' and appointment.doctor != user:
            return Response({'error': 'Unauthorized.'}, status=403)

        if appointment.status in ('cancelled', 'completed'):
            return Response(
                {'error': f'Cannot cancel a {appointment.status} appointment.'},
                status=400,
            )

        appointment.status = 'cancelled'
        appointment.save()

        patient = appointment.patient
        doctor = appointment.doctor
        date = str(appointment.date)
        time = str(appointment.time)

        cancelled_by = user.role

        # In-app notifications
        try:
            if cancelled_by == 'patient':
                send_notification(
                    doctor,
                    f'{patient.get_full_name()} cancelled their appointment on {date}.',
                    notif_type='appointment_cancelled',
                    extra={'appointment_id': appointment.id},
                )
            else:
                send_notification(
                    patient,
                    f'Dr. {doctor.get_full_name()} cancelled your appointment on {date}.',
                    notif_type='appointment_cancelled',
                    extra={'appointment_id': appointment.id},
                )
        except Exception:
            pass

        # Email notifications
        try:
            send_appointment_cancelled_patient(
                patient, doctor, date, time, cancelled_by
            )
        except Exception:
            pass

        if cancelled_by == 'patient':
            try:
                send_appointment_cancelled_doctor(doctor, patient, date, time)
            except Exception:
                pass

        return Response({'message': 'Appointment cancelled.'})


class ConfirmAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        user = request.user

        if user.role not in ('doctor', 'admin'):
            return Response({'error': 'Only doctors or admin can confirm.'}, status=403)

        if user.role == 'doctor' and appointment.doctor != user:
            return Response({'error': 'Unauthorized.'}, status=403)

        if appointment.status != 'pending':
            return Response(
                {'error': f'Cannot confirm a {appointment.status} appointment.'},
                status=400,
            )

        appointment.status = 'confirmed'
        appointment.save()

        patient = appointment.patient
        doctor = appointment.doctor
        date = str(appointment.date)
        time = str(appointment.time)

        # In-app notification
        try:
            send_notification(
                patient,
                f'Your appointment with Dr. {doctor.get_full_name()} on {date} is confirmed.',
                notif_type='appointment_confirmed',
                extra={'appointment_id': appointment.id},
            )
        except Exception:
            pass

        # Email notification
        try:
            send_appointment_confirmed(patient, doctor, date, time)
        except Exception:
            pass

        return Response({'message': 'Appointment confirmed.'})


class UpdateAppointmentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        new_status = request.data.get('status')
        valid = ['pending', 'confirmed', 'cancelled', 'completed']
        if new_status not in valid:
            return Response(
                {'error': f'Status must be one of: {", ".join(valid)}'},
                status=400,
            )

        appointment.status = new_status
        appointment.save()

        return Response({'message': f'Status updated to {new_status}.'})


class AppointmentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        total = Appointment.objects.count()
        pending = Appointment.objects.filter(status='pending').count()
        confirmed = Appointment.objects.filter(status='confirmed').count()
        cancelled = Appointment.objects.filter(status='cancelled').count()
        completed = Appointment.objects.filter(status='completed').count()

        total_patients = CustomUser.objects.filter(role='patient', is_active=True).count()
        total_doctors = CustomUser.objects.filter(role='doctor', is_active=True).count()

        return Response({
            'total_appointments': total,
            'pending': pending,
            'confirmed': confirmed,
            'cancelled': cancelled,
            'completed': completed,
            'total_patients': total_patients,
            'total_doctors': total_doctors,
        })