import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './MainPage/Login';
import Dashboard from './MainPage/Dashboard';
import ForgotPass from './modules/ForgotPass';
import AuthContextProvider, { useAuth } from './context/AuthContext';

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path='/' element={<Login />} />
      <Route path='/forgot-password' element={<ForgotPass />} />
      <Route
        path='/dashboard'
        element={currentUser ? <Dashboard /> : <Navigate to='/' />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthContextProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthContextProvider>
  );
}
