import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
    LayoutGrid, List, Search, Users, Clock, Phone,
    MessageCircle, AlertTriangle, RefreshCw, Sparkles,
    ChevronDown, ChevronUp, MapPin, Home, Tag, Bed, CreditCard,
    ArrowUpDown, Filter
} from 'lucide-react';
import apiService from '../../services/api';
import { formatPhoneCI, extractBestPhone, displayPhone as fmtPhone, extractPhoneFromMessage } from '../../utils/phoneUtils';
import { useToast } from '../../components/Toast';
import EmptyStateShared from '../../components/EmptyState';
import PullToRefresh from '../../components/PullToRefresh';
import BottomSheet from '../../components/BottomSheet';
import './RequestsPage.css';

// ─── EXTRACT MATCH CRITERIA FROM MESSAGE ────────────────────────────────────
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Communes → canonical + aliases
const COMMUNES_ALIASES = [
    { canon: 'Cocody', aliases: ['cocody', 'riviera', 'angre', 'palmeraie', 'bonoumin', 'bietry', 'blockhaus', 'blockhauss', 'ii plateaux', '2 plateaux', 'deux plateaux', 'riviera golf', 'riviera 3', 'riviera 4', 'danga', 'ambassade', 'lycee technique', 'cite des arts', 'mpouto', 'faya', 'riviera 2', 'cite verte', 'coccody'] },
    { canon: 'Yopougon', aliases: ['yopougon', 'yopo', 'niangon', 'toit rouge', 'maroc', 'selmer', 'wassakara', 'ananas', 'gesco', 'andokoi', 'sideci', 'williamsville yop', 'pk 18', 'pk18', 'locodjro'] },
    { canon: 'Marcory', aliases: ['marcory', 'zone 4', 'zone 3', 'zone4', 'zone3', 'remblais', 'anoumabo', 'hibiscus', 'marcori'] },
    { canon: 'Koumassi', aliases: ['koumassi', 'remblai', 'prodomo', 'sopim', 'grand carrefour'] },
    { canon: 'Treichville', aliases: ['treichville', 'treich', 'aragon', 'habitat', 'gare bassam', 'treichvile'] },
    { canon: 'Plateau', aliases: ['plateau', 'cite administrative', 'le plateau'] },
    { canon: 'Adjamé', aliases: ['adjame', '220 logements', 'williamsville', 'liberte', 'adjame nord', 'adjame sud'] },
    { canon: 'Abobo', aliases: ['abobo', 'baoule', 'pk18', 'n dotsre', 'abobo nord', 'abobo gare', 'clouetcha'] },
    { canon: 'Attécoubé', aliases: ['attiecoube', 'attecoube', 'attiécoube', 'agban', 'attiecoub'] },
    { canon: 'Port-Bouët', aliases: ['port-bouet', 'port bouet', 'portbouet', 'aeroport', 'vridi', 'gonza', 'gonzagueville', 'port bouet 2', 'koumassi vridi'] },
    { canon: 'Bingerville', aliases: ['bingerville', 'febca', 'm\'pouto', 'bingervile', 'moossou bingerville'] },
    { canon: 'Grand-Bassam', aliases: ['grand-bassam', 'grand bassam', 'bassam', 'moossou', 'grand bassam plage'] },
    { canon: 'Assinie', aliases: ['assinie', 'mafia', 'assinie mafia'] },
    { canon: 'Songon', aliases: ['songon', 'songon agban'] },
    { canon: 'Anyama', aliases: ['anyama'] },
    { canon: 'Jacqueville', aliases: ['jacqueville', 'jacquevile'] },
    { canon: 'Dabou', aliases: ['dabou'] },
    { canon: 'Abidjan', aliases: ['abidjan', 'abi'] },
];

const TYPES_MAP = [
    { kw: ['villa', 'villas', 'maison', 'duplex', 'triplex', 'maisons', 'residence'], val: 'Villa' },
    { kw: ['appartement', 'appart', 'appartements', 'flat', 'appartment', 'apparte'], val: 'Appartement' },
    { kw: ['studio', 'studios'], val: 'Studio' },
    { kw: ['bureau', 'bureaux', 'open space', 'espace bureau'], val: 'Bureau' },
    { kw: ['magasin', 'boutique', 'commerce', 'local commercial', 'local a usage', 'espace commercial'], val: 'Commercial' },
    { kw: ['terrain', 'parcelle', 'plot', 'lot', 'parcele'], val: 'Terrain' },
    { kw: ['immeuble', 'batiment', 'immeub'], val: 'Immeuble' },
    { kw: ['chambre', 'entree couchee', 'entree couche'], val: 'Chambre' },
];

