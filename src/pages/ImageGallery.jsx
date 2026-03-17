import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, RefreshCw, MapPin, Bed, Phone, Eye, Images, X, ChevronLeft, ChevronRight } from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import './ImageGallery.css';

// ─── Carte bien avec carousel ──────────────────────────────────────────────────
const CatalogueCard = ({ property, images, onView }) => {
    const [imgIdx, setImgIdx] = useState(0);

    // Toutes les URLs disponibles pour cette carte
    const allUrls = useMemo(() => {
        const fromImages = (images || []).map(i => i.lien_image).filter(Boolean);
        if (fromImages.length > 0) return fromImages;
        return property.imageUrl ? [property.imageUrl] : [];
    }, [images, property.imageUrl]);

    const prev = (e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + allUrls.length) % allUrls.length); };
    const next = (e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % allUrls.length); };

    return (
        <div className="cat-card" onClick={() => onView(property)}>
            <div className="cat-card-img">
                {allUrls.length > 0 ? (
                    <>
                        <img src={allUrls[imgIdx]} alt={property.typeBien} loading="lazy"
                            onError={e => { e.target.style.display = 'none'; }} />
                        {allUrls.length > 1 && (
                            <>
                                <button className="cat-nav cat-nav-prev" onClick={prev}><ChevronLeft size={14} /></button>
                                <button className="cat-nav cat-nav-next" onClick={next}><ChevronRight size={14} /></button>
                            </>
                        )}
                        <span className="cat-img-counter">{imgIdx + 1}/{allUrls.length}</span>
                    </>
                ) : (
                    <div className="cat-card-placeholder">
                        <MapPin size={28} style={{ opacity: 0.4 }} />
                    </div>
                )}
                {/* Badges overlay */}
                <div className="cat-badges">
                    <div className="cat-badges-left">
                        {property.typeOffre && (
                            <span className={`cat-badge-offre ${property.typeOffre.toLowerCase().includes('location') ? 'loc' : 'vente'}`}>
                                {property.typeOffre}
                            </span>
                        )}
                    </div>
                    <div className="cat-badges-right">
                        {allUrls.length > 1 && (
                            <span className="cat-badge-photos"><Images size={10} /> {allUrls.length}</span>
                        )}
                        <span className={`cat-badge-dispo ${property.disponible ? 'dispo' : 'occupe'}`}>
                            {property.disponible ? 'Dispo' : 'Occupé'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="cat-card-body">
                <div className="cat-card-header">
                    <span className="cat-type">{property.typeBien}</span>
                    <span className="cat-prix">{property.prixFormate}</span>
                </div>
                <div className="cat-location">
                    <MapPin size={12} />
                    <span>{[property.commune, property.quartier].filter(Boolean).join(' · ') || property.zone || '—'}</span>
                </div>
                {property.chambres > 0 && (
                    <div className="cat-features">
                        <span><Bed size={11} /> {property.chambres} ch.</span>
                        {property.meuble && <span>Meublé</span>}
                    </div>
                )}
                <div className="cat-footer">
                    <span className="cat-ref">{property.refBien}</span>
                    <button className="cat-btn-detail" onClick={e => { e.stopPropagation(); onView(property); }}>
                        <Eye size={13} /> Détails
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Modal détail simplifié ─────────────────────────────────────────────────────
const DetailModal = ({ property, isOpen, onClose, images }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const isTally = property?.groupeWhatsApp === 'FORMULAIRE_TALLY';
    const contact = property?.telephoneBien || property?.telephoneExpediteur || '';

    useEffect(() => { if (isOpen) setActiveIdx(0); }, [isOpen, property]);

    if (!property) return null;

    const allUrls = (images || []).length > 0
        ? (images || []).map(i => i.lien_image).filter(Boolean)
        : (property.imageUrl ? [property.imageUrl] : []);

    const prev = () => setActiveIdx(i => (i - 1 + allUrls.length) % allUrls.length);
    const next = () => setActiveIdx(i => (i + 1) % allUrls.length);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Détails du bien" size="lg">
            <div className="cat-modal">
                {/* Galerie */}
                <div className="cat-modal-gallery">
                    {allUrls.length > 0 ? (
                        <>
                            <div className="cat-modal-img-wrap">
                                <img src={allUrls[activeIdx]} alt="" className="cat-modal-main-img"
                                    onError={e => { e.target.style.display = 'none'; }} />
                                {allUrls.length > 1 && (
                                    <>
                                        <button className="cat-modal-nav cat-modal-nav-prev" onClick={prev}>
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button className="cat-modal-nav cat-modal-nav-next" onClick={next}>
                                            <ChevronRight size={18} />
                                        </button>
                                        <span className="cat-modal-count">{activeIdx + 1} / {allUrls.length}</span>
                                    </>
                                )}
                            </div>
                            {allUrls.length > 1 && (
                                <div className="cat-modal-thumbs">
                                    {allUrls.map((url, i) => (
                                        <img key={i} src={url} alt="" loading="lazy"
                                            className={`cat-modal-thumb ${i === activeIdx ? 'active' : ''}`}
                                            onClick={() => setActiveIdx(i)}
                                            onError={e => { e.target.style.display = 'none'; }} />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="cat-modal-no-img"><MapPin size={36} style={{ opacity: 0.3 }} /></div>
                    )}
                </div>

                {/* Infos */}
                <div className="cat-modal-info">
                    <div className="cat-modal-title-row">
                        <h3>{property.typeBien}</h3>
                        <span className={`cat-badge-offre ${(property.typeOffre || '').toLowerCase().includes('location') ? 'loc' : 'vente'}`}>
                            {property.typeOffre}
                        </span>
                    </div>

                    <div className="cat-modal-prix">{property.prixFormate}</div>

                    <div className="cat-modal-grid">
                        <div><span className="cat-label">Localisation</span><span>{[property.commune, property.quartier].filter(Boolean).join(', ') || property.zone}</span></div>
                        {property.chambres > 0 && <div><span className="cat-label">Chambres</span><span>{property.chambres}</span></div>}
                        <div><span className="cat-label">Meublé</span><span>{property.meuble ? 'Oui' : 'Non'}</span></div>
                        <div><span className="cat-label">Disponible</span><span style={{ color: property.disponible ? '#16a34a' : '#ef4444' }}>{property.disponible ? 'Oui' : 'Non'}</span></div>
                        {property.surface && <div><span className="cat-label">Surface</span><span>{property.surface} m²</span></div>}
                        <div><span className="cat-label">Référence</span><span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{property.refBien || '—'}</span></div>
                        <div><span className="cat-label">Source</span><span style={{ color: isTally ? '#7c3aed' : '#25D366', fontWeight: 600 }}>{isTally ? '📋 Formulaire Tally' : '💬 WhatsApp'}</span></div>
                        {property.expediteur && <div><span className="cat-label">Déposé par</span><span>{property.expediteur}</span></div>}
                        {property.datePublication && <div><span className="cat-label">Publié le</span><span>{property.datePublication}</span></div>}
                    </div>

                    {property.caracteristiques && (
                        <div className="cat-modal-carac">
                            <span className="cat-label">Caractéristiques</span>
                            <p>{property.caracteristiques}</p>
                        </div>
                    )}

                    {contact && (
                        <div className="cat-modal-actions">
                            <a href={`tel:+${contact}`} className="cat-btn-call"><Phone size={15} /> Appeler</a>
                            <a href={`https://wa.me/${contact}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par le ${property.typeBien} à ${property.commune || property.zone}`)}`}
                                target="_blank" rel="noopener noreferrer" className="cat-btn-wa">
                                💬 WhatsApp
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

// ─── Page Catalogue ─────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 40;

// Déduplique par content_hash (même bien = même contenu) et fusionne les images
function deduplicateByRef(list) {
    const seen = new Map();
    for (const p of list) {
        // content_hash = identifiant unique du contenu du bien (plusieurs locaux = même bien avec des images différentes)
        const key = p.contentHash || p.refBien || p.publicationId || String(p.id);
        if (!seen.has(key)) {
            seen.set(key, { ...p, _extraImages: p.imageUrl ? [p.imageUrl] : [] });
        } else {
            // Même bien : ajouter l'image si elle est nouvelle
            if (p.imageUrl && !seen.get(key)._extraImages.includes(p.imageUrl)) {
                seen.get(key)._extraImages.push(p.imageUrl);
            }
        }
    }
    return Array.from(seen.values());
}

const ImageGallery = () => {
    const { addToast } = useToast();
    const [properties, setProperties] = useState([]);   // biens Tally dédupliqués
    const [imagesMap, setImagesMap] = useState({});      // { lookupKey: [images] }
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCommune, setFilterCommune] = useState('all');
    const [filterOffre, setFilterOffre] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => { load(true); }, []); // toujours forcer refresh sur cette page

    const load = async (force = true) => {
        try {
            const res = await apiService.getProperties(force);
            if (res.success) {
                // 1. Filtrer uniquement les biens du formulaire Tally
                const tally = res.data.filter(p => p.groupeWhatsApp === 'FORMULAIRE_TALLY');
                // 2. Dédupliquer (un seul enregistrement par bien)
                const unique = deduplicateByRef(tally);
                setProperties(unique);

                // 3. Charger les images en batch pour toutes les cartes
                const keys = unique.map(p => p.publicationId || String(p.id)).filter(Boolean);
                if (keys.length > 0) {
                    try {
                        const map = await apiService.getImagesForPublications(keys);
                        setImagesMap(map || {});
                    } catch (_) {
                        setImagesMap({});
                    }
                }
            }
        } catch (e) {
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les biens' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => { setRefreshing(true); load(true); };

    // Résoudre les images d'une propriété (carte ou modal)
    // Priorité : table images → _extraImages fusionnées des doublons locaux
    const getImages = useCallback((p) => {
        const key = p.publicationId || String(p.id);
        const fromTable = imagesMap[key] || [];
        if (fromTable.length > 0) return fromTable;

        // Fallback : images collectées depuis les doublons locaux lors de la déduplication
        const urls = (p._extraImages && p._extraImages.length > 0)
            ? p._extraImages
            : (p.imageUrl ? [p.imageUrl] : []);
        return urls.map((url, i) => ({ lien_image: url, image_order: i }));
    }, [imagesMap]);

    // Options filtres dynamiques
    const communes = useMemo(() => {
        const s = new Set(properties.map(p => p.commune).filter(Boolean));
        return ['all', ...Array.from(s).sort()];
    }, [properties]);

    const types = useMemo(() => {
        const s = new Set(properties.map(p => p.typeBien).filter(Boolean));
        return ['all', ...Array.from(s).sort()];
    }, [properties]);

    // Filtrage
    const filtered = useMemo(() => {
        let list = properties;
        if (filterOffre !== 'all') list = list.filter(p => (p.typeOffre || '').toLowerCase().includes(filterOffre.toLowerCase()));
        if (filterType !== 'all') list = list.filter(p => (p.typeBien || '').toLowerCase().includes(filterType.toLowerCase()));
        if (filterCommune !== 'all') list = list.filter(p => p.commune === filterCommune);
        if (search.trim().length >= 2) {
            const s = search.toLowerCase();
            list = list.filter(p =>
                (p.commune || '').toLowerCase().includes(s) ||
                (p.typeBien || '').toLowerCase().includes(s) ||
                (p.quartier || '').toLowerCase().includes(s) ||
                (p.refBien || '').toLowerCase().includes(s) ||
                (p.caracteristiques || '').toLowerCase().includes(s)
            );
        }
        return list;
    }, [properties, search, filterType, filterCommune, filterOffre]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const clearFilters = () => {
        setSearch(''); setFilterType('all'); setFilterCommune('all');
        setFilterOffre('all'); setCurrentPage(1);
    };
    const hasFilters = search || filterType !== 'all' || filterCommune !== 'all' || filterOffre !== 'all';

    return (
        <div className="catalogue-page">
            {/* ─ En-tête ─ */}
            <div className="catalogue-header">
                <div className="catalogue-title-row">
                    <div>
                        <h2>📋 Catalogue Formulaire</h2>
                        <p className="catalogue-subtitle">
                            {loading ? 'Chargement...' : `${filtered.length} bien${filtered.length > 1 ? 's' : ''} soumis via formulaire`}
                        </p>
                    </div>
                    <button className="cat-btn-refresh" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        Rafraîchir
                    </button>
                </div>

                {/* ─ Filtres ─ */}
                <div className="catalogue-filters">
                    <div className="cat-search-wrap">
                        <Search size={15} />
                        <input className="cat-search" placeholder="Rechercher commune, type, quartier…"
                            value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
                    </div>
                    <select className="cat-select" value={filterOffre} onChange={e => { setFilterOffre(e.target.value); setCurrentPage(1); }}>
                        <option value="all">Toutes offres</option>
                        <option value="location">Location</option>
                        <option value="vente">Vente</option>
                    </select>
                    <select className="cat-select" value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}>
                        <option value="all">Tous types</option>
                        {types.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select className="cat-select" value={filterCommune} onChange={e => { setFilterCommune(e.target.value); setCurrentPage(1); }}>
                        <option value="all">Toutes communes</option>
                        {communes.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {hasFilters && (
                        <button className="cat-btn-clear" onClick={clearFilters}><X size={14} /> Effacer</button>
                    )}
                </div>
            </div>

            {/* ─ Grille ─ */}
            {loading ? (
                <div className="catalogue-loading">
                    <div className="cat-spinner" />
                    <p>Chargement des biens…</p>
                </div>
            ) : properties.length === 0 ? (
                <div className="catalogue-empty">
                    <Filter size={40} style={{ opacity: 0.3 }} />
                    <p>Aucun bien soumis via formulaire pour le moment</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: 4 }}>Les biens arrivent via le formulaire Tally → workflow n8n Catalogue</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="catalogue-empty">
                    <Filter size={40} style={{ opacity: 0.3 }} />
                    <p>Aucun bien trouvé avec ces filtres</p>
                    {hasFilters && <button className="cat-btn-clear" onClick={clearFilters}>Effacer les filtres</button>}
                </div>
            ) : (
                <>
                    <div className="catalogue-grid">
                        {paginated.map(p => (
                            <CatalogueCard key={p.id} property={p} images={getImages(p)} onView={setSelected} />
                        ))}
                    </div>

                    {/* ─ Pagination ─ */}
                    {totalPages > 1 && (
                        <div className="catalogue-pagination">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</button>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
                            <span>Page {currentPage} / {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</button>
                        </div>
                    )}
                </>
            )}

            <DetailModal property={selected} isOpen={Boolean(selected)}
                onClose={() => setSelected(null)}
                images={selected ? getImages(selected) : []} />
        </div>
    );
};

export default ImageGallery;
