import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Map as MapIcon,
    Grid,
    Filter,
    X,
    AlertCircle,
    Building,
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import PropertyMap from '../components/PropertyMap';
import PublicPropertyModal from '../components/PublicPropertyModal';
import usePublicProperties from '../hooks/usePublicProperties';
import './PublicProperties.css';

/* ── Skeleton loader ── */
const CardSkeleton = () => (
    <div className="pc-skeleton" aria-hidden="true">
        <div className="pc-skeleton-img" />
        <div className="pc-skeleton-body">
            <div className="pc-skeleton-line" style={{ height: 18, width: '70%' }} />
            <div className="pc-skeleton-line" style={{ height: 14, width: '45%' }} />
            <div className="pc-skeleton-line" style={{ height: 14, width: '60%' }} />
            <div className="pc-skeleton-line" style={{ height: 30, width: '100%', marginTop: 'auto' }} />
        </div>
    </div>
);

const PublicProperties = () => {
    const location = useLocation();
    const initialSearch = new URLSearchParams(location.search).get('search') || '';

    const {
        loading,
        error,
        filteredProperties,
        filteredGeocoded,
        visibleItems,
        searchTerm,
        filters,
        uniqueTypes,
        uniqueCommunes,
        uniqueOffers,
        handleFilterChange,
        handleSearchChange,
        loadMore,
        resetFilters,
        activeFilterCount,
        hasMore,
        remaining,
    } = usePublicProperties(initialSearch);

    const [viewMode, setViewMode] = useState('grid');
    const [selectedProperty, setSelectedProperty] = useState(null);

    const paginatedProperties = filteredProperties.slice(0, visibleItems);

    return (
        <motion.div
            className="public-properties"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
        >
            {/* ── Header banner ── */}
            <section className="properties-header" aria-label="En-tête propriétés">
                <div className="properties-header-content">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        Nos <span className="text-gradient">Propriétés</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                    >
                        Trouvez le bien idéal parmi notre vaste catalogue.
                    </motion.p>
                </div>
            </section>

            {/* ── Main content ── */}
            <section className="properties-main">

                {/* ── Sticky Filter bar ── */}
                <div
                    className="properties-filters"
                    role="search"
                    aria-label="Filtres de recherche"
                >
                    {/* Search input */}
                    <div className="search-box">
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Rechercher (ex: Cocody, Villa, F3...)"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            aria-label="Rechercher un bien"
                            id="prop-search"
                        />
                        {searchTerm && (
                            <button
                                className="search-clear-btn"
                                onClick={() => handleSearchChange('')}
                                aria-label="Effacer la recherche"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Select filters */}
                    <div className="filter-group">
                        <select
                            value={filters.offer}
                            onChange={(e) => handleFilterChange('offer', e.target.value)}
                            aria-label="Filtrer par type d'offre"
                        >
                            <option value="all">Toutes les offres</option>
                            {uniqueOffers.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            aria-label="Filtrer par type de bien"
                        >
                            <option value="all">Tous les types</option>
                            {uniqueTypes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <select
                            value={filters.commune}
                            onChange={(e) => handleFilterChange('commune', e.target.value)}
                            aria-label="Filtrer par commune"
                        >
                            <option value="all">Toutes les communes</option>
                            {uniqueCommunes.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Active filter badge + reset */}
                    {activeFilterCount > 0 && (
                        <button
                            className="filter-reset-btn"
                            onClick={resetFilters}
                            aria-label={`Réinitialiser ${activeFilterCount} filtre(s) actif(s)`}
                        >
                            <Filter size={14} />
                            <span>{activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}</span>
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* ── Count bar + view toggle ── */}
                <div className="properties-count-bar">
                    <p className="properties-count">
                        <strong>{filteredProperties.length}</strong>{' '}
                        {filteredProperties.length > 1 ? 'biens trouvés' : 'bien trouvé'}
                        {loading && <span className="count-loading"> — chargement…</span>}
                    </p>
                    <div className="view-toggle" role="group" aria-label="Mode d'affichage">
                        <button
                            className={`toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            aria-pressed={viewMode === 'grid'}
                        >
                            <Grid size={16} /> Grille
                        </button>
                        <button
                            className={`toggle-btn${viewMode === 'map' ? ' active' : ''}`}
                            onClick={() => setViewMode('map')}
                            aria-pressed={viewMode === 'map'}
                        >
                            <MapIcon size={16} /> Carte
                        </button>
                    </div>
                </div>

                {/* ── Error state ── */}
                {error && (
                    <div className="properties-error" role="alert">
                        <AlertCircle size={24} />
                        <p>Impossible de charger les biens : {error}</p>
                        <button onClick={() => window.location.reload()}>
                            Réessayer
                        </button>
                    </div>
                )}

                {/* ── Map view ── */}
                <AnimatePresence mode="wait">
                    {viewMode === 'map' ? (
                        <motion.div
                            key="map"
                            className="public-map-wrapper"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <PropertyMap
                                properties={filteredGeocoded}
                                onPropertyClick={(p) => setSelectedProperty(p)}
                            />
                        </motion.div>
                    ) : (
                        /* ── Grid view ── */
                        <motion.div
                            key="grid"
                            className="properties-grid-container"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className="properties-grid">
                                {loading ? (
                                    /* Skeletons */
                                    Array.from({ length: 12 }, (_, i) => (
                                        <CardSkeleton key={i} />
                                    ))
                                ) : filteredProperties.length > 0 ? (
                                    paginatedProperties.map((property, index) => (
                                        <PropertyCard
                                            key={property.id}
                                            property={property}
                                            index={index}
                                            onCardClick={setSelectedProperty}
                                        />
                                    ))
                                ) : (
                                    /* Empty state */
                                    <div className="no-properties" role="status">
                                        <Building size={48} aria-hidden="true" />
                                        <h3>Aucun bien trouvé</h3>
                                        <p>Essayez de modifier vos critères de recherche.</p>
                                        <button
                                            className="btn-load-more"
                                            onClick={resetFilters}
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Load more */}
                            {!loading && hasMore && (
                                <div className="load-more-container">
                                    <button className="btn-load-more" onClick={loadMore}>
                                        Afficher {Math.min(remaining, 48)} biens de plus
                                        {remaining > 48 && ` · ${remaining} restants`}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* ── Modal ── */}
            <PublicPropertyModal
                property={selectedProperty}
                isOpen={!!selectedProperty}
                onClose={() => setSelectedProperty(null)}
            />
        </motion.div>
    );
};

export default PublicProperties;
