from django.db import models
from django.conf import settings

class Patient(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_profile')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='patients')
    cpf = models.CharField(max_length=14, unique=True)
    phone = models.CharField(max_length=20)

    def __str__(self):
        return self.user.get_full_name() or self.user.username

class Address(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='address')
    cep = models.CharField(max_length=9)
    street = models.CharField(max_length=255)
    number = models.CharField(max_length=50)
    complement = models.CharField(max_length=255, blank=True, null=True)
    neighborhood = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.street}, {self.number} - {self.city}/{self.state}"

class MedicalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Prontuário de {self.patient} - {self.created_at.strftime('%d/%m/%Y')}"

class Prescription(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, related_name='prescriptions', on_delete=models.CASCADE)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_prescriptions')
    signed_document = models.FileField(upload_to='signed_documents/', null=True, blank=True)

    def __str__(self):
        return f"Prescription for {self.medical_record.patient.user.username} at {self.created_at}"

class Procedure(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, related_name='procedures', on_delete=models.CASCADE)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_procedures')
    signed_document = models.FileField(upload_to='signed_documents/', null=True, blank=True)

    def __str__(self):
        return f"Procedure for {self.medical_record.patient.user.username} at {self.created_at}"
