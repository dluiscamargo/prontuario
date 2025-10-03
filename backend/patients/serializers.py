from rest_framework import serializers
from .models import Patient, Address, MedicalRecord, Prescription, Procedure, SncrNumber
from users.serializers import UserSerializer, DoctorInfoSerializer
from users.models import User

class SncrNumberSerializer(serializers.ModelSerializer):
    """
    Serializer para gerenciar os números SNCR.
    """
    class Meta:
        model = SncrNumber
        fields = ['id', 'number', 'status', 'prescription_type', 'assigned_to', 'prescription', 'created_at', 'updated_at']
        read_only_fields = ('status', 'assigned_to', 'prescription')

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        # Removido o campo 'patient' para evitar validação incorreta em updates aninhados
        exclude = ('patient',)

class PrescriptionSerializer(serializers.ModelSerializer):
    signed_by = DoctorInfoSerializer(read_only=True)

    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ('is_signed', 'signed_at', 'sncr_number')

    def validate(self, data):
        """
        Valida que os dados do adquirente são fornecidos para receitas de controle especial.
        """
        prescription_type = data.get('prescription_type')
        # Verifica se o tipo de prescrição não é o comum
        if prescription_type and prescription_type != Prescription.PrescriptionType.COMUM:
            acquirer_name = data.get('acquirer_name')
            acquirer_document = data.get('acquirer_document')
            if not acquirer_name or not acquirer_document:
                raise serializers.ValidationError(
                    "Para receitas de controle especial, o nome e o documento do adquirente são obrigatórios."
                )
        return data

class ProcedureSerializer(serializers.ModelSerializer):
    signed_by = DoctorInfoSerializer(read_only=True)
    
    class Meta:
        model = Procedure
        fields = '__all__'
        read_only_fields = ('is_signed', 'signed_at')

class MedicalRecordSerializer(serializers.ModelSerializer):
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    procedures = ProcedureSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalRecord
        fields = ['id', 'patient', 'created_at', 'updated_at', 'prescriptions', 'procedures']

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    address = AddressSerializer()
    medical_records = MedicalRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = ['id', 'user', 'doctor', 'cpf', 'phone', 'address', 'medical_records']
        read_only_fields = ('doctor',)

    def __init__(self, *args, **kwargs):
        super(PatientSerializer, self).__init__(*args, **kwargs)
        # Para operações de atualização, torna o username do usuário aninhado somente leitura
        if self.instance:
            self.fields['user'].fields['username'].read_only = True

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        address_data = validated_data.pop('address')
        
        # Corrigido: chama o método create do serializer de forma correta
        user = UserSerializer().create(user_data)
        
        # Cria o paciente associado ao usuário
        patient = Patient.objects.create(user=user, **validated_data)
        
        # Cria o endereço associado ao paciente
        Address.objects.create(patient=patient, **address_data)
        
        return patient

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        address_data = validated_data.pop('address', None)

        # Atualiza o usuário, se houver dados
        if user_data:
            user = instance.user
            # Impede a alteração do nome de usuário para evitar conflitos de unicidade
            user_data.pop('username', None)
            user_serializer = UserSerializer(user, data=user_data, partial=True)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        # Atualiza o endereço, se houver dados
        if address_data:
            if hasattr(instance, 'address') and instance.address:
                address_serializer = AddressSerializer(instance.address, data=address_data, partial=True)
                address_serializer.is_valid(raise_exception=True)
                address_serializer.save()
            else:
                # Cria um novo endereço se não existir
                Address.objects.create(patient=instance, **address_data)
        
        # Atualiza os campos do paciente usando o super() para manter o comportamento padrão
        return super().update(instance, validated_data)
