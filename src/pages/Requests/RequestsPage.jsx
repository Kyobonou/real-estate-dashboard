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
                        <span key={i} className="keyword-highlight">{part}</span> : part
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
                                            <span className="meta-tag">
                                                <Phone size={12} />
                                                {req.telephone}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="btn-whatsapp-action"
                                        onClick={() => handleWhatsAppClick(req.telephone, req.message)}
                                    >
                                        <MessageCircle size={16} />
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
