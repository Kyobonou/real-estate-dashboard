// Geocoding Service - Convert addresses to GPS coordinates
// Uses OpenStreetMap Nominatim API (free, no API key needed)

class GeocodingService {
    constructor() {
        this.cache = new Map();
        this.loadCacheFromStorage();

        // Coordonnées par défaut pour les principales communes d'Abidjan
        this.defaultCoordinates = {
            'Cocody': { lat: 5.3364, lng: -3.9811 },
            'Yopougon': { lat: 5.3453, lng: -4.0891 },
            'Abobo': { lat: 5.4167, lng: -4.0167 },
            'Adjamé': { lat: 5.3515, lng: -4.0208 },
            'Plateau': { lat: 5.3200, lng: -4.0083 },
            'Marcory': { lat: 5.2833, lng: -3.9833 },
            'Treichville': { lat: 5.2833, lng: -4.0000 },
            'Koumassi': { lat: 5.2833, lng: -3.9500 },
            'Port-Bouët': { lat: 5.2500, lng: -3.9167 },
            'Attécoubé': { lat: 5.3333, lng: -4.0500 },
            'Bingerville': { lat: 5.3550, lng: -3.8950 },
            'Songon': { lat: 5.3167, lng: -4.2667 },
            'Anyama': { lat: 5.4950, lng: -3.9500 },
            'Abidjan': { lat: 5.3364, lng: -4.0267 }, // Centre d'Abidjan
        };
    }

    loadCacheFromStorage() {
        try {
            const saved = localStorage.getItem('geocoding_cache');
            if (saved) {
                const parsed = JSON.parse(saved);
                parsed.forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
                console.log('Geocoding cache loaded from localStorage');
            }
        } catch (e) {
            console.warn('Failed to load geocoding cache', e);
        }
    }

    saveCacheToStorage() {
        try {
            const cacheArray = Array.from(this.cache.entries());
            localStorage.setItem('geocoding_cache', JSON.stringify(cacheArray));
        } catch (e) {
            console.warn('Failed to save geocoding cache', e);
        }
    }

    // Normaliser le nom de commune pour correspondance
    normalizeCommune(commune) {
        if (!commune) return '';
        return commune.trim()
            .replace(/é/g, 'e')
            .replace(/è/g, 'e')
            .replace(/ê/g, 'e')
            .replace(/à/g, 'a')
            .replace(/ô/g, 'o')
            .toLowerCase();
    }

    // Obtenir les coordonnées par défaut d'une commune
    getDefaultCoordinates(commune) {
        if (!commune) return null;

        // Chercher une correspondance exacte
        if (this.defaultCoordinates[commune]) {
            return this.defaultCoordinates[commune];
        }

        // Chercher une correspondance partielle (insensible à la casse et accents)
        const normalized = this.normalizeCommune(commune);
        for (const [key, coords] of Object.entries(this.defaultCoordinates)) {
            if (this.normalizeCommune(key).includes(normalized) ||
                normalized.includes(this.normalizeCommune(key))) {
                return coords;
            }
        }

        return null;
    }

