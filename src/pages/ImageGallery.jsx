import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Tag, Grid, List, Search, Filter, X, Phone, Eye,
    Share2, Home, Key, Loader, Bed, Building, RefreshCw,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import apiService from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import './Properties.css';

const PropertyDetailsModal = ({ property, isOpen, onClose }) => {
    const { addToast } = useToast();
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => { setImgFailed(false); }, [property?.id]);

    const hasValidImage = property?.imageUrl && !imgFailed;

    const handleContact = () => {
        if (property.telephoneBien) {
            window.open(`tel:${property.telephoneBien}`, '_self');
        }
        addToast({ type: 'success', title: 'Contact', message: `Appel vers ${property.telephoneBien}` });
    };

    const handleWhatsApp = () => {
        if (!property.telephoneBien) {
            addToast({ type: 'warning', title: 'Erreur', message: 'Numéro de téléphone manquant' });
            return;
        }

        let phone = property.telephoneBien.replace(/\D/g, '');
        if (!phone.startsWith('225')) phone = '225' + phone;

        const message = encodeURIComponent(`Bonjour, je suis intéressé par votre bien vu dans la galerie: ${property.typeBien} à ${property.zone} (${property.prixFormate} FCFA)`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        addToast({ type: 'success', title: 'WhatsApp', message: 'Ouverture de WhatsApp...' });
    };

    const handleShare = () => {
        const text = `${property.typeBien} à ${property.zone} - ${property.prixFormate}\nContact: ${property.telephoneBien}\nImage: ${property.imageUrl}`;
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
                        background: hasValidImage
                            ? `url(${property.imageUrl}) center/cover no-repeat`
                            : `linear-gradient(135deg, ${property.id % 2 === 0 ? '#667eea' : '#f093fb'} 0%, ${property.id % 2 === 0 ? '#764ba2' : '#f5576c'} 100%)`
                    }}>
                        {hasValidImage && (
                            <img src={property.imageUrl} alt="" style={{ display: 'none' }} onError={() => setImgFailed(true)} />
                        )}
                        {!hasValidImage && (
                            <div className="property-overlay">
                                <h2>{property.typeBien}</h2>
                            </div>
                        )}
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
                        <h4>Informations</h4>
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
                                    <span className="info-value">{property.telephoneBien}</span>
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

                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={handleShare}>
                            <Share2 size={18} />
                            Copier
                        </button>
                        <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
                            WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// --- LIST VIEW COMPONENT (TABLE BASED) ---
