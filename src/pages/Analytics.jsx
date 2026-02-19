import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building, Users, MapPin, Home, Key, Calendar,
    BarChart3, PieChart as PieIcon, Loader, RefreshCw, Bed, Tag
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import apiService from '../services/api';
import './Analytics.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#00f2fe', '#f5576c', '#fee140', '#10b981', '#f59e0b', '#8b5cf6'];

const tooltipStyle = {
    backgroundColor: 'rgba(30, 33, 57, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    color: '#ffffff', // Force White Text
};

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [properties, setProperties] = useState([]);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();

        const unsubscribe = apiService.subscribe('dataUpdate', ({ properties: p, visits: v, stats: s }) => {
            if (p?.success) setProperties(p.data);
            if (v?.success) setVisits(v.data);
            if (s?.success) setStats(s.data);
        });

        return () => unsubscribe();
    }, []);

    const loadData = async () => {
        try {
            const [propertiesRes, visitsRes, statsRes] = await Promise.all([
                apiService.getProperties(),
                apiService.getVisits(),
                apiService.getStats(),
            ]);
            if (propertiesRes.success) setProperties(propertiesRes.data);
            if (visitsRes.success) setVisits(visitsRes.data);
            if (statsRes.success) setStats(statsRes.data);
        } catch (error) {
            console.error('Error loading analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Loader className="spinner" size={40} />
                <p>Chargement des analytiques...</p>
            </div>
        );
    }

    // === TOUTES les données calulées depuis le Sheet ===

    // Distribution par type de bien
    const typeData = stats ? Object.entries(stats.parType).map(([name, value], i) => ({
        name, value, color: COLORS[i % COLORS.length]
    })) : [];

    // Distribution par zone
    const zoneData = stats ? Object.entries(stats.parZone).map(([name, value], i) => ({
        name, value, color: COLORS[i % COLORS.length]
    })) : [];

    // Disponibilité
    const disponibiliteData = stats ? [
        { name: 'Disponible', value: stats.biensDisponibles, color: '#10b981' },
        { name: 'Occupé', value: stats.biensOccupes, color: '#ef4444' },
    ].filter(d => d.value > 0) : [];

    // Meublés
    const meublesData = stats ? [
        { name: 'Meublé', value: stats.meubles, color: '#667eea' },
        { name: 'Non meublé', value: stats.nonMeubles, color: '#f59e0b' },
    ].filter(d => d.value > 0) : [];

    // Distribution par nombre de chambres
    const chambresMap = {};
    properties.forEach(p => {
        const ch = p.chambres > 0 ? `${p.chambres} ch.` : 'N/A';
        chambresMap[ch] = (chambresMap[ch] || 0) + 1;
    });
    const chambresData = Object.entries(chambresMap).map(([name, value], i) => ({
        name, value, color: COLORS[i % COLORS.length]
    }));

    // Distribution par publieur
    const publisherMap = {};
    properties.forEach(p => {
        const pub = p.publiePar || 'Inconnu';
        publisherMap[pub] = (publisherMap[pub] || 0) + 1;
    });
    const publisherData = Object.entries(publisherMap).map(([name, value], i) => ({
        name, value, color: COLORS[i % COLORS.length]
    }));

    // Distribution des prix par tranche
    const priceRanges = { '< 500K': 0, '500K - 2M': 0, '2M - 5M': 0, '5M - 10M': 0, '> 10M': 0 };
    properties.forEach(p => {
        if (p.rawPrice < 500000) priceRanges['< 500K']++;
        else if (p.rawPrice < 2000000) priceRanges['500K - 2M']++;
        else if (p.rawPrice < 5000000) priceRanges['2M - 5M']++;
        else if (p.rawPrice < 10000000) priceRanges['5M - 10M']++;
        else priceRanges['> 10M']++;
    });
    const priceData = Object.entries(priceRanges).map(([name, value], i) => ({
        name, value, color: COLORS[i % COLORS.length]
    })).filter(d => d.value > 0);

    // Tableau détaillé de tous les biens
    const sortedProperties = [...properties].sort((a, b) => b.rawPrice - a.rawPrice);

    return (
        <div className="analytics-page">
            {/* Header */}
            <motion.div className="analytics-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div>
                    <h2>Analytiques</h2>
                    <p className="analytics-subtitle">
                        Analyse basée sur {properties.length} biens et {visits.length} visite(s)
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={loadData}>
                    <RefreshCw size={16} />
                    Actualiser
                </button>
            </motion.div>

            {/* KPI Grid — Données réelles */}
            <div className="kpi-grid">
                <motion.div className="kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <div className="kpi-icon" style={{ background: 'var(--gradient-primary)' }}><Building size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Biens</span>
                        <div className="kpi-value">{stats?.totalBiens || 0}</div>
                        <div className="kpi-sub">{stats?.biensDisponibles || 0} disponible(s)</div>
                    </div>
                </motion.div>

                <motion.div className="kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="kpi-icon" style={{ background: 'var(--gradient-success)' }}><Key size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Taux Disponibilité</span>
                        <div className="kpi-value">{stats?.totalBiens > 0 ? Math.round((stats.biensDisponibles / stats.totalBiens) * 100) : 0}%</div>
                        <div className="kpi-sub">{stats?.biensDisponibles}/{stats?.totalBiens} biens</div>
                    </div>
                </motion.div>

                <motion.div className="kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="kpi-icon" style={{ background: 'var(--gradient-secondary)' }}><Calendar size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Visites</span>
                        <div className="kpi-value">{stats?.totalVisites || 0}</div>
                        <div className="kpi-sub">{stats?.visitesConfirmees || 0} confirmée(s)</div>
                    </div>
                </motion.div>

                <motion.div className="kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="kpi-icon" style={{ background: 'var(--gradient-warning)' }}><Bed size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Chambres (moy.)</span>
                        <div className="kpi-value">{stats?.chambresMoyen > 0 ? stats.chambresMoyen.toFixed(1) : 'N/A'}</div>
                        <div className="kpi-sub">par bien</div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Row 1 */}
            <div className="charts-row">
                <motion.div className="chart-card large" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="chart-header">
                        <div>
                            <h3><BarChart3 size={18} /> Biens par Zone</h3>
                            <p>Répartition géographique</p>
                        </div>
                    </div>
                    {zoneData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={zoneData} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} angle={-15} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="value" name="Biens" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 12, fill: '#e2e8f0', fontWeight: 700 }}>
                                    {zoneData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">Aucune donnée</div>
                    )}
                </motion.div>

                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="chart-header">
                        <div>
                            <h3><PieIcon size={18} /> Type de bien</h3>
                            <p>Répartition par catégorie</p>
                        </div>
                    </div>
                    {typeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                                    {typeData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontSize: 13 }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} />
                                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '13px', color: '#cbd5e1' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">Aucune donnée</div>
                    )}
                </motion.div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-row">
                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <div className="chart-header">
                        <div>
                            <h3><Key size={18} /> Disponibilité</h3>
                            <p>Biens disponibles vs occupés</p>
                        </div>
                    </div>
                    {disponibiliteData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={disponibiliteData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                                    {disponibiliteData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontSize: 13 }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">Aucune donnée</div>
                    )}
                </motion.div>

                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <div className="chart-header">
                        <div>
                            <h3><Home size={18} /> Ameublement</h3>
                            <p>Meublé vs Non meublé</p>
                        </div>
                    </div>
                    {meublesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={meublesData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                                    {meublesData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontSize: 13 }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">Aucune donnée</div>
                    )}
                </motion.div>
            </div>

            {/* Charts Row 3 */}
            <div className="charts-row">
                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <div className="chart-header">
                        <div>
                            <h3><Bed size={18} /> Nombre de chambres</h3>
                            <p>Distribution par nombre de chambres</p>
                        </div>
                    </div>
                    {chambresData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chambresData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontSize: 13 }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="value" name="Biens" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 12, fill: '#e2e8f0', fontWeight: 700 }}>
                                    {chambresData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">Aucune donnée</div>
                    )}
                </motion.div>

                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                    <div className="chart-header">
                        <div>
                            <h3><Tag size={18} /> Gamme de prix</h3>
                            <p>Distribution par tranche de prix</p>
                        </div>
                    </div>
                    {priceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={priceData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} angle={-10} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontSize: 13 }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="value" name="Biens" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 12, fill: '#e2e8f0', fontWeight: 700 }}>
                                    {priceData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">Aucune donnée</div>
                    )}
                </motion.div>
            </div>

            {/* Tableau récapitulatif des biens */}
            <motion.div className="chart-card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <div className="chart-header">
                    <div>
                        <h3><Building size={18} /> Récapitulatif des biens</h3>
                        <p>Tous les biens triés par prix décroissant</p>
                    </div>
                </div>
                <div className="performance-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Zone</th>
                                <th>Prix</th>
                                <th>Chambres</th>
                                <th>Meublé</th>
                                <th>Disponible</th>
                                <th>Publié par</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProperties.map((prop, index) => (
                                <motion.tr
                                    key={prop.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9 + index * 0.03 }}
                                >
                                    <td className="zone-name">{prop.typeBien}</td>
                                    <td>{prop.zone}</td>
                                    <td className="revenue-cell">{prop.prixFormate}</td>
                                    <td>{prop.chambres > 0 ? prop.chambres : '—'}</td>
                                    <td>
                                        <span className={`rate-badge ${prop.meuble ? 'high' : 'low'}`}>
                                            {prop.meuble ? 'Oui' : 'Non'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`rate-badge ${prop.disponible ? 'high' : 'low'}`}>
                                            {prop.disponible ? 'Oui' : 'Non'}
                                        </span>
                                    </td>
                                    <td>{prop.publiePar}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Tableau des visites */}
            {visits.length > 0 && (
                <motion.div className="chart-card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
                    <div className="chart-header">
                        <div>
                            <h3><Calendar size={18} /> Visites programmées</h3>
                            <p>Toutes les visites enregistrées</p>
                        </div>
                    </div>
                    <div className="performance-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nom & Prénom</th>
                                    <th>Numéro</th>
                                    <th>Date RV</th>
                                    <th>Bien intéressé</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visits.map((visit, index) => (
                                    <motion.tr
                                        key={visit.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1.1 + index * 0.03 }}
                                    >
                                        <td className="zone-name">{visit.nomPrenom}</td>
                                        <td>{visit.numero}</td>
                                        <td>{visit.dateRv}</td>
                                        <td>{visit.localInteresse}</td>
                                        <td>
                                            <span className={`rate-badge ${visit.visiteProg ? 'high' : 'low'}`}>
                                                {visit.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Analytics;
