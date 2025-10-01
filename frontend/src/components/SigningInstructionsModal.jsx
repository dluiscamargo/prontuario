import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

const SigningInstructionsModal = ({ open, handleClose }) => {
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Próximos Passos para Assinar o Documento</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          O download do PDF foi iniciado. Por favor, siga as instruções abaixo para assinar digitalmente o documento e enviá-lo de volta para o sistema.
        </DialogContentText>
        <List sx={{ mt: 2, p: 0 }}>
          <ListItem>
            <ListItemIcon>
              <Typography variant="h6" component="span" color="primary">1.</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Abra o Assinador ITI"
              secondary="Localize e abra o programa Assinador ITI (ou outro de sua preferência) em seu computador e carregue o PDF que você acabou de baixar."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Typography variant="h6" component="span" color="primary">2.</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Assine o Documento"
              secondary="Siga os passos do programa para assinar o documento com seu certificado digital A3. Pode ser necessário inserir a senha (PIN) do seu token."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Typography variant="h6" component="span" color="primary">3.</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Salve o Novo Arquivo"
              secondary="O programa criará um novo arquivo PDF assinado (ex: 'assinado-receita.pdf'). Salve-o em um local fácil de encontrar."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Typography variant="h6" component="span" color="primary">4.</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Envie o Arquivo Correto"
              secondary="Volte para esta tela e use o botão 'Enviar Assinado' para nos enviar este novo arquivo que você acabou de salvar."
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="contained">
          Entendi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SigningInstructionsModal;
