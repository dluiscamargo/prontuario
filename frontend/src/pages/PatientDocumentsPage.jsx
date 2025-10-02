import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import {
  Container,
  Typography,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from '../components/AppBar';

const StyledTableRow = styled(TableRow, {
  shouldForwardProp: prop => prop !== 'selected',
})(({ selected, theme }) => ({
  cursor: 'pointer',
  ...(selected && {
    backgroundColor: 'rgba(102, 205, 170, 0.2)', // Light aquamarine with more opacity
    '& > .MuiTableCell-root': {
      fontWeight: 500,
    },
    '&:hover': {
      backgroundColor: 'rgba(102, 205, 170, 0.25)', // Slightly darker on hover when selected
    },
  }),
}));

function PatientDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState(null);

  const handleRowClick = docId => {
    setSelectedDocId(prevSelectedId =>
      prevSelectedId === docId ? null : docId,
    );
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/patient-documents/');
        setPatient(response.data.patient);
        setDocuments(response.data.documents);
      } catch (error) {
        console.error('Failed to fetch documents', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  if (!patient) {
    return <Typography>Nenhum paciente encontrado.</Typography>;
  }

  return (
    <Container>
      <Header />
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Meus Documentos
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h6">{`${patient.user.first_name} ${patient.user.last_name}`}</Typography>
            <Typography>CPF: {patient.cpf}</Typography>
            <Typography>Telefone: {patient.phone}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="h5" component="h2" gutterBottom>
        Documentos Assinados
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Data da Assinatura</TableCell>
              <TableCell>Médico</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map(doc => (
              <StyledTableRow
                key={`${doc.type}-${doc.id}`}
                selected={selectedDocId === `${doc.type}-${doc.id}`}
                onClick={() => handleRowClick(`${doc.type}-${doc.id}`)}
              >
                <TableCell>{doc.type}</TableCell>
                <TableCell>{doc.description}</TableCell>
                <TableCell>
                  {new Date(doc.signed_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{`${doc.doctor_name} (CRM: ${doc.doctor_crm})`}</TableCell>
                <TableCell>
                  {doc.signed_document && (
                    <Button
                      variant="contained"
                      href={doc.signed_document}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Baixar
                    </Button>
                  )}
                </TableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default PatientDocumentsPage;
