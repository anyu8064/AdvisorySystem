import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Link } from '@mui/material';
import Logo from '../assets/Logo.png';
import Background from '../assets/Background.png';
import { useAuth } from '../context/AuthContext';
import Prompt from '../components/prompt';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, currentUser } = useAuth();
  const Navigate = useNavigate();
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const HandleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setAlert({
        open: true,
        message: 'Please fill in the required fields.',
        severity: 'warning',
      });
      return;
    }

    let loginEmail = email;
    let userStatus = null;

    try {
      const isEmail = email.includes('@');
      const db = getFirestore();
      const usersRef = collection(db, 'users');
      const q = isEmail
        ? query(usersRef, where('email', '==', email))
        : query(usersRef, where('username', '==', email));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No user found with that email or username.');
      }

      const userDoc = querySnapshot.docs[0].data();
      loginEmail = userDoc.email;
      userStatus = userDoc.status; // Assuming you have a field like "status: 'active'"

      if (!loginEmail) {
        throw new Error('Email not found for that username.');
      }

      if (userStatus !== true && userStatus !== 'active') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Proceed to Firebase Auth login
      await login(loginEmail, password);

      setAlert({
        open: true,
        message: 'Login Successful.',
        severity: 'success',
      });
      setTimeout(() => {
        Navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Login Error:', error);
      setAlert({
        open: true,
        message: 'Login Failed. Wrong password or username.',
        severity: 'error',
      });
    }
  };

  const handleCloseAlert = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };
    
  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundImage: `url(${Background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <Prompt open={alert.open} message={alert.message} severity={alert.severity} onClose={handleCloseAlert} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 500,
          width: '90%',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        <img src={Logo} alt="Logo" style={{ width: '100%', maxWidth: 300, height: 'auto' }} />

        {/* Title */}
        <Typography
          variant="h4"
          sx={{
            color: '#2053B7',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '1px 1px 0 white, -1px 1px 0 white, 1px -1px 0 white, -1px -1px 0 white',
            mt: 2,
            mb: 4,
          }}
        >
          Advisory Template
        </Typography>

        {/* Login Form */}
        <Box
          sx={{
            backgroundColor: 'rgba(71, 122, 216, 0.8)',
            borderRadius: '40px',
            padding: { xs: 4, sm: 6 },
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 3,
          }}
        >
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 4 }}>
            Login
          </Typography>

          <TextField
            fullWidth
            variant="filled"
            onChange={(e) => setEmail(e.target.value)}
            label="Username"
            sx={{ mb: 3, backgroundColor: '#6484ED' }}
            InputLabelProps={{ style: { color: 'white' } }}
            InputProps={{ style: { color: 'white' } }}
          />

          <TextField
            fullWidth
            variant="filled"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            label="Password"
            sx={{ mb: 2, backgroundColor: '#6484ED' }}
            InputLabelProps={{ style: { color: 'white' } }}
            InputProps={{ style: { color: 'white' } }}
          />

          <Link href="/forgot-password" underline="hover" sx={{ alignSelf: 'flex-start', color: 'white', mb: 4 }}>
            Forgot Password
          </Link>

          <Button
            variant="contained"
            onClick={HandleLogin}
            sx={{ backgroundColor: '#1E40AF', borderRadius: 5, px: 5, py: 1.5, fontWeight: 'bold' }}
          >
            Login
          </Button>
        </Box>
      </Box>
    </Box>
  );
}