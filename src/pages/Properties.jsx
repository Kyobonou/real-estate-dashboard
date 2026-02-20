import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Tag, Grid, List, Search, Filter, X, Phone, Eye,
    Download, Share2, Home, Key, Loader, Bed, Building, Map,
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Images,
    User, MessageSquare, Copy, Check, RefreshCw
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


const PropertyDetailsModal = ({ property, isOpen, onClose }) => {
    const { addToast } = useToast();
    const [modalImages, setModalImages] = useState([]);
    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [galleryView, setGalleryView] = useState('carousel');
    const [msgCopied, setMsgCopied] = useState(false);

    useEffect(() => {
        if (!isOpen || !property?.publicationId) {
            setModalImages([]);
            setActiveImgIdx(0);
            setGalleryView('carousel');
            setMsgCopied(false);
            return;
        }
        apiService.getImagesForPublication(property.publicationId).then(imgs => {
            setModalImages(imgs);
            setActiveImgIdx(0);
            setGalleryView('carousel');
        });
    }, [isOpen, property?.publicationId]);

    const contactPhone = property?.telephoneBien || property?.telephoneExpediteur || '';

    const handleContact = () => {
        if (!contactPhone) {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
            return;
        }
        window.open(`tel:${contactPhone}`, '_self');
        addToast({ type: 'success', title: 'Contact', message: `Appel vers ${contactPhone}` });
    };

    const handleWhatsApp = () => {
        const raw = contactPhone.replace(/\D/g, '');
        if (!raw) {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
            return;
        }
        let phone = raw;
        if (!phone.startsWith('225')) phone = '225' + phone;

        const agentName = property.expediteur || property.publiePar || '';
        const lieu = [property.commune, property.quartier].filter(Boolean).join(', ') || property.zone || '';
        const groupeRef = property.groupeWhatsApp ? `\nGroupe source : ${property.groupeWhatsApp}` : '';
        const msgOrigin = property.description
            ? `\n\nVotre annonce :\n"${property.description.substring(0, 200)}${property.description.length > 200 ? '...' : ''}"`
            : '';

        const text = `Bonjour${agentName ? ' ' + agentName : ''},\n\nJe suis intéressé(e) par votre bien : ${property.typeBien} à ${lieu} (${property.prixFormate} FCFA).${groupeRef}${msgOrigin}\n\nMerci de me recontacter.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Détails du Bien" size="lg">
            <div className="property-details-modal">
                <div className="property-details-header">
                    {(() => {
                        const allUrls = modalImages.length > 0
                            ? modalImages.map(i => i.lien_image).filter(Boolean)
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
                                <Phone size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                                <div>
                                    <span className="info-label">Téléphone</span>
                                    <span className="info-value" style={{ fontWeight: 600, letterSpacing: '0.3px' }}>{contactPhone || '—'}</span>
                                </div>
                            </div>
                            {property.groupeWhatsApp && (
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <MessageSquare size={18} style={{ color: '#25D366', flexShrink: 0 }} />
                                    <div>
                                        <span className="info-label">Groupe WhatsApp source</span>
                                        <span className="info-value" style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{property.groupeWhatsApp}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Bouton WhatsApp intégré dans la section contact */}
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
                    </div>

                    {/* ── MESSAGE ORIGINAL ── */}
                    {messageOriginal && (
                        <div className="details-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h4 style={{ margin: 0 }}>Message de l'agent</h4>
                                <button
                                    onClick={handleCopyMessage}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, borderRadius: 7, border: '1px solid var(--border-subtle, #e2e8f0)', background: msgCopied ? '#dcfce7' : 'var(--bg-panel, #fff)', color: msgCopied ? '#16a34a' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    {msgCopied ? <Check size={14} /> : <Copy size={14} />}
                                    {msgCopied ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--text-primary, #1e293b)', lineHeight: 1.6, background: 'var(--bg-secondary, #f8fafc)', padding: '0.875rem 1rem', borderRadius: 8, border: '1px solid var(--border-subtle, #e2e8f0)', maxHeight: '300px', overflowY: 'auto' }}>
                                {messageOriginal}
                            </pre>
                        </div>
                    )}

                    {/* ── ACTIONS ── */}
                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={handleContact}>
                            <Phone size={18} />
                            Appeler
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// --- LIST VIEW COMPONENT (TABLE - style Visits) ---
const PropertyListView = React.memo(({ properties, onViewDetails, handleContact, sortConfig, onSort }) => {
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

    return (
        <div className="biens-list-container">
            <table className="biens-table">
                <thead>
                    <tr>
                        <SortHeader colKey="datePublication" label="Date" />
                        <SortHeader colKey="typeBien" label="Type" />
                        <SortHeader colKey="commune" label="Commune" />
                        <th>Quartier</th>
                        <SortHeader colKey="rawPrice" label="Prix" align="right" />
                        <SortHeader colKey="status" label="Statut" align="center" />
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {properties.map(property => {
                        const isLocation = property.typeOffre?.toLowerCase().includes('location');
                        const isVente = property.typeOffre?.toLowerCase().includes('vente');
                        return (
                            <tr key={property.id} onClick={() => onViewDetails(property)} style={{ cursor: 'pointer' }}>
                                <td className="biens-td-date">
                                    {property.datePublication || '—'}
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
                                        </div>
                                    </div>
                                </td>
                                <td>{property.commune || '—'}</td>
                                <td className="biens-td-muted">{property.quartier || property.zone || '—'}</td>
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
                                        <button className="btn btn-whatsapp btn-sm" onClick={(e) => handleContact(property, e)} title="WhatsApp">
                                            <Phone size={14} />
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

const PropertyCard = ({ property, index, viewMode, onViewDetails }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { addToast } = useToast();
    const statusColor = property.disponible ? 'var(--success)' : 'var(--danger)';

    const handleContact = (e) => {
        e.stopPropagation();
        const num = property.telephoneBien || property.telephoneExpediteur || '';
        if (num) {
            let phone = num.replace(/\D/g, '');
            if (!phone.startsWith('225')) phone = '225' + phone;
            const message = encodeURIComponent(`Bonjour, je suis intéressé par: ${property.typeBien} à ${property.zone}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            addToast({ type: 'success', title: 'Contact', message: `WhatsApp vers ${num}` });
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    };

    return (
        <motion.div
            className="card property-card-v2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => onViewDetails(property)}
        >
            <div className="property-image-wrapper">
                <div
                    className="property-image"
                    style={{
                        position: 'relative', overflow: 'hidden',
                        background: `linear-gradient(135deg, ${property.id % 2 === 0 ? '#4f46e5' : '#ec4899'} 0%, ${property.id % 2 === 0 ? '#7c3aed' : '#f97316'} 100%)`
                    }}
                >
                    {property.imageUrl && (
                        <img
                            src={property.imageUrl}
                            alt={property.typeBien}
                            loading="lazy"
                            decoding="async"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    )}
                </div>
                <div className="property-badges">
                    <span className={`badge ${property.disponible ? 'badge-success' : 'badge-danger'}`}>
                        {property.status}
                    </span>
                    {property.typeOffre && <span className="badge-offer">{property.typeOffre}</span>}
                    {property.photoCount > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, padding: '2px 6px', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Images size={11} /> {property.photoCount}
                        </span>
                    )}
                    {property.photoCount > 0 && property.description && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius: 6, padding: '2px 7px', letterSpacing: '0.3px', boxShadow: '0 1px 4px rgba(217,119,6,0.5)' }}>
                            📸 Photo&nbsp;+&nbsp;Texte
                        </span>
                    )}
                </div>
            </div>

            <div className="property-content">
                <div className="property-header">
                    <h3 className="property-title">{property.typeBien}</h3>
                    <span className="property-price">{property.prixFormate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 8px', flexWrap: 'wrap' }}>
                    {property.refBien && (
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#fff', background: '#1B4299', borderRadius: 5, padding: '3px 9px', letterSpacing: '0.6px', flexShrink: 0 }}>
                            # {property.refBien}
                        </span>
                    )}
                    {property.groupeWhatsApp && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#15803d', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)', borderRadius: 5, padding: '2px 7px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={property.groupeWhatsApp}>
                            {property.groupeWhatsApp}
                        </span>
                    )}
                </div>

                <div className="property-location">
                    <MapPin size={16} />
                    <span>{property.zone} {property.commune ? `- ${property.commune}` : ''}</span>
                </div>

                <p className="property-description">{property.description || property.caracteristiques}</p>

                <div className="property-features">
                    {property.chambres > 0 && (
                        <motion.span className="feature-tag" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                            <Bed size={12} /> {property.chambres} ch.
                        </motion.span>
                    )}
                    {property.meuble && (
                        <motion.span className="feature-tag" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                            <Home size={12} /> Meublé
                        </motion.span>
                    )}
                    <motion.span className="feature-tag" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                        <Tag size={12} /> {property.publiePar}
                    </motion.span>
                </div>

                <motion.div
                    className="property-footer"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onViewDetails(property); }}>
                        <Eye size={16} /> Détails
                    </button>
                    <button className="btn btn-whatsapp btn-sm" onClick={handleContact}>
                        <Phone size={16} /> WhatsApp
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};

