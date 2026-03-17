import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileBarChart,
    MessageSquare,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Calendar,
    Download,
    RefreshCw,
    ShieldCheck,
    Cpu
} from 'lucide-react';
import apiService from '../services/api';
import { supabase } from '../services/supabaseClient';
import './Reporting.css';

const Reporting = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalMessages: 0,
        validAds: 0,
        rejectedMessages: 0,
        avgProcessingTime: '8.4s',
        systemStatus: 'Opérationnel',
        activeWorkflows: 3,
        lastMonthVolume: 0,
        accuracy: '94%'
    });
    const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'

    useEffect(() => {
        fetchMetrics();
    }, [period]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            // Dans un cas réel, on ferait des requêtes COUNT(*) groupées par date
            // Ici on simule l'extraction depuis Supabase pour le démonstrateur

            const { count: totalPubs } = await supabase
                .from('publications')
                .select('*', { count: 'exact', head: true });

            const { count: totalLocaux } = await supabase
                .from('locaux')
                .select('*', { count: 'exact', head: true });

            const { count: totalVisits } = await supabase
                .from('visite_programmee')
                .select('*', { count: 'exact', head: true });

            // Simulation de données historiques pour le rapport
            setMetrics({
                totalMessages: totalPubs || 0,
                validAds: totalLocaux || 0,
                rejectedMessages: (totalPubs || 0) - (totalLocaux || 0),
                avgProcessingTime: '7.2s',
                systemStatus: 'Opérationnel',
                activeWorkflows: 4,
                totalVisits: totalVisits || 0,
                accuracy: '96.2%'
            });
        } catch (error) {
            console.error('Error fetching reporting metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="reporting-page">
            <motion.div
                className="reporting-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1>Rapport d'Exploitation IA</h1>
                    <p className="subtitle">Suivi de l'activité d'automatisation et performance système</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchMetrics}>
                        <RefreshCw size={18} />
                        Actualiser
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        <Download size={18} />
                        Exporter PDF
                    </button>
                </div>
            </motion.div>

            <div className="status-banner">
                <div className="status-pill success">
                    <ShieldCheck size={16} />
                    Système : {metrics.systemStatus}
                </div>
                <div className="status-pill info">
                    <Cpu size={16} />
                    Workflows actifs : {metrics.activeWorkflows}
                </div>
                <div className="status-date">
                    Période : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div className="metrics-grid">
                <motion.div className="metric-card" whileHover={{ y: -5 }}>
                    <div className="metric-icon messages"><MessageSquare /></div>
                    <div className="metric-info">
                        <h3>Messages Brut</h3>
                        <div className="value">{metrics.totalMessages}</div>
                        <p>Traités depuis les groupes WhatsApp</p>
                    </div>
                </motion.div>

                <motion.div className="metric-card" whileHover={{ y: -5 }}>
                    <div className="metric-icon valid"><CheckCircle2 /></div>
                    <div className="metric-info">
                        <h3>Offres Validées</h3>
                        <div className="value">{metrics.validAds}</div>
                        <p>Extraites et structurées par l'IA</p>
                    </div>
                </motion.div>

                <motion.div className="metric-card" whileHover={{ y: -5 }}>
                    <div className="metric-icon accuracy"><FileBarChart /></div>
                    <div className="metric-info">
                        <h3>Précision IA</h3>
                        <div className="value">{metrics.accuracy}</div>
                        <p>Taux de qualification correcte</p>
                    </div>
                </motion.div>

                <motion.div className="metric-card" whileHover={{ y: -5 }}>
                    <div className="metric-icon time"><Clock /></div>
                    <div className="metric-info">
                        <h3>Temps de Traitement</h3>
                        <div className="value">{metrics.avgProcessingTime}</div>
                        <p>Moyenne par annonce</p>
                    </div>
                </motion.div>
            </div>

            <div className="reporting-sections">
                <section className="report-box">
                    <h2>Résumé de l'activité mensuelle</h2>
                    <div className="summary-content">
                        <p>
                            Ce mois-ci, le moteur <strong>ImmoDash AI</strong> a filtré automatiquement
                            <strong> {metrics.rejectedMessages} messages</strong> non pertinents (discussions, publicités tierces, spam),
                            permettant à vos agents de se concentrer uniquement sur les
                            <strong> {metrics.validAds} opportunités réelles</strong>.
                        </p>
                        <div className="comparison-bar">
                            <div className="bar-label">Efficacité du filtrage</div>
                            <div className="bar-container">
                                <div className="bar-fill" style={{ width: `${(metrics.validAds / metrics.totalMessages) * 100 || 0}%` }}></div>
                            </div>
                            <div className="bar-legend">
                                <span>Messages Totaux: {metrics.totalMessages}</span>
                                <span>Utiles: {metrics.validAds}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="report-box">
                    <h2>Maintenance & Optimisations</h2>
                    <ul className="maintenance-list">
                        <li>
                            <div className="list-icon"><ShieldCheck size={18} /></div>
                            <div className="list-text">
                                <strong>Sécurité des données :</strong> Chiffrement des tunnels n8n et rotation des clés API effectuée.
                            </div>
                        </li>
                        <li>
                            <div className="list-icon"><CheckCircle2 size={18} /></div>
                            <div className="list-text">
                                <strong>Mise à jour IA :</strong> Optimisation du prompt pour l'extraction des numéros de téléphone masqués.
                            </div>
                        </li>
                        <li>
                            <div className="list-icon"><AlertTriangle size={18} /></div>
                            <div className="list-text">
                                <strong>Incidents :</strong> 0 interruption de service majeure détectée sur la période.
                            </div>
                        </li>
                    </ul>
                </section>
            </div>

            <div className="reporting-footer">
                <p>Rapport généré automatiquement par le module d'assistance ImmoDash Pro.</p>
                <p>© {new Date().getFullYear()} - Service Maintenance & Evolution</p>
            </div>
        </div>
    );
};

export default Reporting;
