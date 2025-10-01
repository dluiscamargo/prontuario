from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserModelTest(TestCase):
    def test_create_medico(self):
        user = User.objects.create_user(
            username='medico', 
            password='password123', 
            role=User.Role.MEDICO, 
            crm='12345'
        )
        self.assertEqual(user.username, 'medico')
        self.assertEqual(user.role, User.Role.MEDICO)
        self.assertEqual(user.crm, '12345')

    def test_create_paciente(self):
        user = User.objects.create_user(
            username='paciente', 
            password='password123', 
            role=User.Role.PACIENTE
        )
        self.assertEqual(user.username, 'paciente')
        self.assertEqual(user.role, User.Role.PACIENTE)
        self.assertIsNone(user.crm)

    def test_medico_requires_crm(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(
                username='medico_sem_crm', 
                password='password123', 
                role=User.Role.MEDICO
            )
