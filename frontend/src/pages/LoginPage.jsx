import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/api/api-token-auth/', { username, password });
      localStorage.setItem('token', response.data.token);
      enqueueSnackbar('Login bem-sucedido!', { variant: 'success' });
      navigate('/');
    } catch (err) {
      enqueueSnackbar('Falha no login. Verifique suas credenciais.', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h4" component="h1" gutterBottom>
        Login
      </Typography>
      <form onSubmit={handleSubmit}>
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
