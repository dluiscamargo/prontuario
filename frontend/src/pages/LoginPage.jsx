import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import taonmedIcon from '../assets/icone_taonmed.png';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await apiClient.post('/api/api-token-auth/', { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_role', response.data.role);
      localStorage.setItem('user_full_name', response.data.full_name);

      enqueueSnackbar('Login bem-sucedido!', { variant: 'success' });

      if (response.data.role === 'MEDICO') {
        navigate('/');
      } else if (response.data.role === 'PACIENTE') {
        navigate('/my-documents');
      }
    } catch (error) {
      console.error('Login failed', error);
      enqueueSnackbar('Falha no login. Verifique suas credenciais.', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth="xs">
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img src={taonmedIcon} alt="Login Icon" style={{ height: '80px' }} />
      </div>
      <form onSubmit={handleLogin}>
        <TextField
          label="Usuário"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Senha"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Entrar
        </Button>
      </form>
      <Typography align="center" style={{ marginTop: '1rem' }}>
        Não tem uma conta? <Link to="/signup">Cadastre-se como médico</Link>
      </Typography>
    </Container>
  );
}

export default LoginPage;
