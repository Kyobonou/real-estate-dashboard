import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Building, Phone, ArrowRight, Bed, Bath, Square, Home } from 'lucide-react';
import apiService from '../services/api';
import { extractBestPhone } from '../utils/phoneUtils';
import PublicPropertyModal from '../components/PublicPropertyModal';
import './PublicHome.css';

const PublicHome = () => {
    const [featuredProperties, setFeaturedProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/proprietes?search=${encodeURIComponent(searchQuery)}`);
        } else {
            navigate('/proprietes');
        }
    };

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await apiService.getProperties(false);
                if (response.success) {
                    // Keep only the first 3 properties for the 'featured' section
                    setFeaturedProperties(response.data.slice(0, 3));
                }
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    return (
        <motion.div
            className="public-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        Trouvez votre bien <span className="text-gradient">d'exception</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    >
                        Explorez notre sélection exclusive de villas, appartements et terrains de haut standing.
                    </motion.p>

                    <motion.form
                        className="search-bar"
                        onSubmit={handleSearch}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 100 }}
                    >
                        <div className="search-input-wrapper">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Ville, quartier ou type de bien..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary">Rechercher</button>
                    </motion.form>
                </div>
            </section>

            {/* Featured Properties Section (Placeholder for now) */}
            <section className="featured-properties">
                <div className="section-header">
                    <h2>Nos <span className="text-gradient">Biens</span> à la Une</h2>
                    <p>Découvrez nos opportunités immobilières les plus prestigieuses</p>
                </div>

                <div className="properties-grid">
                    {loading ? (
                        [1, 2, 3].map((item) => (
                            <div key={item} className="property-card-skeleton">
                                <div className="skeleton-image"></div>
                                <div className="skeleton-content">
                                    <div className="skeleton-title"></div>
                                    <div className="skeleton-price"></div>
                                    <div className="skeleton-details"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        featuredProperties.map((property, index) => (
                            <motion.div
                                key={property.id}
                                className="public-property-card"
                                onClick={() => setSelectedProperty(property)}
                                style={{ cursor: 'pointer' }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            >
                                <div className="property-image-wrapper">
                                    {property.imageUrl ? (
                                        <img
                                            src={property.imageUrl}
                                            alt={property.typeBien}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div className="property-image-placeholder" style={{
                                            background: `linear-gradient(135deg, ${index % 3 === 0 ? '#1B4299, #4f46e5' : index % 3 === 1 ? '#0e7490, #0891b2' : '#7c3aed, #a855f7'})`,
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.8)', gap: '10px'
                                        }}>
                                            <Building size={48} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>{property.typeBien}</span>
                                        </div>
                                    )}
                                    <div className="property-badges-overlay">
                                        <span className="badge-offer">{property.typeOffre || "À découvrir"}</span>
                                        {property.refBien && <span className="badge-ref">#{property.refBien}</span>}
                                    </div>
                                    <div className="image-gradient-overlay"></div>
                                </div>
                                <div className="property-content">
                                    <div className="property-main-info">
                                        <h3 className="property-title">{property.typeBien}</h3>
                                        <div className="property-price">{property.prixFormate}</div>
                                    </div>

                                    <div className="property-location">
                                        <MapPin size={14} />
                                        <span>{property.zone} {property.commune && `• ${property.commune}`}</span>
                                    </div>

                                    <div className="property-features">
                                        {property.chambres > 0 && (
                                            <span className="feature-item"><Bed size={14} /> {property.chambres} ch.</span>
                                        )}
                                        {property.salles_eau > 0 && (
                                            <span className="feature-item"><Bath size={14} /> {property.salles_eau} sde.</span>
                                        )}
                                        {property.superficie && (
                                            <span className="feature-item"><Square size={14} /> {property.superficie} m²</span>
                                        )}
                                        {property.meuble && (
                                            <span className="feature-item"><Home size={14} /> Meublé</span>
                                        )}
                                    </div>

                                    <div className="property-actions">
                                        <button
                                            className="btn-details"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProperty(property);
                                            }}
                                        >
                                            Découvrir
                                        </button>
                                        <button
                                            className="btn-whatsapp-icon"
                                            title="Contacter sur WhatsApp"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const phone = extractBestPhone(property) || '22500000000';
                                                const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par ce bien (Réf: ${property.refBien}) : ${property.typeBien} à ${property.zone}. Pouvons-nous en discuter ?`);
                                                window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                                            }}
                                        >
                                            <Phone size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                <div className="view-all-container">
                    <button
                        className="btn-view-all"
                        onClick={() => navigate('/proprietes')}
                    >
                        Explorer tout le catalogue <ArrowRight size={20} />
                    </button>
                </div>
            </section>

            {/* Services Section */}
            <section className="services">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    Pourquoi nous choisir ?
                </motion.h2>
                <div className="services-grid">
                    <motion.div
                        className="service-card"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ y: -10 }}
                    >
                        <div className="service-icon"><Building size={32} /></div>
                        <h3>Expertise Locale</h3>
                        <p>Une connaissance parfaite du marché immobilier pour vous conseiller au mieux.</p>
                    </motion.div>
                    <motion.div
                        className="service-card"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ y: -10 }}
                    >
                        <div className="service-icon"><Search size={32} /></div>
                        <h3>Recherche Personnalisée</h3>
                        <p>Des biens qui correspond exactement à vos critères et à votre budget.</p>
                    </motion.div>
                    <motion.div
                        className="service-card"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ y: -10 }}
                    >
                        <div className="service-icon"><Phone size={32} /></div>
                        <h3>Accompagnement de A à Z</h3>
                        <p>Un suivi complet de la première visite jusqu'à la signature finale.</p>
                    </motion.div>
                </div>
            </section>

            <PublicPropertyModal
                property={selectedProperty}
                isOpen={!!selectedProperty}
                onClose={() => setSelectedProperty(null)}
            />
        </motion.div>
    );
};

export default PublicHome;
