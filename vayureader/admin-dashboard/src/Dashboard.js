import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import PdfManager from './components/PdfManager';
import DictionaryManager from './components/DictionaryUploader';
import AbbreviationUploader from './components/AbbreviationUploader';
import AdminManager from './components/AdminManager';
import AdminAuditLogs from './components/AdminAuditLogs';
import UserAuditLogs from './components/UserAuditLogs';

// Helper to check if user has permission
const hasPermission = (user, permission) => {
  if (user.isSuperAdmin) return true;
  return (user.permissions || []).includes(permission);
};

export default function Dashboard({ user, onLogout }) {
  // Set initial view based on first available permission
  const getInitialView = () => {
    if (hasPermission(user, 'manage_pdfs')) return 'pdf';
    if (hasPermission(user, 'manage_dictionary')) return 'dictionary';
    if (hasPermission(user, 'manage_abbreviations')) return 'abbreviation';
    if (hasPermission(user, 'manage_admins')) return 'admins';
    if (hasPermission(user, 'view_audit')) return 'adminAudit';
    if (hasPermission(user, 'view_user_audit')) return 'userAudit';
    return 'pdf';
  };

  const [view, setView] = useState(getInitialView);
  const [pdfToHighlight, setPdfToHighlight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Simulate short loading delay
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (targetView, resourceId) => {
    setView(targetView);
    if (targetView === 'pdf' && resourceId) {
      setPdfToHighlight(resourceId);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-app)',
      }}>
        <div style={{ position: 'relative' }}>
          <img
            src="/iaf.png"
            alt="Loading..."
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              animation: 'pulse 2s infinite ease-in-out'
            }}
          />
          <div style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }
        `}</style>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'pdf':
        return hasPermission(user, 'manage_pdfs') ?
          <PdfManager
            targetPdfId={pdfToHighlight}
            onClearTarget={() => setPdfToHighlight(null)}
          /> : <NoAccess />;
      case 'dictionary':
        return hasPermission(user, 'manage_dictionary') ? <DictionaryManager /> : <NoAccess />;
      case 'abbreviation':
        return hasPermission(user, 'manage_abbreviations') ? <AbbreviationUploader /> : <NoAccess />;
      case 'admins':
        return hasPermission(user, 'manage_admins') ? <AdminManager /> : <NoAccess />;
      case 'adminAudit':
        return hasPermission(user, 'view_audit') ? <AdminAuditLogs onNavigate={handleNavigate} /> : <NoAccess />;
      case 'userAudit':
        return hasPermission(user, 'view_user_audit') ? <UserAuditLogs /> : <NoAccess />;
      default:
        return <PdfManager />;
    }
  };

  const getTitle = () => {
    const titles = {
      pdf: 'PDF Manager',
      dictionary: 'Dictionary',
      abbreviation: 'Abbreviations',
      admins: 'Admin Management',
      adminAudit: 'Admin Audit Logs',
      userAudit: 'User Activity Logs'
    };
    return titles[view] || '';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <Sidebar
        currentView={view}
        setView={setView}
        user={user}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <motion.div
        initial={false}
        animate={{ marginLeft: isSidebarCollapsed ? 80 : 280 }}
        transition={{ duration: 0.1, ease: "easeInOut" }}
        style={{ padding: '2rem', minHeight: '100vh' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '2rem',
              color: 'var(--text-primary)',
              fontFamily: "'Outfit', sans-serif"
            }}>
              {getTitle()}
            </h2>

            <div className="view-container">
              {renderView()}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem',
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{
        width: 64, height: 64,
        background: '#fee2e2',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem'
      }}>🚫</div>
      <h3 style={{ color: '#dc2626', fontSize: '1.25rem', fontWeight: 600 }}>Access Denied</h3>
      <p style={{ color: 'var(--text-secondary)' }}>You don't have permission to access this section.</p>
    </div>
  );
}
