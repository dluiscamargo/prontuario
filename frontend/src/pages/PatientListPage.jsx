import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button
} from '@mui/material';
import Header from '../components/Header';

function PatientListPage() {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiClient.get('/api/patients/');
        // Garante que a resposta seja sempre um array, tratando respostas paginadas ou não
        const patientData = Array.isArray(response.data) ? response.data : response.data.results;
        setPatients(patientData || []);
      } catch (error) {
        console.error("Failed to fetch patients", error);
        setPatients([]); // Em caso de erro, define como array vazio
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!Array.isArray(patients)) return []; // Guarda de segurança
    
    return patients.filter(patient =>
      (patient.user?.first_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (patient.user?.last_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (patient.cpf || '').includes(filter)
    );
  }, [patients, filter]);


  const handleLogout = () => {
      localStorage.removeItem('token');
      navigate('/login');
  }

  return (
    <Container>
      <Header />
      <Button onClick={handleLogout} variant="contained" color="secondary" style={{ marginBottom: '1rem' }}>
          Sair
      </Button>
      <Typography variant="h4" component="h1" gutterBottom>
        Lista de Pacientes
      </Typography>
      <Button component={Link} to="/add-patient" variant="contained" color="primary" style={{ marginBottom: '1rem' }}>
        Adicionar Paciente
      </Button>
      <TextField
        label="Filtrar por nome ou CPF"
        variant="outlined"
        fullWidth
        margin="normal"
        onChange={(e) => setFilter(e.target.value)}
      />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>CPF</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPatients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>{`${patient.user.first_name} ${patient.user.last_name}`}</TableCell>
                <TableCell>{patient.cpf}</TableCell>
                <TableCell>{patient.phone}</TableCell>
                <TableCell>
                  <Button component={Link} to={`/patient/${patient.id}`} variant="contained">
                    Ver Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default PatientListPage;
