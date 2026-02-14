import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Building,
    Calendar,
    Settings,
    Bell,
    Search,
    Menu,
    X,
    TrendingUp,
    LogOut,
    Wifi,
    WifiOff,
    Sun,
    Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiService from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationPanel from './NotificationPanel';
import './Layout.css';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    // REMOVED local state for notifications: const [notifications, setNotifications] = useState(3);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const unsub = apiService.subscribe('connectionChange', ({ online }) => {
            setIsOnline(online);
        });

        // Start polling for real-time data — this is the SINGLE source of polling
        apiService.startPolling(30000);

        return () => {
            unsub();
            apiService.stopPolling();
        };
    }, []);

    // Close sidebar on mobile navigation
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    }, [location]);

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/properties', icon: Building, label: 'Biens' },
        { path: '/gallery', icon: Building, label: 'Galerie' },
        { path: '/visits', icon: Calendar, label: 'Visites' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytiques' },
    ];

    const allPages = [
        ...navItems,
        { path: '/settings', label: 'Paramètres' }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNotifications = () => {
        // Simple mock behavior: clear count or show message
        if (notifications > 0) {
            setNotifications(0);
            // Could add a toast here if ToastContext was used in Layout
            alert("Toutes les notifications ont été lues !"); // Temporary simple feedback
        } else {
            alert("Aucune nouvelle notification.");
        }
    };

    const getRoleLabel = (role) => {
        const roles = { admin: 'Administrateur', agent: 'Agent Terrain', viewer: 'Utilisateur' };
        return roles[role] || 'Utilisateur';
    };

    return (
        <div className="layout">
            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
            >
                <div className="sidebar-header">
                    <motion.div
                        className="logo"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="logo-icon">
                            <Building className="icon" size={28} />
                        </div>
                        {sidebarOpen && (
                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                ImmoDash
                            </motion.h1>
                        )}
                    </motion.div>

                    <button
                        className="toggle-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Connection Status */}
                {sidebarOpen && (
                    <motion.div
                        className={`connection-status ${isOnline ? 'online' : 'offline'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                        <span>{isOnline ? 'Connecté à n8n' : 'Mode hors ligne'}</span>
                    </motion.div>
                )}

                <nav className="sidebar-nav">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <motion.div
                                className="nav-item-content"
                                whileHover={{ x: 5 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <item.icon size={20} />
                                {sidebarOpen && <span>{item.label}</span>}
                            </motion.div>
                            {location.pathname === item.path && (
                                <motion.div
                                    className="active-indicator"
                                    layoutId="activeNav"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <motion.div
                            className="nav-item-content"
                            whileHover={{ x: 5 }}
                        >
                            <Settings size={20} />
                            {sidebarOpen && <span>Paramètres</span>}
                        </motion.div>
                    </NavLink>
                    <motion.button
                        className="nav-item logout-btn"
                        onClick={handleLogout}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="nav-item-content">
                            <LogOut size={20} />
                            {sidebarOpen && <span>Déconnexion</span>}
                        </div>
                    </motion.button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                <header className="top-header">
                    <div className="header-left">
                        <button
                            className="mobile-menu-btn icon-btn"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu size={24} />
                        </button>
                        <motion.h2
                            className="page-title"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={location.pathname}
                        >
                            {allPages.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                        </motion.h2>
                    </div>

                    <div className="header-right">
                        <motion.div
                            className="search-box"
                            whileHover={{ scale: 1.02 }}
                        >
                            <Search size={18} />
                            <input type="text" placeholder="Rechercher..." />
                        </motion.div>

                        <motion.button
                            className="icon-btn"
                            onClick={toggleTheme}
                            whileHover={{ scale: 1.1, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </motion.button>

                        <div style={{ position: 'relative' }}>
                            <motion.button
                                className={`icon-btn ${showNotifications ? 'active' : ''}`}
                                onClick={() => setShowNotifications(!showNotifications)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Notifications"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <motion.span
                                        className="notification-badge"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring' }}
                                    >
                                        {unreadCount}
                                    </motion.span>
                                )}
                            </motion.button>
                            <AnimatePresence>
                                {showNotifications && (
                                    <NotificationPanel onClose={() => setShowNotifications(false)} />
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.div
                            className="user-profile"
                            whileHover={{ scale: 1.05 }}
                            onClick={() => navigate('/settings')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="avatar">{user?.avatar || user?.name?.charAt(0) || 'U'}</div>
                            <div className="user-info">
                                <span className="user-name">{user?.name || 'Utilisateur'}</span>
                                <span className="user-role">{getRoleLabel(user?.role)}</span>
                            </div>
                        </motion.div>
                    </div>
                </header>

                <main className="page-content">
                    {/* REMOVED AnimatePresence mode="wait" — this was causing white screens
                        because it waits for the exit animation to complete before mounting
                        the next lazy-loaded component, causing a blank gap. */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
