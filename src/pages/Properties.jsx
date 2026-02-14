import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Tag, Grid, List, Search, Filter, X, Phone, Eye,
    Download, Share2, Heart, Home, Key, Loader, RefreshCw, Bed, Building, Map
} from 'lucide-react';
import apiService from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PropertyMap from '../components/PropertyMap';
import geocodingService from '../services/geocodingService';
import { debounce } from '../utils/performance';
import './Properties.css';

const PropertyDetailsModal = ({ property, isOpen, onClose }) => {
    const { addToast } = useToast();

    const handleContact = () => {
        if (property.telephone) {
            window.open(`tel:${property.telephone}`, '_self');
        }
        addToast({ type: 'success', title: 'Contact', message: `Appel vers ${property.telephone}` });
    };

    const handleWhatsApp = () => {
        const phone = property.telephone.replace(/\s/g, '');
        const message = encodeURIComponent(`Bonjour, je suis intéressé par votre bien: ${property.typeBien} à ${property.zone} (${property.prixFormate})`);
        window.open(`https://wa.me/225${phone}?text=${message}`, '_blank');
        addToast({ type: 'success', title: 'WhatsApp', message: 'Ouverture de WhatsApp...' });
    };

    const handleShare = () => {
        const text = `${property.typeBien} à ${property.zone} - ${property.prixFormate}\nContact: ${property.telephone}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            addToast({ type: 'info', title: 'Copié !', message: 'Infos du bien copiées dans le presse-papier' });
        }
    };

    if (!property) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Détails du Bien" size="lg">
            <div className="property-details-modal">
                <div className="property-details-header">
                    <div className="property-image-large" style={{
                        background: `linear-gradient(135deg, ${property.id % 2 === 0 ? '#667eea' : '#f093fb'} 0%, ${property.id % 2 === 0 ? '#764ba2' : '#f5576c'} 100%)`
                    }}>
                        <div className="property-overlay">
                            <h2>{property.typeBien}</h2>
                        </div>
                    </div>

                    <div className="property-quick-info">
                        <div className="price-section">
                            <span className="price-label">Prix</span>
                            <h3 className="price-value">{property.prixFormate}</h3>
                        </div>
                        <div className="status-section">
                            <span className={`status-badge ${property.disponible ? 'available' : 'occupied'}`}>
                                {property.status}
                            </span>
                            {property.typeOffre && <span className="offer-badge">{property.typeOffre}</span>}
                        </div>
                    </div>
                </div>

                <div className="property-details-body">
                    <div className="details-section">
                        <h4>Informations du Google Sheet</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <MapPin size={18} />
                                <div>
                                    <span className="info-label">Zone</span>
                                    <span className="info-value">{property.zone}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Phone size={18} />
                                <div>
                                    <span className="info-label">Téléphone</span>
                                    <span className="info-value">{property.telephone}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Tag size={18} />
                                <div>
                                    <span className="info-label">Publié par</span>
                                    <span className="info-value">{property.publiePar || 'Non spécifié'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Bed size={18} />
                                <div>
                                    <span className="info-label">Chambres</span>
                                    <span className="info-value">{property.chambres > 0 ? property.chambres : 'Non spécifié'}</span>
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
                        </div>
                    </div>

                    {property.caracteristiques && (
                        <div className="details-section">
                            <h4>Caractéristiques</h4>
                            <p className="property-full-description">{property.caracteristiques}</p>
                            {(property.features || []).length > 1 && (
                                <div className="features-grid">
                                    {property.features.map((feature, i) => (
                                        <div key={i} className="feature-item">
                                            <Tag size={14} />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {property.datePublication && (
                        <div className="details-section">
                            <h4>Date de publication</h4>
                            <p className="property-full-description">{property.datePublication}</p>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button className="btn btn-ghost" onClick={handleShare}>
                            <Share2 size={18} />
                            Copier les infos
                        </button>
                        <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
                            <Phone size={18} />
                            WhatsApp
                        </button>
                        <button className="btn btn-primary" onClick={handleContact}>
                            <Phone size={18} />
                            Appeler
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const PropertyCard = ({ property, index, viewMode, onViewDetails }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { addToast } = useToast();
    const statusColor = property.disponible ? 'var(--success)' : 'var(--danger)';

    const handleContact = (e) => {
        e.stopPropagation();
        if (property.telephone) {
            const phone = property.telephone.replace(/\s/g, '');
            const message = encodeURIComponent(`Bonjour, je suis intéressé par: ${property.typeBien} à ${property.zone}`);
            window.open(`https://wa.me/225${phone}?text=${message}`, '_blank');
        }
        addToast({ type: 'success', title: 'Contact', message: `WhatsApp vers ${property.telephone}` });
    };

    if (viewMode === 'list') {
        return (
            <motion.div
                className="property-list-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                onClick={() => onViewDetails(property)}
            >
                <div className="property-list-info">
                    <div className="property-list-header">
                        <h3>{property.typeBien} {property.typeOffre ? `— ${property.typeOffre}` : ''}</h3>
                        <span className="property-price">{property.prixFormate}</span>
                    </div>
                    <div className="property-list-details">
                        <span className="property-zone">
                            <MapPin size={14} /> {property.zone}
                        </span>
                        <span className="property-status" style={{ color: statusColor }}>
                            • {property.status}
                        </span>
                    </div>
                    <div className="property-features-inline">
                        {property.chambres > 0 && <span className="feature-badge">{property.chambres} ch.</span>}
                        {property.meuble && <span className="feature-badge">Meublé</span>}
                        <span className="feature-badge">{property.publiePar}</span>
                    </div>
                </div>
                <div className="property-list-actions">
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onViewDetails(property); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Eye size={16} /> Détails
                    </button>
                    <button className="btn btn-whatsapp btn-sm" onClick={handleContact}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={16} /> WhatsApp
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="property-card-v2"
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
                        background: `linear-gradient(135deg, ${property.id % 2 === 0 ? '#667eea' : '#f093fb'} 0%, ${property.id % 2 === 0 ? '#764ba2' : '#f5576c'} 100%)`
                    }}
                >
                    <div className="property-overlay">
                        <span className="property-type">{property.typeBien}</span>
                    </div>
                </div>
                <div className="property-badges">
                    <span className="badge-status" style={{ background: statusColor }}>
                        {property.status}
                    </span>
                    {property.typeOffre && <span className="badge-offer">{property.typeOffre}</span>}
                </div>
            </div>

            <div className="property-content">
                <div className="property-header">
                    <h3 className="property-title">{property.typeBien}</h3>
                    <span className="property-price">{property.prixFormate}</span>
                </div>

                <div className="property-location">
                    <MapPin size={16} />
                    <span>{property.zone}</span>
                </div>

                <p className="property-description">{property.caracteristiques}</p>

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

    useEffect(() => {
        loadProperties();

        const unsubscribe = apiService.subscribe('dataUpdate', ({ properties: p }) => {
            if (p?.success) {
                setProperties(p.data);
                geocodePropertiesAsync(p.data);
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

    const loadProperties = async () => {
        try {
            const response = await apiService.getProperties();
            if (response.success) {
                setProperties(response.data);
                geocodePropertiesAsync(response.data);
            }
        } catch (error) {
            console.error('Error loading properties:', error);
        } finally {
            setLoading(false);
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

    // Filtrage des propriétés (mémorisé pour éviter recalculs)
    const filteredProperties = useMemo(() => {
        return properties.filter(property => {
            const matchesSearch =
                (property.commune || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.zone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.typeBien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.publiePar || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    }, [properties, searchTerm, filters]);

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
        const headers = ['Type', 'Offre', 'Zone', 'Prix', 'Téléphone', 'Caractéristiques', 'Publié par', 'Meublé', 'Chambres', 'Disponible'];
        const rows = filteredProperties.map(p => [
            p.typeBien, p.typeOffre, p.zone, p.prix, p.telephone, p.caracteristiques, p.publiePar, p.meuble ? 'Oui' : 'Non', p.chambres, p.disponible ? 'Oui' : 'Non'
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `biens_immobiliers_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        addToast({ type: 'success', title: 'Export réussi', message: `${filteredProperties.length} biens exportés en CSV` });
    }, [filteredProperties, addToast]);

    const resetFilters = useCallback(() => {
        setFilters({ type: 'all', status: 'all', meuble: 'all', pieces: 'all', commune: 'all', quartier: 'all' });
        setSearchTerm('');
    }, []);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Loader className="spinner" size={40} />
                <p>Chargement des biens depuis Google Sheets...</p>
            </div>
        );
    }

    return (
        <div className="properties-v2">
            <div className="properties-header">
                <div className="header-left">
                    <h2>Biens Immobiliers</h2>
                    <span className="properties-count">{filteredProperties.length} bien(s) trouvé(s) sur {properties.length}</span>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        Exporter CSV
                    </button>
                </div>
            </div>

            <div className="properties-toolbar">
                <div className="search-filter-group">
                    <div className="search-input">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par commune, type, publieur..."
                            defaultValue={searchTerm}
                            onChange={(e) => debouncedSearch(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); }}>
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <button
                        className={`btn btn-secondary filter-btn ${filterOpen ? 'active' : ''}`}
                        onClick={() => setFilterOpen(!filterOpen)}
                    >
                        <Filter size={18} />
                        Filtres
                    </button>
                </div>

                <div className="view-toggle">
                    <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                        <Grid size={18} />
                    </button>
                    <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                        <List size={18} />
                    </button>
                    <button className={`view-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')} title="Vue Carte">
                        <Map size={18} />
                    </button>
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
                            <label>Prix Min (FCFA)</label>
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
                            <label>Prix Max (FCFA)</label>
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
                        properties={geocodedProperties.filter(property => {
                            const matchesSearch =
                                (property.commune || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (property.zone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (property.typeBien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (property.publiePar || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                        })}
                        onPropertyClick={handleViewDetails}
                    />
                </div>
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

            {filteredProperties.length === 0 && (
                <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Building size={48} />
                    <p>Aucun bien trouvé avec ces critères</p>
                    <button className="btn btn-primary" onClick={resetFilters}>
                        Réinitialiser les filtres
                    </button>
                </motion.div>
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
        </div>
    );
};

export default Properties;
