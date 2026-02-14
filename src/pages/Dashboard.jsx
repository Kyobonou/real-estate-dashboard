import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building, Users, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight,
    MapPin, Clock, RefreshCw, ChevronRight, Activity, Home, Key, X
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import apiService from '../services/api';
import Skeleton from '../components/Skeleton';
import './Dashboard.css';

const DashboardSkeleton = () => (
    <div className="dashboard-v2">
        <header className="dashboard-header">
            <div className="header-text">
                <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="300px" height="20px" />
            </div>
            <Skeleton width="120px" height="40px" />
        </header>

        <div className="kpi-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="stat-card-v2" style={{ height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Skeleton className="skeleton-circle" width="48px" height="48px" />
                        <Skeleton width="40px" height="20px" />
                    </div>
                    <div>
                        <Skeleton width="80px" height="16px" style={{ marginBottom: '8px' }} />
                        <Skeleton width="120px" height="32px" />
                    </div>
                </div>
            ))}
        </div>

        <div className="dashboard-layout">
            <div className="charts-column">
                <div className="glass-panel chart-container">
                    <div className="panel-header">
                        <Skeleton width="150px" height="24px" />
                    </div>
                    <div className="chart-wrapper h-300">
                        <Skeleton type="rect" height="100%" />
                    </div>
                </div>

                <div className="two-col-grid">
                    <div className="glass-panel p-6">
                        <div className="panel-header">
                            <Skeleton width="120px" height="24px" />
                        </div>
                        <div className="chart-wrapper h-250" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Skeleton className="skeleton-circle" width="180px" height="180px" />
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="panel-header">
                            <Skeleton width="120px" height="24px" />
                        </div>
                        <div className="availability-summary" style={{ marginTop: '1rem', gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                            <Skeleton type="rect" height="60px" />
                            <Skeleton type="rect" height="60px" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="activity-column">
                <div className="glass-panel activity-list">
                    <div className="panel-header">
                        <Skeleton width="150px" height="24px" />
                    </div>
                    <div className="items-list">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="item-row">
                                <Skeleton className="skeleton-circle" width="32px" height="32px" />
                                <div style={{ flex: 1 }}>
                                    <Skeleton width="60%" height="16px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="40%" height="12px" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel activity-list mt-6">
                    <div className="panel-header">
                        <Skeleton width="150px" height="24px" />
                    </div>
                    <div className="items-list">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="item-row">
                                <Skeleton className="skeleton-circle" width="32px" height="32px" />
                                <div style={{ flex: 1 }}>
                                    <Skeleton width="60%" height="16px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="40%" height="12px" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);


const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
    <motion.div
        className="card stat-card-v2"
        whileHover={{ y: -5 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
    >
        <div className="stat-icon-wrapper" style={{ background: `${color}15`, color: color }}>
            <Icon size={24} />
        </div>
        <div className="stat-content">
            <span className="stat-label">{title}</span>
            <div className="stat-value-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 className="stat-title">{value}</h3>
                {trend && (
                    <div className={`stat-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
                        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <span>{trendValue}%</span>
                    </div>
                )}
            </div>
        </div>
        <div className="stat-glow" style={{ backgroundColor: color }}></div>
    </motion.div>
);

const WelcomeBanner = ({ onClose }) => (
    <motion.div
        className="welcome-banner card"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
    >
        <div className="welcome-content">
            <div className="welcome-icon">
                <Home size={32} />
            </div>
            <div className="welcome-text">
                <h3>Tableau de Bord Pro 👋</h3>
                <p>Bienvenue sur votre espace de gestion immobilière optimisé.</p>
            </div>
            <button className="btn-close-banner" onClick={onClose}><X size={20} /></button>
        </div>
    </motion.div>
);

const EmptyListState = ({ message, icon: Icon, actionLabel, onAction }) => (
    <div className="empty-state">
        <div className="empty-icon">
            <Icon size={24} />
        </div>
        <p>{message}</p>
        {actionLabel && (
            <button className="btn-link-action" onClick={onAction}>
                {actionLabel} <ChevronRight size={14} />
            </button>
        )}
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [properties, setProperties] = useState([]);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    useEffect(() => {
        loadData();
        const unsubscribe = apiService.subscribe('dataUpdate', (data) => {
            if (data.stats?.success) setStats(data.stats.data);
            if (data.properties?.success) setProperties(data.properties.data.slice(0, 5));
            if (data.visits?.success) setVisits(data.visits.data.slice(0, 5));
        });

        // Check if welcome banner was dismissed
        const bannerDismissed = localStorage.getItem('welcome_dismissed');
        if (bannerDismissed) setShowWelcome(false);

        return () => unsubscribe();
    }, []);

    const dismissWelcome = () => {
        setShowWelcome(false);
        localStorage.setItem('welcome_dismissed', 'true');
    };

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [sRes, pRes, vRes] = await Promise.all([
                apiService.getStats(isRefresh),
                apiService.getProperties(isRefresh),
                apiService.getVisits(isRefresh)
            ]);

            if (sRes.success) setStats(sRes.data);
            if (pRes.success) setProperties(pRes.data.slice(0, 5));
            if (vRes.success) setVisits(vRes.data.slice(0, 5));
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        loadData(true);
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    // Pre-process data for charts
    const typeData = stats ? Object.entries(stats.parType).map(([name, value]) => ({ name, value })) : [];
    const zoneData = stats ? Object.entries(stats.parZone).map(([name, value]) => ({ name, value })) : [];

    // Palette Dashboard Pro (Indigo/Violet/Pink/Emerald/Amber)
    const COLORS = ['#4f46e5', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    // Custom Tooltip pour Recharts (Glassmorphism)
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip" style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <p className="label" style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
                    <p className="value" style={{ color: payload[0].fill, fontWeight: '600' }}>
                        {`${payload[0].name} : ${payload[0].value}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            className="dashboard-v2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >

            <header className="dashboard-header">
                <div className="header-text">
                    <h1>Tableau de Bord</h1>
                    <p>Aperçu de votre activité immobilière</p>
                </div>
                <button className={`btn btn-secondary ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
                    <RefreshCw size={18} />
                    <span className="desktop-only">{refreshing ? 'Mise à jour...' : 'Actualiser'}</span>
                </button>
            </header>

            <AnimatePresence>
                {showWelcome && <WelcomeBanner onClose={dismissWelcome} />}
            </AnimatePresence>

            {/* KPI Section - Couleurs unifiées */}
            <div className="kpi-grid">
                <StatCard
                    title="Total Biens"
                    value={stats?.totalBiens || 0}
                    icon={Building}
                    color="#4f46e5" // Indigo
                    trend="up"
                    trendValue="5"
                />
                <StatCard
                    title="Disponibles"
                    value={stats?.biensDisponibles || 0}
                    icon={Key}
                    color="#10b981" // Emerald
                />
                <StatCard
                    title="Visites Prog."
                    value={stats?.visitesProgrammees || 0}
                    icon={Calendar}
                    color="#ec4899" // Pink
                    trend="up"
                    trendValue="12"
                />
                <StatCard
                    title="Prix Moyen"
                    value={apiService.sheetsApi.formatPrice(stats?.prixMoyen || 0)}
                    icon={TrendingUp}
                    color="#8b5cf6" // Violet
                />
            </div>

            <div className="dashboard-layout">
                {/* Main Charts Area */}
                <div className="charts-column">
                    <div className="card chart-container">
                        <div className="panel-header">
                            <h3>Répartition par Zone</h3>
                            <Activity size={18} className="text-secondary" />
                        </div>
                        <div className="chart-wrapper h-300">
                            {zoneData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#94a3b8"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            interval={0}
                                            tick={{ fill: '#94a3b8' }}
                                        />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {zoneData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyListState message="Aucune donnée de zone disponible" icon={Activity} />
                            )}
                        </div>
                    </div>

                    <div className="two-col-grid">
                        <div className="card p-6">
                            <div className="panel-header">
                                <h3>Types de Biens</h3>
                            </div>
                            <div className="chart-wrapper h-250">
                                {typeData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={typeData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {typeData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyListState message="Aucun bien enregistré" icon={Home} />
                                )}
                            </div>
                            {typeData.length > 0 && (
                                <div className="chart-legend">
                                    {typeData.map((item, i) => (
                                        <div key={item.name} className="legend-item">
                                            <span className="dot" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                            <span className="label">{item.name}</span>
                                            <span className="value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="card p-6">
                            {/* ... Disponibilité (inchangé ou presque) ... */}
                            <div className="panel-header">
                                <h3>Disponibilité</h3>
                            </div>
                            <div className="availability-summary">
                                <div className="avail-item">
                                    <div className="avail-info">
                                        <span className="dot available" style={{ background: '#10b981' }}></span>
                                        <span>Libres</span>
                                        <strong>{stats?.biensDisponibles || 0}</strong>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill available" style={{
                                            width: `${stats?.totalBiens ? (stats.biensDisponibles / stats.totalBiens) * 100 : 0}%`,
                                            background: '#10b981'
                                        }}></div>
                                    </div>
                                </div>
                                <div className="avail-item">
                                    <div className="avail-info">
                                        <span className="dot occupied" style={{ background: '#f59e0b' }}></span>
                                        <span>Occupés</span>
                                        <strong>{stats?.biensOccupes || 0}</strong>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill occupied" style={{
                                            width: `${stats?.totalBiens ? (stats.biensOccupes / stats.totalBiens) * 100 : 0}%`,
                                            background: '#f59e0b'
                                        }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Sidebar */}
                <div className="activity-column">
                    <div className="card activity-list">
                        <div className="panel-header">
                            <h3>Derniers Biens</h3>
                        </div>
                        <div className="items-list">
                            {properties.length > 0 ? properties.map(p => (
                                <div key={p.id} className="item-row">
                                    <div className="item-icon" style={{
                                        background: p.disponible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: p.disponible ? '#10b981' : '#ef4444',
                                        borderRadius: '10px'
                                    }}>
                                        <Home size={16} />
                                    </div>
                                    <div className="item-info">
                                        <strong>{p.typeBien}</strong>
                                        <span className="subtext"><MapPin size={10} /> {p.zone}</span>
                                    </div>
                                    <div className="item-price" style={{ fontWeight: 600, color: '#f8fafc' }}>
                                        {p.prixFormate}
                                    </div>
                                </div>
                            )) : (
                                <EmptyListState message="Aucun bien récent" icon={Home} />
                            )}
                        </div>
                    </div>

                    <div className="card activity-list mt-6">
                        <div className="panel-header">
                            <h3>Visites à venir</h3>
                        </div>
                        <div className="items-list">
                            {visits.length > 0 ? visits.map(v => (
                                <div key={v.id} className="item-row">
                                    <div className="item-icon" style={{
                                        background: 'rgba(79, 70, 229, 0.15)',
                                        color: '#4f46e5',
                                        borderRadius: '10px'
                                    }}>
                                        <Calendar size={16} />
                                    </div>
                                    <div className="item-info">
                                        <strong>{v.nomPrenom}</strong>
                                        <span className="subtext"><Clock size={10} /> {v.dateRv}</span>
                                    </div>
                                    <div className={`badge ${v.visiteProg ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                                        {v.visiteProg ? 'Prog.' : 'Tent.'}
                                    </div>
                                </div>
                            )) : (
                                <EmptyListState message="Aucune visite prévue" icon={Calendar} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;
