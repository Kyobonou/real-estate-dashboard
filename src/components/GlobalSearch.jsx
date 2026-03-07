import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building, Calendar, Users, FileText, ArrowRight, X, Command } from 'lucide-react';
import apiService from '../services/api';

/* ─── helpers ──────────────────────────────────────────────────────────── */

const highlight = (text = '', query = '') => {
    if (!query || !text) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((p, i) =>
        new RegExp(`^${escaped}$`, 'i').test(p)
            ? <mark key={i} className="gs-highlight">{p}</mark>
            : p
    );
};

const normalize = (s = '') =>
    String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ─── result groups ──────────────────────────────────────────────────────*/

const GROUPS = [
    { key: 'properties', label: 'Biens', icon: Building, color: '#1B4299' },
    { key: 'visits',     label: 'Visites',  icon: Calendar, color: '#059669' },
    { key: 'clients',    label: 'Clients',  icon: Users,    color: '#7c3aed' },
    { key: 'requests',   label: 'Demandes', icon: FileText, color: '#d97706' },
];

/* ─── component ─────────────────────────────────────────────────────────*/

const GlobalSearch = ({ open, onClose }) => {
    const [query, setQuery]       = useState('');
    const [results, setResults]   = useState({});
    const [loading, setLoading]   = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef  = useRef(null);
    const navigate  = useNavigate();

    /* focus input when opened */
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults({});
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    /* search */
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults({});
            return;
        }
        const q = normalize(query.trim());
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const [props, visits, clients, requests] = await Promise.all([
                    apiService.getProperties(),
                    apiService.getVisits(),
                    apiService.getClients(),
                    apiService.getRequests(),
                ]);
                if (cancelled) return;

                const matchProp = (props || []).filter(p =>
                    [p.refBien, p.commune, p.quartier, p.typeDeBien, p.typeOffre, p.prix, p.telephoneBien]
                        .some(v => normalize(v).includes(q))
                ).slice(0, 5).map(p => ({
                    id: p.id,
                    label: [p.typeDeBien, p.commune].filter(Boolean).join(' · ') || 'Bien sans titre',
                    sub:   [p.refBien, p.prix ? `${p.prix} FCFA` : null].filter(Boolean).join(' · '),
                    path:  '/properties',
                    state: { highlightRef: p.refBien },
                }));

                const matchVisit = (visits || []).filter(v =>
                    [v.nomPrenom, v.numero, v.refBien, v.localInteresse]
                        .some(vv => normalize(vv).includes(q))
                ).slice(0, 4).map(v => ({
                    id: v.id,
                    label: v.nomPrenom || 'Visiteur',
                    sub:   [v.refBien, v.dateRv].filter(Boolean).join(' · '),
                    path:  '/visits',
                }));

                const matchClients = (clients || []).filter(c =>
                    [c.nom, c.prenom, c.telephone, c.email, c.commune]
                        .some(vv => normalize(vv).includes(q))
                ).slice(0, 4).map(c => ({
                    id: c.id,
                    label: [c.prenom, c.nom].filter(Boolean).join(' ') || 'Client',
                    sub:   [c.telephone, c.commune].filter(Boolean).join(' · '),
                    path:  '/clients',
                }));

                const matchReq = (requests || []).filter(r =>
                    [r.expediteur, r.telephone, r.message]
                        .some(vv => normalize(vv).includes(q))
                ).slice(0, 4).map(r => ({
                    id: r.id,
                    label: r.expediteur || 'Demandeur',
                    sub:   (r.message || '').slice(0, 70),
                    path:  '/requests',
                }));

                setResults({
                    properties: matchProp,
                    visits:     matchVisit,
                    clients:    matchClients,
                    requests:   matchReq,
                });
                setActiveIdx(0);
            } catch (_) {
                /* silent */
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 200);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [query]);

    /* flat list for keyboard nav */
    const flat = GROUPS.flatMap(g => (results[g.key] || []).map(r => ({ ...r, group: g.key })));

    const goTo = useCallback((item) => {
        navigate(item.path, item.state ? { state: item.state } : undefined);
        onClose();
    }, [navigate, onClose]);

    const handleKey = (e) => {
        if (e.key === 'Escape') { onClose(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && flat[activeIdx]) goTo(flat[activeIdx]);
    };

    const hasResults = flat.length > 0;
    const isEmpty    = query.length >= 2 && !loading && !hasResults;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* backdrop */}
                    <motion.div
                        className="gs-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                    />

                    {/* panel */}
                    <motion.div
                        className="gs-panel"
                        initial={{ opacity: 0, scale: 0.96, y: -10 }}
                        animate={{ opacity: 1, scale: 1,    y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Recherche globale"
                    >
                        {/* input row */}
                        <div className="gs-input-row">
                            <Search size={18} className="gs-input-icon" />
                            <input
                                ref={inputRef}
                                className="gs-input"
                                placeholder="Rechercher un bien, client, visite..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={handleKey}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {query && (
                                <button className="gs-clear" onClick={() => setQuery('')} tabIndex={-1}>
                                    <X size={15} />
                                </button>
                            )}
                            <kbd className="gs-kbd">Esc</kbd>
                        </div>

                        {/* body */}
                        <div className="gs-body">
                            {!query && (
                                <p className="gs-hint">
                                    Tapez pour chercher dans vos biens, visites, clients et demandes.
                                </p>
                            )}

                            {loading && (
                                <div className="gs-loading">
                                    <span className="gs-spinner" />
                                    Recherche en cours…
                                </div>
                            )}

                            {isEmpty && (
                                <p className="gs-empty">Aucun résultat pour « {query} »</p>
                            )}

                            {hasResults && GROUPS.map(group => {
                                const items = results[group.key] || [];
                                if (!items.length) return null;
                                let flatOffset = flat.findIndex(f => f.group === group.key);
                                return (
                                    <div key={group.key} className="gs-group">
                                        <div className="gs-group-label" style={{ color: group.color }}>
                                            <group.icon size={13} />
                                            {group.label}
                                        </div>
                                        {items.map((item, localIdx) => {
                                            const idx = flat.findIndex(f => f.id === item.id && f.group === group.key);
                                            return (
                                                <button
                                                    key={item.id}
                                                    className={`gs-item ${idx === activeIdx ? 'active' : ''}`}
                                                    onClick={() => goTo(item)}
                                                    onMouseEnter={() => setActiveIdx(idx)}
                                                >
                                                    <span className="gs-item-icon" style={{ background: group.color + '18', color: group.color }}>
                                                        <group.icon size={14} />
                                                    </span>
                                                    <span className="gs-item-text">
                                                        <span className="gs-item-label">{highlight(item.label, query)}</span>
                                                        {item.sub && <span className="gs-item-sub">{highlight(item.sub, query)}</span>}
                                                    </span>
                                                    <ArrowRight size={14} className="gs-item-arrow" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        {/* footer hint */}
                        {hasResults && (
                            <div className="gs-footer">
                                <span><kbd>↑</kbd><kbd>↓</kbd> Naviguer</span>
                                <span><kbd>↵</kbd> Ouvrir</span>
                                <span><kbd>Esc</kbd> Fermer</span>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default GlobalSearch;
