import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, TextField, Button } from '@mui/material'
import Prompt from '../components/prompt'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../utils/firebase'

export default function ForgotPass() {
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success',
    });
    const [email, setEmail] = useState('');
    const Navigate = useNavigate();

    const HandlePasswordReset = async () => {
        if (!email) {
            setAlert({open: true, message: 'Please enter your email.', severity: 'warning'});
        }
        let fullEmail = email.includes('@') ? email : `${email}@gmail.com`;
        try {
            await sendPasswordResetEmail(auth, fullEmail);
            setAlert({open: true, message: 'Verification code has been sent.', severity: 'success'});
            setTimeout(() => {
                Navigate('/');
            }, 2000)
        } catch (error) {
            setAlert({open: true, message: error.message, severity: 'error'});
        }
    }
    
  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 4, }}>
        <Prompt open={alert.open} message={alert.message} severity={alert.severity} />

        {/* Forgot Password Form */}
        <Box sx={{ flex: 1, backgroundColor: '#477AD8', borderRadius: '40px', padding: 6, maxWidth: 400, marginRight: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 3 }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 4 }}>
                Forgot Password
            </Typography>
            <TextField fullWidth variant="filled" onChange={(e) => setEmail(e.target.value)} label="Username" sx={{ mb: 3, backgroundColor: '#6484ED' }} InputLabelProps={{ style: { color: 'white' } }} InputProps={{ style: { color: 'white' } }} />
            <Button variant="contained" onClick={HandlePasswordReset} sx={{ backgroundColor: '#1E40AF', borderRadius: 5, paddingX: 5, paddingY: 1.5, fontWeight: 'bold' }}>
                Login
            </Button>
        </Box>
    </Box>
  )
}
