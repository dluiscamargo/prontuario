import React from 'react';
import PatientForm from '../components/PatientForm';
import apiClient from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Container, Typography } from '@mui/material';
import Header from '../components/Header';
import { useSnackbar } from 'notistack';

function AddPatientPage() {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const handleFormSubmit = async (formData) => {
        try {
            await apiClient.post('/api/patients/', formData);
            enqueueSnackbar('Paciente adicionado com sucesso!', { variant: 'success' });
            navigate('/');
        } catch (error) {
            if (error.response && error.response.data) {
                const errors = error.response.data;
                // Formata os erros do DRF para exibição
                const errorMessages = Object.entries(errors).map(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        return Object.entries(value).map(([nestedKey, nestedValue]) => `${key}.${nestedKey}: ${nestedValue.join(', ')}`).join('; ');
                    }
                    return `${key}: ${Array.isArray(value) ? value.join(', ') : value}`;
                }).join('; ');
                enqueueSnackbar(`Erro ao salvar: ${errorMessages}`, { variant: 'error', persist: true });
            } else {
                enqueueSnackbar('Erro ao adicionar paciente. Tente novamente.', { variant: 'error' });
            }
            console.error("Failed to add patient", error);
        }
    };

    return (
        <Container>
            <Header />
            <Typography variant="h4" component="h1" gutterBottom>
                Adicionar Novo Paciente
            </Typography>
            <PatientForm onFormSubmit={handleFormSubmit} />
        </Container>
    );
}

export default AddPatientPage;