// Mots-clés signalant une LOCATION (mensuel)
const LOC_KEYWORDS = [
    'louer', 'location', 'loyer', 'mensuel', '/mois', 'par mois',
    'en location', 'en loc', 'a louer', 'a prendre en location',
    'bail', 'en bail', 'caution', 'garant', 'loue',
    'mensualite', 'location mensuelle', 'pour louer', 'cherche a louer',
    'prendre en location', 'mois de caution',
];

// Mots-clés signalant une VENTE
const VENTE_KEYWORDS = [
    'acheter', 'achat', 'vente', 'vendre', 'acquerir', 'acquisition',
    'a vendre', 'mise en vente', 'acquis', 'acquereur',
    'investissement immobilier', 'mise en vente', 'a l\'achat',
    'pour acquerir', 'pour acheter',
];

function extractMatchCriteria(message) {
    const raw = message || '';
    const text = norm(raw);
    const c = {};

    // ── Commune ──────────────────────────────────────────────────────────────
    for (const { canon, aliases } of COMMUNES_ALIASES) {
        if (aliases.some(a => text.includes(a))) {
            c.commune = canon;
            break;
        }
    }

    // ── Type de bien ─────────────────────────────────────────────────────────
    for (const { kw, val } of TYPES_MAP) {
        if (kw.some(k => text.includes(k))) { c.type = val; break; }
    }

    // ── Type d'offre (location vs vente) — STRICT ────────────────────────────
    const isLocation = LOC_KEYWORDS.some(k => text.includes(k)) || text.includes('/mois') || text.includes('loyer') || text.includes('mensuel');
    const isVente = VENTE_KEYWORDS.some(k => text.includes(k)) || text.match(/\bventes?\b/i);

    if (isLocation && !isVente) c.typeOffre = 'Location';
    else if (isVente && !isLocation) c.typeOffre = 'Vente';
    else if (isLocation && isVente) {
        c.typeOffre = (text.includes('loyer') || text.includes('mensuel') || text.includes('/mois')) ? 'Location' : 'Vente';
    }

    // ── Budget vente (millions FCFA) ─────────────────────────────────────────
    if (!c.typeOffre || c.typeOffre === 'Vente') {
        const mM = text.match(/budget\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:millions?|m\b)/i)
            || text.match(/(\d+(?:[.,]\d+)?)\s*(?:millions?|m\b)(?!\s*(?:fcfa\/mois|\/mois|par mois))/i);
        if (mM) {
            const n = parseFloat(mM[1].replace(',', '.'));
            if (!isNaN(n) && n >= 1 && n <= 5000) {
                c.budget = n;
                if (!c.typeOffre) c.typeOffre = 'Vente';
            }
        }
    }

    // Heuristique : Si le chiffre est petit (ex: 100, 200, 500) et pas d'unité, c'est souvent un loyer k
    if (!c.loyer && !c.budget) {
        const mSmallNum = text.match(/\b(\d{2,3})\b(?!\s*(?:millions?|m\b))/);
        if (mSmallNum) {
            const n = parseInt(mSmallNum[1]);
            if (n >= 15 && n <= 950) { // Probablement loyer en k
                c.loyer = n * 1000;
                if (!c.typeOffre) c.typeOffre = 'Location';
            }
        }
    }

    // ── Loyer mensuel (FCFA) ─────────────────────────────────────────────────
    if (!c.typeOffre || c.typeOffre === 'Location') {
        // "500k", "500 000", "200 000/mois", "loyer: 300 000", "1,5 millions/mois"
        const loyerPatterns = [
            /loyer\s*(?:maxi?(?:mum)?)?\s*[:\-]?\s*(\d+)\s*k/i,
            /(\d+)\s*k\s*(?:fcfa|f)?\s*(?:\/mois|par mois|mensuel)/i,
            /(\d+)\s*000\s*(?:fcfa|f)?\s*(?:\/mois|par mois|mensuel)/i,
            /loyer\s*[:\-]?\s*(\d[\d\s]*)\s*(?:fcfa|f|cfa)/i,
            /(\d+(?:[.,]\d+)?)\s*millions?\s*(?:fcfa)?\s*(?:\/mois|par mois|mensuel)/i,
            /(\d{2,3})\s*000(?!\s*000)/,  // "500 000" seul — last resort
        ];
        for (const pat of loyerPatterns) {
            const m = text.match(pat);
            if (m) {
                let n;
                const src = pat.source;
                if (src.includes('millions')) n = parseFloat(m[1].replace(',', '.')) * 1_000_000;
                else if (src.includes('000(?!')) n = parseInt(m[1].replace(/\s/g, '')) * 1000;
                else if (src.includes('k\\s')) n = parseInt(m[1]) * 1000;
                else n = parseInt(m[1].replace(/\s/g, ''));
                if (n >= 10_000 && n <= 10_000_000) {
                    c.loyer = n;
                    if (!c.typeOffre) c.typeOffre = 'Location';
                    break;
                }
            }
        }
    }

    // ── Chambres (F3, T4, 3 pièces, 3 chambres, 3P) ──────────────────────────
    const chambreREs = [
        /\b[ft](\d)\b/i,
        /(\d+)\s*(?:chambres?|pieces?|piees?|pce)\b/i,
        /\b(\d)\s*p\b/i,
    ];
    for (const re of chambreREs) {
        const m = text.match(re);
        if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 10) { c.chambres = n; break; } }
    }

    // ── Surface (m²) ─────────────────────────────────────────────────────────
    const mSurf = text.match(/(\d+)\s*m[2²]?\b/i);
    if (mSurf) {
        const s = parseInt(mSurf[1]);
        if (s >= 15 && s <= 5000) c.surface = s;
    }

    // ── Meublé ───────────────────────────────────────────────────────────────
    const isNonMeuble = ['non meuble', 'sans meuble', 'vide', 'non equipe', 'nu', 'non-meuble'].some(k => text.includes(k));
    const isMeuble = !isNonMeuble && ['meuble', 'meubles', 'furnished', 'equipe', 'full option', 'tout equipe', 'entierement meuble'].some(k => text.includes(k));
    if (isNonMeuble) c.meuble = false;
    else if (isMeuble) c.meuble = true;

    // ── Amenities / Characteristics (90% Precision focus) ────────────────────
    const amenities = [];
    if (text.includes('piscine') || text.includes('pool')) amenities.push('piscine');
    if (text.includes('jardin') || text.includes('espace vert')) amenities.push('jardin');
    if (text.includes('balcon') || text.includes('terrasse')) amenities.push('balcon');
    if (text.includes('ascenseur')) amenities.push('ascenseur');
    if (text.includes('parking') || text.includes('garage')) amenities.push('parking');
    if (text.includes('securite') || text.includes('gardien') || text.includes('cloture')) amenities.push('securite');
    if (text.includes('clim') || text.includes('split')) amenities.push('clim');
    if (text.includes('cour') || text.includes('cours')) amenities.push('cour');
    if (text.includes('staffe') || text.includes('staffee')) amenities.push('staff');
    if (text.includes('marbre') || text.includes('marbree')) amenities.push('marbre');
    if (text.includes('neuf') || text.includes('nouvell') || text.includes('finition')) amenities.push('neuf');
    if (text.includes('cuisine')) amenities.push('cuisine');
    if (text.includes('placard')) amenities.push('placard');
    if (text.includes('baignoire') || text.includes('douche')) amenities.push('salle-eau');

    if (amenities.length > 0) c.amenities = amenities;

    // ── Urgence ───────────────────────────────────────────────────────────────
    c.urgent = ['urgent', 'asap', 'urgence', 'des que possible', 'au plus vite', 'tres urgent', 'immediatement', 'de suite', 'rapidement', 'd\'urgence'].some(k => text.includes(k));

    c.originalText = raw;

    c._score = (c.commune ? 3 : 0) + (c.type ? 3 : 0) + (c.typeOffre ? 3 : 0)
        + (c.budget || c.loyer ? 2.5 : 0) + (c.chambres ? 2 : 0) + (c.meuble !== undefined ? 1 : 0)
        + (amenities.length * 0.4);

    return c;
}

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

