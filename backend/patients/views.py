from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Patient, MedicalRecord, Prescription, Procedure
from .serializers import PatientSerializer, MedicalRecordSerializer, PrescriptionSerializer, ProcedureSerializer
from .geolocation import get_coordinates_for_patient
from rest_framework.views import APIView
import requests
from users.models import User
import logging
import io
from django.http import FileResponse, HttpResponseBadRequest, HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from endesive import pdf
import tempfile
import os
from rest_framework import status
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature
import base64

logger = logging.getLogger(__name__)

class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'MEDICO'

class IsPatientOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user

class IsDoctorOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Para Patient
        if hasattr(obj, 'doctor'):
            return obj.doctor == request.user
        # Para MedicalRecord, Prescription, Procedure
        if hasattr(obj, 'medical_record'):
            return obj.medical_record.patient.doctor == request.user
        # Para Address
        if hasattr(obj, 'patient'):
            return obj.patient.doctor == request.user
        return False

class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Patient.objects.filter(doctor=self.request.user)

    def create(self, request, *args, **kwargs):
        logger.info(f"Received data for patient creation: {request.data}")
        
        mutable_data = request.data.copy()
        
        if 'user' in mutable_data and isinstance(mutable_data['user'], dict):
            mutable_data['user']['role'] = User.Role.PACIENTE
        
        serializer = self.get_serializer(data=mutable_data)
        
        try:
            serializer.is_valid(raise_exception=True)
            logger.info(f"Validated data before saving: {serializer.validated_data}")
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.error(f"Validation failed with error: {e}")
            raise e

    def perform_create(self, serializer):
        logger.info(f"Saving patient with doctor: {self.request.user}")
        patient = serializer.save(doctor=self.request.user)
        get_coordinates_for_patient(patient)
        logger.info(f"Finished processing for patient {patient.id}")

    def perform_update(self, serializer):
        patient = serializer.save()
        get_coordinates_for_patient(patient)

class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOwner | IsPatientOwner]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MEDICO':
            return MedicalRecord.objects.filter(patient__doctor=user)
        elif user.role == 'PACIENTE':
            return MedicalRecord.objects.filter(patient__user=user)
        return MedicalRecord.objects.none()

class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOwner]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MEDICO':
            return Prescription.objects.filter(medical_record__patient__doctor=user)
        elif user.role == 'PACIENTE':
            return Prescription.objects.filter(medical_record__patient__user=user)
        return Prescription.objects.none()

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_signed_document(self, request, pk=None):
        prescription = self.get_object()
        if prescription.is_signed:
            return Response({'detail': 'Esta receita já está assinada.'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.data.get('file')
        if not file_obj:
            return Response({'detail': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Salvar temporariamente o arquivo para verificação
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                for chunk in file_obj.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name
            
            # Verificar a assinatura do PDF
            with open(temp_path, 'rb') as pdf_file:
                data = pdf_file.read()
            
            # A função verify retorna uma lista de tuplas com informações da assinatura
            # Se não houver assinaturas válidas, ela pode retornar uma lista vazia ou levantar uma exceção
            signatures = pdf.verify(data)
            
            # Limpeza do arquivo temporário
            os.unlink(temp_path)

            if not signatures:
                 return Response({'detail': 'Nenhuma assinatura digital válida encontrada no documento.'}, status=status.HTTP_400_BAD_REQUEST)
             
            # Aqui você pode adicionar mais validações, como verificar o CPF do assinante
            # com o CRM do médico logado, a validade do certificado, etc.
            
            prescription.is_signed = True
            prescription.signed_at = timezone.now()
            prescription.signed_by = request.user
            prescription.signed_document.save(file_obj.name, file_obj, save=True)
            prescription.save()
            
            return Response(self.get_serializer(prescription).data)

        except Exception as e:
            # Limpeza em caso de erro
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
            logger.error(f"Erro ao verificar assinatura do PDF: {e}")
            return Response({'detail': f'Erro ao processar o PDF assinado: {e}'}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['get'])
    def download_unsigned_pdf(self, request, pk=None):
        prescription = self.get_object()
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        p.drawString(100, height - 100, f"Paciente: {prescription.medical_record.patient.user.get_full_name()}")
        p.drawString(100, height - 120, f"Médico Responsável: {request.user.get_full_name()} (CRM: {request.user.crm})")
        p.drawString(100, height - 140, f"Data da Emissão: {timezone.now().strftime('%d/%m/%Y %H:%M')}")
        p.drawString(100, height - 200, "Receita:")
        p.drawString(120, height - 220, prescription.description)
        
        p.showPage()
        p.save()

        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f'receita_nao_assinada_{prescription.id}.pdf')
    
    @action(detail=True, methods=['get'])
    def download_signed_document(self, request, pk=None):
        prescription = self.get_object()
        if not prescription.is_signed or not prescription.signed_document:
            return HttpResponseBadRequest("Este documento não está assinado.")
        
        # Retorna o arquivo salvo
        return FileResponse(prescription.signed_document, as_attachment=True, filename=prescription.signed_document.name)


class ProcedureViewSet(viewsets.ModelViewSet):
    serializer_class = ProcedureSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOwner]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MEDICO':
            return Procedure.objects.filter(medical_record__patient__doctor=user)
        elif user.role == 'PACIENTE':
            return Procedure.objects.filter(medical_record__patient__user=user)
        return Procedure.objects.none()

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_signed_document(self, request, pk=None):
        procedure = self.get_object()
        if procedure.is_signed:
            return Response({'detail': 'Este procedimento já está assinado.'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.data.get('file')
        if not file_obj:
            return Response({'detail': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                for chunk in file_obj.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name

            with open(temp_path, 'rb') as pdf_file:
                data = pdf_file.read()

            signatures = pdf.verify(data)
            os.unlink(temp_path)

            if not signatures:
                return Response({'detail': 'Nenhuma assinatura digital válida encontrada no documento.'}, status=status.HTTP_400_BAD_REQUEST)

            procedure.is_signed = True
            procedure.signed_at = timezone.now()
            procedure.signed_by = request.user
            procedure.signed_document.save(file_obj.name, file_obj, save=True)
            procedure.save()
            
            return Response(self.get_serializer(procedure).data)

        except Exception as e:
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
            logger.error(f"Erro ao verificar assinatura do PDF: {e}")
            return Response({'detail': f'Erro ao processar o PDF assinado: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def download_unsigned_pdf(self, request, pk=None):
        procedure = self.get_object()
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        p.drawString(100, height - 100, f"Paciente: {procedure.medical_record.patient.user.get_full_name()}")
        p.drawString(100, height - 120, f"Médico Responsável: {request.user.get_full_name()} (CRM: {request.user.crm})")
        p.drawString(100, height - 140, f"Data da Emissão: {timezone.now().strftime('%d/%m/%Y %H:%M')}")
        p.drawString(100, height - 200, "Procedimento/Exame:")
        p.drawString(120, height - 220, procedure.description)

        p.showPage()
        p.save()

        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f'procedimento_nao_assinado_{procedure.id}.pdf')

    @action(detail=True, methods=['get'])
    def download_signed_document(self, request, pk=None):
        procedure = self.get_object()
        if not procedure.is_signed or not procedure.signed_document:
            return HttpResponseBadRequest("Este documento não está assinado.")
        
        return FileResponse(procedure.signed_document, as_attachment=True, filename=procedure.signed_document.name)


class ViaCepView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, cep):
        response = requests.get(f'https://viacep.com.br/ws/{cep}/json/')
        return Response(response.json())
