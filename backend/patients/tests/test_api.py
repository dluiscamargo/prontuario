from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from patients.models import Patient

User = get_user_model()

class PatientAPITest(APITestCase):
    def setUp(self):
        self.doctor = User.objects.create_user(username='doctor', password='password', role=User.Role.MEDICO, crm='12345')
        self.token = Token.objects.create(user=self.doctor)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.patient_user = User.objects.create_user(username='patientuser', password='password', role=User.Role.PACIENTE)
        self.patient = Patient.objects.create(
            user=self.patient_user,
            doctor=self.doctor,
            cpf='123.456.789-00',
            phone='11999999999'
        )

    def test_doctor_can_list_own_patients(self):
        response = self.client.get('/api/patients/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['cpf'], self.patient.cpf)
    
    def test_doctor_cannot_list_other_doctors_patients(self):
        other_doctor = User.objects.create_user(username='otherdoctor', password='password', role=User.Role.MEDICO, crm='54321')
        other_patient_user = User.objects.create_user(username='otherpatient', password='password', role=User.Role.PACIENTE)
        Patient.objects.create(
            user=other_patient_user,
            doctor=other_doctor,
            cpf='987.654.321-00',
            phone='11888888888'
        )
        response = self.client.get('/api/patients/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_patient_cannot_access_patient_list(self):
        patient_user = User.objects.create_user(username='testpatient', password='password', role=User.Role.PACIENTE)
        token = Token.objects.create(user=patient_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        response = self.client.get('/api/patients/')
        self.assertEqual(response.status_code, 403)
