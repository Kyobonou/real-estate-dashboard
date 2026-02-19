import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Phone, Eye, Home, Bed, Layers, Navigation } from 'lucide-react';
import './PropertyMap.css';

// Fix pour les icônes Leaflet qui ne s'affichent pas correctement avec Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Créer des icônes personnalisées pour les marqueurs
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="marker-pin" style="background-color: ${color};">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
};

const availableIcon = createCustomIcon('var(--success, #10b981)');
const occupiedIcon = createCustomIcon('var(--danger, #ef4444)');

// Composant pour ajuster la vue de la carte aux marqueurs
const FitBounds = ({ properties }) => {
    const map = useMap();

    useEffect(() => {
        if (properties && properties.length > 0) {
            const validCoords = properties
                .filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng)
                .map(p => [p.coordinates.lat, p.coordinates.lng]);

            if (validCoords.length > 0) {
                const bounds = L.latLngBounds(validCoords);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            }
        }
    }, [properties, map]);

    return null;
};

const PropertyMap = ({ properties, onPropertyClick }) => {
    const [mapReady, setMapReady] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Centre par défaut: Abidjan
    const defaultCenter = [5.3364, -4.0267];
    const defaultZoom = 11;

    const handleMarkerClick = (property) => {
        if (onPropertyClick) {
            onPropertyClick(property);
        }
    };

    const handleWhatsApp = (e, property) => {
        e.stopPropagation();
        if (!property.telephoneBien) return;
        let phone = property.telephoneBien.replace(/\D/g, '');
        if (!phone.startsWith('225')) phone = '225' + phone;
        const message = encodeURIComponent(
            `Bonjour, je suis intéressé par votre bien: ${property.typeBien} à ${property.zone} (${property.prixFormate} FCFA)`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const handleNavigate = (e, property) => {
        e.stopPropagation();
        // Ouvre Google Maps avec les coordonnées
        const url = `https://www.google.com/maps/search/?api=1&query=${property.coordinates.lat},${property.coordinates.lng}`;
        window.open(url, '_blank');
    };

    // Calcul des tiers de prix pour la heatmap
    const priceTiers = useMemo(() => {
        if (!properties.length) return { low: 0, high: 0 };

        const prices = properties
            .map(p => p.rawPrice)
            .filter(p => p > 0)
            .sort((a, b) => a - b);

        if (!prices.length) return { low: 0, high: 0 };

        const q1 = prices[Math.floor(prices.length * 0.33)];
        const q3 = prices[Math.floor(prices.length * 0.66)];

        return { low: q1, high: q3 };
    }, [properties]);

    const getHeatmapColor = (price) => {
        if (!price) return '#94a3b8'; // Gris si pas de prix
        if (price < priceTiers.low) return '#10b981'; // Vert (Abordable)
        if (price < priceTiers.high) return '#f59e0b'; // Orange (Moyen)
        return '#ef4444'; // Rouge (Cher)
    };

    return (
        <div className="property-map-container">
            <div className="map-controls">
                <button
                    className={`btn-map-control ${showHeatmap ? 'active' : ''}`}
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    title={showHeatmap ? "Désactiver la carte des prix" : "Activer la carte des prix"}
                >
                    <Layers size={18} />
                    {showHeatmap ? "Mode Prix" : "Mode Carte"}
                </button>
            </div>

            <div className="map-legend">
                {showHeatmap ? (
                    <>
                        <div className="legend-item">
                            <div className="legend-marker" style={{ background: '#10b981', borderRadius: '50%' }}></div>
                            <span>Abordable</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-marker" style={{ background: '#f59e0b', borderRadius: '50%' }}></div>
                            <span>Moyen</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-marker" style={{ background: '#ef4444', borderRadius: '50%' }}></div>
                            <span>Élevé</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="legend-item">
                            <div className="legend-marker available"></div>
                            <span>Disponible</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-marker occupied"></div>
                            <span>Occupé</span>
                        </div>
                    </>
                )}
                <div className="legend-count">
                    {properties.length} bien{properties.length > 1 ? 's' : ''}
                </div>
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                scrollWheelZoom={true}
                className="leaflet-map"
                whenReady={() => setMapReady(true)}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapReady && <FitBounds properties={properties} />}

                {properties.map((property) => {
                    if (!property.coordinates || !property.coordinates.lat || !property.coordinates.lng) {
                        return null;
                    }

                    const position = [property.coordinates.lat, property.coordinates.lng];
                    const icon = property.disponible ? availableIcon : occupiedIcon;
                    const heatmapColor = getHeatmapColor(property.rawPrice);

                    return (
                        <React.Fragment key={property.id}>
                            {showHeatmap && (
                                <Circle
                                    center={position}
                                    pathOptions={{
                                        color: heatmapColor,
                                        fillColor: heatmapColor,
                                        fillOpacity: 0.4,
                                        weight: 0
                                    }}
                                    radius={300} // Rayon de 300m
                                />
                            )}

                            <Marker
                                position={position}
                                icon={icon}
                                opacity={showHeatmap ? 0.8 : 1}
                            >
                                {/* Tooltip au survol */}
                                <Tooltip
                                    direction="top"
                                    offset={[0, -30]}
                                    opacity={0.95}
                                    permanent={false}
                                >
                                    <div className="tooltip-content">
                                        <div className="tooltip-title">{property.typeBien}</div>
                                        <div className="tooltip-price">{property.prixFormate}</div>
                                        <div className="tooltip-location">
                                            <MapPin size={12} />
                                            <span>{property.zone}</span>
                                        </div>
                                        {showHeatmap && (
                                            <div style={{ fontSize: '11px', color: heatmapColor, fontWeight: 'bold', marginTop: '4px' }}>
                                                {property.rawPrice < priceTiers.low ? 'Prix attractif' : property.rawPrice > priceTiers.high ? 'Standing élevé' : 'Prix marché'}
                                            </div>
                                        )}
                                    </div>
                                </Tooltip>

                                {/* Popup au clic */}
                                <Popup className="custom-popup" maxWidth={300}>
                                    <div className="popup-content">
                                        <div className="popup-header">
                                            <h3>{property.typeBien}</h3>
                                            <span className={`popup-status ${property.disponible ? 'available' : 'occupied'}`}>
                                                {property.status}
                                            </span>
                                        </div>

                                        <div className="popup-price">
                                            {property.prixFormate}
                                        </div>

                                        <div className="popup-location">
                                            <MapPin size={14} />
                                            <span>{property.zone}</span>
                                        </div>

                                        {property.commune && (
                                            <div className="popup-commune">
                                                <strong>Commune:</strong> {property.commune}
                                            </div>
                                        )}

                                        <div className="popup-features">
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

                                        {property.caracteristiques && (
                                            <p className="popup-description">
                                                {property.caracteristiques.substring(0, 100)}
                                                {property.caracteristiques.length > 100 ? '...' : ''}
                                            </p>
                                        )}

                                        <div className="popup-actions">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleMarkerClick(property)}
                                            >
                                                <Eye size={14} /> Détails
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={(e) => handleNavigate(e, property)}
                                                title="Voir sur Google Maps"
                                                style={{ minWidth: '32px', padding: '0 8px' }}
                                            >
                                                <Navigation size={14} />
                                            </button>
                                            {property.telephoneBien && (
                                                <button
                                                    className="btn btn-whatsapp btn-sm"
                                                    onClick={(e) => handleWhatsApp(e, property)}
                                                >
                                                    <Phone size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default PropertyMap;
