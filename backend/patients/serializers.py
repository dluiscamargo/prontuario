from rest_framework import serializers
from .models import Patient, Address, MedicalRecord, Prescription, Procedure
from users.serializers import UserSerializer
from users.models import User

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        # Removido o campo 'patient' para evitar validação incorreta em updates aninhados
        exclude = ('patient',)

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ('is_signed', 'signed_at', 'signed_by')

class ProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = '__all__'
        read_only_fields = ('is_signed', 'signed_at', 'signed_by')

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

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        address_data = validated_data.pop('address')
        
        # Delega a criação do usuário para o UserSerializer, que já lida com a criptografia
        user = UserSerializer().create(validated_data=user_data)
        
        # Cria o paciente associado ao usuário
        patient = Patient.objects.create(user=user, **validated_data)
        
        # Cria o endereço associado ao paciente
        Address.objects.create(patient=patient, **address_data)
        
        return patient

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        address_data = validated_data.pop('address', {})

        # Atualiza o usuário
        user_serializer = UserSerializer(instance.user, data=user_data, partial=True)
        user_serializer.is_valid(raise_exception=True)
        user_serializer.save()

        # Atualiza o endereço
        if instance.address:
            address_serializer = AddressSerializer(instance.address, data=address_data, partial=True)
            address_serializer.is_valid(raise_exception=True)
            address_serializer.save()
        
        # Atualiza o paciente
        instance.cpf = validated_data.get('cpf', instance.cpf)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.save()
        
        return instance