function isGroup(groupe) {
    return !groupe || groupe.includes('@g.us');
}

function isAgentDemand(message) {
    const text = (message || '').toLowerCase();
    const hasDemand = AGENT_DEMAND_KEYWORDS.some(k => text.includes(k));
    const hasOffer = OFFER_SIGNALS.some(k => text.includes(k));
    return hasDemand && !hasOffer && text.length > 20;
}


function extractPhone(req, isPrivateMsg) {
    // 1. Champs structurés (telephone_expediteur, cleanedSenderPn, etc.)
    let phone = extractBestPhone(req);
    if (phone) return phone;

    // 2. Message privé: le groupe = JID du contact (ex: 2250712345678@c.us)
    if (isPrivateMsg && req.groupe) {
        phone = formatPhoneCI(req.groupe.split('@')[0]);
        if (phone) return phone;
    }

    // 3. Numéro dans le nom de l'expéditeur ("Sophie 0712345678")
    if (req.expediteur) {
        phone = extractPhoneFromMessage(req.expediteur);
        if (phone) return phone;
    }

    // 4. Numéro mentionné dans le message lui-même
    if (req.message) {
        phone = extractPhoneFromMessage(req.message);
        if (phone) return phone;
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
            <div key={i} className="request-card" style={{ height: '240px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem' }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8, borderRadius: 4 }} />
                        <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 4 }} />
                    </div>
                </div>
                <div style={{ padding: '0 1.25rem', flex: 1 }}>
                    <div className="skeleton" style={{ width: '90%', height: 14, marginBottom: 8, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: '80%', height: 14, marginBottom: 8, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 8, borderRadius: 4 }} />
                </div>
                <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
                </div>
            </div>
        ))}
    </div>
);

