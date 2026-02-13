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
    WifiOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import './Layout.css';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notifications, setNotifications] = useState(3);
    const [isOnline, setIsOnline] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    useEffect(() => {
        const unsub = apiService.subscribe('connectionChange', ({ online }) => {
            setIsOnline(online);
        });

        // Start polling for real-time data
        apiService.startPolling(30000);

        return () => {
            unsub();
            apiService.stopPolling();
        };
    }, []);

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/properties', icon: Building, label: 'Biens' },
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

    const getRoleLabel = (role) => {
        const roles = { admin: 'Administrateur', agent: 'Agent Terrain', viewer: 'Utilisateur' };
        return roles[role] || 'Utilisateur';
    };

    return (
        <div className="layout">
            {/* Sidebar */}
            <motion.aside
                className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 100 }}
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
            </motion.aside>

            {/* Main Content */}
            <div className="main-content">
                <header className="top-header">
                    <div className="header-left">
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
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Bell size={20} />
                            {notifications > 0 && (
                                <motion.span
                                    className="notification-badge"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring' }}
                                >
                                    {notifications}
                                </motion.span>
                            )}
                        </motion.button>

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
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Layout;
