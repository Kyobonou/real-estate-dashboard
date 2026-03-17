import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Tag, Grid, List, Search, Filter, X, Phone, Eye,
    Download, Home, Key, Loader, Bed, Building, Map,
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Images,
    User, MessageSquare, Copy, Check, RefreshCw, Lock, Unlock, Sparkles, Building2
} from 'lucide-react';
import * as XLSX from 'xlsx'; // Import bibliothèque Excel
import apiService from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PropertyMap from '../components/PropertyMap';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import geocodingService from '../services/geocodingService';
import { debounce } from '../utils/performance';
import { formatPhoneCI, extractBestPhone, displayPhone } from '../utils/phoneUtils';

// ── Match scoring (Demandes → Biens) ─────────────────────────────────────────
const normStr = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Aliases de communes pour le scoring (même logique que RequestsPage)
const SCORE_COMMUNE_GROUPS = [
    { names: ['cocody', 'coccody'], aliases: ['riviera', 'angre', 'palmeraie', 'bonoumin', 'bietry', 'blockhaus', 'ii plateaux', '2 plateaux', 'deux plateaux', 'riviera golf', 'riviera 3', 'riviera 4', 'danga', 'faya', 'mpouto', 'cite verte'] },
    { names: ['yopougon', 'yopo'], aliases: ['niangon', 'toit rouge', 'maroc', 'selmer', 'wassakara', 'ananas', 'gesco', 'andokoi', 'locodjro', 'sideci'] },
    { names: ['marcory', 'marcori'], aliases: ['zone 4', 'zone 3', 'zone4', 'zone3', 'remblais', 'anoumabo', 'hibiscus'] },
    { names: ['koumassi'], aliases: ['remblai', 'prodomo', 'sopim'] },
    { names: ['treichville', 'treich'], aliases: ['aragon', 'habitat', 'gare bassam'] },
    { names: ['plateau'], aliases: ['cite administrative', 'le plateau'] },
    { names: ['adjame'], aliases: ['220 logements', 'williamsville', 'liberte'] },
    { names: ['abobo'], aliases: ['baoule', 'pk18', 'n dotsre', 'abobo nord', 'clouetcha'] },
    { names: ['port-bouet', 'portbouet', 'port bouet'], aliases: ['vridi', 'gonza', 'gonzagueville', 'aeroport'] },
    { names: ['bingerville'], aliases: ['febca', 'mpouto'] },
    { names: ['grand-bassam', 'grand bassam', 'bassam'], aliases: ['moossou'] },
    { names: ['attiecoube', 'attecoube', 'attécoubé'], aliases: ['agban'] },
];

// Synonymes de types de biens
const TYPE_SYNONYM_GROUPS = [
    ['villa', 'maison', 'duplex', 'triplex', 'residence'],
    ['appartement', 'appart', 'appartment', 'flat'],
    ['studio'],
    ['bureau', 'bureaux', 'open space'],
    ['magasin', 'boutique', 'commerce', 'commercial', 'local commercial'],
    ['terrain', 'parcelle', 'lot'],
    ['immeuble'],
    ['chambre'],
];

// Quartiers connus pour bonus de matching textuel
const QUARTIERS_CONNUS = [
    'angre', 'riviera', 'bonoumin', 'niangon', 'zone 4', 'zone4', 'faya',
    'palmeraie', 'mermoz', 'bel air', 'vallon', 'vridi', 'banco', 'gonzagueville',
    'djibi', 'gesco', 'pk18', 'pk 18', 'attoban', 'aghien', 'wassakara',
    '2 plateaux', 'deux plateaux', 'blockhaus', 'williamsville', 'toit rouge',
    'remblais', 'anoumabo', 'aeroport', 'marcory', 'sopim', 'prodomo',
    'niangon nord', 'niangon sud', 'ananas', 'locodjro', 'selmer',
];

function _getCommuneGroup(cn) {
    const s = normStr(cn);
    for (const g of SCORE_COMMUNE_GROUPS) {
        if (g.names.some(n => s.includes(n) || n.includes(s))) return g;
        if (g.aliases.some(a => s.includes(a) || a.includes(s))) return g;
    }
    return null;
}

function _communeScore(propCommune, critCommune) {
    if (!propCommune || !critCommune) return 0;
    const p = normStr(propCommune);
    const c = normStr(critCommune);
    // Correspondance exacte ou sous-chaîne directe
    if (p === c || p.includes(c) || c.includes(p)) return 8;
    // Même groupe (quartier → commune ou alias → commune)
    const pg = _getCommuneGroup(p);
    const cg = _getCommuneGroup(c);
    if (pg && cg && pg === cg) return 6;
    if (pg && pg.aliases.some(a => c.includes(a))) return 6;
    if (cg && cg.aliases.some(a => p.includes(a))) return 6;
    return 0;
}

function _typeScore(propType, critType) {
    if (!propType || !critType) return 0;
    const p = normStr(propType);
    const c = normStr(critType);
    if (p === c) return 8;
    if (p.includes(c) || c.includes(p)) return 5;
    // Synonymes
    for (const grp of TYPE_SYNONYM_GROUPS) {
        const inP = grp.some(s => p.includes(s));
        const inC = grp.some(s => c.includes(s));
        if (inP && inC) return 4;
    }
    return 0;
}

const MATCH_STOP_WORDS = new Set([
    'cherche', 'besoin', 'client', 'contact', 'urgent', 'dispo',
    'notre', 'votre', 'cette', 'celui', 'leurs', 'avec', 'pour',
    'dans', 'chez', 'bien', 'tres', 'mais', 'plus', 'aussi',
    'tout', 'comme', 'nous', 'vous', 'dont', 'leur', 'quil',
    'elle', 'elles', 'etre', 'avoir', 'faire', 'sont',
    'donne', 'sous', 'vers', 'autour', 'entre', 'pourrait',
]);

function scoreProperty(property, criteria, preNormalized = {}) {
    if (!criteria) return 0;
    let score = 0;

    // Use pre-normalized values if provided (O(1) vs expensive normStr)
    const pOffre = preNormalized.pOffre || normStr(property.typeOffre || property.typeTransaction || '');
    const cOffre = preNormalized.cOffre || normStr(criteria.typeOffre || '');

    // ── Offer Type Match (STRICT) ───────────────────────────────────────────
    if (criteria.typeOffre) {
        // Infer property type based on price if not explicitly stated
        const price = property.rawPrice || 0;
        const isLocByPrice = (price > 0 && price < 1_000_000);
        const isLoc = pOffre.includes('location') || (isLocByPrice && !pOffre.includes('vente'));
        const isVente = pOffre.includes('vente') || (!isLocByPrice && !pOffre.includes('location') && price > 1_000_000);

        const cIsLoc = criteria.typeOffre === 'Location';
        const cIsVente = criteria.typeOffre === 'Vente' || criteria.typeOffre === 'Achat';

        if (cIsLoc && isVente) return 0; // Strict mismatch: location ≠ vente
        if (cIsVente && isLoc) return 0; // Strict mismatch: achat/vente ≠ location

        if ((cIsLoc && isLoc) || (cIsVente && isVente)) score += 12; // High priority match
        // No penalty for ambiguous typeOffre — let other criteria decide
    }

    // Heuristic: if rent requested but price > 10M FCFA, likely NOT a match
    if (cOffre.includes('loc') && (property.rawPrice || 0) > 10_000_000) {
        const pType = preNormalized.pType || normStr(property.typeBien || '');
        if (!pType.includes('immeu') && !pType.includes('batiment')) return 0;
    }

    // ── Commune (max 10 pts) ───────────────────────────────────────────────────
    if (criteria.commune) {
        const cs = _communeScore(property.commune, criteria.commune);
        score += (cs / 8) * 10;
        // Bonus if zone/quartier contains the searched commune
        if (cs < 8) {
            const pZone = preNormalized.pZone || normStr([property.zone, property.quartier].filter(Boolean).join(' '));
            const cC = preNormalized.cCommune || normStr(criteria.commune);
            if (pZone && cC && (pZone.includes(cC) || cC.includes(pZone))) {
                score += (cs === 0 ? 6 : 3);
            }
        }
    }

    // ── Type de bien (max 10 pts) ──────────────────────────────────────────────
    if (criteria.type) {
        const ts = _typeScore(property.typeBien || property.typeDeBien, criteria.type);
        score += (ts / 8) * 10;
    }

    // ── Bedrooms (max 8 pts) ──────────────────────────────────────────────────
    if (criteria.chambres) {
        const pCh = parseInt(property.chambres) || 0;
        if (pCh > 0) {
            const diff = Math.abs(pCh - criteria.chambres);
            if (diff === 0) score += 8;
            else if (diff === 1) score += 4;
            else if (diff === 2) score += 1;
        }
    }

    // ── Price / Budget (max 10 pts) ─────────────────────────────────────────────
    const pIsLoc = pOffre.includes('loc') || pOffre.includes('men');
    const price = property.rawPrice || 0;
    if (criteria.loyer && price) {
        if (pIsLoc || !pOffre) {
            const ratio = price / criteria.loyer;
            if (ratio >= 0.6 && ratio <= 1.05) score += 10;
            else if (ratio <= 1.25) score += 5;
            else if (ratio <= 1.6) score += 1;
        }
    } else if (criteria.budget && price) {
        if (!pIsLoc || !pOffre) {
            const prixM = price >= 1_000_000 ? price / 1_000_000 : price;
            const ratio = prixM / criteria.budget;
            if (ratio >= 0.5 && ratio <= 1.05) score += 10;
            else if (ratio <= 1.3) score += 5;
            else if (ratio <= 1.8) score += 1;
        }
    }

    // ── Furnished (max 5 pts) ────────────────────────
    if (criteria.meuble !== undefined) {
        const pMeuble = property.meuble === true || pOffre.includes('oui');
        if (Boolean(pMeuble) === Boolean(criteria.meuble)) score += 5;
        else score -= 5;
    }

    // ── Rich Amenities match (max 12 pts) ──────────────────────────────────────
    const fullPropText = preNormalized.fullPropText || normStr([
        property.caracteristiques,
        property.description,
        property.titre,
        property.zone,
        property.quartier,
        property.commune,
        property.message_initial
    ].filter(Boolean).join(' '));

    if (criteria.amenities) {
        let amenityMatches = 0;
        criteria.amenities.forEach(a => {
            if (fullPropText.includes(a)) {
                score += 4;
                amenityMatches++;
            }
        });
        // Bonus for having all requested amenities
        if (amenityMatches === criteria.amenities.length && amenityMatches > 0) score += 2;
    }

    // ── Deep textual matching in message/description (max 15 pts) ───────────
    if (criteria.originalText) {
        const textN = preNormalized.cOriginalText || normStr(criteria.originalText);

        // Quality keywords
        const qualityKeywords = [
            { kw: ['piscine', 'pool'], pts: 3 },
            { kw: ['jardin', 'garden', 'espace vert'], pts: 2 },
            { kw: ['parking', 'garage'], pts: 2 },
            { kw: ['neuf', 'finition', 'nouveau', 'refait'], pts: 3 },
            { kw: ['ascenseur'], pts: 2 },
            { kw: ['securite', 'gardien', 'cloture', 'portail'], pts: 2 },
            { kw: ['clim', 'split', 'air conditionne'], pts: 2 },
            { kw: ['marbre', 'staffe'], pts: 2 },
        ];

        qualityKeywords.forEach(({ kw, pts }) => {
            if (kw.some(k => textN.includes(k)) && kw.some(k => fullPropText.includes(k))) {
                score += pts;
            }
        });

        // Quarter name bonus
        for (const q of QUARTIERS_CONNUS) {
            if (textN.includes(q) && fullPropText.includes(q)) { score += 5; break; }
        }

        // General word overlap match
        score += getDeepMatchScore(property, criteria, preNormalized);
    }

    return Math.max(0, score);
}

