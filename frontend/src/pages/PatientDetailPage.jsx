import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { 
    Container, 
    Typography, 
    Card, 
    CardContent, 
    CircularProgress, 
    Button, 
    List, 
    ListItem, 
    ListItemText,
    Divider,
    Box
} from '@mui/material';
import Header from '../components/Header';
import MapView from '../components/MapView';
import RecordFormModal from '../components/RecordFormModal';
import { useSnackbar } from 'notistack';
import SigningInstructionsModal from '../components/SigningInstructionsModal';

const prescriptionTypeLabels = {
    COMUM: "Comum",
    A1_AMARELA: "Notificação de Receita A1 (Amarela)",
    B1_AZUL: "Notificação de Receita B1 (Azul)",
    B2_AZUL: "Notificação de Receita B2 (Azul)",
    C1_BRANCA: "Receita de Controle Especial (Branca - Duas Vias)",
    C2_BRANCA: "Receita de Controle Especial (Branca - Retinoides)",
    ANTIMICROBIANO: "Receita de Antimicrobiano (Branca - Duas Vias)"
};

function PatientDetailPage() {
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', type: null, recordId: null });
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [isDoctor, setIsDoctor] = useState(true); // Simplified check
    const fileInputRef = useRef(null);
    const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);

    const fetchPatient = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/patients/${id}/`);
            setPatient(response.data);
        } catch (error) {
            console.error("Failed to fetch patient details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatient();
    }, [id]);

    const handleDownloadUnsigned = (type, itemId) => {
        const url = type === 'prescription' 
            ? `${apiClient.defaults.baseURL}/api/prescriptions/${itemId}/download_unsigned_pdf/` 
            : `${apiClient.defaults.baseURL}/api/procedures/${itemId}/download_unsigned_pdf/`;
        
        const token = localStorage.getItem('token');
        fetch(url, { headers: { 'Authorization': `Token ${token}` } })
            .then(res => res.blob())
            .then(blob => {
                const href = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.setAttribute('download', `${type}_${itemId}_unsigned.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Abre o modal de instruções após o download
                setInstructionsModalOpen(true);
            })
            .catch(err => {
                enqueueSnackbar('Falha no download do PDF.', { variant: 'error' });
                console.error(err);
            });
    };

    const handleUploadSigned = async (type, itemId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        const url = type === 'prescription' 
            ? `/api/prescriptions/${itemId}/upload_signed_document/` 
            : `/api/procedures/${itemId}/upload_signed_document/`;

        try {
            await apiClient.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            enqueueSnackbar('Documento assinado enviado com sucesso.', { variant: 'success' });
            fetchPatient(); // Refresh data
        } catch (error) {
            const errorMessage = error.response?.data?.detail || 'Falha ao enviar o documento.';
            enqueueSnackbar(errorMessage, { variant: 'error' });
            console.error('Failed to upload signed document', error);
        }
    };

    const handleDownloadSigned = (type, itemId) => {
        const url = type === 'prescription' 
            ? `${apiClient.defaults.baseURL}/api/prescriptions/${itemId}/download_signed_document/` 
            : `${apiClient.defaults.baseURL}/api/procedures/${itemId}/download_signed_document/`;
        
        const token = localStorage.getItem('token');
        fetch(url, { headers: { 'Authorization': `Token ${token}` } })
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                // Pega o nome do arquivo do header Content-Disposition se disponível
                const disposition = res.headers.get('content-disposition');
                let filename = `${type}_${itemId}_signed.pdf`;
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                return res.blob().then(blob => ({ blob, filename }));
            })
            .then(({ blob, filename }) => {
                const href = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(err => {
                enqueueSnackbar('Falha no download do PDF assinado.', { variant: 'error' });
                console.error(err);
            });
    };

    const createNewMedicalRecord = async () => {
        try {
            await apiClient.post('/api/medical-records/', { patient: id });
            enqueueSnackbar('Nova entrada no prontuário criada.', { variant: 'success' });
            fetchPatient();
        } catch (error) {
            enqueueSnackbar('Erro ao criar entrada no prontuário.', { variant: 'error' });
            console.error("Failed to create medical record", error);
        }
    };

    const handleOpenModal = (type, recordId) => {
        setModalConfig({
            title: `Adicionar ${type === 'prescription' ? 'Receita' : 'Procedimento'}`,
            type: type,
            recordId: recordId
        });
        setModalOpen(true);
    };

    const handleCloseModal = () => setModalOpen(false);

    const handleFormSubmit = async (formData) => {
        const url = modalConfig.type === 'prescription' ? '/api/prescriptions/' : '/api/procedures/';
        // O payload agora inclui a descrição e os dados extras da receita
        const payload = { ...formData, medical_record: modalConfig.recordId };
        try {
            await apiClient.post(url, payload);
            enqueueSnackbar(`${modalConfig.type === 'prescription' ? 'Receita' : 'Procedimento'} adicionado com sucesso.`, { variant: 'success' });
            fetchPatient();
        } catch (error) {
            // Lógica para extrair e mostrar a mensagem de erro da API
            const errorData = error.response?.data;
            let errorMessage = `Falha ao adicionar ${modalConfig.type}.`;
            if (errorData) {
                // Pega a primeira chave de erro (ex: 'non_field_errors')
                const errorKey = Object.keys(errorData)[0];
                const errorMessages = errorData[errorKey];
                if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                    errorMessage = errorMessages[0];
                } else {
                    errorMessage = JSON.stringify(errorData);
                }
            }
            enqueueSnackbar(errorMessage, { variant: 'error' });
            console.error(`Failed to add ${modalConfig.type}`, error);
        }
    };

    if (loading) return <CircularProgress />;
    if (!patient) return <Typography>Paciente não encontrado.</Typography>;

    const renderSigningControls = (type, item) => {
        const fileInputId = `${type}-${item.id}-file-input`;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => handleDownloadUnsigned(type, item.id)}>
                    Baixar para Assinar
                </Button>
                <Button size="small" variant="contained" component="label" htmlFor={fileInputId}>
                    Enviar Assinado
                    <input 
                        id={fileInputId}
                        type="file" 
                        hidden 
                        accept=".pdf"
                        onChange={(e) => {
                            if (e.target.files[0]) {
                                handleUploadSigned(type, item.id, e.target.files[0]);
                            }
                        }}
                    />
                </Button>
            </Box>
        );
    };

    return (
        <Container>
            <Header />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <Button component={Link} to={`/edit-patient/${id}`} variant="contained" color="primary">
                    Editar Paciente
                </Button>
                <Button onClick={() => navigate('/')} variant="outlined">
                    Voltar para a Lista
                </Button>
            </Box>
            
            <Typography variant="h4" component="h1" gutterBottom>Detalhes do Paciente</Typography>
            <Card>
                <CardContent>
                    <Typography variant="h6">{`${patient.user.first_name} ${patient.user.last_name}`}</Typography>
                    <Typography>CPF: {patient.cpf}</Typography>
                    <Typography>Telefone: {patient.phone}</Typography>
                    <Typography>Endereço: {`${patient.address.street}, ${patient.address.number} - ${patient.address.city}/${patient.address.state}`}</Typography>
                </CardContent>
            </Card>

            <Box marginTop={4}>
                <Typography variant="h5" component="h2" gutterBottom>Prontuário</Typography>
                <Button onClick={createNewMedicalRecord} variant="contained" style={{ marginBottom: '1rem' }}>
                    Criar Nova Entrada no Prontuário
                </Button>
                {patient.medical_records.map(record => (
                    <Card key={record.id} style={{ marginTop: '1rem' }}>
                        <CardContent>
                            <Typography variant="h6">Entrada de {new Date(record.created_at).toLocaleDateString()}</Typography>
                            <Divider style={{ margin: '1rem 0' }} />
                            
                            <Typography variant="subtitle1">Receitas</Typography>
                            <List>
                                {record.prescriptions.map(p => (
                                    <ListItem key={p.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <ListItemText 
                                            primary={
                                                <Typography component="span" sx={{ fontWeight: 'bold' }}>
                                                    {prescriptionTypeLabels[p.prescription_type] || 'Receita'}
                                                </Typography>
                                            }
                                            secondary={
                                                <>
                                                    <Typography component="span" variant="body2" color="text.primary">
                                                        {p.description}
                                                    </Typography>
                                                    <br />
                                                    {p.sncr_number && (
                                                        <Typography component="span" variant="caption">
                                                            Nº SNCR: {p.sncr_number} |{' '}
                                                        </Typography>
                                                    )}
                                                    <Typography component="span" variant="caption">
                                                        {p.is_signed 
                                                            ? `Assinado por ${p.signed_by?.full_name || 'N/A'} em ${new Date(p.signed_at).toLocaleString()}` 
                                                            : 'Aguardando assinatura'}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                        {p.is_signed ? (
                                            <Button size="small" onClick={() => handleDownloadSigned('prescription', p.id)}>Baixar PDF Assinado</Button>
                                        ) : isDoctor && (
                                            renderSigningControls('prescription', p)
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                            <Button size="small" onClick={() => handleOpenModal('prescription', record.id)}>Adicionar Receita</Button>

                            <Divider style={{ margin: '1rem 0' }} />

                            <Typography variant="subtitle1">Procedimentos</Typography>
                            <List>
                                {record.procedures.map(p => (
                                    <ListItem key={p.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <ListItemText 
                                            primary={p.description} 
                                            secondary={
                                                p.is_signed 
                                                ? `Assinado por ${p.signed_by?.full_name || 'Médico não identificado'} (CRM: ${p.signed_by?.crm || 'N/A'}) em ${new Date(p.signed_at).toLocaleString()}` 
                                                : 'Aguardando assinatura'
                                            }
                                        />
                                        {p.is_signed ? (
                                            <Button size="small" onClick={() => handleDownloadSigned('procedure', p.id)}>Baixar PDF Assinado</Button>
                                        ) : isDoctor && (
                                            renderSigningControls('procedure', p)
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                            <Button size="small" onClick={() => handleOpenModal('procedure', record.id)}>Adicionar Procedimento</Button>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {patient.address.latitude && patient.address.longitude && (
                <Box marginTop={2}>
                    <MapView lat={patient.address.latitude} lon={patient.address.longitude} />
                </Box>
            )}

            <RecordFormModal 
                open={modalOpen}
                handleClose={handleCloseModal}
                handleSubmit={handleFormSubmit}
                title={modalConfig.title}
                type={modalConfig.type}
            />
            <SigningInstructionsModal 
                open={instructionsModalOpen}
                handleClose={() => setInstructionsModalOpen(false)}
            />
        </Container>
    );
}

export default PatientDetailPage;
