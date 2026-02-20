import React from 'react';

const ALL_TABS = [
  { key: 'pdf', label: '📄 PDF Manager', permission: 'manage_pdfs' },
  { key: 'dictionary', label: '📘 Dictionary', permission: 'manage_dictionary' },
  { key: 'abbreviation', label: '🔤 Abbreviations', permission: 'manage_abbreviations' },
  { key: 'admins', label: '👥 Admins', permission: 'manage_admins' },
  { key: 'adminAudit', label: '📋 Admin Audit', permission: 'view_audit' },
  { key: 'userAudit', label: '👁️ User Audit', permission: 'view_user_audit' },
];

export default function Navbar({ currentView, setView, user, onLogout }) {
  // Get visible tabs based on permissions
  const getVisibleTabs = () => {
    if (user.isSuperAdmin) {
      return ALL_TABS; // Super admin sees all
    }

    const userPerms = user.permissions || [];
    return ALL_TABS.filter(tab => userPerms.includes(tab.permission));
  };

  const visibleTabs = getVisibleTabs();

  return (
    <nav style={navStyles.navbar}>
      <div style={navStyles.left}>
        <img src="/iaf.png" alt="IAF" style={{ height: 32, marginRight: 12 }} />
        <span style={{ fontWeight: 600 }}>VayuReader Admin</span>
      </div>
      <div style={navStyles.center}>
        {visibleTabs.map(btn => (
          <button
            key={btn.key}
            onClick={() => setView(btn.key)}
            style={{
              ...navStyles.button,
              ...(currentView === btn.key ? navStyles.active : {}),
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div style={navStyles.right}>
        <div style={navStyles.userInfo}>
          <span style={navStyles.userName}>{user.name}</span>
          {user.isSuperAdmin && <span style={navStyles.superBadge}>Super Admin</span>}
        </div>
        <button onClick={onLogout} style={navStyles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const navStyles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 32px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    width: '200px',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    flex: 1,
    flexWrap: 'wrap',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    minWidth: '200px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  userName: {
    fontSize: '0.9rem',
    color: '#374151',
    fontWeight: 500,
  },
  superBadge: {
    fontSize: '0.7rem',
    background: '#fef3c7',
    color: '#92400e',
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 600,
  },
  button: {
    background: 'none',
    border: 'none',
    color: '#4b5563',
    fontSize: '0.9rem',
    fontWeight: 500,
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  active: {
    background: '#f1f5f9',
    color: '#2563eb',
    fontWeight: 600,
  },
  logoutBtn: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};
