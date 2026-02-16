import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, List, Search, MapPin, Users,
    Clock, Phone, MessageCircle, ExternalLink,
    Filter, AlertTriangle, Check
} from 'lucide-react';
import apiService from '../../services/api';
import './RequestsPage.css';

const RequestsSkeleton = () => (
    <div className="requests-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="request-card skeleton-card" style={{ height: '240px' }}>
                <div className="skeleton-header" style={{ padding: '1.25rem', display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ width: '60%', height: '16px', background: '#e2e8f0', marginBottom: '8px' }} />
                        <div style={{ width: '40%', height: '12px', background: '#e2e8f0' }} />
                    </div>
                </div>
                <div style={{ padding: '0 1.25rem', flex: 1 }}>
                    <div style={{ width: '100%', height: '14px', background: '#e2e8f0', marginBottom: '6px' }} />
                    <div style={{ width: '90%', height: '14px', background: '#e2e8f0', marginBottom: '6px' }} />
                    <div style={{ width: '80%', height: '14px', background: '#e2e8f0' }} />
                </div>
                <div style={{ padding: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ width: '100%', height: '36px', borderRadius: '8px', background: '#e2e8f0' }} />
                </div>
            </div>
        ))}
    </div>
);

const RequestsPage = () => {
    const [viewMode, setViewMode] = useState('grid');
    const [filter, setFilter] = useState('all'); // all, urgent, budget
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [error, setError] = useState(null);

    // Keywords that indicate a request/demand
    const DEMAND_KEYWORDS = [
        'cherche', 'recherche', 'besoin', 'urgent', 'asap',
        'budget', 'client', 'prospect', 'souhaite', 'fcfa', 'prix',
        'acheter', 'louer', 'prendre', 'voulais'
    ];

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Fetch raw publications
            const response = await apiService.getRequests();

            if (response.success) {
                // Client-side filtering logic
                // 1. Filter out known "offers" if possible (e.g., usually have images, price in title, etc.)
                // 2. Keep messages that contain demand keywords
                // 3. Keep text-heavy messages (requests usually are text, offers usually have images)

                const rawData = response.data || [];

                // Heuristic: Identify "Requests"
                const filtered = rawData.filter(msg => {
                    const text = (msg.message || '').toLowerCase();
                    const hasKeyword = DEMAND_KEYWORDS.some(k => text.includes(k));

                    // Exclude known automated messages or system notifications if distinct
                    // Also, requests often don't have an image, but sometimes they send a photo of what they want.
                    // Let's rely primarily on keywords for now.

                    return hasKeyword && text.length > 10; // Simple length check to avoid "Salut"
                });

                setRequests(filtered);
            } else {
                setError("Impossible de charger les demandes.");
            }
        } catch (err) {
            console.error(err);
            setError("Une erreur est survenue lors du chargement.");
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppClick = (phone, message) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        // Message to send: "Bonjour, suite à votre message dans [Groupe]..."
        const text = `Bonjour, concernant votre recherche : "${message.substring(0, 50)}..."`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Highlight keywords in text
    const highlightText = (text) => {
        if (!text) return null;

        // Simple regex replace for known keywords
        const parts = text.split(new RegExp(`(${DEMAND_KEYWORDS.join('|')})`, 'gi'));

        return (
            <span>
                {parts.map((part, i) =>
                    DEMAND_KEYWORDS.some(k => k.toLowerCase() === part.toLowerCase()) ?
                        <strong key={i} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part
                )}
            </span>
        );
    };

    const filteredRequests = requests.filter(req => {
        const text = (req.message || '').toLowerCase();
        const matchesSearch = text.includes(searchTerm.toLowerCase()) ||
            (req.expediteur || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.groupe || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === 'urgent') return text.includes('urgent') || text.includes('asap');
        if (filter === 'budget') return text.includes('budget') || text.includes('fcfa') || text.includes('prix');

        return true;
    });

    return (
        <div className="requests-page-container">
            <header className="requests-header">
                <div className="header-title-group">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="page-title-large"
                    >
                        <MessageCircle className="text-indigo-600" size={32} />
                        Demandes Clients
                    </motion.h2>
                    <p className="page-subtitle">
                        {filteredRequests.length} demandes détectées dans vos groupes
                    </p>
                </div>

                <div className="header-actions">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-outline"
                        onClick={() => fetchRequests()}
                    >
                        <Filter size={18} />
                        Actualiser
                    </motion.button>
                </div>
            </header>

            <div className="requests-toolbar">
                <div className="search-field">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filters-group">
                    <button
                        className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tout
                    </button>
                    <button
                        className={`filter-chip ${filter === 'urgent' ? 'active' : ''}`}
                        onClick={() => setFilter('urgent')}
                    >
                        Urgents
                    </button>
                    <button
                        className={`filter-chip ${filter === 'budget' ? 'active' : ''}`}
                        onClick={() => setFilter('budget')}
                    >
                        Avec Budget
                    </button>
                </div>

                <div className="view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="Vue Liste"
                    >
                        <List size={20} />
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Vue Grille"
                    >
                        <LayoutGrid size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <RequestsSkeleton />
            ) : error ? (
                <div className="error-state">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p>{error}</p>
                    <button className="btn btn-secondary mt-4" onClick={fetchRequests}>Réessayer</button>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="empty-state">
                    <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={40} className="text-slate-300" />
                    </div>
                    <h3>Aucune demande détectée</h3>
                    <p>Les messages contenant "cherche", "besoin" ou "budget" apparaîtront ici.</p>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? 'requests-grid' : 'requests-list-container'}>
                    <AnimatePresence>
                        {filteredRequests.map((req, index) => (
                            <motion.div
                                key={req.id || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ delay: index * 0.03 }}
                                className={`request-card ${viewMode === 'list' ? 'request-card-list' : ''}`}
                            >
                                <div className="request-card-header">
                                    <div className="sender-info">
                                        <div className="sender-avatar">
                                            {(req.expediteur || 'A').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="sender-details">
                                            <span className="sender-name">{req.expediteur || 'Anonyme'}</span>
                                            <div className="message-time">
                                                <Clock size={12} />
                                                {req.horodatage}
                                            </div>
                                        </div>
                                    </div>
                                    {req.type && (
                                        <span className="badge-type">
                                            {req.type}
                                        </span>
                                    )}
                                </div>

                                <div className="request-card-body">
                                    <div className="message-content">
                                        {highlightText(req.message)}
                                    </div>
                                </div>

                                <div className="request-card-footer">
                                    <div className="request-meta-info">
                                        {req.groupe && (
                                            <span className="meta-tag" title={req.groupe}>
                                                <Users size={12} />
                                                {req.groupe.split('@')[0].substring(0, 15)}...
                                            </span>
                                        )}
                                        {req.telephone && (
                                            <span className="meta-tag meta-phone">
                                                <Phone size={16} />
                                                {req.telephone}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="btn-whatsapp-action"
                                        onClick={() => handleWhatsAppClick(req.telephone, req.message)}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        Répondre
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default RequestsPage;
