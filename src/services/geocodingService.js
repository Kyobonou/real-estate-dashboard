/**
 * Service de géocodage optimisé pour Abidjan (Mock/Local)
 * Fournit des coordonnées instantanées sans dépendre d'API externes lentes
 */

// Base de données des coordonnées des communes et quartiers d'Abidjan
const ABIDJAN_COORDS = {
    // Communes Principales
    'cocody': { lat: 5.349, lng: -3.985 },
    'marcory': { lat: 5.304, lng: -3.978 },
    'treichville': { lat: 5.294, lng: -4.010 },
    'koumassi': { lat: 5.298, lng: -3.948 },
    'port-bouet': { lat: 5.253, lng: -3.955 },
    'port-bouët': { lat: 5.253, lng: -3.955 },
    'yopougon': { lat: 5.342, lng: -4.083 },
    'abobo': { lat: 5.416, lng: -4.019 },
    'plateau': { lat: 5.321, lng: -4.020 },
    'le plateau': { lat: 5.321, lng: -4.020 },
    'adjame': { lat: 5.362, lng: -4.027 },
    'adjamé': { lat: 5.362, lng: -4.027 },
    'attecoube': { lat: 5.334, lng: -4.038 },
    'attécoubé': { lat: 5.334, lng: -4.038 },
    'bingerville': { lat: 5.356, lng: -3.896 },
    'songon': { lat: 5.309, lng: -4.249 },
    'anyama': { lat: 5.494, lng: -4.051 },

    // Quartiers Spécifiques (Cocody)
    'riviera': { lat: 5.353, lng: -3.966 },
    'riviera 2': { lat: 5.353, lng: -3.966 },
    'riviera 3': { lat: 5.364, lng: -3.952 },
    'riviera 4': { lat: 5.346, lng: -3.972 },
    'riviera golf': { lat: 5.336, lng: -3.982 },
    'riviera palmeraie': { lat: 5.372, lng: -3.959 },
    'palmeraie': { lat: 5.372, lng: -3.959 },
    'angre': { lat: 5.390, lng: -3.985 },
    'angré': { lat: 5.390, lng: -3.985 },
    'deux plateaux': { lat: 5.359, lng: -3.998 },
    '2 plateaux': { lat: 5.359, lng: -3.998 },
    'vallon': { lat: 5.347, lng: -3.992 },
    'agban': { lat: 5.350, lng: -4.010 },

    // Quartiers Spécifiques (Marcory)
    'bietry': { lat: 5.289, lng: -3.978 },
    'biétry': { lat: 5.289, lng: -3.978 },
    'zone 4': { lat: 5.297, lng: -3.969 },
    'zone 4c': { lat: 5.297, lng: -3.969 },
    'residentiel': { lat: 5.295, lng: -3.980 },
    'résidentiel': { lat: 5.295, lng: -3.980 },

    // Autres
    'bassam': { lat: 5.206, lng: -3.738 },
    'grand-bassam': { lat: 5.206, lng: -3.738 },
    'assinie': { lat: 5.148, lng: -3.287 },

    // Par défaut (Centre Abidjan)
    'abidjan': { lat: 5.321, lng: -4.020 }
};

class GeocodingService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Géocode une liste de propriétés instantanément
     * Utilise le dictionnaire local pour la performance
     */
    async geocodeProperties(properties) {
        if (!properties || !Array.isArray(properties)) return [];

        console.log(`🚀 Géocodage optimisé de ${properties.length} propriétés...`);

        const results = properties.map(property => {
            // 1. Si déjà des coordonnées valides, on garde
            if (property.latitude && property.longitude &&
                !isNaN(parseFloat(property.latitude)) &&
                !isNaN(parseFloat(property.longitude))) {
                return {
                    ...property,
                    coordinates: {
                        lat: parseFloat(property.latitude),
                        lng: parseFloat(property.longitude)
                    }
                };
            }

            // 2. Recherche par Zone puis Commune
            const searchTerms = [
                (property.zone || '').toLowerCase().trim(),
                (property.commune || '').toLowerCase().trim()
            ];

            let baseCoords = null;
            let matchType = 'none';

            // Recherche
            for (const term of searchTerms) {
                if (!term) continue;

                // Exact match
                if (ABIDJAN_COORDS[term]) {
                    baseCoords = ABIDJAN_COORDS[term];
                    matchType = 'exact';
                    break;
                }

                // Partial match (si le terme contient une clé connue)
                // Ex: "Cocody Riviera" -> match "riviera"
                const foundKey = Object.keys(ABIDJAN_COORDS).find(k => term.includes(k) && k.length > 3);
                if (foundKey) {
                    baseCoords = ABIDJAN_COORDS[foundKey];
                    matchType = 'partial';
                    break;
                }
            }

            // Fallback
            if (!baseCoords) {
                baseCoords = ABIDJAN_COORDS['abidjan'];
                matchType = 'fallback';
            }

            // 3. Ajouter un "bruit" aléatoire pour disperser les points
            // +/- 0.003 degrés (~300m) pour éviter les superpositions parfaites
            const noiseLat = (Math.random() - 0.5) * 0.006;
            const noiseLng = (Math.random() - 0.5) * 0.006;

            return {
                ...property,
                coordinates: {
                    lat: baseCoords.lat + noiseLat,
                    lng: baseCoords.lng + noiseLng
                },
                _geocoded: true,
                _matchType: matchType
            };
        });

        return results;
    }

    // Calculer les bornes pour centrer la carte
    getBounds(properties) {
        if (!properties || properties.length === 0) return null;

        const validProps = properties.filter(p => p.coordinates);
        if (validProps.length === 0) return null;

        const lats = validProps.map(p => p.coordinates.lat);
        const lngs = validProps.map(p => p.coordinates.lng);

        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
        };
    }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
