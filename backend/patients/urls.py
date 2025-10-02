from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet,
    MedicalRecordViewSet,
    PrescriptionViewSet,
    ProcedureViewSet,
    ViaCepView,
    PatientDocumentsView,
)

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'medical-records', MedicalRecordViewSet, basename='medicalrecord')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'procedures', ProcedureViewSet, basename='procedure')

urlpatterns = [
    path('', include(router.urls)),
    path('viacep/<str:cep>/', ViaCepView.as_view(), name='viacep'),
    path(
        'patient-documents/',
        PatientDocumentsView.as_view(),
        name='patient-documents',
    ),
]
