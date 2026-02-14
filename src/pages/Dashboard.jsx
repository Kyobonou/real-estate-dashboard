import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building, Users, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight,
    MapPin, Clock, RefreshCw, ChevronRight, Activity, Home, Key
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import apiService from '../services/api';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
    <motion.div
        className="stat-card-v2"
        whileHover={{ y: -5 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
    >
        <div className="stat-icon-wrapper" style={{ background: `${color}15`, color: color }}>
            <Icon size={24} />
        </div>
        <div className="stat-content">
            <span className="stat-label">{title}</span>
            <h3 className="stat-title">{value}</h3>
            {trend && (
                <div className={`stat-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
                    {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>{trendValue}%</span>
                </div>
            )}
        </div>
        <div className="stat-glow" style={{ backgroundColor: color }}></div>
    </motion.div>
);

const WelcomeBanner = ({ onClose }) => (
    <motion.div
        className="welcome-banner glass-panel"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
    >
        <div className="welcome-content">
            <div className="welcome-icon">
                <Home size={32} />
            </div>
            <div className="welcome-text">
                <h3>Bienvenue sur ImmoDash ! 👋</h3>
                <p>Votre tableau de bord pour gérer vos biens immobiliers en toute simplicité.</p>
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

    const loadData = async () => {
        setLoading(true);
        try {
            const [sRes, pRes, vRes] = await Promise.all([
                apiService.getStats(),
                apiService.getProperties(),
                apiService.getVisits()
            ]);

            if (sRes.success) setStats(sRes.data);
            if (pRes.success) setProperties(pRes.data.slice(0, 5));
            if (vRes.success) setVisits(vRes.data.slice(0, 5));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading && !refreshing) {
        return (
            <div className="dashboard-loading">
                <div className="loader-ring"></div>
                <p>Chargement de votre espace...</p>
            </div>
        );
    }

    // Pre-process data for charts
    const typeData = stats ? Object.entries(stats.parType).map(([name, value]) => ({ name, value })) : [];
    const zoneData = stats ? Object.entries(stats.parZone).map(([name, value]) => ({ name, value })) : [];

    const COLORS = ['#667eea', '#764ba2', '#f093fb', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <div className="dashboard-v2">
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

            {/* KPI Section */}
            <div className="kpi-grid">
                <StatCard
                    title="Total Biens"
                    value={stats?.totalBiens || 0}
                    icon={Building}
                    color="#667eea"
                />
                <StatCard
                    title="Disponibles"
                    value={stats?.biensDisponibles || 0}
                    icon={Key}
                    color="#10b981"
                />
                <StatCard
                    title="Visites Prog."
                    value={stats?.visitesProgrammees || 0}
                    icon={Calendar}
                    color="#f093fb"
                />
                <StatCard
                    title="Prix Moyen"
                    value={apiService.sheetsApi.formatPrice(stats?.prixMoyen || 0)}
                    icon={TrendingUp}
                    color="#764ba2"
                />
            </div>

            <div className="dashboard-layout">
                {/* Main Charts Area */}
                <div className="charts-column">
                    <div className="glass-panel chart-container">
                        <div className="panel-header">
                            <h3>Répartition par Zone</h3>
                            <Activity size={18} />
                        </div>
                        <div className="chart-wrapper h-300">
                            {zoneData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={zoneData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                        />
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
                        <div className="glass-panel p-6">
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
                                            >
                                                {typeData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
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

                        <div className="glass-panel p-6">
                            <div className="panel-header">
                                <h3>Disponibilité</h3>
                            </div>
                            <div className="availability-summary">
                                <div className="avail-item">
                                    <div className="avail-info">
                                        <span className="dot available"></span>
                                        <span>Libres</span>
                                        <strong>{stats?.biensDisponibles || 0}</strong>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill available" style={{ width: `${stats?.totalBiens ? (stats.biensDisponibles / stats.totalBiens) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="avail-item">
                                    <div className="avail-info">
                                        <span className="dot occupied"></span>
                                        <span>Occupés</span>
                                        <strong>{stats?.biensOccupes || 0}</strong>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill occupied" style={{ width: `${stats?.totalBiens ? (stats.biensOccupes / stats.totalBiens) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Sidebar */}
                <div className="activity-column">
                    <div className="glass-panel activity-list">
                        <div className="panel-header">
                            <h3>Derniers Biens</h3>
                            <button className="btn-link">Tout voir <ChevronRight size={14} /></button>
                        </div>
                        <div className="items-list">
                            {properties.length > 0 ? properties.map(p => (
                                <div key={p.id} className="item-row">
                                    <div className="item-icon" style={{ background: p.disponible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                        <Home size={16} color={p.disponible ? '#10b981' : '#ef4444'} />
                                    </div>
                                    <div className="item-info">
                                        <strong>{p.typeBien}</strong>
                                        <span className="subtext"><MapPin size={10} /> {p.zone}</span>
                                    </div>
                                    <div className="item-price">{p.prixFormate}</div>
                                </div>
                            )) : (
                                <EmptyListState message="Aucun bien récent" icon={Home} />
                            )}
                        </div>
                    </div>

                    <div className="glass-panel activity-list mt-6">
                        <div className="panel-header">
                            <h3>Visites à venir</h3>
                        </div>
                        <div className="items-list">
                            {visits.length > 0 ? visits.map(v => (
                                <div key={v.id} className="item-row">
                                    <div className="item-icon bg-indigo-soft">
                                        <Calendar size={16} className="text-indigo" />
                                    </div>
                                    <div className="item-info">
                                        <strong>{v.nomPrenom}</strong>
                                        <span className="subtext"><Clock size={10} /> {v.dateRv}</span>
                                    </div>
                                    <div className="status-mini-badge" style={{ background: v.visiteProg ? '#10b98115' : '#f59e0b15', color: v.visiteProg ? '#10b981' : '#f59e0b' }}>
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
        </div>
    );
};

export default Dashboard;
