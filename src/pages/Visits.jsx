import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar as CalendarIcon, Clock, Phone, MapPin, CheckCircle,
    Search, RefreshCw, LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import { debounce } from '../utils/performance';
import './Visits.css';

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


// --- Shared Helper for Actions ---
const VisitActions = React.memo(({ visit, addToast }) => {
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
        <div className="visit-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleCall} title="Appeler" aria-label="Appeler">
                <Phone size={14} /> <span className="desktop-only">Appeler</span>
            </button>
            <button className="btn btn-whatsapp btn-sm" onClick={handleWhatsApp} title="Gros pouce vert" aria-label="WhatsApp">
                WhatsApp
            </button>
        </div>
    );
});

// --- GRID VIEW COMPONENT ---
const GridView = React.memo(({ visits, addToast }) => (
    <div className="visits-grid">
        {visits.map((visit, index) => (
            <motion.div
                key={visit.id}
                className={`card visit-card-v2 ${visit.visiteProg ? 'programmed' : 'tentative'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
            >
                <div className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`}>
                    {visit.visiteProg ? <CheckCircle size={14} /> : <Clock size={14} />}
                    <span>{visit.visiteProg ? 'Confirmée' : 'Tentative'}</span>
                </div>

                <div className="visit-main-info">
                    <div className="visit-user">
                        <div className="user-avatar" style={{ background: visit.visiteProg ? 'var(--gradient-success)' : 'var(--gradient-primary)' }}>
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
                            <span className="label">Zone</span>
                            <span className="value">{visit.zoneInt || 'Non spécifié'}</span>
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

                {visit.notes && (
                    <div className="visit-notes">
                        <p>{visit.notes}</p>
                    </div>
                )}

                <div className="visit-footer">
                    <VisitActions visit={visit} addToast={addToast} />
                </div>
            </motion.div>
        ))}
    </div>
));

