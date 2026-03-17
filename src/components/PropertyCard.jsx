import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bed, Bath, Square, Home, Building, Calendar, Phone } from 'lucide-react';
import { extractBestPhone } from '../utils/phoneUtils';
import './PropertyCard.css';

/**
 * PropertyCard — Shared card component used in PublicHome & PublicProperties.
 * Eliminates code duplication and ensures design consistency.
 *
 * @param {object}   property        – Property data object
 * @param {function} onCardClick     – Called when card body is clicked
 * @param {number}   index           – Used for animation stagger & placeholder gradient
 * @param {boolean}  showDescription – Show short description (default: true)
 * @param {boolean}  compact         – Reduced padding / height variant
 */
const PLACEHOLDER_GRADIENTS = [
    'linear-gradient(135deg, #1B4299, #4f46e5)',
    'linear-gradient(135deg, #0e7490, #0891b2)',
    'linear-gradient(135deg, #7c3aed, #a855f7)',
];

const PropertyCard = memo(({
    property,
    onCardClick,
    index = 0,
    showDescription = true,
    compact = false,
}) => {
    const phone = extractBestPhone(property) || '22500000000';
    const gradientBg = PLACEHOLDER_GRADIENTS[index % 3];

    const handleWhatsApp = (e) => {
        e.stopPropagation();
        const refText = property.refBien ? ` (Réf: ${property.refBien})` : '';
        const message = encodeURIComponent(
            `Bonjour, je suis intéressé(e) par ce bien${refText} : ${property.typeBien} à ${property.zone}. Pouvons-nous en discuter ?`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const handleCardClick = () => {
        if (onCardClick) onCardClick(property);
    };

    const isLocation = property.typeOffre === 'Location';

    return (
        <motion.article
            className={`pc-card${compact ? ' pc-card--compact' : ''}`}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            aria-label={`${property.typeBien} à ${property.commune || property.zone} — ${property.prixFormate}`}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.35, delay: (index % 12) * 0.03 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
        >
            {/* ── Image ── */}
            <div className="pc-image-wrap">
                {property.imageUrl ? (
                    <img
                        src={property.imageUrl}
                        alt={`${property.typeBien} à ${property.commune}`}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="pc-img-placeholder" style={{ background: gradientBg }}>
                        <Building size={32} />
                        <span>{property.typeBien}</span>
                    </div>
                )}

                {/* Badges */}
                <div className="pc-badges">
                    <span className={`pc-badge-offer${isLocation ? ' is-location' : ''}`}>
                        {property.typeOffre || 'À découvrir'}
                    </span>
                    <div className="pc-badges-right">
                        {property.disponible !== false && (
                            <span className="pc-badge-dispo">✓ Dispo</span>
                        )}
                        {property.refBien && (
                            <span className="pc-badge-ref">#{property.refBien}</span>
                        )}
                    </div>
                </div>

                <div className="pc-img-gradient" />
            </div>

            {/* ── Content ── */}
            <div className="pc-content">
                {/* Title + Price */}
                <div className="pc-main-info">
                    <h3 className="pc-title">{property.typeBien}</h3>
                    <p className="pc-price">{property.prixFormate}</p>
                </div>

                {/* Location */}
                <p className="pc-location">
                    <MapPin size={12} />
                    <span>
                        {property.commune || property.zone}
                        {property.quartier && ` · ${property.quartier}`}
                    </span>
                </p>

                {/* Short description */}
                {showDescription && property.description && (
                    <p className="pc-description">
                        {property.description.slice(0, 80)}
                        {property.description.length > 80 ? '…' : ''}
                    </p>
                )}

                {/* Features */}
                <div className="pc-features">
                    {property.chambres > 0 && (
                        <span className="pc-feature"><Bed size={11} /> {property.chambres} ch.</span>
                    )}
                    {property.salles_eau > 0 && (
                        <span className="pc-feature"><Bath size={11} /> {property.salles_eau} sdb.</span>
                    )}
                    {property.superficie && (
                        <span className="pc-feature"><Square size={11} /> {property.superficie} m²</span>
                    )}
                    {property.meuble && (
                        <span className="pc-feature"><Home size={11} /> Meublé</span>
                    )}
                </div>

                {/* Footer */}
                <div className="pc-footer">
                    {property.datePublication && (
                        <span className="pc-date">
                            <Calendar size={11} />
                            {property.datePublication}
                        </span>
                    )}
                    <div className="pc-actions">
                        <button
                            className="pc-btn-details"
                            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                            aria-label="Voir les détails de ce bien"
                        >
                            Voir détails
                        </button>
                        <button
                            className="pc-btn-wa"
                            title="Contacter sur WhatsApp"
                            aria-label="Contacter sur WhatsApp"
                            onClick={handleWhatsApp}
                        >
                            <Phone size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.article>
    );
});

PropertyCard.displayName = 'PropertyCard';
export default PropertyCard;