// ─── CRITERIA CHIPS ──────────────────────────────────────────────────────────
const WA_ICON = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

const CriteriaChips = ({ c }) => {
    const chips = [];
    if (c.commune) chips.push({ icon: <MapPin size={10} />, label: c.commune, cls: 'chip-commune' });
    if (c.type) chips.push({ icon: <Home size={10} />, label: c.type, cls: 'chip-type' });
    if (c.typeOffre) chips.push({ icon: <Tag size={10} />, label: c.typeOffre, cls: 'chip-offre' });
    if (c.chambres) chips.push({ icon: <Bed size={10} />, label: `${c.chambres} ch.`, cls: 'chip-chambres' });
    if (c.budget) chips.push({ icon: <CreditCard size={10} />, label: `≤ ${c.budget}M`, cls: 'chip-budget' });
    if (c.loyer) chips.push({ icon: <CreditCard size={10} />, label: `${Math.round(c.loyer / 1000)}k/mois`, cls: 'chip-loyer' });
    if (c.meuble === true) chips.push({ icon: null, label: 'Meublé', cls: 'chip-meuble' });
    if (c.meuble === false) chips.push({ icon: null, label: 'Non meublé', cls: 'chip-meuble' });
    if (c.urgent) chips.push({ icon: null, label: '🔴 Urgent', cls: 'chip-urgent' });
    if (!chips.length) return null;
    return (
        <div className="match-criteria-chips">
            {chips.map((ch, i) => (
                <span key={i} className={`match-chip ${ch.cls}`}>
                    {ch.icon}{ch.label}
                </span>
            ))}
        </div>
    );
};

// ─── REQUEST CARD ────────────────────────────────────────────────────────────
const MSG_LIMIT = 280;

