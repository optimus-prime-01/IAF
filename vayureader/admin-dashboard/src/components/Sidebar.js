import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Book,
    Type,
    Users,
    ClipboardList,
    Activity,
    LogOut,
    Menu,
    ShieldCheck,
    ChevronLeft
} from 'lucide-react';
import './Sidebar.css';

const MENU_ITEMS = [
    { key: 'pdf', label: 'PDF Manager', icon: FileText, permission: 'manage_pdfs' },
    { key: 'dictionary', label: 'Dictionary', icon: Book, permission: 'manage_dictionary' },
    { key: 'abbreviation', label: 'Abbreviations', icon: Type, permission: 'manage_abbreviations' },
    { key: 'admins', label: 'Admins', icon: Users, permission: 'manage_admins' },
    { key: 'adminAudit', label: 'Admin Audit', icon: ClipboardList, permission: 'view_audit' },
    { key: 'userAudit', label: 'User Audit', icon: Activity, permission: 'view_user_audit' },
];

export default function Sidebar({ currentView, setView, user, onLogout, isCollapsed, onToggle }) {
    const hasPermission = (permission) => {
        if (user.isSuperAdmin) return true;
        return (user.permissions || []).includes(permission);
    };

    const visibleItems = MENU_ITEMS.filter(item => hasPermission(item.permission));

    return (
        <motion.div
            initial={{ width: 280 }}
            animate={{ width: isCollapsed ? 80 : 280 }}
            transition={{ duration: 0.1, ease: "easeInOut" }}
            className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}
        >
            {/* Header */}
            <div className="sidebar-header">
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="logo-container"
                        >
                            <div className="logo-icon">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="brand-name">
                                Vayu<span className="brand-highlight">Admin</span>
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={onToggle}
                    className="collapse-btn"
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <div className="sidebar-nav custom-scrollbar">
                {visibleItems.map((item) => {
                    const isActive = currentView === item.key;
                    const Icon = item.icon;

                    return (
                        <motion.button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Icon size={20} className="nav-icon" style={{ color: isActive ? 'white' : undefined }} />

                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="nav-label"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="avatar">
                        {user.name.charAt(0).toUpperCase()}
                    </div>

                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="user-info"
                            >
                                <p className="user-name" title={user.name}>{user.name}</p>
                                <p className="user-role">{user.isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isCollapsed && (
                        <button
                            onClick={onLogout}
                            className="logout-btn-icon"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
