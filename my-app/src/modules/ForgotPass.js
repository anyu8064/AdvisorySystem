import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import Prompt from '../components/prompt';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebase';
import Background from '../assets/Background.png';

export default function ForgotPass() {
    const [mode, setMode] = useState('email'); // default mode is email
    const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
    const [email, setEmail] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const Navigate = useNavigate();

    const handlePasswordReset = async () => {
        if (!mode) {
            return setAlert({
                open: true,
                message: 'Please select a reset method.',
                severity: 'warning'
            });
        }

        if (!email) {
            return setAlert({
                open: true,
                message: 'Please enter your email.',
                severity: 'warning'
            });
        }

        const fullEmail = email.includes('@') ? email : `${email}@gmail.com`;

        if (mode === 'email') {
            try {
                await sendPasswordResetEmail(auth, fullEmail);
                setAlert({
                    open: true,
                    message: 'Verification link sent to your email.',
                    severity: 'success'
                });
                setTimeout(() => Navigate('/'), 2000);
            } catch (error) {
                setAlert({
                    open: true,
                    message: error.message,
                    severity: 'error'
                });
            }
        } else if (mode === 'security') {
            // Simulated correct answer (replace with Firestore query if needed)
            const validAnswer = 'blue';
            if (securityAnswer.toLowerCase() === validAnswer) {
                setAlert({
                    open: true,
                    message: 'Answer correct. Please contact admin to reset your password.',
                    severity: 'success'
                });
            } else {
                setAlert({
                    open: true,
                    message: 'Incorrect answer.',
                    severity: 'error'
                });
            }
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                height: '100vh',
                backgroundImage: `url(${Background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 4,
            }}
        >
            <Prompt open={alert.open} message={alert.message} severity={alert.severity} />

            <Box
                sx={{
                    flex: 1,
                    backgroundColor: '#477AD8',
                    borderRadius: '40px',
                    padding: 6,
                    maxWidth: 400,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: 3
                }}
            >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}>
                    Forgot Password
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Button
                        variant={mode === 'email' ? 'contained' : 'outlined'}
                        onClick={() => setMode('email')}
                        sx={{
                            color: 'white',
                            borderColor: 'white',
                            ...(mode === 'email'
                                ? {
                                    backgroundColor: '#1E40AF',
                                    borderRadius: 5,
                                    px: 5,
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        backgroundColor: '#1E3A8A',
                                    },
                                }
                                : {
                                    borderRadius: 5,
                                    px: 5,
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                    },
                                }),
                        }}
                    >
                        Via Email
                    </Button>

                    <Button
                        variant={mode === 'security' ? 'contained' : 'outlined'}
                        onClick={() => setMode('security')}
                        sx={{
                            color: 'white',
                            borderColor: 'white',
                            ...(mode === 'security'
                                ? {
                                    backgroundColor: '#1E40AF',
                                    borderRadius: 5,
                                    px: 5,
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        backgroundColor: '#1E3A8A',
                                    },
                                }
                                : {
                                    borderRadius: 5,
                                    px: 5,
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                    },
                                }),
                        }}
                    >
                        Security Q
                    </Button>
                </Box>


                <TextField
                    fullWidth
                    variant="filled"
                    label="Username / Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 3, backgroundColor: '#6484ED' }}
                    InputLabelProps={{ style: { color: 'white' } }}
                    InputProps={{ style: { color: 'white' } }}
                />

                {mode === 'security' && (
                    <TextField
                        fullWidth
                        variant="filled"
                        label="What is your favorite color?"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        sx={{ mb: 3, backgroundColor: '#6484ED' }}
                        InputLabelProps={{ style: { color: 'white' } }}
                        InputProps={{ style: { color: 'white' } }}
                    />
                )}

                <Button
                    onClick={handlePasswordReset}
                    variant="contained"
                    sx={{
                        backgroundColor: '#1E40AF',
                        borderRadius: 5,
                        paddingX: 5,
                        paddingY: 1.5,
                        fontWeight: 'bold'
                    }}
                >
                    Submit
                </Button>
            </Box>
        </Box>
    );
}
