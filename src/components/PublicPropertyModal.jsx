import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building, Bed, Bath, Square, Home, Phone, Navigation, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { extractBestPhone } from '../utils/phoneUtils';
import apiService from '../services/api';
import './PublicPropertyModal.css';

/**
 * PublicPropertyModal — Amélioré v2.0
 * Nouvelles fonctionnalités :
 *  - Navigation clavier (Escape, ArrowLeft, ArrowRight)
 *  - Swipe tactile (touch events)
 *  - Spinner de chargement des images
 *  - Flèches prev/next sur l'image principale
 *  - Accessibilité (aria-modal, focus trap basique)
 */
const PublicPropertyModal = ({ property, isOpen, onClose }) => {
    const [images, setImages] = useState([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [touchStartX, setTouchStartX] = useState(null);

    // ──────────────────────────────────────────────
    // Load images when modal opens
    // ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || !property) return;

        document.body.style.overflow = 'hidden';
        setActiveImgIdx(0);
        setImageLoaded(false);

        if (property.publicationId) {
            setLoadingImages(true);
            apiService
                .getImagesForPublication(property.publicationId)
                .then((imgs) => {
                    const mapped = (imgs || []).map((img) => img.lien_image);
                    setImages(mapped);
                })
                .catch(() => setImages([]))
                .finally(() => setLoadingImages(false));
        } else {
            setImages([]);
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, property]);

    const displayImages =
        images.length > 0 ? images : property?.imageUrl ? [property.imageUrl] : [];
    const totalImages = displayImages.length;

    // ──────────────────────────────────────────────
    // Navigation helpers
    // ──────────────────────────────────────────────
    const goNext = useCallback(() => {
        setActiveImgIdx((prev) => (prev + 1) % totalImages);
        setImageLoaded(false);
    }, [totalImages]);

    const goPrev = useCallback(() => {
        setActiveImgIdx((prev) => (prev - 1 + totalImages) % totalImages);
        setImageLoaded(false);
    }, [totalImages]);

    const goTo = (idx) => {
        setActiveImgIdx(idx);
        setImageLoaded(false);
    };

    // ──────────────────────────────────────────────
    // Keyboard navigation
    // ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && totalImages > 1) goNext();
            if (e.key === 'ArrowLeft' && totalImages > 1) goPrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, goNext, goPrev, totalImages]);

    // ──────────────────────────────────────────────
    // Touch / Swipe support
    // ──────────────────────────────────────────────
    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e) => {
        if (touchStartX === null || totalImages <= 1) return;
        const delta = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) {
            delta > 0 ? goNext() : goPrev();
        }
        setTouchStartX(null);
    };

    // ──────────────────────────────────────────────
    // Actions
    // ──────────────────────────────────────────────
    const handleWhatsApp = () => {
        if (!property) return;
        const phone = extractBestPhone(property) || '22500000000';
        const refText = property.refBien ? ` (Réf: ${property.refBien})` : '';
        const message = encodeURIComponent(
            `Bonjour, je suis intéressé(e) par ce bien${refText} : ${property.typeBien} à ${property.zone} (${property.prixFormate}). Pouvons-nous en discuter ?`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const handleNavigate = () => {
        if (!property) return;
        const q =
            property.coordinates?.lat && property.coordinates?.lng
                ? `${property.coordinates.lat},${property.coordinates.lng}`
                : [property.quartier, property.commune, 'Abidjan', "Côte d'Ivoire"]
                      .filter(Boolean)
                      .join(' ');
        window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
            '_blank'
        );
    };

    if (!property) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ppm-overlay"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Détails : ${property.typeBien}`}
                >
                    <motion.div
                        className="ppm-content"
                        initial={{ opacity: 0, scale: 0.92, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 40 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            className="ppm-close"
                            onClick={onClose}
                            aria-label="Fermer"
                        >
                            <X size={22} />
                        </button>

                        <div className="ppm-layout">
                            {/* ── Gallery ── */}
                            <div
                                className="ppm-gallery"
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                            >
                                {/* Main image */}
                                <div className="ppm-main-img">
                                    {loadingImages && (
                                        <div className="ppm-img-spinner">
                                            <Loader2 size={36} className="ppm-spinner-icon" />
                                        </div>
                                    )}

                                    {!loadingImages && displayImages.length > 0 ? (
                                        <>
                                            {/* Loading skeleton until image ready */}
                                            {!imageLoaded && (
                                                <div className="ppm-img-loading-bar" />
                                            )}
                                            <motion.img
                                                key={displayImages[activeImgIdx]}
                                                src={displayImages[activeImgIdx]}
                                                alt={property.typeBien}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: imageLoaded ? 1 : 0 }}
                                                transition={{ duration: 0.3 }}
                                                onLoad={() => setImageLoaded(true)}
                                            />
                                        </>
                                    ) : !loadingImages && (
                                        <div className="ppm-img-placeholder">
                                            <Building size={64} />
                                            <span>Aucune image disponible</span>
                                        </div>
                                    )}

                                    {/* Offer badge */}
                                    <span className="ppm-badge">{property.typeOffre}</span>

                                    {/* Image counter */}
                                    {totalImages > 1 && (
                                        <div className="ppm-counter">
                                            {activeImgIdx + 1} / {totalImages}
                                        </div>
                                    )}

                                    {/* Prev / Next arrows */}
                                    {totalImages > 1 && (
                                        <>
                                            <button
                                                className="ppm-arrow ppm-arrow--prev"
                                                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                                aria-label="Image précédente"
                                            >
                                                <ChevronLeft size={22} />
                                            </button>
                                            <button
                                                className="ppm-arrow ppm-arrow--next"
                                                onClick={(e) => { e.stopPropagation(); goNext(); }}
                                                aria-label="Image suivante"
                                            >
                                                <ChevronRight size={22} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Thumbnails */}
                                {totalImages > 1 && (
                                    <div className="ppm-thumbnails">
                                        {displayImages.map((url, idx) => (
                                            <button
                                                key={idx}
                                                className={`ppm-thumb${idx === activeImgIdx ? ' active' : ''}`}
                                                onClick={() => goTo(idx)}
                                                aria-label={`Voir image ${idx + 1}`}
                                                aria-pressed={idx === activeImgIdx}
                                            >
                                                <img src={url} alt={`Vue ${idx + 1}`} loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Details ── */}
                            <div className="ppm-details">
                                <div className="ppm-details-header">
                                    <div className="ppm-ref">Réf: {property.refBien || 'N/A'}</div>
                                    <h2>{property.typeBien}</h2>
                                    <div className="ppm-price">{property.prixFormate}</div>
                                    <div className="ppm-location">
                                        <MapPin size={16} />
                                        <span>
                                            {property.locationLabel ||
                                                `${property.zone} ${property.commune}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Features grid */}
                                <div className="ppm-features">
                                    {property.chambres > 0 && (
                                        <div className="ppm-feat">
                                            <div className="ppm-feat-icon"><Bed size={18} /></div>
                                            <div>
                                                <span className="ppm-feat-val">{property.chambres}</span>
                                                <span className="ppm-feat-lab">Chambres</span>
                                            </div>
                                        </div>
                                    )}
                                    {property.salles_eau > 0 && (
                                        <div className="ppm-feat">
                                            <div className="ppm-feat-icon"><Bath size={18} /></div>
                                            <div>
                                                <span className="ppm-feat-val">{property.salles_eau}</span>
                                                <span className="ppm-feat-lab">Salles d'eau</span>
                                            </div>
                                        </div>
                                    )}
                                    {property.superficie && (
                                        <div className="ppm-feat">
                                            <div className="ppm-feat-icon"><Square size={18} /></div>
                                            <div>
                                                <span className="ppm-feat-val">{property.superficie}</span>
                                                <span className="ppm-feat-lab">m²</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="ppm-feat">
                                        <div className="ppm-feat-icon"><Home size={18} /></div>
                                        <div>
                                            <span className="ppm-feat-val">
                                                {property.meuble ? 'Oui' : 'Non'}
                                            </span>
                                            <span className="ppm-feat-lab">Meublé</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {(property.description || property.caracteristiques) && (
                                    <div className="ppm-desc-section">
                                        <h4>Description du bien</h4>
                                        <p>
                                            {property.description ||
                                                property.caracteristiques}
                                        </p>
                                    </div>
                                )}

                                {/* CTA buttons */}
                                <div className="ppm-actions">
                                    <button className="ppm-btn-wa" onClick={handleWhatsApp}>
                                        <Phone size={18} />
                                        Discuter sur WhatsApp
                                    </button>
                                    <button className="ppm-btn-map" onClick={handleNavigate}>
                                        <Navigation size={18} />
                                        Localiser le bien
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PublicPropertyModal;
