import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';

import LoginPage from './pages/LoginPage';
import PatientListPage from './pages/PatientListPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AddPatientPage from './pages/AddPatientPage';
import EditPatientPage from './pages/EditPatientPage';
import DoctorSignUpPage from './pages/DoctorSignUpPage';
import PatientDocumentsPage from './pages/PatientDocumentsPage';
import SncrManagementPage from './pages/SncrManagementPage';
import { SnackbarProvider } from 'notistack';
import SuccessSnackbar from './components/SuccessSnackbar';

const theme = createTheme({
  palette: {
    primary: {
      main: '#66CDAA', // Medium Aquamarine
    },
    secondary: {
      main: '#FF6347', // Tomato
    },
  },
  components: {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#66CDAA',
          color: '#fff',
          fontSize: '0.875rem',
        },
        arrow: {
          color: '#66CDAA',
        },
      },
    },
  },
});

const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={(theme) => ({
          '.notistack-variant-success': {
            backgroundColor: `${theme.palette.primary.main} !important`,
            color: '#fff !important',
          },
        })}
      />
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3}
        Components={{
          success: SuccessSnackbar,
        }}
      >
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<DoctorSignUpPage />} />
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <PatientListPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/patient/:id" 
              element={
                <PrivateRoute>
                  <PatientDetailPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/patient/:id/documents" 
              element={
                <PrivateRoute>
                  <PatientDocumentsPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/add-patient" 
              element={
                <PrivateRoute>
                  <AddPatientPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/edit-patient/:id" 
              element={
                <PrivateRoute>
                  <EditPatientPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/my-documents" 
              element={
                <PrivateRoute>
                  <PatientDocumentsPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/sncr-management" 
              element={
                <PrivateRoute>
                  <SncrManagementPage />
                </PrivateRoute>
              } 
            />
          </Routes>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
