import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import ArticleIcon from '@mui/icons-material/Article';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useNavigate } from 'react-router-dom';
import taonmedIcon from '../assets/icone_taonmed.png';
import apiClient from '../services/api';

const CustomAppBar = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const userRole = localStorage.getItem('user_role');
  const userFullName = localStorage.getItem('user_full_name');

  const handleMenu = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_full_name');
    navigate('/login');
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <img src={taonmedIcon} alt="TaOnMed Icon" style={{ height: '40px', marginRight: '10px' }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Prontuário Eletrônico
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ mr: 2 }}>{userFullName}</Typography>
          <div>
            <IconButton onClick={handleMenu} color="inherit">
              <AccountCircle />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              {userRole === 'MEDICO' && (
                <MenuItem component={Link} to="/patient-list" onClick={handleClose}>
                  <ListItemIcon><MedicalInformationIcon fontSize="small" /></ListItemIcon>
                  Meus Pacientes
                </MenuItem>
              )}
              {userRole === 'MEDICO' && (
                <MenuItem component={Link} to="/sncr-management" onClick={handleClose}>
                  <ListItemIcon><VpnKeyIcon fontSize="small" /></ListItemIcon>
                  Gerenciar Números SNCR
                </MenuItem>
              )}
              {userRole === 'PACIENTE' && (
                <MenuItem component={Link} to="/my-documents" onClick={handleClose}>
                  <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
                  Meus Documentos
                </MenuItem>
              )}
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleClose}>My account</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </div>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;
