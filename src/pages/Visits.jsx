import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon, Clock, Phone, MapPin, CheckCircle,
    Search, RefreshCw, LayoutGrid, List, ChevronLeft, ChevronRight,
    ArrowUpDown, ArrowUp, ArrowDown, X, Printer, MessageSquare,
    User, Home, Building, FileText
} from 'lucide-react';
import apiService from '../services/api';
import supabaseService from '../services/supabaseService';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import { debounce } from '../utils/performance';
import './Visits.css';

// ─── VISIT SHEET (FICHE DE VISITE) MODAL ────────────────────────────────────

const VisitSheet = ({ visit, onClose }) => {
    const [property, setProperty] = useState(null);
    const [loadingProp, setLoadingProp] = useState(false);

    useEffect(() => {
        if (!visit) return;
        if (visit.refBien) {
            setLoadingProp(true);
            supabaseService.getPropertyByRef(visit.refBien).then(res => {
                if (res.success && res.data) setProperty(res.data);
                setLoadingProp(false);
            });
        }
    }, [visit]);

    if (!visit) return null;

    const handlePrint = () => window.print();

    const handleAgentWhatsApp = () => {
        const phone = (property?.telephoneBien || property?.telephoneExpediteur || '').replace(/\D/g, '');
        if (!phone) return;
        const lieu = [property?.commune, property?.quartier, property?.zone].filter(Boolean).join(', ');
        const bien = property ? `${property.typeBien} à ${lieu || 'localisation inconnue'}` : visit.localInteresse || 'votre bien';
        const msg = encodeURIComponent(`Bonjour${property?.expediteur ? ' ' + property.expediteur : ''},\n\nJe souhaite organiser une visite avec ${visit.nomPrenom} pour ${bien}.\nDate prévue : ${visit.dateRv || 'à confirmer'}.\n\nMerci de me confirmer votre disponibilité.`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    const agentPhone = property?.telephoneBien || property?.telephoneExpediteur || '';
    const agentName = property?.expediteur || '';
    const lieu = property
        ? [property.commune, property.quartier, property.zone].filter(Boolean).join(' · ') || '—'
        : visit.localInteresse || '—';
    const description = property?.description || '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content visit-sheet-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={20} />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Fiche de Visite</h2>
                            {visit.refBien && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{visit.refBien}</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={handlePrint} title="Imprimer">
                            <Printer size={16} />
                            <span>Imprimer</span>
                        </button>
                        <button className="btn-icon-close" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                <div className="visit-sheet-body">

                    {/* ── Section Client & Date ── */}
                    <div className="visit-sheet-section visit-sheet-highlight">
                        <h3 className="section-title"><User size={16} /> Informations Client</h3>
                        <div className="visit-sheet-grid-2">
                            <div className="visit-info-block">
                                <span className="info-label">Nom du client</span>
                                <span className="info-value large">{visit.nomPrenom || '—'}</span>
                            </div>
                            <div className="visit-info-block">
                                <span className="info-label">Téléphone client</span>
                                <span className="info-value large">{visit.numero || '—'}</span>
                            </div>
                            <div className="visit-info-block">
                                <span className="info-label">Date de visite prévue</span>
                                <span className="info-value large" style={{ color: 'var(--primary)' }}>{visit.dateRv || '—'}</span>
                            </div>
                            <div className="visit-info-block">
                                <span className="info-label">Statut</span>
                                <span className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-flex', marginTop: '0.25rem' }}>
                                    {visit.visiteProg ? <CheckCircle size={14} /> : <Clock size={14} />}
                                    {visit.visiteProg ? 'Visite confirmée' : 'En attente de confirmation'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Section Bien à Visiter ── */}
                    <div className="visit-sheet-section">
                        <h3 className="section-title"><Building size={16} /> Bien à Visiter</h3>
                        {loadingProp ? (
                            <div style={{ padding: '1rem 0' }}>
                                <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
                                <Skeleton width="70%" height="16px" />
                            </div>
                        ) : property ? (
                            <>
                                <div className="visit-sheet-grid-2">
                                    <div className="visit-info-block">
                                        <span className="info-label">Référence</span>
                                        <span className="info-value">{property.refBien || '—'}</span>
                                    </div>
                                    <div className="visit-info-block">
                                        <span className="info-label">Type</span>
                                        <span className="info-value">{property.typeBien} — {property.typeOffre}</span>
                                    </div>
                                    <div className="visit-info-block">
                                        <span className="info-label">Localisation</span>
                                        <span className="info-value">{lieu}</span>
                                    </div>
                                    <div className="visit-info-block">
                                        <span className="info-label">Prix</span>
                                        <span className="info-value" style={{ fontWeight: 700 }}>{property.prixFormate} FCFA</span>
                                    </div>
                                    {property.chambre && (
                                        <div className="visit-info-block">
                                            <span className="info-label">Chambres</span>
                                            <span className="info-value">{property.chambre}</span>
                                        </div>
                                    )}
                                    {property.meubles && (
                                        <div className="visit-info-block">
                                            <span className="info-label">Meublé</span>
                                            <span className="info-value">{property.meubles}</span>
                                        </div>
                                    )}
                                </div>
                                {description && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <span className="info-label">Description (message original)</span>
                                        <pre className="message-preview" style={{ marginTop: '0.5rem', maxHeight: '120px', overflow: 'auto' }}>{description}</pre>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="visit-info-block">
                                <span className="info-label">Bien concerné</span>
                                <span className="info-value">{visit.localInteresse || '—'}</span>
                                {visit.refBien && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Réf: {visit.refBien} (non trouvé en base)</span>}
                            </div>
                        )}
                    </div>

                    {/* ── Section Agent / Démarcheur ── */}
                    <div className="visit-sheet-section">
                        <h3 className="section-title"><MessageSquare size={16} /> Agent Immobilier / Démarcheur</h3>
                        {property ? (
                            <div className="visit-sheet-grid-2">
                                <div className="visit-info-block">
                                    <span className="info-label">Nom</span>
                                    <span className="info-value">{agentName || '—'}</span>
                                </div>
                                <div className="visit-info-block">
                                    <span className="info-label">Téléphone</span>
                                    <span className="info-value">{agentPhone || '—'}</span>
                                </div>
                                {property.groupeWhatsappOrigine && (
                                    <div className="visit-info-block" style={{ gridColumn: '1 / -1' }}>
                                        <span className="info-label">Groupe WhatsApp source</span>
                                        <span className="info-value">{property.groupeWhatsappOrigine}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Retrouvez le bien en base (réf: {visit.refBien || visit.localInteresse || '—'}) pour voir les coordonnées de l'agent.
                            </p>
                        )}

                        {agentPhone && (
                            <button
                                className="btn btn-whatsapp"
                                style={{ marginTop: '1rem', width: '100%' }}
                                onClick={handleAgentWhatsApp}
                            >
                                <MessageSquare size={16} />
                                Contacter l'agent par WhatsApp
                            </button>
                        )}
                    </div>

                    {/* ── Signatures ── */}
                    <div className="visit-sheet-section visit-signatures print-only-show">
                        <h3 className="section-title">Signatures</h3>
                        <div className="visit-sheet-grid-2">
                            <div className="signature-block">
                                <p className="signature-role">Agent Immobilier</p>
                                <p className="signature-name">{agentName || '____________________'}</p>
                                <div className="signature-line"></div>
                                <p className="signature-caption">Signature</p>
                            </div>
                            <div className="signature-block">
                                <p className="signature-role">Client</p>
                                <p className="signature-name">{visit.nomPrenom || '____________________'}</p>
                                <div className="signature-line"></div>
                                <p className="signature-caption">Signature</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// ─── SKELETON ───────────────────────────────────────────────────────────────

const VisitsSkeleton = ({ viewMode }) => (
    <div className="visits-v2">
        <div className="visits-header">
            <div className="header-text">
                <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="150px" height="20px" />
            </div>
            <Skeleton width="100px" height="40px" />
        </div>

        <div className="visits-toolbar">
            <div className="toolbar-left" style={{ flex: 1 }}>
                <Skeleton width="100%" height="42px" style={{ borderRadius: '12px' }} />
            </div>
            <div className="view-toggles">
                <Skeleton width="120px" height="42px" style={{ borderRadius: '12px' }} />
            </div>
        </div>

        {viewMode === 'list' ? (
            <div className="visits-list-container">
                <table className="visits-table">
                    <thead>
                        <tr>
                            {[1, 2, 3, 4, 5].map(k => <th key={k}><Skeleton width="60%" height="16px" /></th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i}>
                                <td><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Skeleton className="skeleton-circle" width="32px" height="32px" /><Skeleton width="100px" height="16px" /></div></td>
                                <td><Skeleton width="80px" height="16px" /></td>
                                <td><Skeleton width="100px" height="16px" /></td>
                                <td><Skeleton width="80px" height="24px" style={{ borderRadius: '20px' }} /></td>
                                <td><Skeleton width="80px" height="32px" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="visits-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="card visit-card-v2" style={{ height: '200px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <Skeleton width="80px" height="24px" style={{ borderRadius: '20px' }} />
                            <Skeleton className="skeleton-circle" width="32px" height="32px" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <Skeleton className="skeleton-circle" width="40px" height="40px" />
                            <div>
                                <Skeleton width="100px" height="16px" style={{ marginBottom: '4px' }} />
                                <Skeleton width="80px" height="14px" />
                            </div>
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                            <Skeleton width="100%" height="32px" />
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);


// ─── VISIT ACTIONS ──────────────────────────────────────────────────────────

const VisitActions = React.memo(({ visit, addToast, onOpenSheet }) => {
    const handleCall = (e) => {
        e.stopPropagation();
        if (!visit.numero) {
            addToast({ type: 'warning', title: 'Erreur', message: 'Numéro de téléphone manquant' });
            return;
        }
        window.open(`tel:${visit.numero}`, '_self');
    };

    const handleWhatsApp = (e) => {
        e.stopPropagation();
        if (!visit.numero) {
            addToast({ type: 'warning', title: 'Erreur', message: 'Numéro de téléphone manquant' });
            return;
        }
        let phone = visit.numero.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '225' + phone.substring(1);
        else if (phone.length === 10) phone = '225' + phone;
        const message = encodeURIComponent(`Bonjour ${visit.nomPrenom}, je reviens vers vous concernant votre demande de visite pour ${visit.localInteresse || 'votre zone'}.`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    return (
        <div className="visit-actions">
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onOpenSheet(visit); }} title="Fiche de visite">
                <FileText size={14} /> <span className="desktop-only">Fiche</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCall} title="Appeler">
                <Phone size={14} /> <span className="desktop-only">Appeler</span>
            </button>
            <button className="btn btn-whatsapp btn-sm" onClick={handleWhatsApp} title="WhatsApp">
                WhatsApp
            </button>
        </div>
    );
});

// ─── GRID VIEW ───────────────────────────────────────────────────────────────

const GridView = React.memo(({ visits, addToast, onOpenSheet }) => (
    <div className="visits-grid">
        {visits.map((visit) => (
            <div
                key={visit.id}
                className={`card visit-card-v2 ${visit.visiteProg ? 'programmed' : 'tentative'} fade-in`}
                onClick={() => onOpenSheet(visit)}
                style={{ cursor: 'pointer' }}
            >
                <div className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`}>
                    {visit.visiteProg ? <CheckCircle size={14} /> : <Clock size={14} />}
                    <span>{visit.visiteProg ? 'Confirmée' : 'Tentative'}</span>
                </div>

                <div className="visit-main-info">
                    <div className="visit-user">
                        <div className="user-avatar" style={{ background: visit.visiteProg ? 'var(--gradient-success)' : 'var(--gradient-primary)' }}>
                            {(visit.nomPrenom || '?').charAt(0)}
                        </div>
                        <div className="user-text">
                            <h3>{visit.nomPrenom || 'Client Inconnu'}</h3>
                            <span>{visit.numero || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="visit-details-grid">
                    <div className="detail-item">
                        <MapPin size={16} />
                        <div>
                            <span className="label">Bien concerné</span>
                            <span className="value">{visit.localInteresse || 'Non spécifié'}</span>
                        </div>
                    </div>
                    <div className="detail-item">
                        <CalendarIcon size={16} />
                        <div>
                            <span className="label">Date</span>
                            <span className="value">{visit.dateRv}</span>
                        </div>
                    </div>
                </div>

                <div className="visit-footer" onClick={e => e.stopPropagation()}>
                    <VisitActions visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
                </div>
            </div>
        ))}
    </div>
));

// ─── LIST VIEW ───────────────────────────────────────────────────────────────

const ListView = React.memo(({ visits, addToast, sortConfig, onSort, onOpenSheet }) => {
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="sort-icon-muted" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="sort-icon-active" /> : <ArrowDown size={14} className="sort-icon-active" />;
    };

    return (
        <div className="visits-list-container">
            <table className="visits-table">
                <thead>
                    <tr>
                        <th onClick={() => onSort('nomPrenom')} className="sortable-header">
                            <div className="header-cell-content">Client {getSortIcon('nomPrenom')}</div>
                        </th>
                        <th onClick={() => onSort('localInteresse')} className="sortable-header">
                            <div className="header-cell-content">Zone {getSortIcon('localInteresse')}</div>
                        </th>
                        <th onClick={() => onSort('dateRv')} className="sortable-header">
                            <div className="header-cell-content">Date Prévue {getSortIcon('dateRv')}</div>
                        </th>
                        <th onClick={() => onSort('visiteProg')} className="sortable-header">
                            <div className="header-cell-content">Statut {getSortIcon('visiteProg')}</div>
                        </th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {visits.map((visit) => (
                        <tr key={visit.id} onClick={() => onOpenSheet(visit)} style={{ cursor: 'pointer' }}>
                            <td>
                                <div className="list-user-cell">
                                    <div className="list-user-avatar" style={{ background: visit.visiteProg ? 'var(--gradient-success)' : 'var(--gradient-primary)' }}>
                                        {(visit.nomPrenom || '?').charAt(0)}
                                    </div>
                                    <div className="user-text">
                                        <h3>{visit.nomPrenom || 'Client Inconnu'}</h3>
                                        <span>{visit.numero || '-'}</span>
                                    </div>
                                </div>
                            </td>
                            <td>{visit.localInteresse || '-'}</td>
                            <td>{visit.dateRv}</td>
                            <td>
                                <span className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`}>
                                    {visit.visiteProg ? 'Confirmée' : 'Tentative'}
                                </span>
                            </td>
                            <td className="text-center" onClick={e => e.stopPropagation()}>
                                <VisitActions visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

// ─── CALENDAR VIEW ───────────────────────────────────────────────────────────

const CalendarView = React.memo(({ visits, onOpenSheet }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        return { days, offset };
    };

    const { days, offset } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const isSameDay = (d1, d2) => (
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear()
    );

    const getEventsForDay = (day) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return visits.filter(v => {
            if (!v.parsedDate) return false;
            return isSameDay(new Date(v.parsedDate), checkDate);
        });
    };

    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
                <div className="calendar-nav">
                    <button onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <button onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="calendar-grid">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="calendar-col-header">{d}</div>
                ))}
                {Array.from({ length: offset }).map((_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty"></div>
                ))}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    const isToday = isSameDay(new Date(), new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                    return (
                        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                            <span className="day-number">{day}</span>
                            {events.map((ev, idx) => (
                                <div
                                    key={idx}
                                    className={`calendar-event ${ev.visiteProg ? 'programmed' : 'tentative'}`}
                                    title={`${ev.nomPrenom} - ${ev.localInteresse}`}
                                    onClick={() => onOpenSheet(ev)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {ev.nomPrenom}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

// ─── MAIN VISITS PAGE ────────────────────────────────────────────────────────

const Visits = () => {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('list');
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'dateRv', direction: 'desc' });
    const [selectedVisit, setSelectedVisit] = useState(null);
    const ITEMS_PER_PAGE = 20;
    const { addToast } = useToast();

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const loadVisits = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const response = await apiService.getVisits();
            if (response.success) {
                setVisits(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error('Error loading visits:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les visites' });
            setVisits([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadVisits();
        const unsubscribe = apiService.subscribe('dataUpdate', (data) => {
            if (data && data.visits && data.visits.success) {
                setVisits(Array.isArray(data.visits.data) ? data.visits.data : []);
            }
        });
        return () => unsubscribe && unsubscribe();
    }, [loadVisits]);

    const debouncedSearch = useMemo(() => debounce((value) => setSearchTerm(value), 300), []);
    const handleRefresh = useCallback(() => loadVisits(true), [loadVisits]);

    const filteredVisits = useMemo(() => {
        if (!Array.isArray(visits)) return [];
        let items = visits.filter(visit => {
            if (viewMode === 'calendar') return true;
            const matchesSearch =
                (visit.nomPrenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (visit.localInteresse || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (visit.numero || '').includes(searchTerm);
            const matchesFilter =
                filter === 'all' ||
                (filter === 'programmed' && visit.visiteProg) ||
                (filter === 'tentative' && !visit.visiteProg);
            return matchesSearch && matchesFilter;
        });

        if (sortConfig.key) {
            items.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';
                if (sortConfig.key === 'dateRv') {
                    aValue = a.parsedDate ? new Date(a.parsedDate).getTime() : 0;
                    bValue = b.parsedDate ? new Date(b.parsedDate).getTime() : 0;
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [visits, searchTerm, filter, viewMode, sortConfig]);

    const totalPages = Math.ceil(filteredVisits.length / ITEMS_PER_PAGE);

    const paginatedVisits = useMemo(() => {
        if (viewMode === 'calendar') return filteredVisits;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredVisits.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredVisits, currentPage, ITEMS_PER_PAGE, viewMode]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filter, viewMode]);

    if (loading && !refreshing) return <VisitsSkeleton viewMode={viewMode} />;
    if (!visits || !Array.isArray(visits)) {
        return <div className="visits-v2"><div className="error-state">Erreur de chargement des données.</div></div>;
    }

    return (
        <div className="visits-v2 fade-in">

            {/* Visit Sheet Modal */}
            <AnimatePresence>
                {selectedVisit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <VisitSheet visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="visits-header">
                <div className="header-text">
                    <h1>Gestion des Visites</h1>
                    <p>{visits.length} visites enregistrées</p>
                </div>
                <div className="header-actions">
                    <button className={`btn btn-secondary ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
                        <RefreshCw size={18} />
                        <span className="desktop-only">Actualiser</span>
                    </button>
                </div>
            </header>

            <div className="visits-toolbar">
                <div className="toolbar-left">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            defaultValue={searchTerm}
                            onChange={(e) => debouncedSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-chips">
                        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Toutes</button>
                        <button className={`chip ${filter === 'programmed' ? 'active' : ''}`} onClick={() => setFilter('programmed')}>Confirmées</button>
                        <button className={`chip ${filter === 'tentative' ? 'active' : ''}`} onClick={() => setFilter('tentative')}>Tentatives</button>
                    </div>
                </div>
                <div className="view-toggles">
                    <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Vue Grille"><LayoutGrid size={20} /></button>
                    <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vue Liste"><List size={20} /></button>
                    <button className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')} title="Vue Calendrier"><CalendarIcon size={20} /></button>
                </div>
            </div>

            {viewMode === 'grid' && <GridView visits={paginatedVisits} addToast={addToast} onOpenSheet={setSelectedVisit} />}
            {viewMode === 'list' && <ListView visits={paginatedVisits} addToast={addToast} sortConfig={sortConfig} onSort={handleSort} onOpenSheet={setSelectedVisit} />}
            {viewMode === 'calendar' && <CalendarView visits={visits} onOpenSheet={setSelectedVisit} />}

            {viewMode !== 'calendar' && filteredVisits.length === 0 && (
                <div className="empty-state">
                    <CalendarIcon size={48} />
                    <p>Aucune visite ne correspond à vos critères</p>
                    <button className="btn btn-secondary" onClick={() => { setFilter('all'); setSearchTerm(''); }}>
                        Effacer les filtres
                    </button>
                </div>
            )}

            {viewMode !== 'calendar' && filteredVisits.length > ITEMS_PER_PAGE && (
                <div className="pagination-controls" style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    gap: '0.5rem', padding: '2rem 0', marginTop: '2rem',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Précédent</button>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => page <= 3 || page > totalPages - 3 || Math.abs(page - currentPage) <= 1)
                            .map((page, index, array) => {
                                const prevPage = array[index - 1];
                                return (
                                    <React.Fragment key={page}>
                                        {prevPage && page - prevPage > 1 && <span style={{ padding: '0 0.5rem', color: 'var(--text-secondary)' }}>...</span>}
                                        <button className={`btn ${currentPage === page ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setCurrentPage(page)} style={{ minWidth: '2.5rem' }}>{page}</button>
                                    </React.Fragment>
                                );
                            })}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Suivant</button>
                    <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Page {currentPage} sur {totalPages} ({filteredVisits.length} visites)
                    </span>
                </div>
            )}
        </div>
    );
};

export default Visits;
