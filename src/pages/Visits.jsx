import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, User, Phone, MapPin, CheckCircle, XCircle,
    Info, Search, Filter, Trash2, Edit2, Plus, ExternalLink, RefreshCw
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import './Visits.css';

const VisitCard = ({ visit, index }) => {
    const { addToast } = useToast();
    const isProgrammed = visit.visiteProg;

    const handleCall = (e) => {
        e.stopPropagation();
        window.open(`tel:${visit.telephone}`, '_self');
        addToast({ type: 'info', title: 'Appel', message: `Composition du numéro ${visit.telephone}` });
    };

    const handleWhatsApp = (e) => {
        e.stopPropagation();
        const phone = visit.telephone.replace(/\s/g, '');
        const message = encodeURIComponent(`Bonjour ${visit.nomPrenom}, je reviens vers vous concernant votre demande de visite pour un bien à ${visit.zoneInt}.`);
        window.open(`https://wa.me/225${phone}?text=${message}`, '_blank');
        addToast({ type: 'success', title: 'WhatsApp', message: 'Lancement de la conversation...' });
    };

    return (
        <motion.div
            className={`visit-card-v2 ${isProgrammed ? 'programmed' : 'tentative'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
        >
            <div className="visit-badge">
                {isProgrammed ? <CheckCircle size={14} /> : <Clock size={14} />}
                <span>{isProgrammed ? 'Visite Confirmée' : 'Tentative'}</span>
            </div>

            <div className="visit-main-info">
                <div className="visit-user">
                    <div className="user-avatar" style={{ background: isProgrammed ? 'var(--gradient-success)' : 'var(--gradient-primary)' }}>
                        {visit.nomPrenom.charAt(0)}
                    </div>
                    <div className="user-text">
                        <h3>{visit.nomPrenom}</h3>
                        <span>{visit.telephone}</span>
                    </div>
                </div>
            </div>

            <div className="visit-details-grid">
                <div className="detail-item">
                    <MapPin size={16} />
                    <div>
                        <span className="label">Zone d'intérêt</span>
                        <span className="value">{visit.zoneInt}</span>
                    </div>
                </div>
                <div className="detail-item">
                    <Calendar size={16} />
                    <div>
                        <span className="label">Date</span>
                        <span className="value">{visit.dateRv}</span>
                    </div>
                </div>
            </div>

            {visit.notes && (
                <div className="visit-notes">
                    <p>{visit.notes}</p>
                </div>
            )}

            <div className="visit-footer">
                <div className="visit-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleCall}>
                        <Phone size={14} /> Appeler
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleWhatsApp}>
                        WhatsApp
                    </button>
                </div>
            </div>

            <div className="visit-bg-pattern"></div>
        </motion.div>
    );
};

const Visits = () => {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, programmed, tentative
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadVisits();
        const unsubscribe = apiService.subscribe('dataUpdate', ({ visits: v }) => {
            if (v?.success) setVisits(v.data);
        });
        return () => unsubscribe();
    }, []);

    const loadVisits = async () => {
        try {
            const response = await apiService.getVisits();
            if (response.success) {
                setVisits(response.data);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadVisits();
    };

    const filteredVisits = visits.filter(visit => {
        const matchesSearch =
            visit.nomPrenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visit.zoneInt.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visit.telephone.includes(searchTerm);

        const matchesFilter =
            filter === 'all' ||
            (filter === 'programmed' && visit.visiteProg) ||
            (filter === 'tentative' && !visit.visiteProg);

        return matchesSearch && matchesFilter;
    });

    if (loading && !refreshing) {
        return (
            <div className="dashboard-loading">
                <RefreshCw className="spinner" size={40} />
                <p>Récupération des rendez-vous...</p>
            </div>
        );
    }

    return (
        <div className="visits-v2">
            <header className="visits-header">
                <div>
                    <h1>Gestion des Visites</h1>
                    <p>{filteredVisits.length} visites filtrées sur un total de {visits.length}</p>
                </div>
                <button className={`btn btn-secondary ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
                    <RefreshCw size={18} />
                    Actualiser
                </button>
            </header>

            <div className="visits-toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un client, une zone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-chips">
                    <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Toutes</button>
                    <button className={`chip ${filter === 'programmed' ? 'active' : ''}`} onClick={() => setFilter('programmed')}>Programmées</button>
                    <button className={`chip ${filter === 'tentative' ? 'active' : ''}`} onClick={() => setFilter('tentative')}>Tentatives</button>
                </div>
            </div>

            <div className="visits-grid">
                <AnimatePresence>
                    {filteredVisits.map((visit, index) => (
                        <VisitCard key={visit.id} visit={visit} index={index} />
                    ))}
                </AnimatePresence>
            </div>

            {filteredVisits.length === 0 && (
                <div className="empty-state">
                    <Calendar size={48} />
                    <p>Aucune visite trouvée</p>
                    <button className="btn btn-secondary" onClick={() => { setFilter('all'); setSearchTerm(''); }}>
                        Voir toutes les visites
                    </button>
                </div>
            )}
        </div>
    );
};

export default Visits;
