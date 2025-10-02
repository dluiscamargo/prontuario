import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PatientForm from '../components/PatientForm';
import apiClient from '../services/api';
import { Container, Typography, CircularProgress } from '@mui/material';
import Header from '../components/Header';
import { useSnackbar } from 'notistack';

function EditPatientPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchPatient = async () => {
            try {
                const response = await apiClient.get(`/api/patients/${id}/`);
                setPatient(response.data);
            } catch (error) {
                console.error("Failed to fetch patient", error);
            }
        };
        fetchPatient();
    }, [id]);

    const handleFormSubmit = async (formData) => {
        try {
            await apiClient.put(`/api/patients/${id}/`, formData);
            enqueueSnackbar('Paciente atualizado com sucesso!', { variant: 'success' });
            navigate(`/patient/${id}`);
        } catch (error) {
            console.error("Failed to update patient", error);
            let errorMessage = 'Erro ao atualizar paciente.';
            if (error.response && error.response.data) {
                // Exibe o erro bruto do servidor para depuração.
                errorMessage = JSON.stringify(error.response.data);
            }
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    if (!patient) return <CircularProgress />;

    return (
        <Container>
            <Header />
            <Typography variant="h4" component="h1" gutterBottom>
                Editar Paciente
            </Typography>
            <PatientForm patient={patient} onFormSubmit={handleFormSubmit} />
        </Container>
    );
}

export default EditPatientPage;
