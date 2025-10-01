from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        MEDICO = "MEDICO", "Medico"
        PACIENTE = "PACIENTE", "Paciente"

    role = models.CharField(max_length=50, choices=Role.choices)
    crm = models.CharField(max_length=20, blank=True, null=True, unique=True)

    def save(self, *args, **kwargs):
        if self.role == self.Role.MEDICO and not self.crm:
            raise ValueError("Médicos devem ter um CRM.")
        if self.role == self.Role.PACIENTE:
            self.crm = None
        super().save(*args, **kwargs)
