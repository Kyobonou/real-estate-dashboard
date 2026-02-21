import { useState, useEffect, useMemo, useCallback } from 'react';  // useState ajouté pour ImageThumbnail
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, X, Download, ExternalLink, User, Users,
    ChevronDown, ChevronUp, Phone, MapPin, ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import apiService from '../../services/api';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import Skeleton from '../../components/Skeleton';
import '../Properties.css';

// --- MODAL DÉTAIL IMAGE ---
const ImageDetailModal = ({ item, isOpen, onClose }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const { addToast } = useToast();
    if (!item) return null;
    const { property, lien_image, horodatage } = item;

    const handleCopyLink = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(lien_image);
            addToast({ type: 'info', title: 'Copié !', message: 'Lien copié dans le presse-papier' });
        }
    };

    const handleWhatsApp = () => {
        if (!property?.telephoneBien) {
            addToast({ type: 'error', title: 'Erreur', message: 'Pas de numéro disponible' });
            return;
        }
        let phone = property.telephoneBien.replace(/\D/g, '');
        if (!phone.startsWith('225')) phone = '225' + phone;
        const msg = encodeURIComponent(`Bonjour, je suis intéressé par votre ${property.typeBien} à ${property.zone}`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    const gradient = property?.id % 2 === 0
        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
        : 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Détail image" size="lg">
            <div className="property-details-modal">
                <div className="property-details-header">
                    <div className="property-image-large" style={{ height: '300px', background: imgFailed ? gradient : '#000', position: 'relative' }}>
                        {lien_image && !imgFailed && (
                            <img src={lien_image} alt="Full view"
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                onError={() => setImgFailed(true)} />
                        )}
                        {imgFailed && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                                Image expirée<br/><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>L'URL WaSender a expiré</span>
                            </div>
                        )}
                    </div>
                    <div className="property-quick-info">
                        <div className="price-section">
                            <span className="price-label">{property?.typeBien}</span>
                            <h3 className="price-value">{property?.prixFormate}</h3>
                            {property?.refBien && (
                                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: '#fff', background: '#1B4299', borderRadius: 5, padding: '2px 8px' }}>
                                    # {property.refBien}
                                </span>
                            )}
                        </div>
                        <div className="status-section">
                            <span className={`badge ${property?.disponible ? 'badge-success' : 'badge-danger'}`}>
                                {property?.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="property-details-body">
                    <div className="details-section">
                        <h4>Contexte du bien</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <MapPin size={18} />
                                <div>
                                    <span className="info-label">Zone</span>
                                    <span className="info-value">{property?.zone} {property?.commune ? `— ${property.commune}` : ''}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <User size={18} />
                                <div>
                                    <span className="info-label">Publié par</span>
                                    <span className="info-value">{property?.publiePar || '—'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Users size={18} />
                                <div>
                                    <span className="info-label">Groupe WhatsApp</span>
                                    <span className="info-value">{property?.name || property?.groupeWhatsApp || '—'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Phone size={18} />
                                <div>
                                    <span className="info-label">Téléphone</span>
                                    <span className="info-value">{property?.telephone || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {property?.description && (
                        <div className="details-section">
                            <h4>Message initial</h4>
                            <p className="property-full-description" style={{ whiteSpace: 'pre-wrap' }}>
                                {property.description}
                            </p>
                        </div>
                    )}

                    {horodatage && (
                        <div className="details-section">
                            <h4>Date</h4>
                            <p className="property-full-description">{horodatage}</p>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={handleCopyLink}>
                            Copier le lien
                        </button>
                        <button className="btn btn-secondary" onClick={() => window.open(lien_image, '_blank')}>
                            <ExternalLink size={16} /> Ouvrir
                        </button>
                        {property?.telephone && (
                            <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
                                <Phone size={16} /> WhatsApp
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// --- THUMBNAIL AVEC FALLBACK ---
const ImageThumbnail = ({ item, onViewDetail, index }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const gradient = item.property?.id % 2 === 0
        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
        : 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onViewDetail(item)}
            style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            whileHover={{ scale: 1.03, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
        >
            {/* Miniature - utilise lien_thumb (ImgBB) en priorité, fallback lien_image */}
            <div style={{ position: 'relative', aspectRatio: '4/3', background: imgFailed ? gradient : '#111' }}>
                {!imgFailed && (item.lien_thumb || item.lien_image) && (
                    <img
                        src={item.lien_thumb || item.lien_image}
                        alt={item.property?.typeBien}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={() => setImgFailed(true)}
                    />
                )}
                {item.property?.refBien && (
                    <span style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#fff', background: '#1B4299', borderRadius: 4, padding: '1px 5px' }}>
                        #{item.property.refBien}
                    </span>
                )}
            </div>
            {/* Infos contexte */}
            <div style={{ padding: '6px 8px' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.property?.typeBien || '—'}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: '0.67rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <MapPin size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {item.property?.zone}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.7rem', fontWeight: 600, color: '#1B4299' }}>
                    {item.property?.prixFormate}
                </p>
            </div>
        </motion.div>
    );
};

// --- SECTION D'UN GROUPE (auteur ou groupe WA) ---
const AuthorSection = ({ groupKey, items, onViewDetail, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen ?? true);
    const firstProp = items[0]?.property;

    return (
        <div style={{ marginBottom: '2rem', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            {/* En-tête du groupe */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1B4299', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{groupKey}</p>
                    {(firstProp?.name || firstProp?.groupeWhatsApp) && (
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>{firstProp.name || firstProp.groupeWhatsApp}</p>
                    )}
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 20, padding: '2px 10px', border: '1px solid var(--border-color)' }}>
                    {items.length} photo{items.length > 1 ? 's' : ''}
                </span>
                {open ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
            </button>

            {/* Grille d'images */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, padding: 14 }}>
                            {items.map((item, i) => (
                                <ImageThumbnail key={item.id || i} item={item} onViewDetail={onViewDetail} index={i} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- PAGE PRINCIPALE ---
const ImagesPage = () => {
    const [allItems, setAllItems] = useState([]); // [{lien_image, horodatage, id, property:{...}}]
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('auteur'); // 'auteur' | 'groupe'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const { addToast } = useToast();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const response = await apiService.getImagesProperties();
            if (response.success) {
                // Aplatir : pour chaque bien, pour chaque image → un item avec contexte
                const items = response.data.flatMap(prop =>
                    (prop.images || []).map(img => ({ ...img, property: prop }))
                );
                setAllItems(items);
            } else {
                addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les images' });
            }
        } catch (e) {
            addToast({ type: 'error', title: 'Erreur', message: e.message });
        } finally {
            setLoading(false);
        }
    };

    // Filtrage
    const filteredItems = useMemo(() => {
        if (!searchTerm) return allItems;
        const t = searchTerm.toLowerCase();
        return allItems.filter(item =>
            (item.property?.publiePar || '').toLowerCase().includes(t) ||
            (item.property?.name || item.property?.groupeWhatsApp || '').toLowerCase().includes(t) ||
            (item.property?.refBien || '').toLowerCase().includes(t) ||
            (item.property?.typeBien || '').toLowerCase().includes(t) ||
            (item.property?.zone || '').toLowerCase().includes(t)
        );
    }, [allItems, searchTerm]);

    // Regroupement
    const grouped = useMemo(() => {
        const groups = {};
        filteredItems.forEach(item => {
            const key = groupBy === 'auteur'
                ? (item.property?.publiePar || 'Inconnu')
                : (item.property?.name || item.property?.groupeWhatsApp || 'Groupe inconnu');
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        // Trier par nombre d'images décroissant
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [filteredItems, groupBy]);

    const handleExport = useCallback(() => {
        const rows = filteredItems.map(item => ({
            'Réf bien': item.property?.refBien || '',
            'Type': item.property?.typeBien || '',
            'Zone': item.property?.zone || '',
            'Prix': item.property?.prixFormate || '',
            'Publié par': item.property?.publiePar || '',
            'Groupe WhatsApp': item.property?.name || item.property?.groupeWhatsApp || '',
            'Téléphone': item.property?.telephone || '',
            'Lien image': item.lien_image || '',
            'Date': item.horodatage || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Images');
        XLSX.writeFile(wb, `Images_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast({ type: 'success', title: 'Export réussi', message: `${filteredItems.length} images exportées` });
    }, [filteredItems, addToast]);

    if (loading) {
        return (
            <div className="properties-v2">
                <div className="properties-header">
                    <div className="header-left">
                        <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                        <Skeleton width="250px" height="20px" />
                    </div>
                </div>
                <Skeleton width="100%" height="50px" type="rect" style={{ borderRadius: 12, marginBottom: '1rem' }} />
                {[1, 2].map(i => (
                    <div key={i} style={{ marginBottom: '1.5rem', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <Skeleton width="100%" height="56px" type="rect" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, padding: 14 }}>
                            {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} height="140px" type="rect" style={{ borderRadius: 8 }} />)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div className="properties-v2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* En-tête */}
            <div className="properties-header">
                <div className="header-left">
                    <h2>Images WhatsApp</h2>
                    <span className="properties-count">
                        {filteredItems.length} photo(s) · {grouped.length} groupe(s)
                    </span>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} /> Exporter Excel
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="properties-toolbar">
                <div className="search-filter-group" style={{ flex: 1 }}>
                    <div className="search-input">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par auteur, groupe, réf, zone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')}><X size={16} /></button>
                        )}
                    </div>
                </div>

                {/* Toggle groupement */}
                <div className="view-toggle" style={{ gap: 4 }}>
                    <button
                        className={`view-btn ${groupBy === 'auteur' ? 'active' : ''}`}
                        onClick={() => setGroupBy('auteur')}
                        title="Grouper par auteur"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', fontSize: '0.8rem' }}
                    >
                        <User size={16} /> Auteur
                    </button>
                    <button
                        className={`view-btn ${groupBy === 'groupe' ? 'active' : ''}`}
                        onClick={() => setGroupBy('groupe')}
                        title="Grouper par groupe WhatsApp"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', fontSize: '0.8rem' }}
                    >
                        <Users size={16} /> Groupe WA
                    </button>
                </div>
            </div>

            {/* Sections groupées */}
            <AnimatePresence mode="wait">
                {grouped.length === 0 ? (
                    <motion.div className="empty-state" key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <ImageIcon size={48} />
                        <p>Aucune image trouvée</p>
                        {searchTerm && (
                            <button className="btn btn-primary" onClick={() => setSearchTerm('')}>Effacer la recherche</button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key={groupBy} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        {grouped.map(([key, items], idx) => (
                            <AuthorSection
                                key={key}
                                groupKey={key}
                                items={items}
                                onViewDetail={item => { setSelectedItem(item); setModalOpen(true); }}
                                defaultOpen={idx < 3}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <ImageDetailModal
                item={selectedItem}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </motion.div>
    );
};

export default ImagesPage;
