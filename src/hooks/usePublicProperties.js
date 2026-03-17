import { useState, useEffect, useMemo } from 'react';
import apiService from '../services/api';
import geocodingService from '../services/geocodingService';

/**
 * usePublicProperties — Centralise la logique de chargement, filtrage,
 * et pagination des biens publics.
 *
 * @param {string} initialSearch – Terme de recherche initial (depuis URL params)
 * @returns {object}
 */
const usePublicProperties = (initialSearch = '') => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [geocodedProperties, setGeocodedProperties] = useState([]);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [visibleItems, setVisibleItems] = useState(48);
    const [filters, setFilters] = useState({
        type: 'all',
        commune: 'all',
        offer: 'all',
    });

    // Fetch properties once on mount
    useEffect(() => {
        let cancelled = false;

        const fetchProperties = async () => {
            try {
                const response = await apiService.getProperties(false);
                if (cancelled) return;

                if (response.success) {
                    setProperties(response.data);
                    // Geocode asynchronously (for map view)
                    geocodingService.geocodeProperties(response.data).then((geocoded) => {
                        if (!cancelled) setGeocodedProperties(geocoded);
                    });
                }
            } catch (err) {
                if (!cancelled) setError(err?.message || 'Erreur de chargement');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchProperties();
        return () => { cancelled = true; };
    }, []);

    // Derived filter options
    const uniqueTypes = useMemo(
        () => [...new Set(properties.map((p) => p.typeBien).filter(Boolean))].sort(),
        [properties]
    );
    const uniqueCommunes = useMemo(
        () => [...new Set(properties.map((p) => p.commune).filter(Boolean))].sort(),
        [properties]
    );
    const uniqueOffers = useMemo(
        () => [...new Set(properties.map((p) => p.typeOffre).filter(Boolean))].sort(),
        [properties]
    );

    // Pre-normalise search blobs once
    const processedData = useMemo(
        () =>
            properties.map((p) => ({
                ...p,
                _searchBlob: `${p.zone} ${p.commune} ${p.typeBien} ${p.description || ''} ${p.refBien || ''}`.toLowerCase(),
            })),
        [properties]
    );

    // Apply filters
    const filteredProperties = useMemo(() => {
        const s = searchTerm.toLowerCase().trim();
        return processedData.filter((p) => {
            const matchesSearch = !s || p._searchBlob.includes(s);
            const matchesType = filters.type === 'all' || p.typeBien === filters.type;
            const matchesCommune = filters.commune === 'all' || p.commune === filters.commune;
            const matchesOffer = filters.offer === 'all' || p.typeOffre === filters.offer;
            return matchesSearch && matchesType && matchesCommune && matchesOffer;
        });
    }, [processedData, searchTerm, filters]);

    // Geocoded subset matching current filters
    const filteredGeocoded = useMemo(() => {
        const ids = new Set(filteredProperties.map((p) => p.id));
        return geocodedProperties.filter((p) => ids.has(p.id));
    }, [filteredProperties, geocodedProperties]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setVisibleItems(48);
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setVisibleItems(48);
    };

    const loadMore = () => setVisibleItems((prev) => prev + 48);

    const resetFilters = () => {
        setFilters({ type: 'all', commune: 'all', offer: 'all' });
        setSearchTerm('');
        setVisibleItems(48);
    };

    const activeFilterCount = Object.values(filters).filter((v) => v !== 'all').length +
        (searchTerm.trim() ? 1 : 0);

    return {
        // State
        loading,
        error,
        properties,
        filteredProperties,
        filteredGeocoded,
        visibleItems,
        searchTerm,
        filters,
        // Filter options
        uniqueTypes,
        uniqueCommunes,
        uniqueOffers,
        // Actions
        handleFilterChange,
        handleSearchChange,
        loadMore,
        resetFilters,
        // Helpers
        activeFilterCount,
        hasMore: filteredProperties.length > visibleItems,
        remaining: filteredProperties.length - visibleItems,
    };
};

export default usePublicProperties;
