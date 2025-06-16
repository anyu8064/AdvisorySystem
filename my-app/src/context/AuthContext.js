import React, { useContext, useState, useEffect } from 'react';
import { auth } from '../utils/firebase'; // Adjust path as needed
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import Prompt from '../components/prompt';
import { Snackbar, Alert } from '@mui/material';

const AuthContext = React.createContext();

export function useAuth() {
    return useContext(AuthContext);
}

//const AUTO_LOGOUT_TIME = 3600000; // 1 hour in ms
const AUTO_LOGOUT_TIME = 3600000;
export default function AuthContextProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [prompt, setPrompt] = useState({
        open: false,
        message: '',
        severity: 'info',
    });


    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setCurrentUser);
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        let timer;

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setPrompt({
                    open: true,
                    message: 'You have been logged out due to 1 hour of inactivity.',
                    severity: 'info',
                });
                logout();
            }, 3600000); // 1 hour 3600000 (use 10000 for testing)
        };

        // List of user activity events to listen to
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Add event listeners
        events.forEach(event =>
            window.addEventListener(event, resetTimer)
        );

        resetTimer(); // Start the timer on mount

        return () => {
            clearTimeout(timer);
            events.forEach(event =>
                window.removeEventListener(event, resetTimer)
            );
        };
    }, [currentUser]);
    const handleClosePrompt = () => {
        setPrompt(prev => ({ ...prev, open: false }));
    };
    const value = {
        currentUser,
        login,
        logout,
    };
    <Prompt
        open={prompt.open}
        message={prompt.message}
        severity={prompt.severity}
        onClose={handleClosePrompt}
    />

    
    return (
  <>
    <Prompt
      open={prompt.open}
      message={prompt.message}
      severity={prompt.severity}
      onClose={handleClosePrompt}
    />
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  </>
);

}
