import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar as CalendarIcon, Clock, Phone, MapPin, CheckCircle,
    Search, RefreshCw, LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import './Visits.css';

// --- Shared Helper for Actions ---
const VisitActions = ({ visit, addToast }) => {
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
            <button className="btn btn-secondary btn-sm" onClick={handleCall} title="Appeler">
                <Phone size={14} /> <span className="desktop-only">Appeler</span>
            </button>
            <button className="btn btn-whatsapp btn-sm" onClick={handleWhatsApp} title="Gros pouce vert">
                WhatsApp
            </button>
        </div>
    );
};

// --- GRID VIEW COMPONENT ---
const GridView = ({ visits, addToast }) => (
    <div className="visits-grid">
        {visits.map((visit, index) => (
            <motion.div
                key={visit.id}
                className={`visit-card-v2 ${visit.visiteProg ? 'programmed' : 'tentative'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
            >
                <div className="visit-badge">
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
);

// --- LIST VIEW COMPONENT ---
const ListView = ({ visits, addToast }) => (
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
                            <span className={`status-badge-sm ${visit.visiteProg ? 'programmed' : 'tentative'}`}>
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
);

// --- CALENDAR VIEW COMPONENT ---
const CalendarView = ({ visits }) => {
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
};


const Visits = () => {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, programmed, tentative
    const [viewMode, setViewMode] = useState('grid'); // grid, list, calendar
    const [refreshing, setRefreshing] = useState(false);
    const { addToast } = useToast();

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
        } catch (error) {
            console.error('Error loading visits:', error);
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
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
            {viewMode === 'grid' && <GridView visits={filteredVisits} addToast={addToast} />}
            {viewMode === 'list' && <ListView visits={filteredVisits} addToast={addToast} />}
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
        </div>
    );
};

export default Visits;
