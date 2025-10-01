import React, { useState } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

const RecordFormModal = ({ open, handleClose, handleSubmit, title }) => {
    const [description, setDescription] = useState('');

    const onSubmit = () => {
        handleSubmit(description);
        setDescription('');
        handleClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Descrição"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button onClick={onSubmit}>Salvar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default RecordFormModal;
