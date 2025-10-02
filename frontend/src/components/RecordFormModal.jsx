import React, { useState, useEffect } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, FormControl, InputLabel, Select } from '@mui/material';

const prescriptionTypes = {
    COMUM: "Comum",
    A1_AMARELA: "Notificação de Receita A1 (Amarela)",
    B1_AZUL: "Notificação de Receita B1 (Azul)",
    B2_AZUL: "Notificação de Receita B2 (Azul)",
    C1_BRANCA: "Receita de Controle Especial (Branca - Duas Vias)",
    C2_BRANCA: "Receita de Controle Especial (Branca - Retinoides)",
    ANTIMICROBIANO: "Receita de Antimicrobiano (Branca - Duas Vias)"
};

const RecordFormModal = ({ open, handleClose, handleSubmit, title, type }) => {
    const [description, setDescription] = useState('');
    const [prescriptionType, setPrescriptionType] = useState('COMUM');
    const [acquirerName, setAcquirerName] = useState('');
    const [acquirerDocument, setAcquirerDocument] = useState('');

    // Limpa o formulário quando o modal é fechado ou o tipo muda
    useEffect(() => {
        if (!open) {
            setDescription('');
            setPrescriptionType('COMUM');
            setAcquirerName('');
            setAcquirerDocument('');
        }
    }, [open]);

    const onSubmit = () => {
        const payload = {
            description,
            // Inclui dados da receita apenas se o modal for para prescrição
            ...(type === 'prescription' && {
                prescription_type: prescriptionType,
                acquirer_name: acquirerName,
                acquirer_document: acquirerDocument
            })
        };
        handleSubmit(payload);
        handleClose();
    };

    const isControlledPrescription = type === 'prescription' && prescriptionType !== 'COMUM';

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {type === 'prescription' && (
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Tipo de Receita</InputLabel>
                        <Select
                            value={prescriptionType}
                            onChange={(e) => setPrescriptionType(e.target.value)}
                            label="Tipo de Receita"
                        >
                            {Object.entries(prescriptionTypes).map(([key, value]) => (
                                <MenuItem key={key} value={key}>{value}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                <TextField
                    autoFocus
                    margin="dense"
                    label="Descrição"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
                />
                {isControlledPrescription && (
                    <>
                        <TextField
                            margin="dense"
                            label="Nome do Adquirente"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={acquirerName}
                            onChange={(e) => setAcquirerName(e.target.value)}
                        />
                        <TextField
                            margin="dense"
                            label="Documento do Adquirente"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={acquirerDocument}
                            onChange={(e) => setAcquirerDocument(e.target.value)}
                        />
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button onClick={onSubmit} variant="contained">Salvar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default RecordFormModal;
