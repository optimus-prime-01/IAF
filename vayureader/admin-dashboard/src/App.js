import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './Dashboard';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import SecurityQuestionsSetup from './components/SecurityQuestionsSetup';
import api from './utils/api';
import {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  getPermissionsFromToken
} from './utils/adminToken';

function App() {
  const [user, setUser] = useState(null);
  const [adminToken, setAdminTokenState] = useState(() => getAdminToken());
  const [checking, setChecking] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const savedUser = localStorage.getItem('admin_info');
      const savedToken = getAdminToken();

      if (savedToken) {
        setAdminTokenState(savedToken);
      }

      if (savedUser || savedToken) {
        try {
          // Validate session with backend (cookie will be sent automatically)
          const res = await api.get('/api/admin/me');
          const sessionData = res.data.data || {};

          if (sessionData.token) {
            setAdminToken(sessionData.token);
            setAdminTokenState(sessionData.token);
          }

          const { token, ...adminInfo } = sessionData;
          localStorage.setItem('admin_info', JSON.stringify(adminInfo));
          setUser(adminInfo);
        } catch {
          // Session invalid, clear localStorage
          localStorage.removeItem('admin_info');
          clearAdminToken();
          setAdminTokenState(null);
        }
      }
      setChecking(false);
    };
    validateSession();
  }, []);

  const permissions = useMemo(() => getPermissionsFromToken(adminToken), [adminToken]);

  const handleLoginSuccess = (sessionData) => {
    if (sessionData?.token) {
      setAdminToken(sessionData.token);
      setAdminTokenState(sessionData.token);
    }

    if (sessionData?.admin) {
      localStorage.setItem('admin_info', JSON.stringify(sessionData.admin));
      setUser(sessionData.admin);
      return;
    }

    if (sessionData) {
      localStorage.setItem('admin_info', JSON.stringify(sessionData));
      setUser(sessionData);
    }
  };

  const handleLogout = () => {
    api.post('/api/admin/logout').catch(() => { });
    localStorage.removeItem('admin_info');
    clearAdminToken();
    setAdminTokenState(null);
    setUser(null);
  };

  const handleSecuritySetupComplete = async () => {
    // Refresh user data to get updated isVerified status
    try {
      const res = await api.get('/api/admin/me');
      const sessionData = res.data.data || {};

      if (sessionData.token) {
        setAdminToken(sessionData.token);
        setAdminTokenState(sessionData.token);
      }

      const { token, ...adminInfo } = sessionData;
      localStorage.setItem('admin_info', JSON.stringify(adminInfo));
      setUser(adminInfo);
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
        onSuccess={(sessionData) => {
          setShowForgotPassword(false);
          handleLoginSuccess(sessionData);
        }}
      />
    );
  }

  // User not logged in - show login
  if (!user) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
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
  return <Dashboard user={user} permissions={permissions} onLogout={handleLogout} />;
}

export default App;
