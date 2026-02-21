import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, List, Search, Users, Clock, Phone,
    MessageCircle, Filter, AlertTriangle, MessageSquare, RefreshCw
} from 'lucide-react';
import apiService from '../../services/api';
import './RequestsPage.css';

// ─── HELPERS ────────────────────────────────────────────────────────────────

const AGENT_DEMAND_KEYWORDS = [
    'je cherche', 'on cherche', 'nous cherchons', 'mon client cherche',
    'ma cliente cherche', 'mon client', 'ma cliente', 'cherche pour mon',
    'cherche pour ma', 'besoin pour mon', 'sollicite', 'ai un client',
    'ai une cliente', 'recherche urgente', 'recherche pour mon client',
    'cherche urgemment', 'asap pour mon', 'urgent pour mon', 'budget client',
    'cherche un', 'cherche une', 'besoin d\'un', 'besoin d\'une',
    'qui a une', 'qui a un', 'quelqu\'un qui a', 'qui dispose',
    'budget de', 'avec un budget', 'avec un loyer', 'maxi',
    'au plus', 'maximum', 'recherche un', 'recherche une',
    'urgence', 'très urgent', 'au plus vite', 'collègue', 'confrère',
    'un client', 'une cliente', 'un ami', 'une amie', 'un proche'
];

const OFFER_SIGNALS = [
    'je propose', 'je vends', 'je loue', 'à vendre', 'a vendre',
    'à louer', 'a louer', 'mise en vente', 'mise en location',
    'visitez', 'contact:', 'appelez', 'appel', 'prix promo',
    'offre exceptionnelle', 'disponible pour', 'disponible à', 'disponible a',
    'belle villa disponible', 'superbe apparte', 'venez voir'
];

function isPrivate(groupe) {
    if (!groupe) return false;
    // WA private chats: @c.us or raw phone numbers (no @g.us)
    return groupe.includes('@c.us') || (!groupe.includes('@g.us') && /^\d/.test(groupe));
}

function isGroup(groupe) {
    return !groupe || groupe.includes('@g.us');
}

function isAgentDemand(message) {
    const text = (message || '').toLowerCase();
    const hasDemand = AGENT_DEMAND_KEYWORDS.some(k => text.includes(k));
    const hasOffer = OFFER_SIGNALS.some(k => text.includes(k));
    return hasDemand && !hasOffer && text.length > 20;
}

function formatPhone(raw) {
    if (!raw) return '';
    // Strip WA suffixes: @s.whatsapp.net, @c.us, @g.us, @lid, etc.
    let p = raw.split('@')[0];
    // Strip everything non-numeric (spaces, dashes, dots, parens, +, colons)
    p = p.replace(/[^0-9]/g, '');
    if (!p) return '';
    // 8 digits = old Ivorian format → add 225
    if (p.length === 8) return '225' + p;
    // 9 digits starting with 7, 5, 1, 4 = without leading 0 → add 225
    if (p.length === 9 && /^[0-9]/.test(p)) return '225' + p;
    // 10 digits: either starts with 0 (local) or new format
    if (p.length === 10) {
        if (p.startsWith('0')) return '225' + p.substring(1);
        return '225' + p;
    }
    // Already has 225 country code (13 digits for CI) → use as-is
    return p;
}

function extractPhone(req, isPrivateMsg) {
    // 1. Try the explicit telephone field first
    let phone = formatPhone(req.telephone);
    if (phone) return phone;
    // 2. For private chats, the groupe field IS the sender's WA chat ID
    if (isPrivateMsg && req.groupe) {
        phone = formatPhone(req.groupe);
        if (phone && !phone.endsWith('us') && !phone.endsWith('net')) return phone;
    }
    return '';
}

function formatDate(str) {
    if (!str) return '';
    try {
        const d = new Date(str);
        if (isNaN(d)) return str;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return str; }
}

function dedupe(items) {
    const seenIds = new Set();
    const seenFp = new Set();
    const out = [];
    for (const m of items) {
        if (m.message_id) {
            if (seenIds.has(m.message_id)) continue;
            seenIds.add(m.message_id);
        }
        const fp = (m.telephone || '') + '|' + (m.message || '').trim().substring(0, 80).toLowerCase();
        if (seenFp.has(fp)) continue;
        seenFp.add(fp);
        out.push(m);
    }
    return out;
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

const RequestsSkeleton = () => (
    <div className="requests-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="request-card skeleton-card" style={{ height: '240px' }}>
                <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ width: '60%', height: 16, background: '#e2e8f0', marginBottom: 8, borderRadius: 4 }} />
                        <div style={{ width: '40%', height: 12, background: '#e2e8f0', borderRadius: 4 }} />
                    </div>
                </div>
                <div style={{ padding: '0 1.25rem', flex: 1 }}>
                    {[1, 2, 3].map(j => <div key={j} style={{ width: `${100 - j * 10}%`, height: 14, background: '#e2e8f0', marginBottom: 6, borderRadius: 4 }} />)}
                </div>
                <div style={{ padding: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ width: '100%', height: 36, borderRadius: 8, background: '#e2e8f0' }} />
                </div>
            </div>
        ))}
    </div>
);

