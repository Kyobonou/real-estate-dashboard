import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Phone, Eye, Home, Bed } from 'lucide-react';
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
        const phone = property.telephone.replace(/\s/g, '');
        const message = encodeURIComponent(
            `Bonjour, je suis intéressé par votre bien: ${property.typeBien} à ${property.zone} (${property.prixFormate})`
        );
        window.open(`https://wa.me/225${phone}?text=${message}`, '_blank');
    };

    return (
        <div className="property-map-container">
            <div className="map-legend">
                <div className="legend-item">
                    <div className="legend-marker available"></div>
                    <span>Disponible</span>
                </div>
                <div className="legend-item">
                    <div className="legend-marker occupied"></div>
                    <span>Occupé</span>
                </div>
                <div className="legend-count">
                    {properties.length} bien{properties.length > 1 ? 's' : ''} affiché{properties.length > 1 ? 's' : ''}
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

                    return (
                        <Marker
                            key={property.id}
                            position={position}
                            icon={icon}
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
                                    <div className="tooltip-status">
                                        <span className={`status-badge ${property.disponible ? 'available' : 'occupied'}`}>
                                            {property.status}
                                        </span>
                                    </div>
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
                                        {property.telephone && (
                                            <button
                                                className="btn btn-whatsapp btn-sm"
                                                onClick={(e) => handleWhatsApp(e, property)}
                                            >
                                                <Phone size={14} /> WhatsApp
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default PropertyMap;
