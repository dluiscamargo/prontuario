from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework import serializers
from .models import Patient, MedicalRecord, Prescription, Procedure
from .serializers import (
    PatientSerializer, MedicalRecordSerializer, 
    PrescriptionSerializer, ProcedureSerializer, SncrNumberSerializer
)
from .geolocation import get_coordinates_for_patient
from rest_framework.views import APIView
import requests
from users.models import User
import logging
import io
from django.http import FileResponse, HttpResponseBadRequest, HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
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
from .models import SncrNumber
from django.db import transaction

logger = logging.getLogger(__name__)

class PatientDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'PACIENTE':
            return Response({'detail': 'Apenas pacientes podem acessar esta página.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            patient = Patient.objects.get(user=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Paciente não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        prescriptions = Prescription.objects.filter(medical_record__patient=patient, is_signed=True)
        procedures = Procedure.objects.filter(medical_record__patient=patient, is_signed=True)

        documents = []
        for p in prescriptions:
            nature = p.get_prescription_type_display()
            if p.sncr_number:
                nature += f" (Nº SNCR: {p.sncr_number})"
            
            documents.append({
                'id': p.id,
                'type': 'Receita',
                'nature': nature,
                'description': p.description,
                'signed_at': p.signed_at,
                'signed_document': request.build_absolute_uri(p.signed_document.url) if p.signed_document else None,
                'doctor_name': p.signed_by.get_full_name() if p.signed_by else 'N/A',
                'doctor_crm': p.signed_by.crm if p.signed_by else 'N/A'
            })
        
        for p in procedures:
            documents.append({
                'id': p.id,
                'type': 'Procedimento',
                'nature': 'Exame/Procedimento',
                'description': p.description,
                'signed_at': p.signed_at,
                'signed_document': request.build_absolute_uri(p.signed_document.url) if p.signed_document else None,
                'doctor_name': p.signed_by.get_full_name() if p.signed_by else 'N/A',
                'doctor_crm': p.signed_by.crm if p.signed_by else 'N/A'
            })
        
        patient_data = PatientSerializer(patient).data

        return Response({
            'patient': patient_data,
            'documents': sorted(documents, key=lambda x: x['signed_at'], reverse=True)
        })


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
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return Patient.objects.filter(user_id=user_id)
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

    def perform_create(self, serializer):
        """
        Salva a prescrição. Se for de controle especial, busca um número SNCR
        disponível no banco de dados e o associa à receita.
        """
        prescription_type = serializer.validated_data.get('prescription_type')
        
        if prescription_type and prescription_type != Prescription.PrescriptionType.COMUM:
            # Encontra um número SNCR disponível para o médico logado
            with transaction.atomic():
                sncr_num_obj = SncrNumber.objects.select_for_update().filter(
                    assigned_to=self.request.user,
                    status=SncrNumber.Status.DISPONIVEL,
                    prescription_type=prescription_type
                ).first()

                if not sncr_num_obj:
                    error_message = f"Não há números de receita do tipo '{Prescription(prescription_type=prescription_type).get_prescription_type_display()}' disponíveis."
                    raise serializers.ValidationError({
                        'non_field_errors': [error_message]
                    })

                # Salva a prescrição e associa o número
                prescription = serializer.save()
                prescription.sncr_number = sncr_num_obj.number
                prescription.save()
                
                # Marca o número como utilizado e o associa à prescrição
                sncr_num_obj.status = SncrNumber.Status.UTILIZADO
                sncr_num_obj.prescription = prescription
                sncr_num_obj.save()
        else:
            # Salva a prescrição comum sem número SNCR
            serializer.save()

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


    def _draw_prescription_header(self, p, prescription_type, width, height):
        """
        Desenha o cabeçalho do PDF de acordo com o tipo de receita.
        """
        header_height = 50
        margin = 50
        
        type_colors = {
            Prescription.PrescriptionType.A1_AMARELA: colors.HexColor("#fdfd96"), # Amarelo pastel
            Prescription.PrescriptionType.B1_AZUL: colors.HexColor("#add8e6"),      # Azul claro
            Prescription.PrescriptionType.B2_AZUL: colors.HexColor("#add8e6"),      # Azul claro
        }

        bg_color = type_colors.get(prescription_type)

        if bg_color:
            p.setFillColor(bg_color)
            p.rect(margin, height - margin - header_height, width - (2 * margin), header_height, fill=1, stroke=0)
            p.setFillColor(colors.black)
            title = "Notificação de Receita"
        else:
            title = "Receituário Médico"
        
        p.setFont("Helvetica-Bold", 16)
        title_width = p.stringWidth(title, "Helvetica-Bold", 16)
        p.drawString((width - title_width) / 2, height - margin - 35, title)

        return height - margin - header_height - 20 # Retorna a nova posição Y inicial


    @action(detail=True, methods=['get'])
    def download_unsigned_pdf(self, request, pk=None):
        prescription = self.get_object()
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Desenha o cabeçalho e obtém a nova posição Y
        current_y = self._draw_prescription_header(p, prescription.prescription_type, width, height)

        # Informações do Paciente e Médico
        p.setFont("Helvetica", 12)
        p.drawString(100, current_y, f"Paciente: {prescription.medical_record.patient.user.get_full_name()}")
        current_y -= 20
        p.drawString(100, current_y, f"Médico: {prescription.signed_by.get_full_name() if prescription.signed_by else request.user.get_full_name()} (CRM: {prescription.signed_by.crm if prescription.signed_by else request.user.crm})")
        current_y -= 20
        p.drawString(100, current_y, f"Data de Emissão: {timezone.now().strftime('%d/%m/%Y')}")
        current_y -= 30

        # Informações da Receita Controlada (se aplicável)
        if prescription.prescription_type != Prescription.PrescriptionType.COMUM:
            p.setFont("Helvetica-Bold", 12)
            p.drawString(100, current_y, f"Tipo: {prescription.get_prescription_type_display()}")
            current_y -= 20
            if prescription.sncr_number:
                p.drawString(100, current_y, f"Numeração SNCR: {prescription.sncr_number}")
                current_y -= 20
            
            p.setFont("Helvetica", 12)
            p.drawString(100, current_y, "Adquirente:")
            current_y -= 20
            p.drawString(120, current_y, f"Nome: {prescription.acquirer_name or '____________________________'}")
            current_y -= 20
            p.drawString(120, current_y, f"Documento: {prescription.acquirer_document or '____________________________'}")
            current_y -= 30

        # Descrição da Prescrição
        p.setFont("Helvetica-Bold", 12)
        p.drawString(100, current_y, "Prescrição:")
        current_y -= 20
        p.setFont("Helvetica", 12)

        # Lógica para quebrar a linha
        from reportlab.lib.utils import simpleSplit
        lines = simpleSplit(prescription.description, 'Helvetica', 12, width - 200)
        for line in lines:
            p.drawString(120, current_y, line)
            current_y -= 15

        # Nota sobre vias para receitas de controle especial brancas
        if prescription.prescription_type in [
            Prescription.PrescriptionType.C1_BRANCA,
            Prescription.PrescriptionType.C2_BRANCA,
            Prescription.PrescriptionType.ANTIMICROBIANO
        ]:
            p.setFont("Helvetica-Oblique", 9)
            p.drawString(100, 140, "1ª Via - Retenção pela Farmácia / 2ª Via - Orientação ao Paciente")

        # Assinatura (espaço para assinatura digital/física)
        p.setFont("Helvetica", 12)
        if prescription.is_signed and prescription.signed_at:
             p.drawString(100, 100, f"Documento assinado digitalmente por {prescription.signed_by.get_full_name()} em {prescription.signed_at.strftime('%d/%m/%Y %H:%M')}")
        else:
             p.drawString(100, 100, "_________________________")
             p.drawString(100, 85, "Assinatura do Médico")

        p.showPage()
        p.save()

        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f'receita_{prescription.id}.pdf')
    
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


class SncrNumberViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que os médicos gerenciem seus números de receita controlada (SNCR).
    """
    serializer_class = SncrNumberSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        """
        Retorna apenas os números SNCR pertencentes ao médico logado.
        """
        return SncrNumber.objects.filter(assigned_to=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """
        Cria um ou mais números SNCR a partir de uma string com números
        separados por quebra de linha.
        """
        numbers_str = request.data.get('number', '')
        prescription_type = request.data.get('prescription_type') # Novo campo
        if not numbers_str:
            return Response({'detail': 'Nenhum número fornecido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not prescription_type:
            return Response({'detail': 'O tipo de receita é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        number_list = [num.strip() for num in numbers_str.splitlines() if num.strip()]
        created_numbers = []
        errors = []

        for number in number_list:
            serializer = self.get_serializer(data={'number': number, 'prescription_type': prescription_type})
            if serializer.is_valid():
                serializer.save(assigned_to=request.user)
                created_numbers.append(serializer.data)
            else:
                errors.append({number: serializer.errors})
        
        if errors:
            return Response({
                'detail': 'Alguns números não puderam ser criados.',
                'created': created_numbers,
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response(created_numbers, status=status.HTTP_201_CREATED)
