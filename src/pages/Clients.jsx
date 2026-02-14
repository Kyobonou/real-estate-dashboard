import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, RefreshCw, LayoutGrid, List, Phone,
    Calendar, MapPin, CheckCircle, Clock, X, TrendingUp,
    UserPlus, UserCheck, UserX, SlidersHorizontal, ArrowUpDown, Filter
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import Skeleton from '../components/Skeleton';
import { debounce } from '../utils/performance';
import './Clients.css';

const ClientsSkeleton = ({ viewMode }) => (
    <div className="clients-page">
        <div className="clients-header">
            <div className="header-text">
                <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="150px" height="20px" />
            </div>
            <Skeleton width="100px" height="40px" />
        </div>

        <div className="clients-kpi-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="client-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Skeleton className="skeleton-circle" width="48px" height="48px" />
                    <div>
                        <Skeleton width="80px" height="16px" style={{ marginBottom: '4px' }} />
                        <Skeleton width="40px" height="24px" />
                    </div>
                </div>
            ))}
        </div>

        <div className="clients-toolbar-modern">
            <Skeleton width="100%" height="50px" type="rect" style={{ borderRadius: '12px' }} />
        </div>

        {viewMode === 'grid' ? (
            <div className="clients-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="client-card" style={{ height: '220px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <Skeleton className="skeleton-circle" width="40px" height="40px" />
                            <Skeleton width="60px" height="20px" style={{ borderRadius: '20px' }} />
                        </div>
                        <Skeleton width="70%" height="24px" style={{ marginBottom: '10px' }} />
                        <Skeleton width="40%" height="16px" style={{ marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                            <Skeleton width="30%" height="16px" />
                            <Skeleton width="30%" height="16px" />
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="clients-list-container">
                <table className="clients-table">
                    <thead>
                        <tr>
                            {[1, 2, 3, 4, 5, 6].map(k => <th key={k}><Skeleton width="60%" height="16px" /></th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i}>
                                <td><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Skeleton className="skeleton-circle" width="32px" height="32px" /><Skeleton width="100px" height="16px" /></div></td>
                                <td><Skeleton width="80px" height="24px" style={{ borderRadius: '20px' }} /></td>
                                <td><Skeleton width="40px" height="16px" /></td>
                                <td><Skeleton width="100px" height="16px" /></td>
                                <td><Skeleton width="120px" height="24px" /></td>
                                <td><Skeleton width="80px" height="32px" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);


// --- KPI Card ---
const KpiCard = ({ title, value, icon: Icon, color }) => (
    <motion.div
        className="card client-kpi-card"
        whileHover={{ y: -4 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
    >
        <div className="kpi-icon" style={{ background: `${color}15`, color }}>
            <Icon size={22} />
        </div>
        <div className="kpi-content">
            <span className="kpi-label">{title}</span>
            <h3 className="kpi-value">{value}</h3>
        </div>
    </motion.div>
);

// --- Client Actions (hidden for viewers) ---
const ClientActions = React.memo(({ client, addToast, canAction = true }) => {
    if (!canAction) return null;
    const handleCall = (e) => {
        e.stopPropagation();
        if (!client.numero) return;
        window.open(`tel:${client.numero}`, '_self');
        addToast({ type: 'info', title: 'Appel', message: `Composition du ${client.numero}` });
    };

    const handleWhatsApp = (e) => {
        e.stopPropagation();
        if (!client.numero) return;
        const phone = client.numero.replace(/\s/g, '');
        const message = encodeURIComponent(`Bonjour ${client.nomPrenom}, nous revenons vers vous concernant votre recherche immobilière.`);
        window.open(`https://wa.me/225${phone}?text=${message}`, '_blank');
        addToast({ type: 'success', title: 'WhatsApp', message: 'Lancement de la conversation...' });
    };

    return (
        <div className="client-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleCall} title="Appeler" disabled={!client.numero}>
                <Phone size={14} /> <span className="desktop-only">Appeler</span>
            </button>
            <button className="btn btn-whatsapp btn-sm" onClick={handleWhatsApp} title="WhatsApp" disabled={!client.numero}>
                WhatsApp
            </button>
        </div>
    );
});

// --- Status Badge ---
const StatusBadge = ({ statut }) => {
    const config = {
        'Nouveau': { className: 'badge-info', icon: UserPlus },
        'Actif': { className: 'badge-success', icon: UserCheck },
        'Inactif': { className: 'badge-warning', icon: UserX },
    };
    const { className, icon: Icon } = config[statut] || config['Nouveau'];
    return (
        <span className={`badge ${className}`}>
            <Icon size={12} />
            {statut}
        </span>
    );
};

// --- Avatar ---
const ClientAvatar = ({ nomPrenom, statut }) => {
    const gradients = {
        'Nouveau': 'var(--gradient-primary)',
        'Actif': 'var(--gradient-success)',
        'Inactif': 'linear-gradient(135deg, #f59e0b, #d97706)',
    };
    const initials = nomPrenom
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase())
        .join('');

    return (
        <div className="client-avatar" style={{ background: gradients[statut] || gradients['Nouveau'] }}>
            {initials || '?'}
        </div>
    );
};

// --- Grid View ---
const GridView = React.memo(({ clients, addToast, onSelect, canAction }) => (
    <div className="clients-grid">
        {clients.map((client, index) => (
            <motion.div
                key={client.id}
                className="card client-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ y: -4 }}
                onClick={() => onSelect(client)}
            >
                <div className="client-card-header">
                    <ClientAvatar nomPrenom={client.nomPrenom} statut={client.statut} />
                    <StatusBadge statut={client.statut} />
                </div>

                <div className="client-card-body">
                    <h3 className="client-name">{client.nomPrenom}</h3>
                    {client.numero && (
                        <a href={`tel:${client.numero}`} className="client-phone" onClick={e => e.stopPropagation()}>
                            <Phone size={13} /> {client.numero}
                        </a>
                    )}

                    <div className="client-stats-row">
                        <div className="client-stat">
                            <Calendar size={14} />
                            <span>{client.totalVisites} visite{client.totalVisites > 1 ? 's' : ''}</span>
                        </div>
                        <div className="client-stat">
                            <Clock size={14} />
                            <span>{client.derniereVisite ? formatDate(client.derniereVisite) : '-'}</span>
                        </div>
                    </div>

                    {client.zonesInteret.length > 0 && (
                        <div className="client-chips">
                            {client.zonesInteret.slice(0, 3).map((zone, i) => (
                                <span key={i} className="zone-chip">
                                    <MapPin size={11} /> {zone}
                                </span>
                            ))}
                            {client.zonesInteret.length > 3 && (
                                <span className="zone-chip more">+{client.zonesInteret.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="client-card-footer">
                    <ClientActions client={client} addToast={addToast} canAction={canAction} />
                </div>
            </motion.div>
        ))}
    </div>
));

// --- List View ---
const ListView = React.memo(({ clients, addToast, onSelect, canAction }) => (
    <div className="clients-list-container">
        <table className="clients-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Visites</th>
                    <th>Dernière visite</th>
                    <th>Zones</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {clients.map(client => (
                    <tr key={client.id} onClick={() => onSelect(client)} className="client-row">
                        <td>
                            <div className="list-client-cell">
                                <ClientAvatar nomPrenom={client.nomPrenom} statut={client.statut} />
                                <div className="client-text">
                                    <h3>{client.nomPrenom}</h3>
                                    <span>{client.numero || '-'}</span>
                                </div>
                            </div>
                        </td>
                        <td><StatusBadge statut={client.statut} /></td>
                        <td>
                            <span className="visit-count">
                                {client.totalVisites}
                                {client.visitesConfirmees > 0 && (
                                    <span className="confirmed"> ({client.visitesConfirmees} conf.)</span>
                                )}
                            </span>
                        </td>
                        <td>{client.derniereVisite ? formatDate(client.derniereVisite) : '-'}</td>
                        <td>
                            <div className="client-chips compact">
                                {client.zonesInteret.slice(0, 2).map((zone, i) => (
                                    <span key={i} className="zone-chip small">{zone}</span>
                                ))}
                                {client.zonesInteret.length > 2 && (
                                    <span className="zone-chip small more">+{client.zonesInteret.length - 2}</span>
                                )}
                            </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                            <ClientActions client={client} addToast={addToast} canAction={canAction} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
));

// --- Client Detail Modal ---
const ClientDetailModal = ({ client, onClose, addToast, canAction }) => {
    if (!client) return null;

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="client-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <ClientAvatar nomPrenom={client.nomPrenom} statut={client.statut} />
                    <div className="modal-header-info">
                        <h2>{client.nomPrenom}</h2>
                        <StatusBadge statut={client.statut} />
                    </div>
                </div>

                <div className="modal-body">
                    <div className="modal-info-grid">
                        <div className="info-item">
                            <Phone size={16} />
                            <div>
                                <span className="info-label">Téléphone</span>
                                <span className="info-value">
                                    {client.numero ? (
                                        <a href={`tel:${client.numero}`}>{client.numero}</a>
                                    ) : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="info-item">
                            <Calendar size={16} />
                            <div>
                                <span className="info-label">Total visites</span>
                                <span className="info-value">{client.totalVisites} ({client.visitesConfirmees} confirmées)</span>
                            </div>
                        </div>
                        <div className="info-item">
                            <Clock size={16} />
                            <div>
                                <span className="info-label">Première visite</span>
                                <span className="info-value">{client.premiereVisite ? formatDate(client.premiereVisite) : '-'}</span>
                            </div>
                        </div>
                        <div className="info-item">
                            <Clock size={16} />
                            <div>
                                <span className="info-label">Dernière visite</span>
                                <span className="info-value">{client.derniereVisite ? formatDate(client.derniereVisite) : '-'}</span>
                            </div>
                        </div>
                    </div>

                    {client.zonesInteret.length > 0 && (
                        <div className="modal-zones">
                            <h4><MapPin size={15} /> Zones d'intérêt</h4>
                            <div className="client-chips">
                                {client.zonesInteret.map((zone, i) => (
                                    <span key={i} className="zone-chip">{zone}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="modal-timeline">
                        <h4><Calendar size={15} /> Historique des visites</h4>
                        <div className="timeline">
                            {client.visites.map((visit, i) => (
                                <div key={i} className={`timeline-item ${visit.visiteProg ? 'confirmed' : 'pending'}`}>
                                    <div className="timeline-dot">
                                        {visit.visiteProg ? <CheckCircle size={14} /> : <Clock size={14} />}
                                    </div>
                                    <div className="timeline-content">
                                        <span className="timeline-date">{visit.dateRv || 'Date inconnue'}</span>
                                        <span className="timeline-zone">
                                            <MapPin size={12} /> {visit.localInteresse || 'Zone non précisée'}
                                        </span>
                                        <span className={`timeline-status ${visit.visiteProg ? 'confirmed' : 'pending'}`}>
                                            {visit.visiteProg ? 'Confirmée' : 'Non confirmée'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <ClientActions client={client} addToast={addToast} canAction={canAction} />
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- Helper ---
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- Main Component ---
const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedClient, setSelectedClient] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // Limite par page pour éviter le lag

    const { addToast } = useToast();
    const { can } = useAuth();
    const canAction = can('call');

    // Charger les clients avec option forceRefresh
    const loadClients = useCallback(async (force = false) => {
        if (force) setRefreshing(true);
        try {
            const response = await apiService.getClients(force);
            if (response.success) {
                setClients(response.data);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les clients' });
        } finally {
            setLoading(false);
            if (force) setRefreshing(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadClients();
        const unsubscribe = apiService.subscribe('dataUpdate', () => {
            // Mise à jour silencieuse si données changent en arrière-plan
            loadClients(false);
        });
        return () => unsubscribe();
    }, [loadClients]);

    const debouncedSearch = useMemo(
        () => debounce((value) => {
            setSearchTerm(value);
            setCurrentPage(1); // Reset page on search
        }, 300),
        []
    );

    const handleRefresh = useCallback(() => {
        loadClients(true);
    }, [loadClients]);

    // Filtrage optimisé
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term ||
                (client.nomPrenom && client.nomPrenom.toLowerCase().includes(term)) ||
                (client.numero && client.numero.includes(term));

            const matchesFilter =
                filter === 'all' ||
                client.statut === filter;

            return matchesSearch && matchesFilter;
        });
    }, [clients, searchTerm, filter]);

    // KPI calculations (mémoïsé pour éviter les recalculs inutiles)
    const kpis = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const nouveauxCeMois = clients.filter(c => {
            if (!c.premiereVisite) return false;
            return new Date(c.premiereVisite) >= startOfMonth;
        }).length;

        const actifs = clients.filter(c => c.statut === 'Actif').length;
        const clientsAvecRetour = clients.filter(c => c.totalVisites > 1).length;
        const tauxRetour = clients.length > 0
            ? Math.round((clientsAvecRetour / clients.length) * 100)
            : 0;

        return {
            total: clients.length,
            nouveaux: nouveauxCeMois,
            actifs,
            tauxRetour,
        };
    }, [clients]);

    // Pagination Logic
    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredClients.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredClients, currentPage]);

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

    if (loading && !refreshing && clients.length === 0) {
        return <ClientsSkeleton viewMode={viewMode} />;
    }

    return (
        <motion.div
            className="clients-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >

            <header className="clients-header">
                <div className="header-text">
                    <h1>CRM Clients</h1>
                    <p>{clients.length} clients identifiés</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn btn-secondary ${refreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                        <span className="desktop-only">{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="clients-kpi-grid">
                <KpiCard title="Total clients" value={kpis.total} icon={Users} color="#667eea" />
                <KpiCard title="Nouveaux ce mois" value={kpis.nouveaux} icon={UserPlus} color="#10b981" />
                <KpiCard title="Actifs" value={kpis.actifs} icon={TrendingUp} color="#8b5cf6" />
                <KpiCard title="Taux de retour" value={`${kpis.tauxRetour}%`} icon={UserCheck} color="#f59e0b" />
            </div>

            {/* Modern Toolbar */}
            <div className="clients-toolbar-modern">
                <div className="toolbar-search-wrapper">
                    <div className="search-icon">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        className="search-input-modern"
                        placeholder="Rechercher par nom, téléphone..."
                        defaultValue={searchTerm}
                        onChange={(e) => debouncedSearch(e.target.value)}
                    />
                </div>

                <div className="toolbar-actions-wrapper">
                    <div className="filter-tabs-modern">
                        {['all', 'Nouveau', 'Actif', 'Inactif'].map(status => (
                            <button
                                key={status}
                                className={`filter-tab ${filter === status ? 'active' : ''}`}
                                onClick={() => { setFilter(status); setCurrentPage(1); }}
                            >
                                {status === 'all' ? 'Tous' : status}
                                {status === 'all' && <span className="count-badge">{clients.length}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="toolbar-separator"></div>

                    <div className="view-controls">
                        <div className="view-toggle-modern">
                            <button
                                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Vue Grille"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="Vue Liste"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Content with Pagination */}
            <div style={{ minHeight: '400px' }}>
                {viewMode === 'grid' && (
                    <GridView clients={paginatedClients} addToast={addToast} onSelect={setSelectedClient} canAction={canAction} />
                )}
                {viewMode === 'list' && (
                    <ListView clients={paginatedClients} addToast={addToast} onSelect={setSelectedClient} canAction={canAction} />
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Précédent
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        Page {currentPage} sur {totalPages}
                    </span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Suivant
                    </button>
                </div>
            )}

            {/* Empty State */}
            {filteredClients.length === 0 && (
                <div className="empty-state">
                    <Users size={48} />
                    <p>Aucun client ne correspond à vos critères</p>
                    <button className="btn btn-secondary" onClick={() => { setFilter('all'); setSearchTerm(''); }}>
                        Effacer les filtres
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedClient && (
                    <ClientDetailModal
                        client={selectedClient}
                        onClose={() => setSelectedClient(null)}
                        addToast={addToast}
                        canAction={canAction}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Clients;
