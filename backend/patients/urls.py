from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, MedicalRecordViewSet, PrescriptionViewSet, ProcedureViewSet

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'medical-records', MedicalRecordViewSet, basename='medicalrecord')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'procedures', ProcedureViewSet, basename='procedure')

urlpatterns = [
    path('', include(router.urls)),
]