const Properties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
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

    useEffect(() => {
        loadProperties();

        const unsubscribe = apiService.subscribe('dataUpdate', ({ properties: p }) => {
            // pollData émet properties comme array directement
            const arr = Array.isArray(p) ? p : p?.data;
            if (arr) {
                setProperties(arr);
                geocodePropertiesAsync(arr);
            }
        });

        return () => unsubscribe();
    }, []);

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

    const loadProperties = async (forceRefresh = false) => {
        try {
            const response = await apiService.getProperties(forceRefresh);
            if (response.success) {
                setProperties(response.data);
                geocodePropertiesAsync(response.data);
                if (forceRefresh) {
                    addToast({
                        type: 'success',
                        title: '✅ Données actualisées',
                        message: `${response.data.length} bien${response.data.length !== 1 ? 's' : ''} chargé${response.data.length !== 1 ? 's' : ''}`
                    });
                }
            } else {
                // Handle API error response
                const errorMsg = response.error || 'Impossible de charger les propriétés';
                console.error('Properties API Error:', errorMsg);
                addToast({
                    type: 'error',
                    title: '⚠️ Erreur de chargement',
                    message: errorMsg === 'NetworkError'
                        ? 'Vérifiez votre connexion internet'
                        : errorMsg.includes('timeout')
                        ? 'Le serveur met trop de temps. Réessayez.'
                        : errorMsg
                });
            }
        } catch (error) {
            console.error('Error loading properties:', error);
            addToast({
                type: 'error',
                title: '❌ Erreur système',
                message: 'Une erreur inattendue s\'est produite. Veuillez réessayer.'
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadProperties(true);
    }, []);

    // Fonction de tri
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleTableContact = (property, e) => {
        const num = property.telephoneBien || property.telephoneExpediteur || '';
        if (num) {
            let phone = num.replace(/\D/g, '');
            if (!phone.startsWith('225')) phone = '225' + phone;
            const message = encodeURIComponent(`Bonjour, je suis intéressé par: ${property.typeBien} à ${property.zone}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            addToast({ type: 'success', title: 'Contact', message: `WhatsApp vers ${num}` });
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    };

    // Extraire les options uniques depuis les données réelles (mémorisé)
    const uniqueTypes = useMemo(() =>
        [...new Set(properties.map(p => p.typeBien).filter(Boolean))].sort(),
        [properties]
    );

    const uniqueCommunes = useMemo(() =>
        [...new Set(properties.map(p => p.commune).filter(Boolean))].sort(),
        [properties]
    );

    const uniqueQuartiers = useMemo(() =>
        [...new Set(properties.map(p => p.zone).filter(Boolean))].sort(),
        [properties]
    );

    const uniquePieces = useMemo(() =>
        [...new Set(properties.map(p => p.chambres).filter(p => p > 0))].sort((a, b) => a - b),
        [properties]
    );

    // Filtrage et Tri mémorisé
    const filteredProperties = useMemo(() => {
        let items = properties.filter(property => {
            const matchesSearch =
                (property.refBien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.commune || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.zone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.typeBien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.publiePar || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.groupeWhatsApp || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.caracteristiques || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filters.type === 'all' || property.typeBien === filters.type;

            const matchesStatus = filters.status === 'all' ||
                (filters.status === 'Disponible' && property.disponible) ||
                (filters.status === 'Occupé' && !property.disponible);

            const matchesMeuble = filters.meuble === 'all' ||
                (filters.meuble === 'oui' && property.meuble) ||
                (filters.meuble === 'non' && !property.meuble);

            const matchesPieces = filters.pieces === 'all' || property.chambres === parseInt(filters.pieces);

            const matchesCommune = filters.commune === 'all' || property.commune === filters.commune;

            const matchesQuartier = filters.quartier === 'all' || property.zone === filters.quartier;

            let matchesPrice = true;
            if (filters.minPrice && property.rawPrice < parseFloat(filters.minPrice)) matchesPrice = false;
            if (filters.maxPrice && property.rawPrice > parseFloat(filters.maxPrice)) matchesPrice = false;

            return matchesSearch && matchesType && matchesStatus && matchesMeuble && matchesPieces && matchesCommune && matchesQuartier && matchesPrice;
        });

        // Appliquer le tri
        if (sortConfig.key) {
            items.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Spécial pour les nombres
                if (sortConfig.key === 'rawPrice' || sortConfig.key === 'chambres') {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                }
                // Spécial pour les dates (format attendu: DD/MM/YYYY HH:MM)
                else if (sortConfig.key === 'datePublication') {
                    const parseDateStr = (d) => {
                        if (!d || typeof d !== 'string') return 0;
                        if (d.includes('/')) {
                            const cleanStr = d.replace(/le\s+/gi, '').trim();
                            const [datePart, timePart] = cleanStr.split(' ');
                            const [day, month, year] = datePart.split('/');

                            if (timePart) {
                                const [hour, minute] = timePart.split(':');
                                return new Date(year, month - 1, day, hour, minute || 0).getTime();
                            }
                            return new Date(year, month - 1, day).getTime();
                        }
                        return new Date(d).getTime() || 0;
                    };
                    aValue = parseDateStr(aValue);
                    bValue = parseDateStr(bValue);
                }
                else {
                    // String comparison
                    aValue = String(aValue || '').toLowerCase();
                    bValue = String(bValue || '').toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [properties, searchTerm, filters, sortConfig]);

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

    // Debounced search (optimisation critique)
    const debouncedSearch = useMemo(
        () => debounce((value) => setSearchTerm(value), 300),
        []
    );

    // Handlers optimisés avec useCallback
    const handleViewDetails = useCallback((property) => {
        setSelectedProperty(property);
        setModalOpen(true);
    }, []);

    const handleExport = useCallback(() => {
        // Préparer les données pour le fichier Excel
        const dataToExport = filteredProperties.map(p => ({
            'Type': p.typeBien,
            'Offre': p.typeOffre,
            'Zone': p.zone,
            'Commune': p.commune || '',
            'Prix': p.prixFormate, // Ou p.rawPrice si on veut des nombres bruts
            'Téléphone': p.telephone,
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
        setSearchTerm('');
        addToast({ type: 'info', title: 'Filtres réinitialisés', message: 'Tous les biens sont maintenant affichés' });
    }, [addToast]);

    if (loading) {
        return <PropertiesSkeleton viewMode={viewMode} />;
    }

    return (
        <motion.div
            className="properties-v2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >

            <div className="properties-header">
                <div className="header-left">
                    <h2>Biens Immobiliers</h2>
                    <span className="properties-count">{filteredProperties.length} bien(s) trouvé(s) sur {properties.length}</span>
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
                            defaultValue={searchTerm}
                            onChange={(e) => debouncedSearch(e.target.value)}
                            title="Tapez pour chercher dans tous les biens"
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); }}>
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
                />
            ) : (
                <div className={`properties-container ${viewMode}`}>
                    <AnimatePresence mode="wait">
                        {paginatedProperties.map((property, index) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                                index={index}
                                viewMode={viewMode}
                                onViewDetails={handleViewDetails}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {filteredProperties.length === 0 && !loading && (
                <EmptyState
                    icon={Building}
                    title="Aucun bien trouvé"
                    description={searchTerm || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== false)
                        ? "Essayez de modifier vos filtres ou votre recherche"
                        : "Aucun bien disponible pour le moment"}
                    actionLabel="Réinitialiser les filtres"
                    onAction={resetFilters}
                    size="medium"
                />
            )}

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
            />
        </motion.div>
    );
};

export default Properties;
