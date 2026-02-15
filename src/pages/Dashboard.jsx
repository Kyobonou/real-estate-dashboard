import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Building, Users, Calendar, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    MapPin, Clock, RefreshCw, ChevronRight, Activity, Home, Key, X, PieChart as PieChartIcon,
    ArrowRight
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
                <div key={i} className="stat-card-v3" style={{ height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

        <div className="dashboard-grid">
            <div className="charts-section">
                <div className="card-panel">
                    <div className="panel-header">
                        <Skeleton width="150px" height="24px" />
                    </div>
                    <div className="chart-wrapper h-full">
                        <Skeleton type="rect" height="100%" />
                    </div>
                </div>

                <div className="card-panel">
                    <div className="panel-header">
                        <Skeleton width="120px" height="24px" />
                    </div>
                    <div className="chart-wrapper h-200" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Skeleton className="skeleton-circle" width="180px" height="180px" />
                    </div>
                </div>
            </div>

            <div className="bottom-section">
                {[1, 2, 3].map(i => (
                    <div key={i} className="card-panel">
                        <div className="panel-header">
                            <Skeleton width="120px" height="24px" />
                        </div>
                        <div className="list-container">
                            <Skeleton type="rect" height="60px" style={{ marginBottom: '10px' }} />
                            <Skeleton type="rect" height="60px" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);


// Components internal optimized for Dashboard V2
const StatCardV3 = ({ title, value, icon: Icon, trend, trendValue, color }) => (
    <div className="stat-card-v3">
        <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: `${color}15`, color: color }}>
                <Icon size={20} />
            </div>
            {trend && (
                <div className={`stat-trend-badge ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
                    {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trendValue}
                </div>
            )}
        </div>
        <div className="stat-body">
            <h3>{value}</h3>
            <p>{title}</p>
        </div>
    </div>
);

const ListItem = ({ title, subtitle, meta, icon: Icon, color, metaColor }) => (
    <div className="list-item">
        <div className="item-icon-box" style={{ backgroundColor: `${color}15`, color: color }}>
            <Icon size={18} />
        </div>
        <div className="item-content">
            <span className="item-title" title={title}>{title}</span>
            <div className="item-subtitle">
                {subtitle}
            </div>
        </div>
        {meta && <span className="item-meta" style={{ color: metaColor || 'var(--text-primary)' }}>{meta}</span>}
    </div>
);

const WelcomeBanner = ({ onClose }) => (
    <motion.div
        className="welcome-banner"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        style={{ marginBottom: '1.5rem' }}
    >
        <div className="welcome-content">
            <div className="welcome-icon">
                <Home size={28} color="white" />
            </div>
            <div className="welcome-text">
                <h3>Tableau de Bord Pro</h3>
                <p>Bienvenue sur votre espace de gestion immobilière optimisé.</p>
            </div>
            <button className="btn-close-banner" onClick={onClose}><X size={20} /></button>
        </div>
    </motion.div>
);

const Dashboard = () => {
    // Hooks defined at top level
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [properties, setProperties] = useState([]);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    // Data Load Logic
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [sRes, pRes, vRes] = await Promise.all([
                apiService.getStats(isRefresh),
                apiService.getProperties(isRefresh),
                apiService.getVisits(isRefresh)
            ]);

            if (sRes.success) setStats(sRes.data);
            if (pRes.success) setProperties(pRes.data);
            if (vRes.success) setVisits(vRes.data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(false), 30000);

        const bannerDismissed = localStorage.getItem('welcome_dismissed');
        if (bannerDismissed) setShowWelcome(false);

        return () => clearInterval(interval);
    }, [loadData]);

    const handleRefresh = () => loadData(true);
    const dismissWelcome = () => {
        setShowWelcome(false);
        localStorage.setItem('welcome_dismissed', 'true');
    };

    // --- COMPUTED DATA ---

    // 1. Commune Data
    const communeData = useMemo(() => {
        if (!stats?.parCommune) return [];
        const entries = Object.entries(stats.parCommune)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (entries.length > 7) {
            const top7 = entries.slice(0, 7);
            const others = entries.slice(7).reduce((sum, item) => sum + item.value, 0);
            return [...top7, { name: 'Autres', value: others }];
        }
        return entries;
    }, [stats]);

    // 2. Types Data
    const typeData = useMemo(() => {
        if (!stats?.parType) return [];
        const entries = Object.entries(stats.parType)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (entries.length > 5) {
            const top5 = entries.slice(0, 5);
            const others = entries.slice(5).reduce((sum, item) => sum + item.value, 0);
            return [...top5, { name: 'Autres', value: others }];
        }
        return entries;
    }, [stats]);

    // 3. Availability
    const availabilityData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Disponible', value: stats.biensDisponibles || 0, color: '#10b981' },
            { name: 'Occupé', value: stats.biensOccupes || 0, color: '#ef4444' }
        ];
    }, [stats]);

    // 4. Recent Properties (Top 5)
    const recentProperties = useMemo(() => {
        if (!properties.length) return [];
        return [...properties]
            .sort((a, b) => new Date(b.datePublication || 0) - new Date(a.datePublication || 0))
            .slice(0, 5);
    }, [properties]);

    // 5. Upcoming Visits (Top 5)
    const upcomingVisits = useMemo(() => {
        if (!visits.length) return [];
        return [...visits]
            .filter(v => v.status === 'Programmée' || v.status === "Aujourd'hui")
            .sort((a, b) => (a.parsedDate || 0) - (b.parsedDate || 0))
            .slice(0, 5);
    }, [visits]);


    const COLORS = ['#4f46e5', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    color: '#f1f5f9'
                }}>
                    <p style={{ fontSize: '11px', marginBottom: '2px', opacity: 0.7, textTransform: 'uppercase' }}>{label || payload[0].name}</p>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: payload[0].payload.fill || payload[0].color }}>
                        {payload[0].value} {payload[0].name === 'Prix' ? 'FCFA' : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading && !stats) return <DashboardSkeleton />;

    return (
        <motion.div
            className="dashboard-v2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <header className="dashboard-header">
                <div className="header-text">
                    <h1>Vue d'ensemble</h1>
                    <p>Suivi en temps réel de votre parc immobilier</p>
                </div>
                <button className={`btn btn-secondary ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
                    <RefreshCw size={18} />
                    <span className="desktop-only">{refreshing ? 'Synchro...' : 'Actualiser'}</span>
                </button>
            </header>

            <AnimatePresence>
                {showWelcome && <WelcomeBanner onClose={dismissWelcome} />}
            </AnimatePresence>

            <div className="dashboard-grid">

                {/* 1. KPI SECTION */}
                <section className="kpi-section">
                    <StatCardV3
                        title="Patrimoine Total"
                        value={stats?.totalBiens || 0}
                        icon={Building}
                        color="#4f46e5"
                        trend="neutral"
                        trendValue="Biens"
                    />
                    <StatCardV3
                        title="Taux Disponibilité"
                        value={`${stats?.totalBiens ? Math.round((stats.biensDisponibles / stats.totalBiens) * 100) : 0}%`}
                        icon={PieChartIcon}
                        color="#10b981"
                        trend={stats?.biensDisponibles > 0 ? 'up' : 'neutral'}
                        trendValue={`${stats?.biensDisponibles} Dispo.`}
                    />
                    <StatCardV3
                        title="Visites Actives"
                        value={(stats?.visitesProgrammees || 0) + (stats?.visitesAujourdhui || 0)}
                        icon={Calendar}
                        color="#ec4899"
                        trend="up"
                        trendValue="À venir"
                    />
                    <StatCardV3
                        title="Clients Uniques"
                        value={stats?.totalClients || 0}
                        icon={Users}
                        color="#8b5cf6"
                        trend="up"
                        trendValue="Prospects"
                    />
                </section>

                {/* 2. CHARTS SECTION */}
                <section className="charts-section">
                    {/* Commune Chart */}
                    <div className="card-panel">
                        <div className="panel-header">
                            <h3>Répartition par Commune</h3>
                            <MapPin size={16} className="text-secondary" />
                        </div>
                        <div className="chart-wrapper h-full">
                            {communeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={communeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                            {communeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex-center h-full text-muted">Pas de données</div>
                            )}
                        </div>
                    </div>

                    {/* Types Chart */}
                    <div className="card-panel">
                        <div className="panel-header">
                            <h3>Types de Biens</h3>
                            <Home size={16} className="text-secondary" />
                        </div>
                        <div className="chart-wrapper h-200">
                            {typeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={typeData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
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
                            ) : <div className="flex-center h-full text-muted">N/A</div>}
                        </div>
                        {/* Legend */}
                        <div className="custom-legend">
                            {typeData.slice(0, 4).map((entry, index) => (
                                <div key={index} className="legend-item">
                                    <span className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    <span>{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. BOTTOM SECTION */}
                <section className="bottom-section">

                    {/* A. Disponibilité */}
                    <div className="card-panel">
                        <div className="panel-header">
                            <h3>Occupation</h3>
                            <PieChartIcon size={16} className="text-secondary" />
                        </div>
                        <div className="chart-wrapper h-200 availability-content">
                            {stats ? (
                                <>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={availabilityData}
                                                startAngle={180}
                                                endAngle={0}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={0}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {availabilityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="donut-center-text" style={{ top: '60%' }}>
                                        <span className="donut-number">{availabilityData[0].value}</span>
                                        <span className="donut-label">Disponibles</span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* B. Derniers Ajouts */}
                    <div className="card-panel">
                        <div className="panel-header">
                            <h3>Derniers Ajouts</h3>
                            <button className="btn-icon-link" onClick={() => navigate('/properties')} title="Voir tout">
                                <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="list-container">
                            {recentProperties.map((p, i) => (
                                <ListItem
                                    key={i}
                                    title={p.typeBien}
                                    subtitle={`${p.commune || p.zone} • ${p.prixFormate}`}
                                    meta={p.status === 'Disponible' ? 'Dispo' : 'Occupé'}
                                    metaColor={p.status === 'Disponible' ? '#10b981' : '#ef4444'}
                                    icon={Home}
                                    color="#6366f1"
                                />
                            ))}
                            {recentProperties.length === 0 && <p className="text-muted text-center py-4">Aucun bien récent</p>}
                        </div>
                    </div>

                    {/* C. Visites à venir */}
                    <div className="card-panel">
                        <div className="panel-header">
                            <h3>Prochaines Visites</h3>
                            <button className="btn-icon-link" onClick={() => navigate('/visits')} title="Voir tout">
                                <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="list-container">
                            {upcomingVisits.map((v, i) => (
                                <ListItem
                                    key={i}
                                    title={v.nomPrenom}
                                    subtitle={`${v.dateRv} • ${v.localInteresse || 'N/A'}`}
                                    meta={v.status}
                                    metaColor={v.status === "Aujourd'hui" ? '#f59e0b' : '#ec4899'}
                                    icon={Calendar}
                                    color="#ec4899"
                                />
                            ))}
                            {upcomingVisits.length === 0 && <p className="text-muted text-center py-4">Aucune visite programmée</p>}
                        </div>
                    </div>

                </section>
            </div>
        </motion.div>
    );
};

export default Dashboard;
