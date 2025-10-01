import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import LoginPage from './pages/LoginPage';
import PatientListPage from './pages/PatientListPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AddPatientPage from './pages/AddPatientPage';
import EditPatientPage from './pages/EditPatientPage';
import DoctorSignUpPage from './pages/DoctorSignUpPage';
import { SnackbarProvider } from 'notistack';

const theme = createTheme({});

const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
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
          </Routes>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
