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
    class PrescriptionType(models.TextChoices):
        COMUM = "COMUM", "Comum"
        A1_AMARELA = "A1_AMARELA", "Notificação de Receita A1 (Amarela)"
        B1_AZUL = "B1_AZUL", "Notificação de Receita B1 (Azul)"
        B2_AZUL = "B2_AZUL", "Notificação de Receita B2 (Azul)"
        C1_BRANCA = "C1_BRANCA", "Receita de Controle Especial (Branca - Duas Vias)"
        C2_BRANCA = "C2_BRANCA", "Receita de Controle Especial (Branca - Retinoides)"
        ANTIMICROBIANO = "ANTIMICROBIANO", "Receita de Antimicrobiano (Branca - Duas Vias)"

    medical_record = models.ForeignKey(MedicalRecord, related_name='prescriptions', on_delete=models.CASCADE)
    description = models.TextField()
    prescription_type = models.CharField(
        max_length=50,
        choices=PrescriptionType.choices,
        default=PrescriptionType.COMUM
    )
    sncr_number = models.CharField(max_length=20, blank=True, null=True, unique=True, help_text="Numeração oficial gerada pelo SNCR para receitas controladas.")
    acquirer_name = models.CharField(max_length=255, blank=True, null=True, help_text="Nome completo do comprador/adquirente do medicamento.")
    acquirer_document = models.CharField(max_length=50, blank=True, null=True, help_text="Documento de identificação do comprador/adquirente.")
    created_at = models.DateTimeField(auto_now_add=True)
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_prescriptions')
    signed_document = models.FileField(upload_to='signed_documents/', null=True, blank=True)

    def __str__(self):
        return f"Prescription for {self.medical_record.patient.user.username} at {self.created_at}"


class SncrNumber(models.Model):
    """
    Armazena e gerencia os números de receita controlada obtidos da Vigilância Sanitária.
    """
    class Status(models.TextChoices):
        DISPONIVEL = "DISPONIVEL", "Disponível"
        UTILIZADO = "UTILIZADO", "Utilizado"
        CANCELADO = "CANCELADO", "Cancelado"

    # Reutilizando a definição de PrescriptionType para manter a consistência
    prescription_type = models.CharField(
        max_length=50,
        choices=Prescription.PrescriptionType.choices,
        help_text="Tipo de receita a que este número se destina."
    )
    number = models.CharField(max_length=50, unique=True, help_text="Numeração oficial fornecida pela Vigilância Sanitária.")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DISPONIVEL)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sncr_numbers', help_text="Médico a quem este número foi designado.")
    prescription = models.OneToOneField('Prescription', on_delete=models.SET_NULL, null=True, blank=True, related_name='used_sncr_number')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.number} ({self.status})"


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