// ── Deep Text Search Helper (v3 - High precision) ──
function getDeepMatchScore(property, criteria, preNormalized = {}) {
    if (!criteria.originalText) return 0;

    let score = 0;
    const fullDesc = preNormalized.fullDescBlob || normStr([
        property.caracteristiques,
        property.zone,
        property.quartier,
        property.description,
        property.message_initial,
        property.publiePar,
    ].filter(Boolean).join(' '));

    const words = preNormalized.cWords || normStr(criteria.originalText)
        .split(/[\s,;.!?/()\[\]+*#@"\n\r]+/)
        .filter(w => w.length > 3 && !MATCH_STOP_WORDS.has(w) && !/^\d+$/.test(w));

    let matchCount = 0;
    for (const w of words) {
        if (fullDesc.includes(w)) matchCount++;
    }

    if (matchCount > 0) score += Math.min(Math.ceil(matchCount * 2.5), 15);

    return Math.max(0, score);
}

// Calcule la fraîcheur d'un bien selon sa date de publication (shelf life = 30 jours)
const getFreshness = (dateRaw) => {
    if (!dateRaw) return null;
    const pub = new Date(dateRaw);
    if (isNaN(pub.getTime())) return null;
    const days = Math.floor((Date.now() - pub.getTime()) / 86400000);
    if (days <= 3) return { label: 'Nouveau', color: '#10b981', bg: 'rgba(16,185,129,0.15)', pct: 100, days };
    if (days <= 7) return { label: 'Récent', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', pct: 82, days };
    if (days <= 15) return { label: 'En cours', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', pct: 55, days };
    if (days <= 25) return { label: 'Expire bientôt', color: '#f97316', bg: 'rgba(249,115,22,0.15)', pct: 25, days };
    return { label: 'Expiré', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', pct: 5, days };
};
import PullToRefresh from '../components/PullToRefresh';
import './Properties.css';

const PropertiesSkeleton = ({ viewMode }) => (
    <div className="properties-v2">
        <div className="properties-header">
            <div className="header-left">
                <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="250px" height="20px" />
            </div>
            <Skeleton width="140px" height="40px" />
        </div>

        <div className="properties-toolbar">
            <div className="search-filter-group" style={{ width: '100%', gap: '1rem' }}>
                <Skeleton width="100%" height="42px" type="rect" style={{ borderRadius: '12px' }} />
                <Skeleton width="120px" height="42px" type="rect" style={{ borderRadius: '12px' }} />
            </div>
            <div className="view-toggle">
                <Skeleton width="120px" height="42px" type="rect" style={{ borderRadius: '12px' }} />
            </div>
        </div>

        <div className={`properties-container ${viewMode}`}>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={viewMode === 'list' ? 'property-list-item' : 'property-card-v2'} style={viewMode === 'list' ? { pointerEvents: 'none' } : { pointerEvents: 'none', height: '420px' }}>
                    {viewMode === 'list' ? (
                        <>
                            <div className="property-list-info" style={{ width: '100%' }}>
                                <div className="property-list-header">
                                    <Skeleton width="40%" height="24px" />
                                    <Skeleton width="20%" height="24px" />
                                </div>
                                <div className="property-list-details" style={{ marginTop: '0.5rem' }}>
                                    <Skeleton width="30%" height="16px" />
                                    <Skeleton width="20%" height="16px" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <Skeleton type="rect" height="200px" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }} />
                            <div className="property-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <Skeleton width="70%" height="24px" style={{ marginBottom: '8px' }} />
                                    <Skeleton width="40%" height="20px" />
                                </div>
                                <Skeleton width="100%" height="16px" />
                                <Skeleton width="90%" height="16px" />
                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                    <Skeleton width="60px" height="24px" />
                                    <Skeleton width="60px" height="24px" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    </div>
);


const PropertyDetailsModal = ({ property, isOpen, onClose, onToggleDisponible, onPrev, onNext, currentIdx, totalCount, variant = "modal", images = [] }) => {
    const { addToast } = useToast();
    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [galleryView, setGalleryView] = useState('carousel');
    const [msgCopied, setMsgCopied] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [aiImproved, setAiImproved] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev?.(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); onNext?.(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onPrev, onNext]);

    const handleToggleDisponible = async () => {
        if (!property?.id || toggling) return;
        setToggling(true);
        const result = await onToggleDisponible(property.id, property.disponible);
        if (!result?.success) {
            addToast({ type: 'error', title: 'Erreur', message: result?.error || 'Impossible de modifier le statut' });
        }
        setToggling(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        setActiveImgIdx(0);
        setGalleryView('carousel');
        setMsgCopied(false);
        setAiImproved(false);
    }, [isOpen, property?.publicationId]);

    // Extract best phone using utility
    const rawContact = extractBestPhone(property);
    const contactPhone = rawContact; // extractBestPhone already returns a clean string or ''

    const handleContact = () => {
        if (!contactPhone) {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
            return;
        }
        window.open(`tel:+${contactPhone}`, '_self');
        addToast({ type: 'success', title: 'Contact', message: `Appel vers +${contactPhone}` });
    };

    const handleWhatsApp = () => {
        if (!contactPhone) {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
            return;
        }

        const agentName = property.expediteur || property.publiePar || '';
        const lieu = [property.commune, property.quartier].filter(Boolean).join(', ') || property.zone || '';
        const msgOrigin = property.description
            ? `\n\n------- Message d'origine -------\n${property.description}\n---------------------------------`
            : '';

        const text = `Bonjour${agentName ? ' ' + agentName : ''},\n\nJe suis intéressé(e) par votre bien : ${property.typeBien} à ${lieu} (${property.prixFormate} FCFA).\n\nMerci de me recontacter.${msgOrigin}`;
        window.open(`https://wa.me/${contactPhone}?text=${encodeURIComponent(text)}`, '_blank');
        addToast({ type: 'success', title: 'WhatsApp', message: 'Ouverture de WhatsApp...' });
    };

    const handleCopyMessage = () => {
        const text = property.description || property.caracteristiques || '';
        if (!text) return;
        navigator.clipboard?.writeText(text).then(() => {
            setMsgCopied(true);
            addToast({ type: 'success', title: 'Copié !', message: 'Message original copié dans le presse-papier' });
            setTimeout(() => setMsgCopied(false), 2000);
        });
    };

    if (!property) return null;

    const localisation = [property.commune, property.quartier, property.zone].filter(Boolean).join(' · ') || '—';
    const agentName = property.expediteur || property.publiePar || '';
    const messageOriginal = property.description || '';

    const navStrip = totalCount > 1 ? (
        <div className="modal-nav-strip">
            <button
                className="modal-nav-btn"
                onClick={onPrev}
                disabled={currentIdx <= 0}
                title="Bien précédent (←)"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="modal-nav-counter">
                {currentIdx + 1} <span>/</span> {totalCount}
            </span>
            <button
                className="modal-nav-btn"
                onClick={onNext}
                disabled={currentIdx >= totalCount - 1}
                title="Bien suivant (→)"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    ) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Détails du Bien" size="lg" navContent={navStrip} variant={variant}>
            <div className="property-details-modal">

                <div className="property-details-header">
                    {(() => {
                        const allUrls = images.length > 0
                            ? images.map(i => i.lien_image).filter(Boolean)
                            : (property.imageUrl ? [property.imageUrl] : []);
                        const hasImages = allUrls.length > 0;
                        return (
                            <div style={{ position: 'relative' }}>
                                {hasImages && allUrls.length > 1 && (
                                    <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                        <button onClick={() => setGalleryView('carousel')}
                                            style={{ flex: 1, padding: '5px 0', fontSize: '0.78rem', fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer', background: galleryView === 'carousel' ? '#1B4299' : 'var(--bg-primary)', color: galleryView === 'carousel' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            <ChevronLeft size={14} /><ChevronRight size={14} /> Carrousel
                                        </button>
                                        <button onClick={() => setGalleryView('grid')}
                                            style={{ flex: 1, padding: '5px 0', fontSize: '0.78rem', fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer', background: galleryView === 'grid' ? '#1B4299' : 'var(--bg-primary)', color: galleryView === 'grid' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            <Images size={14} /> Grille ({allUrls.length})
                                        </button>
                                    </div>
                                )}
                                {(galleryView === 'carousel' || allUrls.length <= 1) && (
                                    <div className="property-image-large" style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${property.id % 2 === 0 ? '#4f46e5' : '#ec4899'} 0%, ${property.id % 2 === 0 ? '#7c3aed' : '#f97316'} 100%)` }}>
                                        {hasImages ? (
                                            <>
                                                <img key={activeImgIdx} src={allUrls[activeImgIdx]} alt={`${property.typeBien} ${activeImgIdx + 1}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={e => { e.target.style.display = 'none'; }} />
                                                {allUrls.length > 1 && (
                                                    <>
                                                        <button onClick={() => setActiveImgIdx(i => (i - 1 + allUrls.length) % allUrls.length)}
                                                            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                                                            <ChevronLeft size={18} />
                                                        </button>
                                                        <button onClick={() => setActiveImgIdx(i => (i + 1) % allUrls.length)}
                                                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                                                            <ChevronRight size={18} />
                                                        </button>
                                                        <span style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                            {activeImgIdx + 1} / {allUrls.length}
                                                        </span>
                                                        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                                                            {allUrls.map((_, i) => (
                                                                <div key={i} onClick={() => setActiveImgIdx(i)}
                                                                    style={{ width: i === activeImgIdx ? 20 : 8, height: 8, borderRadius: 4, background: i === activeImgIdx ? '#fff' : 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'width 0.2s' }} />
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                                <div className="property-overlay"><h2>{property.typeBien}</h2></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {galleryView === 'grid' && allUrls.length > 1 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6, padding: 10, background: 'var(--bg-secondary)', maxHeight: 320, overflowY: 'auto' }}>
                                        {allUrls.map((url, i) => (
                                            <div key={i} onClick={() => { setActiveImgIdx(i); setGalleryView('carousel'); }}
                                                style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', cursor: 'pointer', border: i === activeImgIdx ? '2px solid #1B4299' : '2px solid transparent' }}>
                                                <img src={url} alt={`Photo ${i + 1}`} loading="lazy"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={e => { e.target.parentElement.style.display = 'none'; }} />
                                                <span style={{ position: 'absolute', bottom: 3, right: 4, fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '1px 4px' }}>{i + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className="property-quick-info">
                        <div className="price-section">
                            <span className="price-label">Prix</span>
                            <h3 className="price-value">{property.prixFormate}</h3>
                            {property.refBien && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.4px', marginTop: 2 }}>
                                    Réf&nbsp;{property.refBien}
                                </span>
                            )}
                        </div>
                        <div className="status-section">
                            <span className={`badge ${property.disponible ? 'badge-success' : 'badge-danger'}`}>{property.status}</span>
                            {property.typeOffre && <span className="offer-badge">{property.typeOffre}</span>}
                        </div>
                    </div>
                </div>

                <div className="property-details-body">

                    {/* ── LOCALISATION ── */}
                    <div className="details-section">
                        <h4>Localisation</h4>
                        <div className="info-grid">
                            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                <MapPin size={18} style={{ color: 'var(--brand-primary, #4f46e5)', flexShrink: 0 }} />
                                <div>
                                    <span className="info-label">Zone / Commune / Quartier</span>
                                    <span className="info-value" style={{ fontWeight: 600 }}>{localisation}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Bed size={18} />
                                <div>
                                    <span className="info-label">Chambres</span>
                                    <span className="info-value">{property.chambres > 0 ? property.chambres : '—'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Home size={18} />
                                <div>
                                    <span className="info-label">Meublé</span>
                                    <span className="info-value">{property.meuble ? 'Oui' : 'Non'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Key size={18} />
                                <div>
                                    <span className="info-label">Disponible</span>
                                    <span className="info-value">{property.disponible ? 'Oui' : 'Non'}</span>
                                </div>
                            </div>
                            {property.datePublication && (
                                <div className="info-item">
                                    <Tag size={18} />
                                    <div>
                                        <span className="info-label">Publié le</span>
                                        <span className="info-value">{property.datePublication}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── CONTACT DE L'AGENT ── */}
                    <div className="details-section" style={{ background: 'var(--bg-secondary, #f8fafc)', borderRadius: 10, padding: '1rem 1.25rem' }}>
                        <h4 style={{ marginBottom: '0.75rem' }}>Contact de l'agent</h4>
                        <div className="info-grid">
                            {agentName && (
                                <div className="info-item">
                                    <User size={18} style={{ color: '#4f46e5', flexShrink: 0 }} />
                                    <div>
                                        <span className="info-label">Partagé par</span>
                                        <span className="info-value" style={{ fontWeight: 600 }}>{agentName}</span>
                                    </div>
                                </div>
                            )}
                            <div className="info-item">
                                <Phone size={18} style={{ color: contactPhone ? '#16a34a' : '#94a3b8', flexShrink: 0 }} />
                                <div>
                                    <span className="info-label">Téléphone</span>
                                    {contactPhone ? (
                                        <a
                                            href={`tel:+${contactPhone}`}
                                            style={{ fontWeight: 600, letterSpacing: '0.3px', color: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                        >
                                            {displayPhone(contactPhone)}
                                        </a>
                                    ) : (
                                        <span className="info-value" style={{ color: '#ef4444', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                            Non disponible — numéro non extrait du message
                                        </span>
                                    )}
                                </div>
                            </div>
                            {property.groupeWhatsApp && (
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    {property.groupeWhatsApp === 'FORMULAIRE_TALLY' ? (
                                        <>
                                            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📋</span>
                                            <div>
                                                <span className="info-label">Source</span>
                                                <span className="info-value" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#7c3aed' }}>
                                                    Formulaire Tally (soumission directe)
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare size={18} style={{ color: '#25D366', flexShrink: 0 }} />
                                            <div>
                                                <span className="info-label">Groupe WhatsApp source</span>
                                                <span className="info-value" style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>
                                                    {(property.groupName && !property.groupName.startsWith('Groupe '))
                                                        ? property.groupName
                                                        : property.groupeWhatsApp}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Bouton WhatsApp — visible uniquement si un numéro est disponible */}
                        {contactPhone ? (
                            <button
                                className="btn btn-whatsapp"
                                onClick={handleWhatsApp}
                                style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center', gap: 8 }}
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ flexShrink: 0 }}>
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                Envoyer un message WhatsApp
                            </button>
                        ) : (
                            <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.8rem', textAlign: 'center' }}>
                                ⚠️ Contact WhatsApp indisponible — le numéro de téléphone n'a pas été extrait du message original.
                                {property.description && (
                                    <span style={{ display: 'block', marginTop: '0.4rem', color: '#6b7280', fontSize: '0.75rem' }}>
                                        Vérifiez le message original ci-dessous pour trouver le numéro manuellement.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── MESSAGE ORIGINAL ── */}
                    {messageOriginal && (
                        <div className="details-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '10px' }}>
                                <h4 style={{ margin: 0 }}>Caractéristiques</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setAiImproved(!aiImproved)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, borderRadius: 7, border: '1px solid var(--border-subtle, #e2e8f0)', background: aiImproved ? '#ede9fe' : 'var(--bg-panel, #fff)', color: aiImproved ? '#6d28d9' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <Sparkles size={14} />
                                        {aiImproved ? 'Voir Original' : 'Améliorer (IA)'}
                                    </button>
                                    <button
                                        onClick={handleCopyMessage}
                                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, borderRadius: 7, border: '1px solid var(--border-subtle, #e2e8f0)', background: msgCopied ? '#dcfce7' : 'var(--bg-panel, #fff)', color: msgCopied ? '#16a34a' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        {msgCopied ? <Check size={14} /> : <Copy size={14} />}
                                        {msgCopied ? 'Copié !' : 'Copier'}
                                    </button>
                                </div>
                            </div>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--text-primary, #1e293b)', lineHeight: 1.6, background: aiImproved ? '#f8fafc' : 'var(--bg-secondary, #f8fafc)', padding: '0.875rem 1rem', borderRadius: 8, border: aiImproved ? '1px solid #c4b5fd' : '1px solid var(--border-subtle, #e2e8f0)', maxHeight: '300px', overflowY: 'auto' }}>
                                {aiImproved ? (() => {
                                    let lines = messageOriginal.split('\n').map(l => l.trim()).filter(l => l);
                                    return lines.map(l => {
                                        if (l.match(/^[0-9]+\s*(chambre|salon|douche|wc|salle|m2|m²|pièces?)/i) || l.match(/^(✓|•|-)\s/)) {
                                            return `✔️ ${l.replace(/^(✓|•|-)\s/, '')}`;
                                        }
                                        if (l.includes(':') && !l.toLowerCase().includes('http')) {
                                            return `🔹 ${l}`;
                                        }
                                        if (l.match(/(fcfa|cfa|frs|prix)/i)) {
                                            return `💰 ${l}`;
                                        }
                                        return l;
                                    }).join('\n\n');
                                })() : messageOriginal}
                            </pre>
                        </div>
                    )}

                    {/* ── ACTIONS ── */}
                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={handleContact}>
                            <Phone size={18} />
                            Appeler
                        </button>
                        <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
                            <MessageSquare size={18} />
                            WhatsApp
                        </button>
                        <button
                            className={`btn ${property?.disponible ? 'btn-danger' : 'btn-success'}`}
                            onClick={handleToggleDisponible}
                            disabled={toggling}
                            style={{ opacity: toggling ? 0.7 : 1 }}
                        >
                            {toggling
                                ? <Loader size={18} className="spinning" />
                                : property?.disponible ? <Lock size={18} /> : <Unlock size={18} />
                            }
                            {property?.disponible ? 'Marquer Occupé' : 'Marquer Disponible'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// --- LIST VIEW COMPONENT (TABLE - style Visits) ---
const PropertyListView = React.memo(({ properties, onViewDetails, handleContact, sortConfig, onSort, onReset, hasFilters }) => {
    const SortHeader = ({ colKey, label, align = 'left' }) => {
        const isActive = sortConfig.key === colKey;
        const icon = isActive
            ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
            : <ArrowUpDown size={12} className="sort-icon-muted" />;
        const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        return (
            <th className="sortable-header" onClick={() => onSort(colKey)} style={{ textAlign: align }}>
                <div className="header-cell-content" style={{ justifyContent: justify }}>
                    {label}
                    <span className={isActive ? 'sort-icon-active' : ''}>{icon}</span>
                </div>
            </th>
        );
    };

    if (properties.length === 0) {
        return (
            <EmptyState
                variant={hasFilters ? 'filter' : 'building'}
                title={hasFilters ? 'Aucune propriété ne correspond à vos filtres' : 'Aucun bien disponible'}
                description={hasFilters
                    ? 'Modifiez ou réinitialisez les filtres pour voir plus de résultats.'
                    : 'Les nouvelles annonces WhatsApp apparaîtront ici automatiquement.'}
                actionLabel={hasFilters ? 'Réinitialiser les filtres' : undefined}
                onAction={hasFilters ? onReset : undefined}
                size="medium"
            />
        );
    }

    return (
        <div className="biens-list-container">
            <table className="biens-table">
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}>Visuel</th>
                        <SortHeader colKey="datePublication" label="Date" />
                        <SortHeader colKey="typeBien" label="Type" />
                        <SortHeader colKey="commune" label="Commune" />
                        <th>Quartier/Zone</th>
                        <th>N° Téléphone</th>
                        <SortHeader colKey="rawPrice" label="Prix" align="right" />
                        <SortHeader colKey="status" label="Statut" align="center" />
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {properties.map(property => {
                        const isLocation = property.typeOffre?.toLowerCase().includes('location');
                        const isVente = property.typeOffre?.toLowerCase().includes('vente');
                        const hasImage = Boolean(property.imageUrl);
                        return (
                            <tr key={property.id} onClick={() => onViewDetails(property)} style={{ cursor: 'pointer' }}>
                                <td style={{ padding: '8px' }}>
                                    <div className="lv-thumbnail" style={{
                                        width: '44px', height: '44px',
                                        borderRadius: '8px', overflow: 'hidden',
                                        background: hasImage ? '#1e293b' : 'linear-gradient(135deg, #1B4299, #4f46e5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {hasImage ? (
                                            <img src={property.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Building2 size={18} color="rgba(255,255,255,0.6)" />
                                        )}
                                    </div>
                                </td>
                                <td className="biens-td-date">
                                    {(() => {
                                        const f = getFreshness(property.datePublicationRaw);
                                        return (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                {f && <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0, boxShadow: `0 0 4px ${f.color}` }} title={f.label} />}
                                                {property.datePublication || '—'}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td>
                                    <div className="biens-type-cell">
                                        <span className="biens-type-name">{property.typeBien}</span>
                                        <div className="biens-type-badges">
                                            {property.typeOffre && (
                                                <span className={`biens-offre-badge ${isLocation ? 'offre-location' : isVente ? 'offre-vente' : ''}`}>
                                                    {property.typeOffre}
                                                </span>
                                            )}
                                            {property.refBien && (
                                                <span className="biens-ref-badge">#{property.refBien}</span>
                                            )}
                                            {property.groupeWhatsApp && (
                                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#15803d', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)', borderRadius: 4, padding: '1px 6px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    title={property.groupName || property.groupeWhatsApp}>
                                                    {(property.groupName && !property.groupName.startsWith('Groupe '))
                                                        ? property.groupName
                                                        : property.groupeWhatsApp}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>{property.commune || '—'}</td>
                                <td className="biens-td-muted">{property.quartier || property.zone || '—'}</td>
                                <td onClick={e => e.stopPropagation()}>
                                    {(() => {
                                        const phone = extractBestPhone(property);
                                        if (!phone) return <span className="biens-td-muted">—</span>;
                                        const waPhone = formatPhoneCI(phone);
                                        const msg = encodeURIComponent(`Bonjour, je suis intéressé par: ${property.typeBien} à ${property.zone || property.commune || ''}`);
                                        return (
                                            <a
                                                href={`https://wa.me/${waPhone}?text=${msg}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.3px', color: '#15803d', textDecoration: 'none', padding: '3px 8px', borderRadius: 6, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', transition: 'all 0.2s' }}
                                                title="Contacter via WhatsApp"
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.18)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.08)'; }}
                                            >
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366" style={{ flexShrink: 0 }}>
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                </svg>
                                                {displayPhone(phone)}
                                            </a>
                                        );
                                    })()}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {property.rawPrice > 0
                                        ? <strong>{property.prixFormate}</strong>
                                        : <span className="biens-td-muted">—</span>
                                    }
                                </td>
                                <td className="text-center">
                                    <span className={`badge ${property.disponible ? 'badge-success' : 'badge-danger'}`}>
                                        {property.status}
                                    </span>
                                </td>
                                <td className="text-center" onClick={e => e.stopPropagation()}>
                                    <div className="biens-row-actions">
                                        <button className="btn btn-secondary btn-sm" onClick={() => onViewDetails(property)} title="Voir les détails">
                                            <Eye size={14} />
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); const p = extractBestPhone(property); if (p) window.open(`tel:${p}`, '_self'); }} title="Appeler">
                                            <Phone size={14} />
                                        </button>
                                        <button className="btn btn-whatsapp btn-sm" onClick={(e) => handleContact(property, e)} title="WhatsApp">
                                            <MessageSquare size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="biens-list-footer">
                {properties.length} bien{properties.length > 1 ? 's' : ''} affiché{properties.length > 1 ? 's' : ''}
            </div>
        </div>
    );
});

const PropertyCard = React.memo(React.forwardRef(({ property, index, onViewDetails, viewMode, images = [] }, ref) => {
    const { addToast } = useToast();
    const freshness = useMemo(() => getFreshness(property.datePublicationRaw), [property.datePublicationRaw]);
    const contactPhone = useMemo(() => extractBestPhone(property), [property]);
    const [imgIdx, setImgIdx] = useState(0);
    const allUrls = useMemo(() => {
        const fromImages = images.map(i => i.lien_image).filter(Boolean);
        if (fromImages.length > 0) return fromImages;
        return property.imageUrl ? [property.imageUrl] : [];
    }, [images, property.imageUrl]);
    const hasImage = allUrls.length > 0;
    const prevImg = useCallback((e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + allUrls.length) % allUrls.length); }, [allUrls.length]);
    const nextImg = useCallback((e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % allUrls.length); }, [allUrls.length]);

    const handleContact = useCallback((e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (contactPhone) {
            const message = encodeURIComponent(`Bonjour, je suis intéressé par: ${property.typeBien} à ${property.zone || property.commune || ''}`);
            window.open(`https://wa.me/${contactPhone}?text=${message}`, '_blank');
            addToast({ type: 'success', title: 'Contact', message: `WhatsApp vers ${contactPhone}` });
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    }, [contactPhone, property.typeBien, property.zone, property.commune, addToast]);

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.18 } }
    };

    // Icône de placeholder selon le type de bien
    const PlaceholderIcon = useCallback(() => {
        const type = (property.typeBien || '').toLowerCase();
        if (type.includes('villa') || type.includes('maison')) return <Home size={32} style={{ opacity: 0.6 }} />;
        if (type.includes('appartement') || type.includes('studio')) return <Building size={32} style={{ opacity: 0.6 }} />;
        if (type.includes('terrain')) return <MapPin size={32} style={{ opacity: 0.6 }} />;
        return <Home size={32} style={{ opacity: 0.6 }} />;
    }, [property.typeBien]);

    return (
        <motion.div
            ref={ref}
            layout={false}
            className="card property-card-v2"
            data-offre={(property.typeOffre || '').toLowerCase().includes('location') ? 'location' : (property.typeOffre || '').toLowerCase().includes('vente') || (property.typeOffre || '').toLowerCase().includes('achat') ? 'vente' : undefined}
            variants={itemVariants}
            onClick={() => onViewDetails(property)}
        >
            {/* ── IMAGE SECTION ── */}
            <div className="property-image-wrapper">
                <div
                    className="property-image"
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: hasImage
                            ? '#0f172a'
                            : `linear-gradient(135deg, ${property.id % 3 === 0 ? '#1B4299, #4f46e5' : property.id % 3 === 1 ? '#0e7490, #0891b2' : '#7c3aed, #a855f7'})`
                    }}
                >
                    {hasImage ? (
                        <>
                            <img
                                key={imgIdx}
                                src={allUrls[imgIdx]}
                                alt={property.typeBien}
                                loading="lazy"
                                decoding="async"
                                style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%',
                                    objectFit: 'cover'
                                }}
                                onError={e => { e.target.style.display = 'none'; e.target.parentNode.style.background = 'linear-gradient(135deg, #1B4299, #4f46e5)'; }}
                            />
                            {allUrls.length > 1 && (
                                <>
                                    <button onClick={prevImg} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}>
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button onClick={nextImg} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}>
                                        <ChevronRight size={14} />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        /* Placeholder visuel quand pas d'image */
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,255,255,0.7)', gap: 8
                        }}>
                            <PlaceholderIcon />
                        </div>
                    )}

                    {/* Overlay gradient au bas pour lisibilité */}
                    {hasImage && (
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: '55%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                            pointerEvents: 'none'
                        }} />
                    )}
                </div>

                {/* Freshness bar */}
                {freshness && (
                    <div className="freshness-bar-track">
                        <motion.div
                            className="freshness-bar-fill"
                            style={{ background: freshness.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${freshness.pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                )}

                {/* Badges overlay */}
                <div className="property-badges">
                    {/* Gauche : match score ou badge offre */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {property._matchPct > 0 ? (
                            <span className={`match-score-badge ${property._matchPct >= 80 ? 'match-top' : property._matchPct >= 50 ? 'match-good' : 'match-low'}`}>
                                <Sparkles size={10} />
                                {property._matchPct}%
                            </span>
                        ) : property.typeOffre ? (
                            <span className={`badge-offer ${(property.typeOffre || '').toLowerCase().includes('location') ? 'location' : (property.typeOffre || '').toLowerCase().includes('vente') || (property.typeOffre || '').toLowerCase().includes('achat') ? 'vente' : ''}`}>
                                {property.typeOffre}
                            </span>
                        ) : null}
                        {property.groupeWhatsApp === 'FORMULAIRE_TALLY' && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(124,58,237,0.85)', color: '#fff', borderRadius: 5, padding: '2px 6px', backdropFilter: 'blur(4px)' }}>
                                📋 Formulaire
                            </span>
                        )}
                    </div>
                    {/* Droite : photo count + disponibilité */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {allUrls.length > 0 && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 5, padding: '2px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Images size={9} /> {allUrls.length}
                            </span>
                        )}
                        <span className={`badge ${property.disponible ? 'badge-success' : 'badge-danger'}`}>
                            {property.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── CONTENT SECTION ── */}
            <div className="property-content">
                <div className="property-header">
                    <h3 className="property-title">{property.typeBien}</h3>
                    <span className="property-price">{property.prixFormate}</span>
                </div>

                <div className="property-location">
                    <MapPin size={14} />
                    <span>{property.zone} {property.commune ? `- ${property.commune}` : ''}</span>
                </div>

                <p className="property-description">{property.description || property.caracteristiques}</p>

                <div className="property-features">
                    {property.chambres > 0 && (
                        <span className="feature-tag">
                            <Bed size={12} /> {property.chambres} ch.
                        </span>
                    )}
                    {property.meuble && (
                        <span className="feature-tag">
                            <Home size={12} /> Meublé
                        </span>
                    )}
                    <span className="feature-tag">
                        <Tag size={12} /> {property.publiePar}
                    </span>
                </div>

                <div
                    className="property-footer"
                    style={{ display: 'flex', gap: '8px' }}
                >
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '0.4rem 0.5rem' }} onClick={(e) => { e.stopPropagation(); onViewDetails(property); }} title="Voir les détails">
                        <Eye size={16} /> Détails
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.5rem' }} onClick={(e) => { e.stopPropagation(); if (contactPhone) window.open(`tel:${contactPhone}`, '_self'); else addToast({ type: 'error', title: 'Erreur', message: 'Numéro non disponible' }); }} title="Appeler">
                        <Phone size={16} />
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.5rem' }} onClick={(e) => {
                        e.stopPropagation();
                        const q = (property.coordinates?.lat && property.coordinates?.lng)
                            ? `${property.coordinates.lat},${property.coordinates.lng}`
                            : [property.quartier, property.commune, 'Abidjan', 'Côte d\'Ivoire'].filter(Boolean).join(' ');
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
                    }} title="Voir sur Google Maps">
                        <Map size={16} />
                    </button>
                    <button className="btn btn-whatsapp btn-sm" style={{ padding: '0.4rem 0.5rem' }} onClick={handleContact} title="WhatsApp">
                        <MessageSquare size={16} /> WA
                    </button>
                </div>
            </div>
        </motion.div>
    );
}));

const Properties = () => {
    const location = useLocation();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState(''); // valeur affichée dans l'input (contrôlé)
    const [matchBanner, setMatchBanner] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [geocodedProperties, setGeocodedProperties] = useState([]);
    const [geocoding, setGeocoding] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'datePublication', direction: 'desc' });
    const ITEMS_PER_PAGE = 20;
    const { addToast } = useToast();

    const [filters, setFilters] = useState({
        type: 'all',
        commune: 'all',
        quartier: 'all',
        pieces: 'all',
        minPrice: '',
        maxPrice: '',
        status: 'all',
        meuble: 'all'
    });
    const [refreshing, setRefreshing] = useState(false);
    const [imagesMap, setImagesMap] = useState({});
    // Server-side filtered results (populated when active filters exist)
    const [serverFilteredProperties, setServerFilteredProperties] = useState(null);
    const [serverTotalCount, setServerTotalCount] = useState(null);
    const [serverFiltering, setServerFiltering] = useState(false);

    // Lire les critères de matching depuis RequestsPage (navigation state)
    useEffect(() => {
        const state = location.state;
        console.log('Properties Page State:', state);
        if (state?.fromRequest && (state?.matchSearch || state?.matchCriteria)) {
            const m = state.matchCriteria || state.matchSearch;
            setSearchTerm(''); setSearchInput(''); // Laisser les filtres faire le travail
            setMatchBanner({
                snippet: state.requestSnippet || '',
                commune: m.commune,
                type: m.type,
                typeOffre: m.typeOffre,
                budget: m.budget,
                loyer: m.loyer,
                chambres: m.chambres,
                meuble: m.meuble,
                urgent: m.urgent,
                criteria: m,
            });
            // En mode match, réinitialiser tous les filtres durs — le scoring gère tout
            setFilters({ type: 'all', status: 'all', meuble: 'all', pieces: 'all', commune: 'all', quartier: 'all', minPrice: '', maxPrice: '' });
            // Trier par score de matching
            setSortConfig({ key: 'matchScore', direction: 'desc' });
            setCurrentPage(1);
        }
    }, [location.state]);

    useEffect(() => {
        loadProperties();

        const unsubscribe = apiService.subscribe('dataUpdate', ({ properties: p }) => {
            // pollData émet properties comme array directement
            const arr = Array.isArray(p) ? p : p?.data;
            if (arr) {
                setProperties(arr);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Déclencher le géocodage on-demand quand on passe en mode carte
        if (viewMode === 'map' && geocodedProperties.length === 0 && properties.length > 0) {
            geocodePropertiesAsync(properties);
        }
    }, [viewMode, properties.length, geocodedProperties.length]);

    const loadImages = useCallback(async (props) => {
        const keys = props.map(p => p.publicationId).filter(Boolean);
        if (keys.length === 0) return;
        try {
            const map = await apiService.getImagesForPublications(keys);
            setImagesMap(map || {});
        } catch (_) {}
    }, []);

    const getImages = useCallback((p) => {
        const key = p.publicationId || String(p.id);
        const fromMap = imagesMap[key] || [];
        if (fromMap.length > 0) return fromMap;
        return p.imageUrl ? [{ lien_image: p.imageUrl }] : [];
    }, [imagesMap]);

    const loadProperties = async () => {
        setLoading(true);
        try {
            const response = await apiService.getProperties(false);
            if (response.success) {
                setProperties(response.data);
                loadImages(response.data);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les biens' });
        } finally {
            setLoading(false);
        }
    };

    // Géocoder les propriétés de manière asynchrone
    const geocodePropertiesAsync = async (props) => {
        if (!props || props.length === 0) return;

        setGeocoding(true);
        try {
            const geocoded = await geocodingService.geocodeProperties(props);
            setGeocodedProperties(geocoded);
        } catch (error) {
            console.error('Geocoding error:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Erreur lors du géocodage des propriétés' });
        } finally {
            setGeocoding(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Force refresh skip cache
            const response = await apiService.getProperties(true);
            if (response.success) {
                setProperties(response.data);
                geocodePropertiesAsync(response.data); // Re-geocode after refresh
                loadImages(response.data);
                addToast({ type: 'success', title: 'Actualisé', message: 'Données mises à jour depuis le serveur' });
            }
        } catch (error) {
            addToast({ type: 'error', title: 'Erreur', message: 'Échec de l\'actualisation' });
        } finally {
            setRefreshing(false);
        }
    }, [addToast, loadImages]);

    // Fonction de tri
    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    }, []);

    const handleToggleDisponible = async (propertyId, currentDisponible) => {
        const result = await apiService.toggleDisponible(propertyId, currentDisponible);
        if (result.success) {
            const label = result.disponible ? 'Disponible' : 'Occupé';
            addToast({ type: 'success', title: 'Statut mis à jour', message: `Bien marqué comme ${label}` });
            setProperties(prev => prev.map(p =>
                p.id === propertyId ? { ...p, disponible: result.disponible } : p
            ));
            setSelectedProperty(prev => prev?.id === propertyId ? { ...prev, disponible: result.disponible } : prev);
        }
        return result;
    };

    const handleTableContact = (property, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const phone = extractBestPhone(property);

        if (phone) {
            const message = encodeURIComponent(`Bonjour, je suis intéressé par: ${property.typeBien} à ${property.zone}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            addToast({ type: 'success', title: 'Contact', message: `WhatsApp vers ${phone}` });
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    };

    // Options pour les sélecteurs de filtres
    const uniqueCommunes = useMemo(() =>
        [...new Set(properties.map(p => p.commune).filter(Boolean))].sort(),
        [properties]
    );

    const uniqueQuartiers = useMemo(() => {
        if (filters.commune !== 'all') {
            return [...new Set(properties
                .filter(p => p.commune === filters.commune)
                .map(p => p.zone)
                .filter(Boolean))].sort();
        }
        return [...new Set(properties.map(p => p.zone).filter(Boolean))].sort();
    }, [properties, filters.commune]);

    const uniqueTypes = useMemo(() =>
        [...new Set(properties.map(p => p.typeBien).filter(Boolean))].sort(),
        [properties]
    );

    const uniquePieces = useMemo(() =>
        [...new Set(properties.map(p => p.chambres).filter(p => p > 0))].sort((a, b) => a - b),
        [properties]
    );

    // --- OPTIMISATION CRITIQUE: PRE-PROCESSING ---
    // On normalise les données une seule fois quand elles arrivent, 
    // pas à chaque fois que l'utilisateur tape une lettre ou change de page.
    const preProcessedProperties = useMemo(() => {
        return properties.map(p => ({
            ...p,
            _norm_search_blob: normStr([
                p.refBien, p.commune, p.zone, p.typeBien, p.publiePar, p.name, p.groupeWhatsApp, p.caracteristiques, p.description
            ].filter(Boolean).join(' ')),
            _norm_full_prop_text: normStr([
                p.caracteristiques, p.description, p.titre, p.zone, p.quartier, p.commune, p.messageInitial
            ].filter(Boolean).join(' ')),
            _norm_full_desc_blob: normStr([
                p.caracteristiques, p.zone, p.quartier, p.description, p.messageInitial, p.publiePar,
            ].filter(Boolean).join(' ')),
            _norm_offre: normStr(p.typeOffre || p.typeTransaction || ''),
            _norm_type: normStr(p.typeBien || p.typeDeBien || ''),
            _norm_zone: normStr([p.zone, p.quartier].filter(Boolean).join(' ')),
        }));
    }, [properties]);

    // Filtrage et Tri mémorisé
    const filteredProperties = useMemo(() => {
        const isMatchMode = Boolean(matchBanner?.criteria);
        const searchLower = searchTerm.toLowerCase();

        // When server-side filtering returned results (and we're not in match mode),
        // use those as the base set. Local filters (price, pieces, meuble, status) still apply.
        const baseProperties = (!isMatchMode && serverFilteredProperties !== null)
            ? serverFilteredProperties.map(p => ({
                ...p,
                _norm_search_blob: normStr([p.refBien, p.commune, p.zone, p.typeBien, p.publiePar, p.groupeWhatsApp, p.caracteristiques, p.description].filter(Boolean).join(' ')),
                _norm_full_prop_text: normStr([p.caracteristiques, p.description, p.zone, p.quartier, p.commune].filter(Boolean).join(' ')),
                _norm_full_desc_blob: normStr([p.caracteristiques, p.zone, p.quartier, p.description, p.publiePar].filter(Boolean).join(' ')),
                _norm_offre: normStr(p.typeOffre || ''),
                _norm_type: normStr(p.typeBien || ''),
                _norm_zone: normStr([p.zone, p.quartier].filter(Boolean).join(' ')),
            }))
            : preProcessedProperties;

        // Si on est en mode match, pré-calculer les vecteurs du criteria
        const preNormalizedCriteria = isMatchMode ? {
            cOffre: normStr(matchBanner.criteria.typeOffre || ''),
            cCommune: normStr(matchBanner.criteria.commune || ''),
            cOriginalText: normStr(matchBanner.criteria.originalText || ''),
            cWords: normStr(matchBanner.criteria.originalText || '')
                .split(/[\s,;.!?/()\[\]+*#@"\n\r]+/)
                .filter(w => w.length > 3 && !MATCH_STOP_WORDS.has(w) && !/^\d+$/.test(w)),
        } : {};

        let items = baseProperties.filter(property => {
            const matchesSearch = !searchTerm || property._norm_search_blob.includes(searchLower);

            const matchesStatus = filters.status === 'all' ||
                (filters.status === 'Disponible' && property.disponible) ||
                (filters.status === 'Occupé' && !property.disponible);

            let matchesPrice = true;
            if (filters.minPrice && (property.rawPrice || 0) < parseFloat(filters.minPrice)) matchesPrice = false;
            if (filters.maxPrice && (property.rawPrice || 0) > parseFloat(filters.maxPrice)) matchesPrice = false;

            if (isMatchMode) return matchesSearch && matchesStatus && matchesPrice;

            // Mode normal : tous les filtres durs
            const matchesType = filters.type === 'all' || property.typeBien === filters.type;
            const matchesMeuble = filters.meuble === 'all' ||
                (filters.meuble === 'oui' && property.meuble) ||
                (filters.meuble === 'non' && !property.meuble);
            const matchesPieces = filters.pieces === 'all' || property.chambres === parseInt(filters.pieces);
            const matchesCommune = filters.commune === 'all' || property.commune === filters.commune;
            const matchesQuartier = filters.quartier === 'all' || property.zone === filters.quartier;

            return matchesSearch && matchesType && matchesStatus && matchesMeuble && matchesPieces && matchesCommune && matchesQuartier && matchesPrice;
        });

        // Tri (mode normal uniquement)
        if (!isMatchMode && sortConfig.key && sortConfig.key !== 'matchScore') {
            items.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'rawPrice' || sortConfig.key === 'chambres') {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                } else if (sortConfig.key === 'datePublication') {
                    // Use ISO raw date for reliable sorting
                    aValue = new Date(a.datePublicationRaw || 0).getTime();
                    bValue = new Date(b.datePublicationRaw || 0).getTime();
                } else {
                    aValue = String(aValue || '').toLowerCase();
                    bValue = String(bValue || '').toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // ── Match scoring (O(N) avec pre-normalized data) ─────────────────────
        if (isMatchMode) {
            const crit = matchBanner.criteria;

            let maxScore = 0;
            if (crit.commune) maxScore += 10;
            if (crit.type) maxScore += 10;
            if (crit.typeOffre) maxScore += 12;
            if (crit.chambres) maxScore += 8;
            if (crit.budget || crit.loyer) maxScore += 10;
            if (crit.meuble !== undefined) maxScore += 5;
            if (crit.originalText) maxScore += 20;
            if (crit.amenities) maxScore += (crit.amenities.length * 4) + 2;

            if (maxScore === 0) maxScore = 1;

            items = items.map(p => {
                const s = scoreProperty(p, crit, {
                    pOffre: p._norm_offre,
                    pType: p._norm_type,
                    pZone: p._norm_zone,
                    fullPropText: p._norm_full_prop_text,
                    fullDescBlob: p._norm_full_desc_blob,
                    ...preNormalizedCriteria
                });
                return { ...p, _matchScore: s, _matchPct: Math.round((s / maxScore) * 100) };
            });

            // Seuil strict 90% — ne propose que les biens vraiment compatibles
            items = items.filter(p => p._matchPct >= 80);

            items.sort((a, b) => b._matchScore - a._matchScore);
        }

        return items;
    }, [preProcessedProperties, serverFilteredProperties, searchTerm, filters, sortConfig, matchBanner]);

    // Optimisation Vercel: Croisement efficace O(N) pour la carte au lieu de duplication O(N*M)
    const filteredGeocodedProperties = useMemo(() => {
        const filteredIds = new Set(filteredProperties.map(p => p.id));
        return geocodedProperties.filter(p => filteredIds.has(p.id));
    }, [filteredProperties, geocodedProperties]);

    // Pagination (optimisation importante)
    const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);

    const paginatedProperties = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredProperties.slice(start, end);
    }, [filteredProperties, currentPage, ITEMS_PER_PAGE]);

    // Réinitialiser la page à 1 quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters]);

    // Debounced server-side filter fetch — only runs when meaningful filters are active.
    // Skips in match-banner mode (scoring needs all data).
    const debouncedServerFilter = useMemo(
        () => debounce(async (activeFilters, matchMode) => {
            if (matchMode) return; // match-score mode: skip server filter
            const hasFilter = (
                (activeFilters.commune && activeFilters.commune !== 'all') ||
                (activeFilters.type && activeFilters.type !== 'all') ||
                (activeFilters.status === 'Disponible') || // status filter maps to disponible
                (activeFilters.search && activeFilters.search.length >= 2)
            );
            if (!hasFilter) {
                setServerFilteredProperties(null);
                setServerTotalCount(null);
                return;
            }
            setServerFiltering(true);
            try {
                const serverFilters = {};
                if (activeFilters.commune !== 'all') serverFilters.commune = activeFilters.commune;
                if (activeFilters.type !== 'all') serverFilters.typeBien = activeFilters.type;
                if (activeFilters.status === 'Disponible') serverFilters.disponible = true;
                if (activeFilters.search && activeFilters.search.length >= 2) serverFilters.search = activeFilters.search;
                serverFilters.page = 1;
                serverFilters.pageSize = 200; // fetch up to 200 for local sort/dedup

                const [response, count] = await Promise.all([
                    apiService.getProperties(false, serverFilters),
                    apiService.getTotalCount(serverFilters),
                ]);
                if (response.success) {
                    setServerFilteredProperties(response.data);
                    setServerTotalCount(count);
                } else {
                    setServerFilteredProperties(null);
                    setServerTotalCount(null);
                }
            } catch (e) {
                console.error('Server filter error:', e);
                setServerFilteredProperties(null);
                setServerTotalCount(null);
            } finally {
                setServerFiltering(false);
            }
        }, 300),
        []
    );

    // Trigger server-side filter when filters or searchTerm change
    useEffect(() => {
        debouncedServerFilter({ ...filters, search: searchTerm }, Boolean(matchBanner?.criteria));
    }, [filters, searchTerm, matchBanner]);

    // Debounced search (optimisation critique)
    const debouncedSearch = useMemo(
        () => debounce((value) => setSearchTerm(value), 300),
        []
    );

    // Navigate to a specific index in filteredProperties
    const handleNavTo = useCallback((idx) => {
        if (idx < 0 || idx >= filteredProperties.length) return;
        setSelectedProperty(filteredProperties[idx]);
        setSelectedIndex(idx);
    }, [filteredProperties]);

    // Handlers optimisés avec useCallback
    const handleViewDetails = useCallback((property) => {
        const idx = filteredProperties.findIndex(p => p.id === property.id);
        setSelectedProperty(property);
        setSelectedIndex(idx >= 0 ? idx : 0);
        setModalOpen(true);
    }, [filteredProperties]);

    const handleExport = useCallback(() => {
        // Préparer les données pour le fichier Excel
        const dataToExport = filteredProperties.map(p => ({
            'Type': p.typeBien,
            'Offre': p.typeOffre,
            'Zone': p.zone,
            'Commune': p.commune || '',
            'Prix': p.prixFormate, // Ou p.rawPrice si on veut des nombres bruts
            'Téléphone': extractBestPhone(p),
            'Caractéristiques': p.caracteristiques,
            'Publié par': p.publiePar,
            'Meublé': p.meuble ? 'Oui' : 'Non',
            'Chambres': p.chambres > 0 ? p.chambres : '',
            'Disponible': p.disponible ? 'Oui' : 'Non',
            'Date Publication': p.datePublication
        }));

        // Créer une feuille de travail (worksheet)
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        // Ajuster la largeur des colonnes (optionnel mais recommandé)
        const wscols = [
            { wch: 20 }, // Type
            { wch: 15 }, // Offre
            { wch: 20 }, // Zone
            { wch: 20 }, // Commune
            { wch: 15 }, // Prix
            { wch: 15 }, // Téléphone
            { wch: 50 }, // Caractéristiques
            { wch: 20 }, // Publié par
            { wch: 10 }, // Meublé
            { wch: 10 }, // Chambres
            { wch: 10 }, // Disponible
            { wch: 20 }, // Date Publication
        ];
        worksheet['!cols'] = wscols;

        // Créer un classeur (workbook)
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Biens Immobiliers");

        // Générer le fichier Excel et déclencher le téléchargement
        XLSX.writeFile(workbook, `Biens_Immobiliers_${new Date().toISOString().split('T')[0]}.xlsx`);

        addToast({ type: 'success', title: 'Export réussi', message: `${filteredProperties.length} biens exportés en Excel` });
    }, [filteredProperties, addToast]);

    const resetFilters = useCallback(() => {
        setFilters({ type: 'all', status: 'all', meuble: 'all', pieces: 'all', commune: 'all', quartier: 'all', minPrice: '', maxPrice: '' });
        setSearchTerm(''); setSearchInput('');
        addToast({ type: 'info', title: 'Filtres réinitialisés', message: 'Tous les biens sont maintenant affichés' });
    }, [addToast]);

    if (loading) {
        return <PropertiesSkeleton viewMode={viewMode} />;
    }

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <motion.div
                className={`properties-v2 ${modalOpen ? 'has-side-panel' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >

                {matchBanner && (
                    <div className="match-banner">
                        <Sparkles size={15} />
                        <div className="match-banner-content">
                            <span className="match-banner-label">Biens trouvés pour la demande :</span>
                            <div className="match-banner-chips">
                                {matchBanner.type && <span className="mbchip mbchip-type">{matchBanner.type}</span>}
                                {matchBanner.commune && <span className="mbchip mbchip-loc">📍 {matchBanner.commune}</span>}
                                {matchBanner.typeOffre && <span className="mbchip mbchip-offre">{matchBanner.typeOffre}</span>}
                                {matchBanner.chambres && <span className="mbchip mbchip-ch">{matchBanner.chambres} ch.</span>}
                                {matchBanner.budget && <span className="mbchip mbchip-price">≤ {matchBanner.budget}M FCFA</span>}
                                {matchBanner.loyer && <span className="mbchip mbchip-price">{Math.round(matchBanner.loyer / 1000)}k/mois</span>}
                                {matchBanner.urgent && <span className="mbchip mbchip-urgent">🔴 Urgent</span>}
                            </div>
                            {matchBanner.snippet && <span className="match-banner-snippet">« {matchBanner.snippet.substring(0, 80)}{matchBanner.snippet.length > 80 ? '…' : ''} »</span>}
                        </div>
                        <button className="match-banner-close" onClick={() => {
                            setMatchBanner(null);
                            setSearchTerm('');
                            setSearchInput('');
                            setFilters(prev => ({ ...prev, commune: 'all', type: 'all', pieces: 'all', meuble: 'all' }));
                            setSortConfig({ key: 'datePublication', direction: 'desc' });
                        }}>×</button>
                    </div>
                )}

                <div className="properties-header">
                    <div className="header-left">
                        <h2>Biens Immobiliers</h2>
                        <span className="properties-count">
                            {serverTotalCount !== null
                                ? `${serverTotalCount} propriétés trouvées`
                                : `${filteredProperties.length} bien(s) trouvé(s) sur ${properties.length}`}
                            {serverFiltering && <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>...</span>}
                        </span>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={handleExport}>
                            <Download size={18} />
                            Exporter Excel
                        </button>
                    </div>
                </div>

                <div className="properties-toolbar">
                    <div className="search-filter-group">
                        <div className="search-input" title="Recherchez par référence, commune, quartier, type de bien...">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher par Réf, commune, type, zone..."
                                value={searchInput}
                                onChange={(e) => {
                                    setSearchInput(e.target.value);
                                    debouncedSearch(e.target.value);
                                }}
                                title="Tapez pour chercher dans tous les biens"
                            />
                            {searchInput && (
                                <button onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            title="Rafraîchir les données depuis la base de données"
                        >
                            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                            {refreshing ? 'Chargement...' : 'Rafraîchir'}
                        </button>

                        <button
                            className={`btn btn-secondary filter-btn ${filterOpen ? 'active' : ''}`}
                            onClick={() => setFilterOpen(!filterOpen)}
                            title="Filtrez par type, commune, prix, disponibilité, etc."
                        >
                            <Filter size={18} />
                            Filtres
                        </button>
                    </div>

                    <div className="view-toggle" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <select
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key, direction });
                            }}
                            className="sort-select"
                            title="Triez les biens par date, prix ou type"
                        >
                            <option value="datePublication-desc">Date (Récent → Ancien)</option>
                            <option value="datePublication-asc">Date (Ancien → Récent)</option>
                            <option value="rawPrice-asc">Prix (Croissant)</option>
                            <option value="rawPrice-desc">Prix (Décroissant)</option>
                            <option value="typeBien-asc">Type (A-Z)</option>
                            <option value="commune-asc">Commune (A-Z)</option>
                        </select>

                        <div className="view-toggle-inner" style={{ display: 'flex', gap: '2px', background: 'var(--bg-app)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                            <button
                                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Afficher en grille - Vue compacte des biens"
                                aria-label="Vue Grille"
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="Afficher en liste - Tableau détaillé de tous les biens"
                                aria-label="Vue Liste"
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
                                onClick={() => setViewMode('map')}
                                title="Afficher sur la carte - Visualisez les biens par localisation"
                                aria-label="Vue Carte"
                            >
                                <Map size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {filterOpen && (
                        <motion.div className="filters-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <div className="filter-group">
                                <label>Type de bien</label>
                                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                                    <option value="all">Tous</option>
                                    {uniqueTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Commune</label>
                                <select value={filters.commune} onChange={(e) => setFilters({ ...filters, commune: e.target.value })}>
                                    <option value="all">Toutes</option>
                                    {uniqueCommunes.map(commune => (
                                        <option key={commune} value={commune}>{commune}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Quartier</label>
                                <select value={filters.quartier} onChange={(e) => setFilters({ ...filters, quartier: e.target.value })}>
                                    <option value="all">Tous</option>
                                    {uniqueQuartiers.map(quartier => (
                                        <option key={quartier} value={quartier}>{quartier}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Nombre de pièces</label>
                                <select value={filters.pieces} onChange={(e) => setFilters({ ...filters, pieces: e.target.value })}>
                                    <option value="all">Tous</option>
                                    {uniquePieces.map(piece => (
                                        <option key={piece} value={piece}>{piece} Pièce(s)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Prix Min</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 50000"
                                    value={filters.minPrice}
                                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        padding: '0.625rem',
                                        borderRadius: 'var(--radius-sm)',
                                        outline: 'none',
                                        width: '100%',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Prix Max</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 500000"
                                    value={filters.maxPrice}
                                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        padding: '0.625rem',
                                        borderRadius: 'var(--radius-sm)',
                                        outline: 'none',
                                        width: '100%',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Statut</label>
                                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                                    <option value="all">Tous</option>
                                    <option value="Disponible">Disponible</option>
                                    <option value="Occupé">Occupé</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Meublé</label>
                                <select value={filters.meuble} onChange={(e) => setFilters({ ...filters, meuble: e.target.value })}>
                                    <option value="all">Tous</option>
                                    <option value="oui">Meublé</option>
                                    <option value="non">Non meublé</option>
                                </select>
                            </div>

                            <button className="btn btn-ghost" onClick={resetFilters}>
                                Réinitialiser
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {viewMode === 'map' ? (
                    <div className="map-view-container">
                        {geocoding && (
                            <div className="map-loading-overlay">
                                <Loader className="spinner" size={24} />
                                <span>Géocodage des propriétés...</span>
                            </div>
                        )}
                        <PropertyMap
                            properties={filteredGeocodedProperties}
                            onPropertyClick={handleViewDetails}
                        />
                    </div>
                ) : viewMode === 'list' ? (
                    <PropertyListView
                        properties={paginatedProperties}
                        onViewDetails={handleViewDetails}
                        handleContact={handleTableContact}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        hasFilters={Object.values(filters).some(v => v !== 'all' && v !== '' && v !== false) || Boolean(searchTerm)}
                        onReset={resetFilters}
                    />
                ) : (
                    /* VUE GRILLE - Animations CSS légères (pas de AnimatePresence popLayout) */
                    <motion.div
                        className={`properties-container ${viewMode}`}
                        variants={{
                            hidden: { opacity: 0 },
                            show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
                        }}
                        initial="hidden"
                        animate="show"
                        key={`grid-${currentPage}`}
                    >
                        {paginatedProperties.map((property, index) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                                index={index}
                                viewMode={viewMode}
                                onViewDetails={handleViewDetails}
                                images={getImages(property)}
                            />
                        ))}
                    </motion.div>
                )}

                {filteredProperties.length === 0 && !loading && (() => {
                    const isMatchMode = Boolean(matchBanner?.criteria);
                    const hasSearch = Boolean(searchTerm);
                    const hasFilters = Object.values(filters).some(v => v !== 'all' && v !== '' && v !== false);
                    const variant = isMatchMode ? 'filter' : hasSearch ? 'search' : hasFilters ? 'filter' : 'building';
                    const title = isMatchMode
                        ? 'Aucun bien ne correspond suffisamment à cette demande'
                        : hasSearch ? `Aucun résultat pour « ${searchTerm} »`
                        : hasFilters ? 'Aucun bien correspond à vos filtres'
                        : 'Aucun bien disponible';
                    const desc = isMatchMode
                        ? 'Les biens disponibles ne correspondent pas à ≥80% des critères demandés (localisation, type, budget, chambres). Revenez quand de nouvelles annonces arrivent.'
                        : hasSearch ? 'Essayez un autre terme de recherche ou élargissez vos critères.'
                        : hasFilters ? 'Modifiez ou réinitialisez les filtres pour voir plus de résultats.'
                        : 'Les nouvelles annonces WhatsApp apparaîtront ici automatiquement.';
                    return (
                        <EmptyState
                            variant={variant}
                            title={title}
                            description={desc}
                            showTips={hasSearch}
                            actionLabel={(isMatchMode || hasSearch || hasFilters) ? 'Réinitialiser' : undefined}
                            onAction={(isMatchMode || hasSearch || hasFilters) ? resetFilters : undefined}
                            size="medium"
                        />
                    );
                })()}

                {/* Pagination Controls */}
                {viewMode !== 'map' && filteredProperties.length > ITEMS_PER_PAGE && (
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
                                    // Afficher les 3 premières, les 3 dernières, et 2 autour de la page actuelle
                                    return page <= 3 ||
                                        page > totalPages - 3 ||
                                        Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => {
                                    // Ajouter des "..." entre les groupes
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
                            Page {currentPage} sur {totalPages} ({filteredProperties.length} biens)
                        </span>
                    </div>
                )}

                <PropertyDetailsModal
                    property={selectedProperty}
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onToggleDisponible={handleToggleDisponible}
                    currentIdx={selectedIndex}
                    totalCount={filteredProperties.length}
                    onPrev={() => handleNavTo(selectedIndex - 1)}
                    onNext={() => handleNavTo(selectedIndex + 1)}
                    variant="side-panel"
                    images={selectedProperty ? getImages(selectedProperty) : []}
                />
            </motion.div>
        </PullToRefresh>
    );
};

export default Properties;
