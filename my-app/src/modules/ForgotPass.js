import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
} from '@mui/material';
import Prompt from '../components/prompt';
import { sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import Background from '../assets/Background.png';

const db = getFirestore();

function censorEmail(email) {
    const [user, domain] = email.split('@');
    if (user.length < 4) return '*'.repeat(user.length) + '@' + domain;

    const first = user[0];
    const last = user[user.length - 1];
    return `${first}***${last}***@${domain}`;
}

export default function ForgotPass() {
    const [securityQuestions, setSecurityQuestions] = useState([]);
    const [securityAnswers, setSecurityAnswers] = useState(['', '']);
    const [userUid, setUserUid] = useState('');
    const [userNeedUid, setUserNeedUid] = useState('');
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState('');
    const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
    const [email, setEmail] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const Navigate = useNavigate();

    const handleInitialSubmit = async () => {
        if (!email) {
            setAlert({
                open: true,
                message: 'Please enter your username or email.',
                severity: 'warning'
            });
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            const isEmail = email.includes('@');
            const q = query(usersRef, where(isEmail ? 'email' : 'username', '==', email.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setAlert({
                    open: true,
                    message: 'Account not found.',
                    severity: 'error'
                });
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.status !== true) {
                setAlert({
                    open: true,
                    message: 'Account is inactive. Please contact admin.',
                    severity: 'error'
                });
                return;
            }

            const secQRef = collection(db, 'users', userDoc.id, 'SecQ');
            const secQSnapshot = await getDocs(secQRef);

            if (secQSnapshot.empty) {
                setAlert({
                    open: true,
                    message: 'No security questions found.',
                    severity: 'error'
                });
                return;
            }

            const questions = secQSnapshot.docs.slice(0, 2).map(doc => {
                const data = doc.data();
                const [question, answer] = Object.entries(data)[0];
                return { question, correctAnswer: answer };
            });

            if (questions.length < 2) {
                setAlert({
                    open: true,
                    message: 'Not enough security questions set for this account.',
                    severity: 'error'
                });
                return;
            }

            setSecurityQuestions(questions);
            setSecurityAnswers(['', '']);
            setUserNeedUid(userData.uid);
            setUserUid(userDoc.id);
            setUserEmail(userData.email);
            setStep(2);
            setMode('email'); // Default mode
        } catch (error) {
            console.error(error);
            setAlert({
                open: true,
                message: 'Something went wrong. Please try again.',
                severity: 'error'
            });
        }
    };

    const handlePasswordReset = async () => {
        if (mode === 'email') {
            try {
                await sendPasswordResetEmail(auth, userEmail);
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
            try {
                const secQRef = collection(db, 'users', userUid, 'SecQ');
                const secQSnapshot = await getDocs(secQRef);

                if (secQSnapshot.empty) {
                    setAlert({
                        open: true,
                        message: 'Security questions not set.',
                        severity: 'error'
                    });
                    return;
                }

                let allMatched = true;
                secQSnapshot.docs.slice(0, 2).forEach((doc, index) => {
                    const data = doc.data();
                    const [_, correctAnswer] = Object.entries(data)[0] || [];
                    const userAnswer = securityAnswers[index];

                    if (
                        !userAnswer ||
                        userAnswer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase()
                    ) {
                        allMatched = false;
                    }
                });

                if (allMatched) {
                    setShowPasswordFields(true);
                    setAlert({
                        open: true,
                        message: 'All answers correct. Please enter your new password.',
                        severity: 'success'
                    });
                } else {
                    setAlert({
                        open: true,
                        message: 'One or more answers are incorrect.',
                        severity: 'error'
                    });
                }

            } catch (error) {
                setAlert({
                    open: true,
                    message: 'Error checking answers.',
                    severity: 'error'
                });
            }
        }
    };

    const handlePasswordUpdate = async () => {
        if (!newPassword || !confirmPassword) {
            setAlert({
                open: true,
                message: "Please fill in both password fields.",
                severity: "warning",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setAlert({
                open: true,
                message: "Passwords do not match.",
                severity: "error",
            });
            return;
        }

        try {
            const user = auth.currentUser;
console.log(user)
            if (!user) {
                setAlert({
                    open: true,
                    message: "No user is currently signed in.",
                    severity: "error",
                });
                return;
            }

            await updatePassword(userNeedUid, newPassword);

            setAlert({
                open: true,
                message: "Password updated successfully.",
                severity: "success",
            });

            setTimeout(() => Navigate("/"), 2000);
        } catch (error) {
            console.error("❌ Password update error:", error);
            setAlert({
                open: true,
                message: error.message,
                severity: "error",
            });
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
            <Prompt
                open={alert.open}
                message={alert.message}
                severity={alert.severity}
                onClose={() => setAlert(prev => ({ ...prev, open: false }))}
            />

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

                {step === 1 && (
                    <>
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
                        <Button
                            onClick={handleInitialSubmit}
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
                    </>
                )}

                {step === 2 && (
                    <>
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

                        {mode === 'email' && (
                            <TextField
                                fullWidth
                                variant="filled"
                                label="Sending to"
                                value={censorEmail(userEmail)}
                                InputProps={{
                                    readOnly: true,
                                    style: { color: 'white' }
                                }}
                                InputLabelProps={{ style: { color: 'white' } }}
                                sx={{ mb: 3, backgroundColor: '#6484ED' }}
                            />
                        )}

                        {mode === 'security' && !showPasswordFields &&
                            securityQuestions.map((q, index) => (
                                <TextField
                                    key={index}
                                    fullWidth
                                    variant="filled"
                                    label={q.question}
                                    value={securityAnswers[index] || ''}
                                    onChange={(e) => {
                                        const updatedAnswers = [...securityAnswers];
                                        updatedAnswers[index] = e.target.value;
                                        setSecurityAnswers(updatedAnswers);
                                    }}
                                    sx={{ mb: 3, backgroundColor: '#6484ED' }}
                                    InputLabelProps={{ style: { color: 'white' } }}
                                    InputProps={{ style: { color: 'white' } }}
                                />
                            ))
                        }


                        {mode && !showPasswordFields && (
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
                        )}

                        {mode === 'security' && showPasswordFields && (
                            <>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    label="New Password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    sx={{ mb: 2, backgroundColor: '#6484ED' }}
                                    InputLabelProps={{ style: { color: 'white' } }}
                                    InputProps={{ style: { color: 'white' } }}
                                />
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    label="Confirm Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    sx={{ mb: 3, backgroundColor: '#6484ED' }}
                                    InputLabelProps={{ style: { color: 'white' } }}
                                    InputProps={{ style: { color: 'white' } }}
                                />
                                <Button
                                    onClick={handlePasswordUpdate}
                                    variant="contained"
                                    sx={{
                                        backgroundColor: '#1E40AF',
                                        borderRadius: 5,
                                        paddingX: 5,
                                        paddingY: 1.5,
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Submit New Password
                                </Button>
                            </>
                        )}

                    </>
                )}
            </Box>
        </Box>
    );
}
