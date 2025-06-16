import { createContext, useContext, useState, useEffect } from "react";
import { auth } from '../utils/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const AuthContext = createContext({
    currentUser: null,
    login: () => Promise,
    logout: () => Promise,
})

export const useAuth = () => useContext(AuthContext)

export default function AuthContextProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user)
        })
        return () => {
            unsubscribe()
        }
    }, [])

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        setCurrentUser(null)
        return signOut(auth)
    }

    const value = {
        currentUser,
        login,
        logout
    }
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}