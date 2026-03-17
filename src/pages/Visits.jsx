import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as VirtualList, FixedSizeGrid as VirtualGrid } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon, Clock, Phone, MapPin, CheckCircle,
    Search, RefreshCw, LayoutGrid, List, ChevronLeft, ChevronRight,
    ArrowUpDown, ArrowUp, ArrowDown, X, Printer, MessageSquare,
    User, Home, Building, FileText, ExternalLink, Bed, Tag, AlertCircle
} from 'lucide-react';
import apiService from '../services/api';
import supabaseService from '../services/supabaseService';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import { debounce } from '../utils/performance';
import pdfService from '../services/pdfService';
import { extractBestPhone, formatPhoneCI } from '../utils/phoneUtils';
import PullToRefresh from '../components/PullToRefresh';
import ConfettiEffect from '../components/ConfettiEffect';
import { hapticSuccess, hapticLight, hapticMedium } from '../utils/haptics';
import './Visits.css';

// ─── VISIT SHEET (FICHE DE VISITE) MODAL ────────────────────────────────────

const VisitSheet = ({ visit, onClose, onSuccess }) => {
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

    const displayPrice = useMemo(() => {
        if (visit?.localInteresse && typeof visit.localInteresse === 'string' && visit.localInteresse.includes('|')) {
            const parts = visit.localInteresse.split('|').map(p => p.trim());
            if (parts.length >= 3) {
                const pricePart = parts[parts.length - 1];
                if (/\d|million|mille|fcfa/i.test(pricePart)) {
                    return pricePart;
                }
            }
        }
        if (property?.prixFormate) {
            return `${property.prixFormate} FCFA`;
        }
        return '';
    }, [visit, property]);

    if (!visit) return null;

    const _buildPdfData = () => {
        const lieu = property
            ? [property.commune, property.quartier, property.zone].filter(Boolean).join(', ')
            : visit.localInteresse || '';

        const _propPhone = extractBestPhone(property);
        const agentPhone = _propPhone || visit.agence_tel || '';
        const agentName = property?.publiePar || property?.expediteur || visit.agence_nom || '';

        return {
            content: visit.nomPrenom || 'Visiteur',
            property: property
                ? `${property.typeBien || 'Bien'} ${property.typeOffre || ''}`.trim()
                : visit.localInteresse || 'Bien immobilier',
            address: lieu,
            price: displayPrice,
            date: visit.dateRv || '',
            phone: visit.numero || '',
            ref: property?.refBien || visit.refBien || '',
            agentPhone: agentPhone,
            agentName: agentName,
            caracteristiques: property?.caracteristiques || ''
        };
    };

    const handlePrint = () => {
        hapticSuccess();            // vibration de succès
        pdfService.printVisitVoucher(_buildPdfData());
        if (onSuccess) onSuccess();
    };

    const handleGeneratePdf = () => {
        hapticSuccess();            // vibration de succès
        pdfService.generateVisitVoucher(_buildPdfData());
        if (onSuccess) onSuccess();
    };
    const _propPhone = extractBestPhone(property);
    const agentPhone = _propPhone || visit.agence_tel || '';
    const agentName = property?.publiePar || property?.expediteur || visit.agence_nom || '';

    const handleAgentWhatsApp = (phoneOverride) => {
        const phone = phoneOverride || agentPhone;
        if (!phone) return;
        hapticMedium();
        const lieu = property
            ? [property.commune, property.quartier, property.zone].filter(Boolean).join(', ')
            : visit.localInteresse || '';
        const bien = property
            ? `${property.typeBien}${lieu ? ' à ' + lieu : ''}`
            : visit.localInteresse || 'votre bien';
        const ref = property?.refBien || visit.refBien || '';
        const greetingName = agentName;
        const greeting = greetingName ? ` ${greetingName}` : '';
        const msg = encodeURIComponent(
            `Bonjour${greeting},\n\n` +
            `Je souhaite organiser une visite avec *${visit.nomPrenom || 'un client'}* pour *${bien}*${ref ? ` (Réf: ${ref})` : ''}.\n` +
            `📅 Date prévue : *${visit.dateRv || 'à confirmer'}*\n\n` +
            `Merci de me confirmer votre disponibilité.`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };
    const lieu = property
        ? [property.commune, property.quartier, property.zone].filter(Boolean).join(' · ') || '—'
        : visit.localInteresse || '—';
    const description = property?.description || '';
    const groupSource = property?.groupeWhatsApp || property?.groupeWhatsappOrigine || property?.groupName || '';

    return (
        <AnimatePresence>
            <>
                {/* Backdrop - fixed overlay */}
                <motion.div
                    className="visit-drawer-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                />
                {/* Drawer Panel */}
                <motion.div
                    className="visit-drawer-panel"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className="visit-drawer-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FileText size={20} />
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Fiche de Visite</h2>
                                {visit.refBien && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Réf. {visit.refBien}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={handleGeneratePdf}>
                                <FileText size={16} /><span>Bon de visite</span>
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                                <Printer size={16} /><span>Imprimer</span>
                            </button>
                            <button className="btn-icon-close" onClick={onClose}><X size={20} /></button>
                        </div>
                    </div>

                    <div className="visit-sheet-body">

                        {/* ── DATE DE VISITE – Bandeau prioritaire ── */}
                        <div className="visit-date-banner">
                            <CalendarIcon size={20} />
                            <div>
                                <span className="visit-date-label">Date de visite prévue</span>
                                <span className="visit-date-value">{visit.dateRv || 'Non définie'}</span>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <span className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                                    {visit.visiteProg ? <CheckCircle size={13} /> : <Clock size={13} />}
                                    {visit.visiteProg ? 'Confirmée' : 'En attente'}
                                </span>
                                {visit.created_at && (
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: '2px' }}>
                                        Enregistré le {new Date(visit.created_at).toLocaleString('fr-FR', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Section Client ── */}
                        <div className="visit-sheet-section visit-sheet-highlight">
                            <h3 className="section-title"><User size={16} /> Client</h3>
                            <div className="visit-sheet-grid-2">
                                <div className="visit-info-block">
                                    <span className="info-label">Nom</span>
                                    <span className="info-value large">{visit.nomPrenom || '—'}</span>
                                </div>
                                <div className="visit-info-block">
                                    <span className="info-label">Téléphone</span>
                                    {visit.numero ? (
                                        <a href={`tel:${visit.numero}`} className="info-value large info-phone-link">
                                            <Phone size={13} /> {visit.numero}
                                        </a>
                                    ) : <span className="info-value large">—</span>}
                                </div>
                            </div>
                        </div>

                        {/* ── Section Bien à Visiter ── */}
                        <div className="visit-sheet-section">
                            <h3 className="section-title"><Building size={16} /> Bien à Visiter</h3>
                            {loadingProp ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>
                                    <Skeleton width="100%" height="16px" />
                                    <Skeleton width="70%" height="16px" />
                                    <Skeleton width="50%" height="16px" />
                                </div>
                            ) : property ? (
                                <>
                                    {/* Badges type / offre */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        {property.typeBien && <span className="bien-chip chip-type"><Home size={11} />{property.typeBien}</span>}
                                        {property.typeOffre && <span className="bien-chip chip-offre"><Tag size={11} />{property.typeOffre}</span>}
                                        {property.chambre && <span className="bien-chip chip-chambres"><Bed size={11} />{property.chambre}{String(property.chambre).match(/ch|pièce|piece/i) ? '' : ' ch.'}</span>}
                                        {property.meubles && <span className="bien-chip">Meublé</span>}
                                    </div>
                                    <div className="visit-sheet-grid-2">
                                        <div className="visit-info-block" style={{ minWidth: 0 }}>
                                            <span className="info-label">Référence</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <span className="info-value" style={{ fontWeight: 600, wordBreak: 'break-all' }}>{property.refBien || '—'}</span>
                                                {property.refBien && (
                                                    <a
                                                        href={`/biens?search=${property.refBien}`}
                                                        className="btn-icon-link"
                                                        title="Voir ce bien"
                                                        onClick={(e) => { e.preventDefault(); window.location.href = `/biens?search=${property.refBien}`; }}
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="visit-info-block">
                                            <span className="info-label">Prix</span>
                                            <span className="info-value" style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                                                {displayPrice || '—'}
                                            </span>
                                        </div>
                                        <div className="visit-info-block" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label"><MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Localisation</span>
                                            <span className="info-value">{lieu}</span>
                                        </div>
                                    </div>
                                    {description && (
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <span className="info-label">Annonce originale</span>
                                            <pre className="message-preview" style={{ marginTop: '0.4rem', maxHeight: '100px', overflow: 'auto', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>{description}</pre>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <div className="visit-info-block">
                                        <span className="info-label">Bien concerné (saisi manuellement)</span>
                                        <span className="info-value">{visit.localInteresse || '—'}</span>
                                    </div>
                                    {visit.refBien && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.8rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                                            Réf. <strong>{visit.refBien}</strong> introuvable en base.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Section Agent / Démarcheur ── */}
                        <div className="visit-sheet-section visit-agent-section">
                            <h3 className="section-title"><MessageSquare size={16} /> Contact Annonceur</h3>
                            <div className="visit-sheet-grid-2">
                                <div className="visit-info-block">
                                    <span className="info-label">Agent / Démarcheur</span>
                                    <span className="info-value">{agentName || 'Non spécifié'}</span>
                                </div>
                                <div className="visit-info-block">
                                    <span className="info-label">Téléphone</span>
                                    {agentPhone ? (
                                        <a href={`tel:${agentPhone}`} className="info-value info-phone-link">
                                            <Phone size={13} /> {agentPhone}
                                        </a>
                                    ) : <span className="info-value">—</span>}
                                </div>
                                {groupSource && (
                                    <div className="visit-info-block" style={{ gridColumn: '1 / -1' }}>
                                        <span className="info-label">Groupe WhatsApp source</span>
                                        <span className="info-value">{groupSource}</span>
                                    </div>
                                )}
                            </div>

                            {/* Bouton WhatsApp agent — visible si téléphone disponible */}
                            {agentPhone ? (
                                <button
                                    className="btn-whatsapp-agent"
                                    style={{ marginTop: '1.25rem', width: '100%', justifyContent: 'center', fontWeight: 600 }}
                                    onClick={() => handleAgentWhatsApp(agentPhone)}
                                >
                                    <MessageSquare size={18} />
                                    Organiser la visite sur WhatsApp
                                </button>
                            ) : (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', border: '1px dashed var(--border-color)' }}>
                                    <AlertCircle size={18} style={{ color: 'var(--brand-warning)', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Coordonnées manquantes</p>
                                        <p style={{ margin: 0 }}>Nous n'avons pas pu identifier l'annonceur. Vous pouvez essayer de retrouver le bien avec la référence <strong>{visit.refBien || 'N/A'}</strong>.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Signatures (impression) ── */}
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
                </motion.div>
            </>
        </AnimatePresence>
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
                            {[1, 2, 3, 4, 5, 6].map(k => <th key={k}><Skeleton width="60%" height="16px" /></th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i}>
                                <td><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Skeleton className="skeleton-circle" width="32px" height="32px" /><Skeleton width="100px" height="16px" /></div></td>
                                <td><Skeleton width="80px" height="16px" /></td>
                                <td><Skeleton width="100px" height="16px" /></td>
                                <td><Skeleton width="90px" height="16px" /></td>
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
        hapticMedium();
        window.open(`tel:${visit.numero}`, '_self');
    };

    const handleWhatsApp = (e) => {
        e.stopPropagation();
        if (!visit.numero) {
            addToast({ type: 'warning', title: 'Erreur', message: 'Numéro de téléphone manquant' });
            return;
        }
        hapticMedium();
        let phone = visit.numero.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '225' + phone.substring(1);
        else if (phone.length === 10) phone = '225' + phone;
        const message = encodeURIComponent(`Bonjour ${visit.nomPrenom}, je reviens vers vous concernant votre demande de visite pour ${visit.localInteresse || 'votre zone'}.`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    return (
        <div className="visit-actions">
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onOpenSheet(visit); }} title="Fiche de visite">
                <FileText size={14} /> <span>Fiche visite</span>
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

// ─── VISIT CARD (extracted for reuse in virtualized grid) ────────────────────

const VisitCard = React.memo(({ visit, addToast, onOpenSheet }) => (
    <div
        className={`card visit-card-v2 ${visit.visiteProg ? 'programmed' : 'tentative'} fade-in`}
        onClick={() => { hapticLight(); onOpenSheet(visit); }}
        style={{ cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{visit.numero || '-'}</span>
                        {visit.refBien && <span className="ref-badge-mini">{visit.refBien}</span>}
                    </div>
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
                    <span className="label">Date Prévue</span>
                    <span className="value">{visit.dateRv}</span>
                </div>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <Clock size={16} />
                <div>
                    <span className="label">Enregistré le</span>
                    <span className="value">
                        {visit.created_at ? new Date(visit.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                    </span>
                </div>
            </div>
        </div>

        <div className="visit-footer" onClick={e => e.stopPropagation()}>
            <VisitActions visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
        </div>
    </div>
));

// ─── GRID VIEW ───────────────────────────────────────────────────────────────

// Card height in px for the virtual grid rows
const GRID_CARD_HEIGHT = 280;
const GRID_COL_WIDTH = 340; // min column width
const GRID_GAP = 24;

const GridView = React.memo(({ visits, addToast, onOpenSheet }) => {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0].contentRect.width;
            setContainerWidth(w);
        });
        ro.observe(el);
        setContainerWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    // Fallback: if fewer than 20 items, skip virtualization entirely
    if (visits.length < 20) {
        return (
            <div className="visits-grid">
                {visits.map((visit) => (
                    <VisitCard key={visit.id} visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
                ))}
            </div>
        );
    }

    const colCount = containerWidth > 0
        ? Math.max(1, Math.floor((containerWidth + GRID_GAP) / (GRID_COL_WIDTH + GRID_GAP)))
        : 1;
    const rowCount = Math.ceil(visits.length / colCount);
    const colWidth = containerWidth > 0
        ? Math.floor((containerWidth - (colCount - 1) * GRID_GAP) / colCount)
        : GRID_COL_WIDTH;

    const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * colCount + columnIndex;
        if (index >= visits.length) return null;
        const visit = visits[index];
        const cellStyle = {
            ...style,
            left: Number(style.left) + columnIndex * GRID_GAP,
            top: Number(style.top) + rowIndex * GRID_GAP,
            width: colWidth,
            height: GRID_CARD_HEIGHT,
            padding: 0,
        };
        return (
            <div style={cellStyle}>
                <VisitCard visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
            </div>
        );
    }, [visits, addToast, onOpenSheet, colCount, colWidth]);

    return (
        <div ref={containerRef} style={{ width: '100%' }}>
            {containerWidth > 0 && (
                <VirtualGrid
                    columnCount={colCount}
                    columnWidth={colWidth + GRID_GAP}
                    height={Math.min(700, rowCount * (GRID_CARD_HEIGHT + GRID_GAP))}
                    rowCount={rowCount}
                    rowHeight={GRID_CARD_HEIGHT + GRID_GAP}
                    width={containerWidth}
                    style={{ overflow: 'auto' }}
                >
                    {Cell}
                </VirtualGrid>
            )}
        </div>
    );
});

// ─── LIST VIEW ───────────────────────────────────────────────────────────────

const LIST_ROW_HEIGHT = 72; // px per row

const ListView = React.memo(({ visits, addToast, sortConfig, onSort, onOpenSheet }) => {
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="sort-icon-muted" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="sort-icon-active" /> : <ArrowDown size={14} className="sort-icon-active" />;
    };

    // Column flex-basis percentages to mimic the table layout
    const COL_WIDTHS = ['22%', '20%', '14%', '16%', '13%', '15%'];

    const Row = useCallback(({ index, style }) => {
        const visit = visits[index];
        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color, #e2e8f0)',
                    cursor: 'pointer',
                    background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary, rgba(0,0,0,0.02))',
                    boxSizing: 'border-box',
                    padding: '0 1rem',
                    transition: 'background 0.15s',
                }}
                onClick={() => { hapticLight(); onOpenSheet(visit); }}
            >
                <div style={{ flex: COL_WIDTHS[0], minWidth: 0 }}>
                    <div className="list-user-cell">
                        <div className="list-user-avatar" style={{ background: visit.visiteProg ? 'var(--gradient-success)' : 'var(--gradient-primary)', flexShrink: 0 }}>
                            {(visit.nomPrenom || '?').charAt(0)}
                        </div>
                        <div className="user-text" style={{ minWidth: 0 }}>
                            <h3 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visit.nomPrenom || 'Client Inconnu'}</h3>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visit.numero || '-'}</span>
                        </div>
                    </div>
                </div>
                <div style={{ flex: COL_WIDTHS[1], minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                    {visit.localInteresse || '-'}
                </div>
                <div style={{ flex: COL_WIDTHS[2], fontSize: '0.875rem' }}>{visit.dateRv}</div>
                <div style={{ flex: COL_WIDTHS[3] }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {visit.created_at ? new Date(visit.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                    </span>
                </div>
                <div style={{ flex: COL_WIDTHS[4] }}>
                    <span className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`}>
                        {visit.visiteProg ? 'Confirmée' : 'Tentative'}
                    </span>
                </div>
                <div style={{ flex: COL_WIDTHS[5], textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <VisitActions visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
                </div>
            </div>
        );
    }, [visits, addToast, onOpenSheet]);

    const listHeight = Math.min(600, visits.length * LIST_ROW_HEIGHT);

    return (
        <div className="visits-list-container">
            {/* Sticky header row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                borderBottom: '2px solid var(--border-color, #e2e8f0)',
                background: 'var(--bg-primary, #fff)',
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                height: 44,
            }}>
                <div style={{ flex: COL_WIDTHS[0] }} onClick={() => onSort('nomPrenom')} className="sortable-header">
                    <div className="header-cell-content">Client {getSortIcon('nomPrenom')}</div>
                </div>
                <div style={{ flex: COL_WIDTHS[1] }} onClick={() => onSort('localInteresse')} className="sortable-header">
                    <div className="header-cell-content">Zone {getSortIcon('localInteresse')}</div>
                </div>
                <div style={{ flex: COL_WIDTHS[2] }} onClick={() => onSort('dateRv')} className="sortable-header">
                    <div className="header-cell-content">Date Prévue {getSortIcon('dateRv')}</div>
                </div>
                <div style={{ flex: COL_WIDTHS[3] }} onClick={() => onSort('created_at')} className="sortable-header">
                    <div className="header-cell-content">Enregistré le {getSortIcon('created_at')}</div>
                </div>
                <div style={{ flex: COL_WIDTHS[4] }} onClick={() => onSort('visiteProg')} className="sortable-header">
                    <div className="header-cell-content">Statut {getSortIcon('visiteProg')}</div>
                </div>
                <div style={{ flex: COL_WIDTHS[5], textAlign: 'center' }}>Actions</div>
            </div>

            {/* Virtualized rows — only active when > 20 items */}
            {visits.length < 20 ? (
                <div>
                    {visits.map((visit, index) => (
                        <div
                            key={visit.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: LIST_ROW_HEIGHT,
                                borderBottom: '1px solid var(--border-color, #e2e8f0)',
                                cursor: 'pointer',
                                background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary, rgba(0,0,0,0.02))',
                                boxSizing: 'border-box',
                                padding: '0 1rem',
                            }}
                            onClick={() => { hapticLight(); onOpenSheet(visit); }}
                        >
                            <div style={{ flex: COL_WIDTHS[0], minWidth: 0 }}>
                                <div className="list-user-cell">
                                    <div className="list-user-avatar" style={{ background: visit.visiteProg ? 'var(--gradient-success)' : 'var(--gradient-primary)', flexShrink: 0 }}>
                                        {(visit.nomPrenom || '?').charAt(0)}
                                    </div>
                                    <div className="user-text" style={{ minWidth: 0 }}>
                                        <h3 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visit.nomPrenom || 'Client Inconnu'}</h3>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visit.numero || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: COL_WIDTHS[1], minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                {visit.localInteresse || '-'}
                            </div>
                            <div style={{ flex: COL_WIDTHS[2], fontSize: '0.875rem' }}>{visit.dateRv}</div>
                            <div style={{ flex: COL_WIDTHS[3] }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {visit.created_at ? new Date(visit.created_at).toLocaleString('fr-FR', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                    }) : '-'}
                                </span>
                            </div>
                            <div style={{ flex: COL_WIDTHS[4] }}>
                                <span className={`badge ${visit.visiteProg ? 'badge-success' : 'badge-warning'}`}>
                                    {visit.visiteProg ? 'Confirmée' : 'Tentative'}
                                </span>
                            </div>
                            <div style={{ flex: COL_WIDTHS[5], textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <VisitActions visit={visit} addToast={addToast} onOpenSheet={onOpenSheet} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <VirtualList
                    height={listHeight}
                    itemCount={visits.length}
                    itemSize={LIST_ROW_HEIGHT}
                    width="100%"
                >
                    {Row}
                </VirtualList>
            )}
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
    const [showSuccess, setShowSuccess] = useState(false);
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
                (visit.refBien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        <PullToRefresh onRefresh={loadVisits}>
            <div className={`visits-v2 fade-in ${selectedVisit ? 'has-side-panel' : ''}`}>
                <ConfettiEffect isActive={showSuccess} onComplete={() => setShowSuccess(false)} />

                {/* Visit Sheet Modal */}
                <AnimatePresence>
                    {selectedVisit && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <VisitSheet
                                visit={selectedVisit}
                                onClose={() => setSelectedVisit(null)}
                                onSuccess={() => setShowSuccess(true)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="visits-header">
                    <div className="header-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h1 style={{ margin: 0 }}>Gestion des Visites</h1>
                            <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', opacity: 0.8 }}>v2.1</span>
                        </div>
                        <p className="text-muted">Planifiez et suivez les rencontres avec vos clients</p>
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
        </PullToRefresh>
    );
};

export default Visits;
