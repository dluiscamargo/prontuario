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
  Button,
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CustomAppBar from '../components/AppBar';

const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== 'selected',
})(({ selected, theme }) => ({
  cursor: 'pointer',
  ...(selected && {
    backgroundColor: 'rgba(102, 205, 170, 0.2)', // Light aquamarine with more opacity
    '& > .MuiTableCell-root': {
      fontWeight: 500,
    },
    '&:hover': {
      backgroundColor: 'rgba(102, 205, 170, 0.25)', // Slightly darker on hover when selected
    }
  }),
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  fontWeight: 'bold',
}));

function PatientListPage() {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiClient.get('/api/patients/');
        const patientData = Array.isArray(response.data) ? response.data : response.data.results;
        setPatients(patientData || []);
      } catch (error) {
        console.error("Failed to fetch patients", error);
        setPatients([]);
      }
    };
    fetchPatients();
  }, []);

  const handleRowClick = (patientId) => {
    setSelectedPatientId(prevSelectedId => (prevSelectedId === patientId ? null : patientId));
  };

  const handleMenuOpen = (event, patientId) => {
    event.stopPropagation(); // Impede que o clique na linha seja acionado
    setMenuAnchorEl(event.currentTarget);
    setSelectedPatientId(patientId);
  };

  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };

  const filteredPatients = useMemo(() => {
    if (!Array.isArray(patients)) return [];
    
    return patients.filter(patient =>
      (patient.user?.first_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (patient.user?.last_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (patient.cpf || '').includes(filter)
    );
  }, [patients, filter]);

  const handleEdit = (event) => {
    event.stopPropagation();
    navigate(`/edit-patient/${selectedPatientId}`);
    handleMenuClose();
  };

  const handleDelete = async (event) => {
    event.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este paciente?')) {
      try {
        await apiClient.delete(`/api/patients/${selectedPatientId}/`);
        setPatients(patients.filter(p => p.id !== selectedPatientId));
      } catch (error) {
        console.error('Failed to delete patient', error);
      }
    }
    handleMenuClose();
  };

  return (
    <div>
      <CustomAppBar />
      <Container>
        <Box sx={{ my: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Lista de Pacientes
          </Typography>
          <Button component={Link} to="/add-patient" variant="contained" color="primary">
            Adicionar Paciente
          </Button>
        </Box>
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
                <StyledHeaderCell>Nome</StyledHeaderCell>
                <StyledHeaderCell>CPF</StyledHeaderCell>
                <StyledHeaderCell>Telefone</StyledHeaderCell>
                <StyledHeaderCell align="right">Ações</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPatients.map((patient) => (
                <StyledTableRow 
                  key={patient.id}
                  selected={selectedPatientId === patient.id}
                  onClick={() => handleRowClick(patient.id)}
                >
                  <TableCell component="th" scope="row">
                    {`${patient.user.first_name} ${patient.user.last_name}`.toUpperCase()}
                  </TableCell>
                  <TableCell>{patient.cpf}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Tooltip title="Prontuário">
                        <IconButton 
                          component={Link} 
                          to={`/patient/${patient.id}`} 
                          sx={{ mr: 1 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MedicalInformationIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                      <IconButton 
                        aria-label="more"
                        onClick={(e) => handleMenuOpen(e, patient.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
                        anchorEl={menuAnchorEl}
                        open={Boolean(menuAnchorEl) && selectedPatientId === patient.id}
                        onClose={handleMenuClose}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MenuItem onClick={handleEdit}>
                          <Tooltip title="Editar" placement="right">
                            <ListItemIcon>
                              <EditIcon fontSize="small" />
                            </ListItemIcon>
                          </Tooltip>
                        </MenuItem>
                        <MenuItem onClick={handleDelete}>
                          <Tooltip title="Excluir" placement="right">
                            <ListItemIcon>
                              <DeleteIcon fontSize="small" />
                            </ListItemIcon>
                          </Tooltip>
                        </MenuItem>
                      </Menu>
                    </Box>
                  </TableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </div>
  );
}

export default PatientListPage;
