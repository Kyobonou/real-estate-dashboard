import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Tag, Grid, List, Search, Filter, X, Phone, Eye,
    Download, Share2, Image as ImageIcon, User, Calendar, MessageSquare, ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import apiService from '../../services/api';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import Skeleton from '../../components/Skeleton';
import '../Properties.css'; // Reusing Properties styles for consistency

// Skeleton specific to images page (reusing property layout)
const ImagesSkeleton = ({ viewMode }) => (
    <div className="properties-v2">
        <div className="properties-header">
            <div className="header-left">
                <Skeleton width="200px" height="32px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="250px" height="20px" />
            </div>
            <Skeleton width="140px" height="40px" />
        </div>
        <div className="properties-toolbar">
            <Skeleton width="100%" height="50px" type="rect" style={{ borderRadius: '12px' }} />
        </div>
        <div className={`properties-container ${viewMode}`}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="property-card-v2" style={{ pointerEvents: 'none', height: '350px' }}>
                    <Skeleton type="rect" height="200px" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }} />
                    <div className="property-content" style={{ padding: '1.5rem' }}>
                        <Skeleton width="60%" height="24px" style={{ marginBottom: '0.5rem' }} />
                        <Skeleton width="40%" height="16px" style={{ marginBottom: '1rem' }} />
                        <Skeleton width="90%" height="14px" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ImageDetailsModal = ({ image, isOpen, onClose }) => {
    const { addToast } = useToast();

    if (!image) return null;

    const handleShare = () => {
        const text = `Image de : ${image.expediteur}\nDate : ${image.horodatage}\nLien : ${image.lien_image}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            addToast({ type: 'info', title: 'Copié !', message: 'Lien copié dans le presse-papier' });
        }
    };

    const handleWhatsApp = () => {
        if (image.telephone) {
            const phone = image.telephone.replace(/\D/g, '');
            const message = encodeURIComponent(`Bonjour, concernant l'image envoyée le ${image.horodatage}...`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Pas de numéro de téléphone disponible' });
        }
    };

    const handleOpenImage = () => {
        window.open(image.lien_image, '_blank');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Détails de l'image" size="lg">
            <div className="property-details-modal">
                <div className="property-details-header">
                    <div className="property-image-large" style={{ height: '300px', background: '#000' }}>
                        <img
                            src={image.lien_image}
                            alt="Full view"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>

                    <div className="property-quick-info">
                        <div className="price-section">
                            <span className="price-label">Expéditeur</span>
                            <h3 className="price-value" style={{ fontSize: '1.2rem' }}>{image.expediteur || 'Inconnu'}</h3>
                        </div>
                        <div className="status-section">
                            <span className="badge badge-offer">
                                {image.groupe ? 'Groupe' : 'Direct'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="property-details-body">
                    {image.message && (
                        <div className="details-section">
                            <h4>Message associé</h4>
                            <p className="property-full-description">{image.message}</p>
                        </div>
                    )}

                    <div className="details-section">
                        <h4>Informations</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <Calendar size={18} />
                                <div>
                                    <span className="info-label">Date</span>
                                    <span className="info-value">{image.horodatage}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Phone size={18} />
                                <div>
                                    <span className="info-label">Téléphone</span>
                                    <span className="info-value">{image.telephone || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Tag size={18} />
                                <div>
                                    <span className="info-label">Groupe</span>
                                    <span className="info-value">{image.groupe || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={handleShare}>
                            <Share2 size={18} />
                            Copier Lien
                        </button>
                        <button className="btn btn-secondary" onClick={handleOpenImage}>
                            <ExternalLink size={18} />
                            Voir l'original
                        </button>
                        {image.telephone && (
                            <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
                                <Phone size={18} />
                                Contacter
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const ImageCard = ({ image, index, viewMode, onViewDetails }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Fallback for missing phone
    const hasPhone = !!image.telephone;

    if (viewMode === 'list') {
        return (
            <motion.div
                className="property-list-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onViewDetails(image)}
            >
                <div className="property-image-wrapper">
                    <img src={image.lien_image} alt="Preview" className="property-image" loading="lazy" />
                </div>
                <div className="property-list-info">
                    <div className="property-list-header">
                        <h3>{image.expediteur || 'Expéditeur inconnu'}</h3>
                    </div>
                    <div className="property-list-details">
                        <span className="property-zone">
                            <Calendar size={14} /> {image.horodatage}
                        </span>
                        {image.groupe && (
                            <span className="property-status" style={{ color: 'var(--text-secondary)' }}>
                                • {image.groupe}
                            </span>
                        )}
                    </div>
                    <div className="property-features-inline">
                        <span className="feature-badge">{image.telephone || 'Sans numéro'}</span>
                    </div>
                </div>
                <div className="property-list-actions">
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onViewDetails(image); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Eye size={16} /> Détails
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="card property-card-v2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => onViewDetails(image)}
        >
            <div className="property-image-wrapper" style={{ height: '220px' }}>
                <img
                    src={image.lien_image}
                    alt="Preview"
                    className="property-image"
                    loading="lazy"
                />
                <div className="property-badges">
                    <span className={`badge ${image.groupe ? 'badge-offer' : 'badge-success'}`}>
                        {image.groupe ? 'Groupe' : 'Direct'}
                    </span>
                </div>
            </div>

            <div className="property-content">
                <div className="property-header">
                    <h3 className="property-title">{image.expediteur || 'Inconnu'}</h3>
                </div>

                <div className="property-location">
                    <Calendar size={16} />
                    <span>{image.horodatage}</span>
                </div>

                {image.message ? (
                    <p className="property-description line-clamp-2" title={image.message}>
                        {image.message.substring(0, 100) + (image.message.length > 100 ? '...' : '')}
                    </p>
                ) : (
                    <p className="property-description" style={{ fontStyle: 'italic', opacity: 0.5 }}>Aucun message</p>
                )}

                <div className="property-features">
                    {hasPhone && (
                        <span className="feature-tag">
                            <Phone size={12} /> {image.telephone}
                        </span>
                    )}
                </div>

                <motion.div
                    className="property-footer"
                    initial={{ opacity: 1 }} // Always show on mobile/desktop for consistency
                    animate={{ opacity: 1 }}
                >
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onViewDetails(image); }}>
                        <Eye size={16} /> Détails
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => {
                        e.stopPropagation();
                        window.open(image.lien_image, '_blank');
                    }}>
                        <ExternalLink size={16} /> Ouvrir
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};

const ImagesPage = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const { addToast } = useToast();

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        try {
            const response = await apiService.getImages();
            if (response.success) {
                setImages(response.data);
            }
        } catch (error) {
            console.error('Error loading images:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les images' });
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredImages = useMemo(() => {
        return images.filter(img => {
            const term = searchTerm.toLowerCase();
            return (
                (img.expediteur || '').toLowerCase().includes(term) ||
                (img.message || '').toLowerCase().includes(term) ||
                (img.groupe || '').toLowerCase().includes(term) ||
                (img.telephone || '').includes(term)
            );
        });
    }, [images, searchTerm]);

    // Pagination
    const paginatedImages = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredImages.slice(start, end);
    }, [filteredImages, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleViewDetails = (image) => {
        setSelectedImage(image);
        setModalOpen(true);
    };

    const handleExport = () => {
        const dataToExport = filteredImages.map(img => ({
            'Expéditeur': img.expediteur,
            'Téléphone': img.telephone,
            'Groupe': img.groupe,
            'Date': img.horodatage,
            'Message': img.message,
            'Lien Image': img.lien_image
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Images WhatsApp");
        XLSX.writeFile(workbook, `Images_WhatsApp_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast({ type: 'success', title: 'Export réussi', message: `${filteredImages.length} images exportées` });
    };

    if (loading) return <ImagesSkeleton viewMode={viewMode} />;

    return (
        <motion.div
            className="properties-v2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="properties-header">
                <div className="header-left">
                    <h2>Images WhatsApp</h2>
                    <span className="properties-count">{filteredImages.length} image(s) trouvée(s)</span>
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
                    <div className="search-input">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par expéditeur, message, groupe..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="view-toggle">
                    <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                        <Grid size={18} />
                    </button>
                    <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                        <List size={18} />
                    </button>
                </div>
            </div>

            <div className={`properties-container ${viewMode}`}>
                <AnimatePresence mode="wait">
                    {paginatedImages.map((img, index) => (
                        <ImageCard
                            key={img.id || index}
                            image={img}
                            index={index}
                            viewMode={viewMode}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {filteredImages.length === 0 && (
                <div className="empty-state">
                    <ImageIcon size={48} />
                    <p>Aucune image trouvée</p>
                    <button className="btn btn-primary" onClick={() => setSearchTerm('')}>
                        Effacer la recherche
                    </button>
                </div>
            )}

            {filteredImages.length > ITEMS_PER_PAGE && (
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
                        style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                        Précédent
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Page {currentPage} / {Math.ceil(filteredImages.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredImages.length / ITEMS_PER_PAGE), prev + 1))}
                        disabled={currentPage >= Math.ceil(filteredImages.length / ITEMS_PER_PAGE)}
                        style={{ opacity: currentPage >= Math.ceil(filteredImages.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}
                    >
                        Suivant
                    </button>
                </div>
            )}

            <ImageDetailsModal
                image={selectedImage}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </motion.div>
    );
};

export default ImagesPage;
