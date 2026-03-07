import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Building, Filter, Map as MapIcon, Grid, Bed, Bath, Square, Home, Phone } from 'lucide-react';
import apiService from '../services/api';
import geocodingService from '../services/geocodingService';
import { extractBestPhone } from '../utils/phoneUtils';
import PropertyMap from '../components/PropertyMap';
import PublicPropertyModal from '../components/PublicPropertyModal';
import './PublicProperties.css';

const PublicProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
    const [geocodedProperties, setGeocodedProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [filters, setFilters] = useState({
        type: 'all',
        commune: 'all',
        offer: 'all'
    });

    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const initialSearch = queryParams.get('search');
        if (initialSearch) {
            setSearchTerm(initialSearch);
        }
    }, [location]);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await apiService.getProperties(false);
                if (response.success) {
                    setProperties(response.data);
                    // Geocode for the map
                    geocodingService.geocodeProperties(response.data).then(geocoded => {
                        setGeocodedProperties(geocoded);
                    });
                }
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    const uniqueTypes = useMemo(() =>
        [...new Set(properties.map(p => p.typeBien).filter(Boolean))].sort(),
        [properties]);

    const uniqueCommunes = useMemo(() =>
        [...new Set(properties.map(p => p.commune).filter(Boolean))].sort(),
        [properties]);

    const uniqueOffers = useMemo(() =>
        [...new Set(properties.map(p => p.typeOffre).filter(Boolean))].sort(),
        [properties]);

    // Optimisation : Normaliser une seule fois
    const processedData = useMemo(() => {
        return properties.map(p => ({
            ...p,
            _norm_blob: `${p.zone} ${p.commune} ${p.typeBien} ${p.description || ''} ${p.refBien || ''}`.toLowerCase()
        }));
    }, [properties]);

    const filteredProperties = useMemo(() => {
        const s = searchTerm.toLowerCase();
        return processedData.filter(property => {
            const matchesSearch = !searchTerm || property._norm_blob.includes(s);

            const matchesType = filters.type === 'all' || property.typeBien === filters.type;
            const matchesCommune = filters.commune === 'all' || property.commune === filters.commune;
            const matchesOffer = filters.offer === 'all' || property.typeOffre === filters.offer;

            return matchesSearch && matchesType && matchesCommune && matchesOffer;
        });
    }, [processedData, searchTerm, filters]);

    const [visibleItems, setVisibleItems] = useState(48);


    const handleLoadMore = () => {
        setVisibleItems(prev => prev + 48);
    };

    const displayGeocodedProperties = useMemo(() => {
        const filteredIds = new Set(filteredProperties.map(p => p.id));
        return geocodedProperties.filter(p => filteredIds.has(p.id));
    }, [filteredProperties, geocodedProperties]);

    return (
        <motion.div
            className="public-properties"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <section className="properties-header">
                <div className="properties-header-content">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        Nos <span className="text-gradient">Propriétés</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Trouvez le bien idéal parmi notre vaste catalogue.
                    </motion.p>
                </div>
            </section>

            <section className="properties-main">
                <div className="properties-filters">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher (ex: Cocody, Villa...)"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setVisibleItems(48); // Reset when searching
                            }}
                        />
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.offer}
                            onChange={(e) => {
                                setFilters({ ...filters, offer: e.target.value });
                                setVisibleItems(48);
                            }}
                        >
                            <option value="all">Toutes les offres</option>
                            {uniqueOffers.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => {
                                setFilters({ ...filters, type: e.target.value });
                                setVisibleItems(48);
                            }}
                        >
                            <option value="all">Tous les types</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <select
                            value={filters.commune}
                            onChange={(e) => {
                                setFilters({ ...filters, commune: e.target.value });
                                setVisibleItems(48);
                            }}
                        >
                            <option value="all">Toutes les communes</option>
                            {uniqueCommunes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="properties-count-bar">
                    <div className="properties-count">
                        <strong>{filteredProperties.length}</strong> {filteredProperties.length > 1 ? 'biens trouvés' : 'bien trouvé'}
                    </div>
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid size={18} /> Grille
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
                            onClick={() => setViewMode('map')}
                        >
                            <MapIcon size={18} /> Carte
                        </button>
                    </div>
                </div>

                {viewMode === 'map' ? (
                    <div className="public-map-wrapper">
                        <PropertyMap
                            properties={displayGeocodedProperties}
                            onPropertyClick={(property) => setSelectedProperty(property)}
                        />
                    </div>
                ) : (
                    <div className="properties-grid-container">
                        <div className="properties-grid">
                            {loading ? (
                                [1, 2, 3, 4, 5, 6].map((item) => (
                                    <div key={item} className="property-card-skeleton">
                                        <div className="skeleton-image"></div>
                                        <div className="skeleton-content">
                                            <div className="skeleton-title"></div>
                                            <div className="skeleton-price"></div>
                                            <div className="skeleton-details"></div>
                                        </div>
                                    </div>
                                ))
                            ) : filteredProperties.length > 0 ? (
                                filteredProperties.slice(0, visibleItems).map((property, index) => (
                                    <motion.div
                                        key={property.id}
                                        className="public-property-card"
                                        onClick={() => setSelectedProperty(property)}
                                        style={{ cursor: 'pointer' }}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }} // Optimized animations
                                        whileHover={{ y: -8, transition: { duration: 0.2 } }}
                                    >
                                        <div className="property-image-wrapper">
                                            {property.imageUrl ? (
                                                <img
                                                    src={property.imageUrl}
                                                    alt={property.typeBien}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="property-image-placeholder" style={{
                                                    background: `linear-gradient(135deg, ${index % 3 === 0 ? '#1B4299, #4f46e5' : index % 3 === 1 ? '#0e7490, #0891b2' : '#7c3aed, #a855f7'})`,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.8)', gap: '10px'
                                                }}>
                                                    <Building size={42} />
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase' }}>{property.typeBien}</span>
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
                                                    Voir détails
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
                            ) : (
                                <div className="no-properties">
                                    <Building size={48} />
                                    <h3>Aucun bien trouvé</h3>
                                    <p>Essayez de modifier vos critères de recherche.</p>
                                </div>
                            )}
                        </div>

                        {filteredProperties.length > visibleItems && (
                            <div className="load-more-container">
                                <button className="btn-load-more" onClick={handleLoadMore}>
                                    Afficher plus de biens ({filteredProperties.length - visibleItems} restants)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <PublicPropertyModal
                property={selectedProperty}
                isOpen={!!selectedProperty}
                onClose={() => setSelectedProperty(null)}
            />
        </motion.div>
    );
};

export default PublicProperties;
