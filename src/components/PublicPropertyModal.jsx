import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Home, Building, Bed, Bath, Square, Phone, Navigation } from 'lucide-react';
import { extractBestPhone } from '../utils/phoneUtils';
import apiService from '../services/api';
import './PublicPropertyModal.css';

const PublicPropertyModal = ({ property, isOpen, onClose }) => {
    const [images, setImages] = useState([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [activeImgIdx, setActiveImgIdx] = useState(0);

    useEffect(() => {
        if (!isOpen || !property) return;

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        if (property.publicationId) {
            setLoadingImages(true);
            apiService.getImagesForPublication(property.publicationId)
                .then(imgs => {
                    const mapped = (imgs || []).map(img => img.lien_image);
                    setImages(mapped);
                })
                .finally(() => {
                    setLoadingImages(false);
                    setActiveImgIdx(0);
                });
        } else {
            setImages([]);
            setActiveImgIdx(0);
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, property]);

    if (!isOpen || !property) return null;

    const displayImages = images.length > 0 ? images : (property.imageUrl ? [property.imageUrl] : []);
    const phone = extractBestPhone(property) || '22500000000';

    const handleWhatsApp = () => {
        const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par ce bien : ${property.typeBien} à ${property.zone} (${property.prixFormate}). Pouvons-nous en discuter ?`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const handleNavigate = () => {
        const q = (property.coordinates?.lat && property.coordinates?.lng)
            ? `${property.coordinates.lat},${property.coordinates.lng}`
            : [property.quartier, property.commune, 'Abidjan', 'Côte d\'Ivoire'].filter(Boolean).join(' ');
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
    };

    return (
        <AnimatePresence>
            <div className="public-modal-overlay" onClick={onClose}>
                <motion.div
                    className="public-modal-content"
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="public-modal-close" onClick={onClose} aria-label="Fermer">
                        <X size={24} />
                    </button>

                    <div className="public-modal-layout">
                        {/* Image Gallery */}
                        <div className="public-modal-gallery">
                            <div className="main-image">
                                {displayImages.length > 0 ? (
                                    <motion.img
                                        key={displayImages[activeImgIdx]}
                                        src={displayImages[activeImgIdx]}
                                        alt={property.typeBien}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                ) : (
                                    <div className="placeholder-img">
                                        <Building size={64} />
                                        <span>Pas d'image disponible</span>
                                    </div>
                                )}
                                <span className="modal-badge-float">{property.typeOffre}</span>
                                {displayImages.length > 1 && (
                                    <div className="image-counter">
                                        {activeImgIdx + 1} / {displayImages.length}
                                    </div>
                                )}
                            </div>

                            {displayImages.length > 1 && (
                                <div className="thumbnails">
                                    {displayImages.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className={`thumbnail ${idx === activeImgIdx ? 'active' : ''}`}
                                            onClick={() => setActiveImgIdx(idx)}
                                        >
                                            <img src={url} alt={`Vue ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="public-modal-details">
                            <div className="details-header">
                                <div className="ref-tag">Réf: {property.refBien || 'N/A'}</div>
                                <h2>{property.typeBien}</h2>
                                <div className="price-tag">{property.prixFormate}</div>
                                <div className="location">
                                    <MapPin size={18} />
                                    <span>{property.locationLabel || `${property.zone} ${property.commune}`}</span>
                                </div>
                            </div>

                            <div className="features-grid">
                                {property.chambres > 0 && (
                                    <div className="feature-item">
                                        <Bed size={20} />
                                        <div>
                                            <span className="feat-val">{property.chambres}</span>
                                            <span className="feat-lab">Chambres</span>
                                        </div>
                                    </div>
                                )}
                                {property.salles_eau > 0 && (
                                    <div className="feature-item">
                                        <Bath size={20} />
                                        <div>
                                            <span className="feat-val">{property.salles_eau}</span>
                                            <span className="feat-lab">Salles d'eau</span>
                                        </div>
                                    </div>
                                )}
                                {property.superficie && (
                                    <div className="feature-item">
                                        <Square size={20} />
                                        <div>
                                            <span className="feat-val">{property.superficie}</span>
                                            <span className="feat-lab">m²</span>
                                        </div>
                                    </div>
                                )}
                                <div className="feature-item">
                                    <Home size={20} />
                                    <div>
                                        <span className="feat-val">{property.meuble ? 'Oui' : 'Non'}</span>
                                        <span className="feat-lab">Meublé</span>
                                    </div>
                                </div>
                            </div>

                            <div className="description-section">
                                <h4>Description du bien</h4>
                                <div className="description-content">
                                    <p>{property.description || property.caracteristiques || "Aucune description détaillée disponible."}</p>
                                </div>
                            </div>

                            <div className="action-buttons">
                                <button className="btn-whatsapp-full" onClick={handleWhatsApp}>
                                    <Phone size={20} /> Discuter sur WhatsApp
                                </button>
                                <button className="btn-map-full" onClick={handleNavigate}>
                                    <Navigation size={20} /> Localiser le bien
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PublicPropertyModal;
