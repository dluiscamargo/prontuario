import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';

function DoctorSignUpPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
        crm: '',
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/api/users/', {
                ...formData,
                role: 'MEDICO'
            });
            enqueueSnackbar('Cadastro realizado com sucesso! Faça o login.', { variant: 'success' });
            navigate('/login');
        } catch (err) {
            enqueueSnackbar('Falha no cadastro. Verifique os dados e tente novamente.', { variant: 'error' });
        }
    };

    return (
        <Container maxWidth="xs">
            <Typography variant="h4" component="h1" gutterBottom>
                Cadastro de Médico
            </Typography>
            <form onSubmit={handleSubmit}>
                <TextField name="first_name" label="Nome" onChange={handleChange} fullWidth margin="normal" />
                <TextField name="last_name" label="Sobrenome" onChange={handleChange} fullWidth margin="normal" />
                <TextField name="username" label="Nome de Usuário" onChange={handleChange} fullWidth margin="normal" />
                <TextField name="email" label="Email" type="email" onChange={handleChange} fullWidth margin="normal" />
                <TextField name="crm" label="CRM" onChange={handleChange} fullWidth margin="normal" />
                <TextField name="password" label="Senha" type="password" onChange={handleChange} fullWidth margin="normal" />
                {error && <Typography color="error">{error}</Typography>}
                <Button type="submit" variant="contained" color="primary" fullWidth>
                    Cadastrar
                </Button>
            </form>
            <Typography align="center" style={{ marginTop: '1rem' }}>
                Já tem uma conta? <Link to="/login">Faça login</Link>
            </Typography>
        </Container>
    );
}

export default DoctorSignUpPage;