const ImagePropertyListView = React.memo(({ properties, onViewDetails, handleContact, sortConfig, onSort }) => {
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="sort-icon-muted" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="sort-icon-active" /> : <ArrowDown size={14} className="sort-icon-active" />;
    };

    return (
        <div className="properties-list-wrapper">
            <table className="properties-table">
                <thead>
                    <tr>
                        <th onClick={() => onSort('datePublication')} className="sortable-header">
                            <div className="header-cell-content">Date {getSortIcon('datePublication')}</div>
                        </th>
                        <th onClick={() => onSort('typeBien')} className="sortable-header">
                            <div className="header-cell-content">Type {getSortIcon('typeBien')}</div>
                        </th>
                        <th onClick={() => onSort('commune')} className="sortable-header">
                            <div className="header-cell-content">Commune {getSortIcon('commune')}</div>
                        </th>
                        <th onClick={() => onSort('zone')} className="sortable-header">
                            <div className="header-cell-content">Quartier {getSortIcon('zone')}</div>
                        </th>
                        <th onClick={() => onSort('rawPrice')} className="sortable-header">
                            <div className="header-cell-content">Prix {getSortIcon('rawPrice')}</div>
                        </th>
                        <th onClick={() => onSort('status')} className="sortable-header">
                            <div className="header-cell-content">Statut {getSortIcon('status')}</div>
                        </th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {properties.map((property) => (
                        <tr key={property.id} onClick={() => onViewDetails(property)} className="property-row">
                            <td className="date-cell">{property.datePublication || '-'}</td>
                            <td>
                                <div className="type-cell">
                                    <strong>{property.typeBien}</strong>
                                    {property.typeOffre && <span className="type-offre">{property.typeOffre}</span>}
                                </div>
                            </td>
                            <td>{property.commune || '-'}</td>
                            <td>{property.zone || '-'}</td>
                            <td className="price-cell">{property.prixFormate}</td>
                            <td>
                                <span className={`badge ${property.disponible ? 'badge-success' : 'badge-danger'}`}>
                                    {property.status}
                                </span>
                            </td>
                            <td className="text-center" onClick={e => e.stopPropagation()}>
                                <div className="table-actions">
                                    <button className="btn btn-ghost btn-icon-sm" onClick={() => onViewDetails(property)} title="Détails">
                                        <Eye size={16} />
                                    </button>
                                    <button className="btn btn-whatsapp btn-icon-sm" onClick={(e) => handleContact(property, e)} title="WhatsApp">
                                        <Phone size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

const ImagePropertyCard = ({ property, index, viewMode, onViewDetails }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);
    const { addToast } = useToast();
    const statusColor = property.disponible ? 'var(--success)' : 'var(--danger)';
    const hasValidImage = property.imageUrl && !imgFailed;

    const handleContact = (e) => {
        e.stopPropagation();
        if (property.telephoneBien) {
            let phone = property.telephoneBien.replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '225' + phone.substring(1);
            } else if (phone.length === 10) {
                phone = '225' + phone;
            }
            const message = encodeURIComponent(`Bonjour, je suis intéressé par ce bien vu sur la galerie: ${property.typeBien} à ${property.zone}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            addToast({ type: 'success', title: 'Contact', message: 'Ouverture de WhatsApp...' });
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    };

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
                        background: hasValidImage
                            ? `url(${property.imageUrl}) center/cover no-repeat`
                            : `linear-gradient(135deg, ${property.id % 2 === 0 ? '#667eea' : '#f093fb'} 0%, ${property.id % 2 === 0 ? '#764ba2' : '#f5576c'} 100%)`
                    }}
                >
                    {hasValidImage && (
                        <img src={property.imageUrl} alt="" style={{ display: 'none' }} onError={() => setImgFailed(true)} />
                    )}
                    {!hasValidImage && (
                        <div className="property-overlay">
                            <span className="property-type">{property.typeBien}</span>
                        </div>
                    )}
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
                    <span>{property.zone} {property.commune ? `- ${property.commune}` : ''}</span>
                </div>

                <p className="property-description">{property.caracteristiques}</p>

                <div className="property-features">
                    {property.chambres > 0 && (
                        <span className="feature-tag">
                            <Bed size={12} /> {property.chambres} ch.
                        </span>
                    )}
                    {property.meuble && (
                        <span className="feature-tag">
                            <Home size={12} /> Meublé
                        </span>
                    )}
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

const ImageGallery = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'datePublication', direction: 'desc' });
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
    }, []);

    const loadProperties = async (force = false) => {
        try {
            const response = await apiService.getImagesProperties(force);
            if (response.success) {
                setProperties(response.data);
                if (force) {
                    addToast({ type: 'success', title: 'Actualisé', message: 'La galerie a été mise à jour' });
                }
            }
        } catch (error) {
            console.error('Erreur chargement galerie:', error);
            addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger la galerie' });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadProperties(true);
    };

    // Fonction de tri
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleTableContact = (property, e) => {
        if (property.telephoneBien) {
            let phone = property.telephoneBien.replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '225' + phone.substring(1);
            } else if (phone.length === 10) {
                phone = '225' + phone;
            }
            const message = encodeURIComponent(`Bonjour, je suis intéressé par ce bien vu sur la galerie: ${property.typeBien} à ${property.zone}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            addToast({ type: 'success', title: 'Contact', message: 'Ouverture de WhatsApp...' });
        } else {
            addToast({ type: 'error', title: 'Erreur', message: 'Numéro de téléphone non disponible' });
        }
    };

    // Extraire les options uniques
    const uniqueTypes = [...new Set(properties.map(p => p.typeBien).filter(Boolean))].sort();
    const uniqueCommunes = [...new Set(properties.map(p => p.commune).filter(Boolean))].sort();
    const uniqueQuartiers = [...new Set(properties.map(p => p.zone).filter(Boolean))].sort();
    const uniquePieces = [...new Set(properties.map(p => p.chambres).filter(p => p > 0))].sort((a, b) => a - b);

    const filteredProperties = useMemo(() => {
        let items = properties.filter(property => {
            const matchesSearch =
                (property.commune || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.zone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (property.typeBien || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                // Spécial pour les dates (format: DD/MM/YYYY HH:MM)
                else if (sortConfig.key === 'datePublication') {
                    const parseDateStr = (d) => {
                        if (!d || typeof d !== 'string') return 0;
                        if (d.includes('/')) {
                            // Nettoyer la chaîne pour enlever les mots comme "le" ou les tirets si présents
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

    const handleViewDetails = (property) => {
        setSelectedProperty(property);
        setModalOpen(true);
    };

    const resetFilters = () => {
        setFilters({ type: 'all', status: 'all', meuble: 'all', pieces: 'all', commune: 'all', quartier: 'all' });
        setSearchTerm('');
    };

    if (loading) {
        return (
            <div className="gallery-loading">
                <div className="spinner"></div>
                <p>Chargement de la galerie...</p>
            </div>
        );
    }

    return (
        <div className="properties-v2">
            <div className="properties-header">
                <div className="header-left">
                    <h2>Galerie Immobilière</h2>
                    <span className="properties-count">{filteredProperties.length} bien(s) affiché(s) sur {properties.length}</span>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Actualiser les données"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        <span className="hide-mobile">Actualiser</span>
                    </button>
                </div>
            </div>

            <div className="properties-toolbar">
                <div className="search-filter-group">
                    <div className="search-input">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher (commune, quartier, type, mot-clé)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className="clear-search"
                                onClick={() => setSearchTerm('')}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        className={`btn-filter ${filterOpen ? 'active' : ''}`}
                        onClick={() => setFilterOpen(!filterOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1rem',
                            background: filterOpen ? 'var(--primary)' : 'var(--bg-tertiary)',
                            color: filterOpen ? 'white' : 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <Filter size={18} />
                        Filtres
                        {(filters.type !== 'all' || filters.commune !== 'all' || filters.quartier !== 'all') && (
                            <span className="filter-badge" style={{
                                background: filterOpen ? 'white' : 'var(--primary)',
                                color: filterOpen ? 'var(--primary)' : 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '0.7em',
                                marginLeft: '0.5rem'
                            }}>!</span>
                        )}
                    </button>
                </div>

                <div className="toolbar-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="sort-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key, direction });
                            }}
                            className="sort-select"
                            title="Trier par"
                        >
                            <option value="datePublication-desc">Date (Récent → Ancien)</option>
                            <option value="datePublication-asc">Date (Ancien → Récent)</option>
                            <option value="rawPrice-asc">Prix (Croissant)</option>
                            <option value="rawPrice-desc">Prix (Décroissant)</option>
                            <option value="typeBien-asc">Type (A-Z)</option>
                            <option value="commune-asc">Commune (A-Z)</option>
                        </select>
                    </div>

                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Vue Grille"
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Vue Liste"
                        >
                            <List size={18} />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                            onClick={() => setViewMode('grouped')}
                            title="Grouper par auteur"
                        >
                            <Users size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {filterOpen && (
                    <motion.div
                        className="filters-panel"
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: '2rem' }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="filter-group">
                            <label>Type de bien</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            >
                                <option value="all">Tous les types</option>
                                {uniqueTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Commune</label>
                            <select
                                value={filters.commune}
                                onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
                            >
                                <option value="all">Toutes les communes</option>
                                {uniqueCommunes.map(commune => (
                                    <option key={commune} value={commune}>{commune}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Quartier</label>
                            <select
                                value={filters.quartier}
                                onChange={(e) => setFilters({ ...filters, quartier: e.target.value })}
                            >
                                <option value="all">Tous les quartiers</option>
                                {uniqueQuartiers.map(quartier => (
                                    <option key={quartier} value={quartier}>{quartier}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Pièces</label>
                            <select
                                value={filters.pieces}
                                onChange={(e) => setFilters({ ...filters, pieces: e.target.value })}
                            >
                                <option value="all">Peu importe</option>
                                {uniquePieces.map(piece => (
                                    <option key={piece} value={piece}>{piece} Pièces</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Budget Max</label>
                            <input
                                type="number"
                                placeholder="Prix max..."
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--glass-border)',
                                    padding: '0.625rem',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)',
                                    width: '100%'
                                }}
                            />
                        </div>

                        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                            <button
                                onClick={resetFilters}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-secondary)',
                                    padding: '0.625rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <X size={16} /> Réinitialiser
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {viewMode === 'list' ? (
                <ImagePropertyListView
                    properties={filteredProperties}
                    onViewDetails={handleViewDetails}
                    handleContact={handleTableContact}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />
            ) : (
                <div className={`properties-container ${viewMode}`}>
                    {filteredProperties.length > 0 ? (
                        filteredProperties.map((property, index) => (
                            <ImagePropertyCard
                                key={index}
                                property={property}
                                index={index}
                                viewMode={viewMode}
                                onViewDetails={handleViewDetails}
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <Home size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Aucun bien ne correspond à vos critères.</p>
                            <button
                                onClick={resetFilters}
                                style={{
                                    marginTop: '1rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Effacer les filtres
                            </button>
                        </div>
                    )}
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

export default ImageGallery;
