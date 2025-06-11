import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './MainPage/Login'
import Dashboard from './MainPage/Dashboard'
import ForgotPass from './modules/ForgotPass'
import AuthContextProvider from './context/AuthContext';
//import PrivateRoute from './context/PrivateRoute';


export default function App() {

  return (
    <AuthContextProvider>
      <Router>
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path='/forgot-password' element={<ForgotPass />} />
          <Route path='/dashboard' element={<Dashboard />} />
        </Routes>
      </Router>
    </AuthContextProvider>
  );
}

