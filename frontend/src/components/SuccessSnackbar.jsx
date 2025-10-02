import React from 'react';
import { SnackbarContent } from 'notistack';
import { Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledAlert = styled(Alert)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText || '#fff',
}));

const SuccessSnackbar = React.forwardRef((props, ref) => {
  const { message } = props;
  return (
    <SnackbarContent ref={ref}>
      <StyledAlert severity="success">{message}</StyledAlert>
    </SnackbarContent>
  );
});

export default SuccessSnackbar;
