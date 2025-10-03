import React, { useState, useEffect } from 'react';
import {
  Container, Typography, TextField, Button, Box, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import apiClient from '../services/api';
import CustomAppBar from '../components/AppBar';
import SuccessSnackbar from '../components/SuccessSnackbar';

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  fontWeight: 'bold',
}));

const PRESCRIPTION_TYPE_OPTIONS = {
  "A1_AMARELA": "Notificação de Receita A1 (Amarela)",
  "B1_AZUL": "Notificação de Receita B1 (Azul)",
  "B2_AZUL": "Notificação de Receita B2 (Azul)",
  "C1_BRANCA": "Receita de Controle Especial (Branca - Duas Vias)",
  "C2_BRANCA": "Receita de Controle Especial (Branca - Retinoides)",
  "ANTIMICROBIANO": "Receita de Antimicrobiano (Branca - Duas Vias)"
};

const getStatusChipColor = (status) => {
  switch (status) {
    case 'DISPONIVEL':
      return 'success';
    case 'UTILIZADO':
      return 'warning';
    case 'CANCELADO':
      return 'default';
    default:
      return 'default';
  }
};

const SncrManagementPage = () => {
  const [numbers, setNumbers] = useState([]);
  const [filteredNumbers, setFilteredNumbers] = useState([]);
  const [newNumbers, setNewNumbers] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/sncr-numbers/');
      setNumbers(response.data);
    } catch (err) {
      setError('Falha ao buscar os números.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  useEffect(() => {
    if (prescriptionType === 'ALL') {
      setFilteredNumbers(numbers);
    } else {
      setFilteredNumbers(numbers.filter(num => num.prescription_type === prescriptionType));
    }
  }, [prescriptionType, numbers]);

  const handleAddNumbers = async () => {
    try {
      const response = await apiClient.post('/api/sncr-numbers/', { 
        number: newNumbers,
        prescription_type: prescriptionType 
      });
      setNewNumbers('');
      setSnackbarOpen(true);
      fetchNumbers(); // Re-fetch the list
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Erro ao adicionar os números.';
      setError(errorMessage);
      console.error(err);
    }
  };

  return (
    <div>
      <CustomAppBar />
      <Container>
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Gerenciamento de Números de Receita (SNCR)
          </Typography>
          <Typography paragraph>
            Adicione os números de receita controlada fornecidos pela Vigilância Sanitária.
            Cole uma lista de números, um por linha.
          </Typography>
        </Box>

        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Adicionar Novos Números</Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel id="prescription-type-label">Tipo de Receita (Filtra a tabela abaixo)</InputLabel>
            <Select
              labelId="prescription-type-label"
              value={prescriptionType}
              label="Tipo de Receita (Filtra a tabela abaixo)"
              onChange={(e) => setPrescriptionType(e.target.value)}
            >
              <MenuItem key="ALL" value="ALL">Todos os Tipos</MenuItem>
              {Object.entries(PRESCRIPTION_TYPE_OPTIONS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Números de Receita (um por linha)"
            multiline
            rows={6}
            fullWidth
            value={newNumbers}
            onChange={(e) => setNewNumbers(e.target.value)}
            variant="outlined"
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddNumbers}
            disabled={!newNumbers.trim() || prescriptionType === 'ALL'}
          >
            Adicionar
          </Button>
          {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        </Paper>

        <Typography variant="h5" gutterBottom>Meus Números</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Número</StyledHeaderCell>
                <StyledHeaderCell>Tipo de Receita</StyledHeaderCell>
                <StyledHeaderCell>Status</StyledHeaderCell>
                <StyledHeaderCell>Data de Cadastro</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}>Carregando...</TableCell></TableRow>
              ) : (
                filteredNumbers.map((num) => (
                  <TableRow key={num.id}>
                    <TableCell>{num.number}</TableCell>
                    <TableCell>{PRESCRIPTION_TYPE_OPTIONS[num.prescription_type] || num.prescription_type}</TableCell>
                    <TableCell>
                      <Chip label={num.status} color={getStatusChipColor(num.status)} />
                    </TableCell>
                    <TableCell>{new Date(num.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
      <SuccessSnackbar
        open={snackbarOpen}
        handleClose={() => setSnackbarOpen(false)}
        message="Números adicionados com sucesso!"
      />
    </div>
  );
};

export default SncrManagementPage;
