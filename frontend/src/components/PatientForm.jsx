import React, { useState } from 'react';
import apiClient from '../services/api';
import { TextField, Button, Grid } from '@mui/material';

const PatientForm = ({ patient, onFormSubmit }) => {
    const [formData, setFormData] = useState({
        user: {
            first_name: patient?.user?.first_name || '',
            last_name: patient?.user?.last_name || '',
            email: patient?.user?.email || '',
            username: patient?.user?.username || '',
            password: '',
        },
        cpf: patient?.cpf || '',
        phone: patient?.phone || '',
        address: {
            cep: patient?.address?.cep || '',
            street: patient?.address?.street || '',
            number: patient?.address?.number || '',
            complement: patient?.address?.complement || '',
            neighborhood: patient?.address?.neighborhood || '',
            city: patient?.address?.city || '',
            state: patient?.address?.state || '',
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        const [section, field] = name.split('.');
        
        if (field) {
            setFormData(prev => ({
                ...prev,
                [section]: { ...prev[section], [field]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCepBlur = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await apiClient.get(`/api/viacep/${cep}/`);
                const { logradouro, bairro, localidade, uf } = response.data;
                setFormData(prev => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        street: logradouro,
                        neighborhood: bairro,
                        city: localidade,
                        state: uf,
                    }
                }));
            } catch (error) {
                console.error("Failed to fetch CEP", error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        onFormSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField name="user.first_name" label="Nome" value={formData.user.first_name} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField name="user.last_name" label="Sobrenome" value={formData.user.last_name} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <TextField name="user.email" label="Email" type="email" value={formData.user.email} onChange={handleChange} fullWidth />
                </Grid>
                 <Grid item xs={12}>
                    <TextField name="user.username" label="Nome de usuário" value={formData.user.username} onChange={handleChange} fullWidth />
                </Grid>
                {!patient && (
                    <Grid item xs={12}>
                        <TextField name="user.password" label="Senha" type="password" value={formData.user.password} onChange={handleChange} fullWidth required />
                    </Grid>
                )}
                <Grid item xs={12} sm={6}>
                    <TextField name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField name="phone" label="Telefone" value={formData.phone} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField name="address.cep" label="CEP" value={formData.address.cep} onChange={handleChange} onBlur={handleCepBlur} fullWidth />
                </Grid>
                <Grid item xs={12} sm={8}>
                    <TextField name="address.street" label="Rua" value={formData.address.street} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField name="address.number" label="Número" value={formData.address.number} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={8}>
                    <TextField name="address.complement" label="Complemento" value={formData.address.complement} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField name="address.neighborhood" label="Bairro" value={formData.address.neighborhood} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField name="address.city" label="Cidade" value={formData.address.city} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField name="address.state" label="Estado" value={formData.address.state} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <Button type="submit" variant="contained" color="primary">Salvar</Button>
                </Grid>
            </Grid>
        </form>
    );
};

export default PatientForm;