const RequestCard = ({ req, keywords, isPrivateMsg, viewMode, itemVariants }) => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);

    const waPhone = extractPhone(req, isPrivateMsg);
    const matchCriteria = useMemo(() => extractMatchCriteria(req.message), [req.message]);
    const hasMatch = matchCriteria._score > 0;

    const MAX_SCORE = 13;
    const qualityPct = Math.round((matchCriteria._score / MAX_SCORE) * 100);
    const qualityLabel = qualityPct >= 80 ? 'Complète' : qualityPct >= 55 ? 'Bonne' : qualityPct >= 30 ? 'Partielle' : 'Faible';
    const qualityColor = qualityPct >= 80 ? '#059669' : qualityPct >= 55 ? '#1B4299' : qualityPct >= 30 ? '#d97706' : '#94a3b8';

    const rawGroupe = req.groupe || '';
    const groupLabel = req.groupName || req.nom_groupe
        || rawGroupe.replace(/@[gs]\.us$/, '').replace(/-[0-9]+$/, '').trim()
        || 'Groupe';
    // Numéro affiché : toujours formaté "+225 07 XX XX XX"
    const displayedPhone = waPhone ? fmtPhone(waPhone) : '';

    const fullMsg = req.message || '';
    const isLong = fullMsg.length > MSG_LIMIT;
    const shownMsg = expanded || !isLong ? fullMsg : fullMsg.slice(0, MSG_LIMIT) + '…';

    const handleFindMatches = useCallback(() => {
        // Ensure we use the full absolute path and include both criteria keys for compatibility
        navigate('/dashboard/properties', {
            state: {
                matchSearch: matchCriteria,
                matchCriteria: matchCriteria,
                fromRequest: true,
                requestSnippet: fullMsg.substring(0, 160),
            }
        });
        addToast({
            type: 'info',
            title: 'Recherche de correspondances',
            message: 'Chargement des biens les plus pertinents...'
        });
    }, [navigate, matchCriteria, fullMsg, addToast]);

    const handleWhatsApp = useCallback(() => {
        const criteriaStr = [
            matchCriteria.type,
            matchCriteria.commune && `à ${matchCriteria.commune}`,
            matchCriteria.typeOffre && `(${matchCriteria.typeOffre})`,
            matchCriteria.chambres && `${matchCriteria.chambres} ch.`,
            matchCriteria.budget && `≤ ${matchCriteria.budget}M FCFA`,
            matchCriteria.loyer && `≤ ${Math.round(matchCriteria.loyer / 1000)}k/mois`,
            matchCriteria.meuble === true ? 'Meublé' : matchCriteria.meuble === false ? 'Non meublé' : null,
            matchCriteria.urgent ? '⚡ Urgent' : null,
        ].filter(Boolean).join(' · ');

        let text;
        if (isPrivateMsg) {
            text = criteriaStr
                ? `Bonjour${req.expediteur ? ' ' + req.expediteur : ''},\n\nJ'ai bien noté votre recherche :\n📋 *${criteriaStr}*\n\nNous vérifions nos disponibilités et reviendrons vers vous très vite.\n\nMerci !`
                : `Bonjour${req.expediteur ? ' ' + req.expediteur : ''},\n\nJ'ai bien reçu votre message.\nPouvez-vous me préciser vos critères (type, zone, budget) ?\n\nMerci !`;
        } else {
            text = criteriaStr
                ? `Bonjour${req.expediteur ? ' ' + req.expediteur : ''},\n\nSuite à votre recherche dans *${groupLabel}* :\n📋 *${criteriaStr}*\n\nNous pourrions avoir ce qu'il vous faut ! Contactez-nous pour plus de détails.`
                : `Bonjour${req.expediteur ? ' ' + req.expediteur : ''},\n\nSuite à votre message dans le groupe "${groupLabel}".\n\nNous pourrions peut-être vous aider. Avez-vous plus de détails ?`;
        }
        if (waPhone) {
            window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    }, [waPhone, isPrivateMsg, req.expediteur, groupLabel, matchCriteria, addToast]);

    const highlightText = useCallback((text) => {
        if (!text || !keywords?.length) return <span>{text}</span>;
        const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    keywords.some(k => k.toLowerCase() === part.toLowerCase())
                        ? <mark key={i} className="keyword-highlight">{part}</mark>
                        : part
                )}
            </span>
        );
    }, [keywords]);

    const dragX = useMotionValue(0);
    const whatsappOpacity = useTransform(dragX, [0, 40], [0, 1]);
    const finderOpacity = useTransform(dragX, [0, -40], [0, 1]);

    return (
        <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="swipe-container"
        >
            <div className="swipe-actions-bg">
                <motion.div
                    className="swipe-left-action"
                    onClick={handleWhatsApp}
                    style={{ opacity: whatsappOpacity, cursor: 'pointer' }}
                >
                    <WA_ICON /> WhatsApp
                </motion.div>
                {hasMatch && (
                    <motion.div
                        className="swipe-right-action"
                        onClick={handleFindMatches}
                        style={{ opacity: finderOpacity, cursor: 'pointer' }}
                    >
                        <Sparkles size={14} /> Trouver
                    </motion.div>
                )}
            </div>

            <motion.div
                className={`request-card swipe-card-content ${viewMode === 'list' ? 'request-card-list' : ''}`}
                style={{ x: dragX, zIndex: 1, position: 'relative' }}
                drag="x"
                dragConstraints={{ left: hasMatch ? -80 : 0, right: 80 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                    if (info.offset.x > 60) handleWhatsApp();
                    if (info.offset.x < -60 && hasMatch) handleFindMatches();
                }}
                whileTap={{ cursor: 'grabbing' }}
            >
                {/* ── HEADER ── */}
                <div className="request-card-header">
                    <div className="sender-info">
                        <div className={`sender-avatar ${isPrivateMsg ? 'sender-private' : ''}`}>
                            {(req.expediteur || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="sender-details">
                            <span className="sender-name">{req.expediteur || displayedPhone || 'Inconnu'}</span>
                            <div className="message-time">
                                <Clock size={11} />
                                {formatDate(req.horodatage || req.message_timestamp)}
                                {!isPrivateMsg && groupLabel && (
                                    <span className="group-name-inline">· {groupLabel.substring(0, 22)}{groupLabel.length > 22 ? '…' : ''}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className={`badge-source ${isPrivateMsg ? 'badge-private' : 'badge-group'}`}>
                        {isPrivateMsg ? 'Privé' : 'Groupe'}
                    </span>
                </div>

                {/* ── MESSAGE BODY ── */}
                <div className="request-card-body">
                    <div className="message-content">
                        {highlightText(shownMsg)}
                    </div>
                    {isLong && (
                        <button className="message-expand-btn" onClick={() => setExpanded(v => !v)}>
                            {expanded ? <><ChevronUp size={13} /> Voir moins</> : <><ChevronDown size={13} /> Voir plus ({fullMsg.length - MSG_LIMIT} car. de plus)</>}
                        </button>
                    )}

                    {/* ── Criteria chips ── */}
                    <CriteriaChips c={matchCriteria} />

                    {/* ── Quality bar ── */}
                    {matchCriteria._score > 0 && (
                        <div className="demand-quality-wrap">
                            <div className="demand-quality-header">
                                <span className="demand-quality-title">Qualité de la demande</span>
                                <span className="demand-quality-badge" style={{ color: qualityColor }}>
                                    {qualityLabel} · {qualityPct}%
                                </span>
                            </div>
                            <div className="demand-quality-track">
                                <motion.div
                                    className="demand-quality-fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${qualityPct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    style={{ background: qualityColor }}
                                />
                            </div>
                            {matchCriteria._score < 9 && (
                                <div className="demand-missing-hint">
                                    <span className="hint-label">Préciser :</span>
                                    {!matchCriteria.commune && <span className="hint-tag">zone</span>}
                                    {!matchCriteria.type && <span className="hint-tag">type de bien</span>}
                                    {!matchCriteria.typeOffre && <span className="hint-tag">location/vente</span>}
                                    {(!matchCriteria.budget && !matchCriteria.loyer) && <span className="hint-tag">budget</span>}
                                    {!matchCriteria.chambres && <span className="hint-tag">chambres</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── FOOTER ── */}
                <div className="request-card-footer">
                    {displayedPhone && (
                        <span className="meta-phone-display">
                            <Phone size={13} />
                            {displayedPhone}
                        </span>
                    )}
                    <div className="card-action-buttons">
                        {hasMatch && (
                            <button
                                className="btn-match-action"
                                onClick={handleFindMatches}
                                title={`Trouver des biens${matchCriteria.commune ? ' à ' + matchCriteria.commune : ''}${matchCriteria.type ? ' (' + matchCriteria.type + ')' : ''}`}
                            >
                                <Sparkles size={14} />
                                Trouver
                            </button>
                        )}
                        <button
                            className="btn-whatsapp-action"
                            onClick={handleWhatsApp}
                            title={waPhone ? `Répondre à ${waPhone}` : 'Ouvrir WhatsApp'}
                        >
                            <WA_ICON />
                            Répondre
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};


// ─── VIRTUALIZED LIST WRAPPER ─────────────────────────────────────────────────

const VIRTUAL_THRESHOLD = 20;    // only virtualize above this count
const LIST_ITEM_HEIGHT = 320;    // estimated px per card in list mode

const VirtualizedRequestList = ({ items, viewMode, activeTab, itemVariants, containerVariants }) => {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
        ro.observe(el);
        setContainerWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    // Grid view: use windowed slice + "show more" (drag gestures + CSS grid are incompatible with react-window)
    if (viewMode === 'grid') {
        return (
            <GridWindowedRequests
                items={items}
                activeTab={activeTab}
                itemVariants={itemVariants}
                containerVariants={containerVariants}
            />
        );
    }

    // List view: single column — use FixedSizeList when items > threshold
    const isPrivateMsg = activeTab === 'prive';

    if (items.length < VIRTUAL_THRESHOLD) {
        return (
            <motion.div
                className="requests-list-container"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <AnimatePresence mode="popLayout">
                    {items.map((req, idx) => (
                        <RequestCard
                            key={req.id || req.message_id || idx}
                            req={req}
                            keywords={AGENT_DEMAND_KEYWORDS}
                            isPrivateMsg={isPrivateMsg}
                            viewMode="list"
                            itemVariants={itemVariants}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        );
    }

    const Row = ({ index, style }) => {
        const req = items[index];
        return (
            <div style={{ ...style, padding: '0 0 12px 0', boxSizing: 'border-box' }}>
                <RequestCard
                    req={req}
                    keywords={AGENT_DEMAND_KEYWORDS}
                    isPrivateMsg={isPrivateMsg}
                    viewMode="list"
                    itemVariants={itemVariants}
                />
            </div>
        );
    };

    return (
        <div ref={containerRef} style={{ width: '100%' }}>
            <VirtualList
                height={Math.min(700, items.length * LIST_ITEM_HEIGHT)}
                itemCount={items.length}
                itemSize={LIST_ITEM_HEIGHT}
                width="100%"
                style={{ overflowX: 'hidden' }}
            >
                {Row}
            </VirtualList>
        </div>
    );
};

// Grid windowing: render in pages of 30 + "show more" button
const GRID_PAGE_SIZE = 30;

const GridWindowedRequests = ({ items, activeTab, itemVariants, containerVariants }) => {
    const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE);
    const isPrivateMsg = activeTab === 'prive';
    const visibleItems = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    // Reset when items change (filter/search)
    useEffect(() => { setVisibleCount(GRID_PAGE_SIZE); }, [items]);

    return (
        <>
            <motion.div
                className="requests-grid"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <AnimatePresence mode="popLayout">
                    {visibleItems.map((req, idx) => (
                        <RequestCard
                            key={req.id || req.message_id || idx}
                            req={req}
                            keywords={AGENT_DEMAND_KEYWORDS}
                            isPrivateMsg={isPrivateMsg}
                            viewMode="grid"
                            itemVariants={itemVariants}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
            {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setVisibleCount(c => Math.min(c + GRID_PAGE_SIZE, items.length))}
                    >
                        Afficher plus ({items.length - visibleCount} restants)
                    </button>
                </div>
            )}
        </>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const RequestsPage = () => {
    const [viewMode, setViewMode] = useState('grid');
    const [subFilter, setSubFilter] = useState('all'); // all | urgent | budget
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [rawData, setRawData] = useState([]);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('groupes'); // 'groupes' | 'prive'
    const [sortBy, setSortBy] = useState('date');    // 'date' | 'qualite' | 'urgent'
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // Animations
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

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

    // ── Partitioning: only group agent demands ──
    const agentRequests = useMemo(() => {
        const agents = [];
        for (const msg of rawData) {
            const groupe = msg.groupe || '';
            if (isGroup(groupe) && isAgentDemand(msg.message)) {
                agents.push(msg);
            }
        }
        return dedupe(agents);
    }, [rawData]);

    const privateRequests = useMemo(() => {
        const privs = rawData.filter(msg => {
            const groupe = msg.groupe || '';
            return !isGroup(groupe) && isAgentDemand(msg.message);
        });
        return dedupe(privs);
    }, [rawData]);

    const filteredItems = useMemo(() => {
        const source = activeTab === 'prive' ? privateRequests : agentRequests;
        const term = searchTerm.toLowerCase();
        let items = source.filter(req => {
            const text = (req.message || '').toLowerCase();
            const matchesSearch = !term ||
                text.includes(term) ||
                (req.expediteur || '').toLowerCase().includes(term) ||
                (req.telephone || '').includes(term) ||
                (req.groupName || req.nom_groupe || '').toLowerCase().includes(term);

            if (!matchesSearch) return false;
            if (subFilter === 'urgent') return text.includes('urgent') || text.includes('asap') || text.includes('urgence');
            if (subFilter === 'budget') return text.includes('budget') || text.includes('prix') || text.includes('loyer') || text.includes('maxi');
            return true;
        });

        if (sortBy === 'qualite') {
            items = [...items].sort((a, b) =>
                extractMatchCriteria(b.message)._score - extractMatchCriteria(a.message)._score
            );
        } else if (sortBy === 'urgent') {
            items = [...items].sort((a, b) => {
                const uA = norm(a.message || '').includes('urgent') ? 1 : 0;
                const uB = norm(b.message || '').includes('urgent') ? 1 : 0;
                return uB - uA;
            });
        }
        return items;
    }, [agentRequests, privateRequests, activeTab, searchTerm, subFilter, sortBy]);

    return (
        <PullToRefresh onRefresh={fetchRequests}>
            <div className="requests-page-container">

                <header className="requests-header">
                    <div className="header-title-group">
                        <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="page-title-large">
                            <MessageCircle size={32} />
                            Demandes
                        </motion.h2>
                        <p className="page-subtitle">
                            {(activeTab === 'prive' ? privateRequests : agentRequests).length} demande{(activeTab === 'prive' ? privateRequests : agentRequests).length !== 1 ? 's' : ''} · {activeTab === 'groupes' ? 'groupes WhatsApp' : 'messages privés'}
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

                {/* ── Source tabs ── */}
                <div className="requests-tabs">
                    <button
                        className={`req-tab ${activeTab === 'groupes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('groupes')}
                    >
                        <Users size={14} />
                        Groupes
                        <span className="tab-count">{agentRequests.length}</span>
                    </button>
                    <button
                        className={`req-tab ${activeTab === 'prive' ? 'active' : ''}`}
                        onClick={() => setActiveTab('prive')}
                    >
                        <MessageCircle size={14} />
                        Privés
                        <span className="tab-count tab-count-private">{privateRequests.length}</span>
                    </button>
                </div>
                <p className="tab-description">
                    {activeTab === 'groupes'
                        ? 'Agents cherchant un bien pour leurs clients dans les groupes WhatsApp.'
                        : 'Demandes reçues en message privé — prospects directs.'}
                </p>

                {/* ── Toolbar ── */}
                <div className="requests-toolbar">
                    <div className="search-field">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un agent, message, groupe..."
                            className="search-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filters-group hide-mobile">
                        <button className={`filter-chip ${subFilter === 'all' ? 'active' : ''}`} onClick={() => setSubFilter('all')}>Tous</button>
                        <button className={`filter-chip ${subFilter === 'urgent' ? 'active' : ''}`} onClick={() => setSubFilter('urgent')}>Urgents</button>
                        <button className={`filter-chip ${subFilter === 'budget' ? 'active' : ''}`} onClick={() => setSubFilter('budget')}>Avec Budget</button>
                    </div>

                    <button className="mobile-filter-trigger" onClick={() => setIsFilterSheetOpen(true)}>
                        <Filter size={18} />
                        <span>Filtres</span>
                        {(subFilter !== 'all' || sortBy !== 'date') && <span className="filter-dot" />}
                    </button>

                    <div className="sort-selector hide-mobile">
                        <ArrowUpDown size={15} />
                        <select
                            className="sort-select"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            title="Trier par"
                        >
                            <option value="date">Date</option>
                            <option value="qualite">Qualité ↓</option>
                            <option value="urgent">Urgents ↑</option>
                        </select>
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
                    <EmptyStateShared
                        variant={searchTerm ? 'search' : 'messages'}
                        title={searchTerm ? `Aucun résultat pour « ${searchTerm} »` : 'Aucune demande détectée'}
                        description={searchTerm
                            ? "Essayez un autre terme ou effacez la recherche."
                            : "Les agents cherchant des biens pour leurs clients apparaîtront ici."}
                        showTips={Boolean(searchTerm)}
                        actionLabel={searchTerm ? 'Effacer' : undefined}
                        onAction={searchTerm ? () => setSearchTerm('') : undefined}
                        size="medium"
                    />
                ) : (
                    <VirtualizedRequestList
                        items={filteredItems}
                        viewMode={viewMode}
                        activeTab={activeTab}
                        itemVariants={itemVariants}
                        containerVariants={containerVariants}
                    />
                )}
            </div>

            <BottomSheet
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                title="Filtres & Tri"
            >
                <FilterSheetContent
                    subFilter={subFilter}
                    setSubFilter={setSubFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    onClose={() => setIsFilterSheetOpen(false)}
                />
            </BottomSheet>
        </PullToRefresh>
    );
};

/* --- FILTER SHEET CONTENT --- */
const FilterSheetContent = ({ subFilter, setSubFilter, sortBy, setSortBy, onClose }) => (
    <div className="filter-sheet-layout">
        <section className="filter-group">
            <label>Filtrer par type</label>
            <div className="filter-options-grid">
                <button
                    className={`filter-option ${subFilter === 'all' ? 'active' : ''}`}
                    onClick={() => { setSubFilter('all'); onClose(); }}
                >Tout</button>
                <button
                    className={`filter-option ${subFilter === 'urgent' ? 'active' : ''}`}
                    onClick={() => { setSubFilter('urgent'); onClose(); }}
                >Urgent 🔥</button>
                <button
                    className={`filter-option ${subFilter === 'budget' ? 'active' : ''}`}
                    onClick={() => { setSubFilter('budget'); onClose(); }}
                >Budget 💰</button>
            </div>
        </section>

        <section className="filter-group">
            <label>Trier par</label>
            <div className="filter-options-grid">
                <button
                    className={`filter-option ${sortBy === 'date' ? 'active' : ''}`}
                    onClick={() => { setSortBy('date'); onClose(); }}
                >Plus récent</button>
                <button
                    className={`filter-option ${sortBy === 'qualite' ? 'active' : ''}`}
                    onClick={() => { setSortBy('qualite'); onClose(); }}
                >Meilleurs scores</button>
                <button
                    className={`filter-option ${sortBy === 'urgent' ? 'active' : ''}`}
                    onClick={() => { setSortBy('urgent'); onClose(); }}
                >Urgence d'abord</button>
            </div>
        </section>
    </div>
);

export default RequestsPage;
