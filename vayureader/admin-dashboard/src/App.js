import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import SecurityQuestionsSetup from './components/SecurityQuestionsSetup';
import api from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const savedUser = localStorage.getItem('admin_info');
      if (savedUser) {
        try {
          // Validate session with backend (cookie will be sent automatically)
          const res = await api.get('/api/admin/me');
          // Update stored info with latest from server
          localStorage.setItem('admin_info', JSON.stringify(res.data.data));
          setUser(res.data.data);
        } catch {
          // Session invalid, clear localStorage
          localStorage.removeItem('admin_info');
        }
      }
      setChecking(false);
    };
    validateSession();
  }, []);

  const handleLogout = () => {
    api.post('/api/admin/logout').catch(() => { });
    localStorage.removeItem('admin_info');
    setUser(null);
  };

  const handleSecuritySetupComplete = async () => {
    // Refresh user data to get updated isVerified status
    try {
      const res = await api.get('/api/admin/me');
      localStorage.setItem('admin_info', JSON.stringify(res.data.data));
      setUser(res.data.data);
    } catch {
      handleLogout();
    }
  };

  if (checking) return null;

  // Show forgot password screen
  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        onSuccess={() => {
          setShowForgotPassword(false);
          window.location.reload(); // Refresh to validate session
        }}
      />
    );
  }

  // User not logged in - show login
  if (!user) {
    return (
      <Login
        onLoginSuccess={(admin) => setUser(admin)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  // User logged in but not verified - show security questions setup
  if (user && user.isVerified === false) {
    return (
      <SecurityQuestionsSetup onComplete={handleSecuritySetupComplete} />
    );
  }

  // User logged in and verified - show dashboard
  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
