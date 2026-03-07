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
    Moon,
    Users,
    Wand2,
    Trello,
    MessageCircle,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiService from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationPanel from './NotificationPanel';
import ChatAssistant from './ChatAssistant';
import GlobalSearch from './GlobalSearch';
import Logo from './Logo';
import { hapticLight, hapticMedium } from '../utils/haptics';
import './Layout.css';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const { theme, toggleTheme } = useTheme();
    const [scrolledDown, setScrolledDown] = useState(false);

    /* Track scroll for dynamic header */
    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            if (window.innerWidth > 768) return; // Only on mobile

            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 60) {
                setScrolledDown(true);
            } else {
                setScrolledDown(false);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    /* Ctrl+K  or  Cmd+K  →  open spotlight */
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(s => !s);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        const unsub = apiService.subscribe('connectionChange', ({ online }) => {
            setIsOnline(online);
        });

        // Start polling for real-time data
        apiService.startPolling(300000); // 5 minutes au lieu de 30s pour réduire la charge

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
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'agent', 'viewer'] },
        { path: '/dashboard/pipeline', icon: Trello, label: 'Pipeline', roles: ['admin', 'agent'] },
        { path: '/dashboard/properties', icon: Building, label: 'Biens', roles: ['admin', 'agent', 'viewer'] },
        { path: '/dashboard/gallery', icon: Building, label: 'Catalogue', roles: ['admin', 'agent', 'viewer'] },
        { path: '/dashboard/expiring', icon: AlertCircle, label: 'À Renouveler', roles: ['admin', 'agent'] },
        { path: '/dashboard/visits', icon: Calendar, label: 'Visites', roles: ['admin', 'agent'] },
        { path: '/dashboard/requests', icon: MessageCircle, label: 'Demandes', roles: ['admin', 'agent'] },
        { path: '/dashboard/clients', icon: Users, label: 'Clients', roles: ['admin', 'agent'] },
        { path: '/dashboard/tools/ad-generator', icon: Wand2, label: 'Rédaction IA', roles: ['admin', 'agent'] },
        { path: '/dashboard/analytics', icon: TrendingUp, label: 'Analytiques', roles: ['admin'] },
    ].filter(item => !item.roles || item.roles.includes(user?.role || 'admin'));

    const allPages = [
        ...navItems,
        { path: '/dashboard/settings', label: 'Paramètres', roles: ['admin', 'agent', 'viewer'] }
    ].filter(item => !item.roles || item.roles.includes(user?.role || 'admin'));

    const handleLogout = () => {
        logout();
        navigate('/');
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
                        className="logo-container"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/dashboard')}
                        style={{ cursor: 'pointer' }}
                    >
                        <Logo collapsed={!sidebarOpen} />
                    </motion.div>

                    <button
                        className="toggle-btn"
                        onClick={() => { hapticLight(); setSidebarOpen(!sidebarOpen); }}
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
                        <span>{isOnline ? 'Connecté' : 'Mode hors ligne'}</span>
                    </motion.div>
                )}

                <nav className="sidebar-nav">
                    {/* Lien vers la Vitrine externe en mode App */}
                    {import.meta.env.VITE_SITE_MODE === 'app' && (
                        <a
                            href={import.meta.env.VITE_SITE_URL_VITRINE || '/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-item showcase-link"
                            style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}
                        >
                            <motion.div className="nav-item-content" whileHover={{ x: 5 }}>
                                <MessageCircle size={20} style={{ color: 'var(--brand-primary)' }} />
                                {sidebarOpen && <span style={{ fontWeight: '600' }}>Voir la Vitrine</span>}
                            </motion.div>
                        </a>
                    )}

                    {navItems.map((item, index) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => hapticLight()}
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
                    <NavLink to="/dashboard/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
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
                <header className={`top-header ${scrolledDown ? 'header-hidden' : ''}`}>
                    <div className="header-left">
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="mobile-logo-wrapper">
                            <Logo collapsed={true} />
                        </div>
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
                        <motion.button
                            className="search-box"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setShowSearch(true)}
                            title="Recherche globale (Ctrl+K)"
                        >
                            <Search size={18} />
                            <span className="search-box-placeholder">Rechercher…</span>
                            <kbd className="search-box-kbd">Ctrl K</kbd>
                        </motion.button>

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
                                    <>
                                        <div
                                            className="notification-overlay"
                                            onClick={() => setShowNotifications(false)}
                                            style={{
                                                position: 'fixed',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                zIndex: 999,
                                                background: 'transparent',
                                            }}
                                        />
                                        <NotificationPanel onClose={() => setShowNotifications(false)} />
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.div
                            className="user-profile"
                            whileHover={{ scale: 1.05 }}
                            onClick={() => navigate('/dashboard/settings')}
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
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.99 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: '100%' }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
            <ChatAssistant />

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="mobile-bottom-nav">
                {[
                    { path: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
                    { path: '/dashboard/pipeline', icon: Trello, label: 'Pipeline' },
                    { path: '/dashboard/properties', icon: Building, label: 'Biens' },
                    { path: '/dashboard/requests', icon: MessageCircle, label: 'Demandes' },
                ].filter(item => {
                    const allowed = navItems.find(n => n.path === item.path);
                    return allowed;
                }).map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => hapticLight()}
                        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={22} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                {/* Custom "Plus" to open sidebar */}
                <button
                    className="bottom-nav-item"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        hapticMedium();
                        setSidebarOpen(true);
                    }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                    <Menu size={22} />
                    <span>Plus</span>
                </button>
            </nav>
        </div>
    );
};

export default Layout;