    // Geocoder une adresse via Nominatim (avec rate limiting)
    async geocodeAddress(address) {
        if (!address) return null;

        // Vérifier le cache
        const cacheKey = address.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Rate limiting: attendre 1 seconde entre les requêtes (politique Nominatim)
            await this.delay(1000);

            const query = encodeURIComponent(`${address}, Abidjan, Côte d'Ivoire`);
            const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'ImmoDash Real Estate Dashboard'
                }
            });

            if (!response.ok) throw new Error('Geocoding failed');

            const data = await response.json();

            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };

                // Mettre en cache
                this.cache.set(cacheKey, coords);
                this.saveCacheToStorage();

                return coords;
            }

            return null;
        } catch (error) {
            console.warn('Geocoding error:', error);
            return null;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Obtenir les coordonnées d'une propriété
    async getPropertyCoordinates(property) {
        const { commune, zone } = property;

        // PRIORITÉ 1: Géocoder avec la zone précise (quartier) + commune
        // Cela donne la position la plus précise
        if (zone && commune) {
            const coords = await this.geocodeAddress(`${zone}, ${commune}`);
            if (coords) {
                console.log(`✓ Géocodé: ${zone}, ${commune}`);
                return coords;
            }
        }

        // PRIORITÉ 2: Essayer juste avec la zone (quartier)
        if (zone) {
            const coords = await this.geocodeAddress(`${zone}, Abidjan`);
            if (coords) {
                console.log(`✓ Géocodé: ${zone}, Abidjan`);
                return coords;
            }
        }

        // PRIORITÉ 3: Utiliser les coordonnées par défaut de la commune
        const defaultCoords = this.getDefaultCoordinates(commune);
        if (defaultCoords) {
            console.log(`⚠ Coordonnées par défaut pour commune: ${commune}`);
            // Ajouter un léger décalage aléatoire pour éviter que tous les biens
            // de la même commune soient au même endroit
            return {
                lat: defaultCoords.lat + (Math.random() - 0.5) * 0.02,
                lng: defaultCoords.lng + (Math.random() - 0.5) * 0.02
            };
        }

        // PRIORITÉ 4: Essayer de géocoder juste avec la commune
        if (commune) {
            const coords = await this.geocodeAddress(`${commune}, Abidjan`);
            if (coords) {
                console.log(`✓ Géocodé: ${commune}, Abidjan`);
                return coords;
            }
        }

        // PRIORITÉ 5: Fallback - centre d'Abidjan
        console.warn(`✗ Impossible de géocoder: ${zone || 'N/A'}, ${commune || 'N/A'} - Utilisation du centre d'Abidjan`);
        return { lat: 5.3364, lng: -4.0267 };
    }

    // Géocoder toutes les propriétés en batch (avec rate limiting)
    async geocodeProperties(properties) {
        console.log(`🗺️ Début du géocodage de ${properties.length} propriétés...`);
        const startTime = Date.now();

        // Créer un map des adresses uniques pour éviter de géocoder plusieurs fois la même adresse
        const uniqueAddresses = new Map();

        properties.forEach(property => {
            const { zone, commune } = property;
            // Créer une clé unique pour chaque combinaison zone + commune
            const addressKey = `${zone || ''}|${commune || ''}`;

            if (!uniqueAddresses.has(addressKey)) {
                uniqueAddresses.set(addressKey, { zone, commune, properties: [] });
            }
            uniqueAddresses.get(addressKey).properties.push(property);
        });

        console.log(`📍 ${uniqueAddresses.size} adresses uniques à géocoder`);

        // Géocoder chaque adresse unique
        const geocodedAddresses = new Map();
        let geocodedCount = 0;

        for (const [addressKey, { zone, commune }] of uniqueAddresses) {
            const coords = await this.getPropertyCoordinates({ zone, commune });
            geocodedAddresses.set(addressKey, coords);
            geocodedCount++;

            // Log de progression tous les 10 géocodages
            if (geocodedCount % 10 === 0) {
                console.log(`⏳ Progression: ${geocodedCount}/${uniqueAddresses.size} adresses géocodées`);
            }
        }

        // Appliquer les coordonnées à toutes les propriétés
        const results = [];
        properties.forEach(property => {
            const { zone, commune } = property;
            const addressKey = `${zone || ''}|${commune || ''}`;
            const coords = geocodedAddresses.get(addressKey);

            // Ajouter un micro-décalage pour éviter la superposition exacte
            const microOffset = {
                lat: coords.lat + (Math.random() - 0.5) * 0.0005,
                lng: coords.lng + (Math.random() - 0.5) * 0.0005
            };

            results.push({
                ...property,
                coordinates: microOffset
            });
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Géocodage terminé en ${duration}s - ${properties.length} propriétés géocodées`);

        return results;
    }

    // Obtenir les limites géographiques pour centrer la carte
    getBounds(properties) {
        if (!properties || properties.length === 0) {
            // Bounds par défaut pour Abidjan
            return {
                north: 5.45,
                south: 5.20,
                east: -3.85,
                west: -4.30
            };
        }

        const coords = properties
            .map(p => p.coordinates)
            .filter(c => c && c.lat && c.lng);

        if (coords.length === 0) {
            return {
                north: 5.45,
                south: 5.20,
                east: -3.85,
                west: -4.30
            };
        }

        const lats = coords.map(c => c.lat);
        const lngs = coords.map(c => c.lng);

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
