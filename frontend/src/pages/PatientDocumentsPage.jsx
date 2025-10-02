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
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

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
  const [patientPhone, setPatientPhone] = useState('');
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
        setPatientPhone(response.data.patient.phone);
        setDocuments(response.data.documents);
      } catch (error) {
        console.error('Failed to fetch documents', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleShareOnWhatsApp = (docUrl, patientPhone) => {
    const formattedPhone = `55${patientPhone.replace(/\D/g, '')}`;
    const message = encodeURIComponent(
      `Olá! Segue o link para o seu documento: ${docUrl}`,
    );
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        href={doc.signed_document}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Baixar
                      </Button>
                      <WhatsAppIcon
                        color="success"
                        sx={{ cursor: 'pointer' }}
                        onClick={() =>
                          handleShareOnWhatsApp(
                            doc.signed_document,
                            patientPhone,
                          )
                        }
                      />
                    </Box>
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