// ─── REQUEST CARD ────────────────────────────────────────────────────────────

const RequestCard = ({ req, keywords, isPrivateMsg, viewMode }) => {
    const waPhone = extractPhone(req, isPrivateMsg);
    // Clean display of group label (strip WA JID noise)
    const rawGroupe = req.groupe || '';
    const groupLabel = req.name
        || req.nom_groupe
        || rawGroupe.replace(/@[gs]\.us$/, '').replace(/-[0-9]+$/, '').trim()
        || 'Groupe inconnu';

    // Display phone: show the raw telephone or the groupe-derived phone
    const displayPhone = req.telephone
        ? req.telephone.split('@')[0]
        : (isPrivateMsg ? rawGroupe.split('@')[0] : '');

    const handleWhatsApp = () => {
        const snippet = (req.message || '').substring(0, 150);
        let text;
        if (isPrivateMsg) {
            text = `Bonjour${req.expediteur ? ' ' + req.expediteur : ''},\n\nJ'ai bien reçu votre message concernant la recherche d'un bien.\nPouvez-vous me préciser vos critères (type, zone, budget) ?\n\nMerci !`;
        } else {
            text = `Bonjour${req.expediteur ? ' ' + req.expediteur : ''},\n\nSuite à votre recherche dans le groupe "${groupLabel}" :\n"${snippet}"\n\nNous pourrions peut-être vous aider. Pouvez-vous me donner plus de détails ?`;
        }
        if (waPhone) {
            window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            // Fallback: open WA without a phone (user can paste number manually)
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    // Highlight demand keywords
    const highlightText = (text) => {
        if (!text || !keywords?.length) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    keywords.some(k => k.toLowerCase() === part.toLowerCase())
                        ? <strong key={i} style={{ color: 'var(--text-primary)', background: 'rgba(27,66,153,0.08)', borderRadius: '3px', padding: '0 2px' }}>{part}</strong>
                        : part
                )}
            </span>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`request-card ${viewMode === 'list' ? 'request-card-list' : ''}`}
        >
            <div className="request-card-header">
                <div className="sender-info">
                    <div className={`sender-avatar ${isPrivateMsg ? 'sender-private' : ''}`}>
                        {(req.expediteur || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="sender-details">
                        <span className="sender-name">{req.expediteur || req.telephone || 'Inconnu'}</span>
                        <div className="message-time">
                            <Clock size={12} />
                            {formatDate(req.horodatage || req.message_timestamp)}
                        </div>
                    </div>
                </div>
                <span className={`badge-source ${isPrivateMsg ? 'badge-private' : 'badge-group'}`}>
                    {isPrivateMsg ? 'Message Privé' : 'Groupe'}
                </span>
            </div>

            <div className="request-card-body">
                <div className="message-content">
                    {highlightText(req.message)}
                </div>
            </div>

            <div className="request-card-footer">
                <div className="request-meta-info">
                    {!isPrivateMsg && groupLabel && (
                        <span className="meta-tag" title={req.groupe}>
                            <Users size={12} />
                            <span>{groupLabel.substring(0, 20)}{groupLabel.length > 20 ? '…' : ''}</span>
                        </span>
                    )}
                    {displayPhone && (
                        <span className="meta-tag meta-phone">
                            <Phone size={12} />
                            {displayPhone}
                        </span>
                    )}
                </div>
                <button
                    className="btn-whatsapp-action"
                    onClick={handleWhatsApp}
                    title={waPhone ? `Répondre à ${waPhone}` : 'Ouvrir WhatsApp'}
                >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Répondre
                </button>
            </div>
        </motion.div>
    );
};

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

const EmptyState = ({ isPrivate }) => (
    <div className="empty-state">
        <div style={{ background: '#f8fafc', width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={40} style={{ color: '#cbd5e1' }} />
        </div>
        {isPrivate ? (
            <>
                <h3>Aucun message privé</h3>
                <p>Les personnes qui vous contactent directement (via vos publicités) apparaîtront ici.</p>
            </>
        ) : (
            <>
                <h3>Aucune demande détectée</h3>
                <p>Les agents cherchant des biens pour leurs clients apparaîtront ici.</p>
            </>
        )}
    </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const RequestsPage = () => {
    const [viewMode, setViewMode] = useState('grid');
    const [tab, setTab] = useState('agents'); // 'agents' | 'private'
    const [subFilter, setSubFilter] = useState('all'); // all | urgent | budget
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [rawData, setRawData] = useState([]);
    const [error, setError] = useState(null);

    const fetchRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getRequests();
            if (response.success) {
                setRawData(response.data || []);
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

    useEffect(() => { fetchRequests(); }, []);

    // ── Partitioning ──
    const { agentRequests, privateMessages } = useMemo(() => {
        const agents = [];
        const privates = [];
        for (const msg of rawData) {
            const groupe = msg.groupe || '';
            if (isPrivate(groupe)) {
                privates.push(msg);
            } else if (isGroup(groupe) && isAgentDemand(msg.message)) {
                agents.push(msg);
            }
        }
        return {
            agentRequests: dedupe(agents),
            privateMessages: dedupe(privates),
        };
    }, [rawData]);

    // ── Filtering ──
    const currentItems = tab === 'agents' ? agentRequests : privateMessages;

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return currentItems.filter(req => {
            const text = (req.message || '').toLowerCase();
            const matchesSearch = !term ||
                text.includes(term) ||
                (req.expediteur || '').toLowerCase().includes(term) ||
                (req.telephone || '').includes(term) ||
                (req.name || req.nom_groupe || '').toLowerCase().includes(term);

            if (!matchesSearch) return false;
            if (subFilter === 'urgent') return text.includes('urgent') || text.includes('asap') || text.includes('urgence');
            if (subFilter === 'budget') return text.includes('budget') || text.includes('prix') || text.includes('loyer') || text.includes('maxi');
            return true;
        });
    }, [currentItems, searchTerm, subFilter]);

    const demandKws = tab === 'agents' ? AGENT_DEMAND_KEYWORDS : [];

    return (
        <div className="requests-page-container">

            <header className="requests-header">
                <div className="header-title-group">
                    <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="page-title-large">
                        <MessageCircle size={32} />
                        Demandes
                    </motion.h2>
                    <p className="page-subtitle">
                        {agentRequests.length} demandes agents · {privateMessages.length} messages privés
                    </p>
                </div>
                <div className="header-actions">
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="btn btn-outline"
                        onClick={fetchRequests}
                    >
                        <RefreshCw size={18} />
                        Actualiser
                    </motion.button>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="requests-tabs">
                <button
                    className={`req-tab ${tab === 'agents' ? 'active' : ''}`}
                    onClick={() => { setTab('agents'); setSubFilter('all'); setSearchTerm(''); }}
                >
                    <Users size={16} />
                    Agents en groupes
                    {agentRequests.length > 0 && <span className="tab-count">{agentRequests.length}</span>}
                </button>
                <button
                    className={`req-tab ${tab === 'private' ? 'active' : ''}`}
                    onClick={() => { setTab('private'); setSubFilter('all'); setSearchTerm(''); }}
                >
                    <MessageSquare size={16} />
                    Contacts Privés
                    {privateMessages.length > 0 && <span className="tab-count tab-count-private">{privateMessages.length}</span>}
                </button>
            </div>

            {/* ── Tab description ── */}
            {tab === 'agents' && (
                <p className="tab-description">
                    Agents immobiliers cherchant un bien pour leurs clients dans les groupes WhatsApp.
                </p>
            )}
            {tab === 'private' && (
                <p className="tab-description">
                    Personnes qui vous écrivent directement (via sponsoring ou publicité) pour trouver un bien.
                </p>
            )}

            {/* ── Toolbar ── */}
            <div className="requests-toolbar">
                <div className="search-field">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder={tab === 'agents' ? 'Rechercher un agent, message, groupe...' : 'Rechercher un contact, message...'}
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filters-group">
                    <button className={`filter-chip ${subFilter === 'all' ? 'active' : ''}`} onClick={() => setSubFilter('all')}>Tous</button>
                    <button className={`filter-chip ${subFilter === 'urgent' ? 'active' : ''}`} onClick={() => setSubFilter('urgent')}>Urgents</button>
                    <button className={`filter-chip ${subFilter === 'budget' ? 'active' : ''}`} onClick={() => setSubFilter('budget')}>Avec Budget</button>
                </div>

                <div className="view-toggle">
                    <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vue Liste"><List size={20} /></button>
                    <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Vue Grille"><LayoutGrid size={20} /></button>
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <RequestsSkeleton />
            ) : error ? (
                <div className="error-state">
                    <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                    <p>{error}</p>
                    <button className="btn btn-secondary" onClick={fetchRequests} style={{ marginTop: '1rem' }}>Réessayer</button>
                </div>
            ) : filteredItems.length === 0 ? (
                <EmptyState isPrivate={tab === 'private'} />
            ) : (
                <div className={viewMode === 'grid' ? 'requests-grid' : 'requests-list-container'}>
                    <AnimatePresence>
                        {filteredItems.map((req, idx) => (
                            <RequestCard
                                key={req.id || req.message_id || idx}
                                req={req}
                                keywords={demandKws}
                                isPrivateMsg={tab === 'private'}
                                viewMode={viewMode}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default RequestsPage;
