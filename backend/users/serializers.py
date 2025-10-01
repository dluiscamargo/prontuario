from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'crm', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Abordagem explícita e robusta para garantir a criação correta do usuário
        password = validated_data.pop('password')
        
        user = User(**validated_data)
        
        # Garante a criptografia da senha
        user.set_password(password)
        
        try:
            # Chama o método .save() do modelo, que contém a validação do CRM
            user.save()
        except ValueError as e:
            # Converte o erro de validação do modelo para um erro do serializer
            raise serializers.ValidationError({'detail': str(e)})
            
        return user