// --- LIST VIEW COMPONENT ---
const ListView = React.memo(({ visits, addToast }) => (
    <div className="visits-list-container">
        <table className="visits-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Zone</th>
                    <th>Date Prévue</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {visits.map((visit) => (
                    <tr key={visit.id}>
                        <td>
                            <div className="list-user-cell">
                                <div className="list-user-avatar" style={{ background: visit.visiteProg ? 'var(--gradient-success)' : 'var(--gradient-primary)' }}>
                                    {visit.nomPrenom.charAt(0)}
                                </div>
                                <div className="user-text">
                                    <h3>{visit.nomPrenom}</h3>
                                    <span>{visit.telephone}</span>
                                </div>
                            </div>
                        </td>
                        <td>{visit.zoneInt || '-'}</td>
                        <td>{visit.dateRv}</td>
                        <td>
                            <span className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`}>
                                {visit.visiteProg ? 'Confirmée' : 'Tentative'}
                            </span>
                        </td>
                        <td>
                            <VisitActions visit={visit} addToast={addToast} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
));

// --- CALENDAR VIEW COMPONENT ---
const CalendarView = React.memo(({ visits }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        // Adjust for Monday start (1)
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        return { days, offset };
    };

    const { days, offset } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const getEventsForDay = (day) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return visits.filter(v => {
            if (!v.parsedDate) return false; // parsedDate comes from API as Date object (if not lost in JSON)
            // If it came from localStorage JSON, it might be a string. Handle both.
            const vDate = new Date(v.parsedDate);
            return isSameDay(vDate, checkDate);
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
                {/* Headers */}
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="calendar-col-header">{d}</div>
                ))}

                {/* Empty Cells */}
                {Array.from({ length: offset }).map((_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty"></div>
                ))}

                {/* Days */}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    const isToday = isSameDay(new Date(), new Date(currentDate.getFullYear(), currentDate.getMonth(), day));

                    return (
                        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                            <span className="day-number">{day}</span>
                            {events.map((ev, idx) => (
                                <div key={idx} className={`calendar-event ${ev.visiteProg ? 'programmed' : 'tentative'}`} title={`${ev.nomPrenom} - ${ev.zoneInt}`}>
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


const Visits = () => {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, programmed, tentative
    const [viewMode, setViewMode] = useState('list'); // grid, list, calendar
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const { addToast } = useToast();

    useEffect(() => {
        console.log('Visits component mounted');
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
        } catch (error) {
            console.error('Error loading visits:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Debounced search (optimisation critique)
    const debouncedSearch = useMemo(
        () => debounce((value) => setSearchTerm(value), 300),
        []
    );

    // Handlers optimisés avec useCallback
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadVisits();
    }, []);

    // Filtrage des visites (mémorisé pour éviter recalculs)
    const filteredVisits = useMemo(() => {
        return visits.filter(visit => {
            if (viewMode === 'calendar') return true; // Show all in calendar, maybe filter later if needed

            const matchesSearch =
                visit.nomPrenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (visit.zoneInt && visit.zoneInt.toLowerCase().includes(searchTerm.toLowerCase())) ||
                visit.telephone.includes(searchTerm);

            const matchesFilter =
                filter === 'all' ||
                (filter === 'programmed' && visit.visiteProg) ||
                (filter === 'tentative' && !visit.visiteProg);

            return matchesSearch && matchesFilter;
        });
    }, [visits, searchTerm, filter, viewMode]);

    // Pagination (optimisation importante)
    const totalPages = Math.ceil(filteredVisits.length / ITEMS_PER_PAGE);

    const paginatedVisits = useMemo(() => {
        if (viewMode === 'calendar') return filteredVisits; // Pas de pagination pour le calendrier
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredVisits.slice(start, end);
    }, [filteredVisits, currentPage, ITEMS_PER_PAGE, viewMode]);

    // Réinitialiser la page à 1 quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter, viewMode]);

    if (loading && !refreshing) {
        return <VisitsSkeleton viewMode={viewMode} />;
    }

    return (
        <motion.div
            className="visits-v2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >

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
                    <button
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Vue Grille"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="Vue Liste"
                    >
                        <List size={20} />
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                        onClick={() => setViewMode('calendar')}
                        title="Vue Calendrier"
                    >
                        <CalendarIcon size={20} />
                    </button>
                </div>
            </div>


            {/* Content Area */}
            {viewMode === 'grid' && <GridView visits={paginatedVisits} addToast={addToast} />}
            {viewMode === 'list' && <ListView visits={paginatedVisits} addToast={addToast} />}
            {viewMode === 'calendar' && <CalendarView visits={visits} />}

            {/* Empty State (only for list/grid) */}
            {viewMode !== 'calendar' && filteredVisits.length === 0 && (
                <div className="empty-state">
                    <CalendarIcon size={48} />
                    <p>Aucune visite ne correspond à vos critères</p>
                    <button className="btn btn-secondary" onClick={() => { setFilter('all'); setSearchTerm(''); }}>
                        Effacer les filtres
                    </button>
                </div>
            )}

            {/* Pagination Controls */}
            {viewMode !== 'calendar' && filteredVisits.length > ITEMS_PER_PAGE && (
                <div className="pagination-controls" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '2rem 0',
                    marginTop: '2rem',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                            opacity: currentPage === 1 ? 0.5 : 1,
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Précédent
                    </button>

                    <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        alignItems: 'center'
                    }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                                return page <= 3 ||
                                    page > totalPages - 3 ||
                                    Math.abs(page - currentPage) <= 1;
                            })
                            .map((page, index, array) => {
                                const prevPage = array[index - 1];
                                const showEllipsis = prevPage && page - prevPage > 1;

                                return (
                                    <React.Fragment key={page}>
                                        {showEllipsis && (
                                            <span style={{ padding: '0 0.5rem', color: 'var(--text-secondary)' }}>...</span>
                                        )}
                                        <button
                                            className={`btn ${currentPage === page ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                            onClick={() => setCurrentPage(page)}
                                            style={{
                                                minWidth: '2.5rem',
                                                fontWeight: currentPage === page ? 'bold' : 'normal'
                                            }}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                    </div>

                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            opacity: currentPage === totalPages ? 0.5 : 1,
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Suivant
                    </button>

                    <span style={{
                        marginLeft: '1rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem'
                    }}>
                        Page {currentPage} sur {totalPages} ({filteredVisits.length} visites)
                    </span>
                </div>
            )}
        </motion.div>
    );
};

export default Visits;
