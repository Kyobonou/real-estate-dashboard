// Google Sheets Public API Service - Real Estate Dashboard
// Connects to published Google Sheet (no API key needed!)
// TOUTES les données proviennent UNIQUEMENT du Google Sheet

const SHEET_CSV_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRqwrLIv6E-PjF4mA6qj9EdGqJPbnnzl-g53KXsUYHC_TB9nyMDIQK75MYp7H5z06aLT4b98jOhLSXQ/pub';
const GID_LOCAUX = 0;
const GID_VISITES = 50684091;
const GID_IMAGES = 1059453156;

class GoogleSheetsService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute (increased from 30s)
        this.isOnline = navigator.onLine;
        this.listeners = new Map();
        this.pollingInterval = null;
        this.isPageVisible = !document.hidden;

        // Load cache from localStorage on init
        this.loadCacheFromStorage();

        this.setupVisibilityListener();
        this.setupOnlineListener();
    }

    loadCacheFromStorage() {
        try {
            const savedCache = localStorage.getItem('immodash_data_cache');
            if (savedCache) {
                const parsed = JSON.parse(savedCache);
                // Restore Map from array of entries
                parsed.forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
                console.log('Cache loaded from localStorage');
            }
        } catch (e) {
            console.warn('Failed to load cache from storage', e);
        }
    }

    saveCacheToStorage() {
        try {
            // Convert Map to array of entries for JSON stringify
            const cacheArray = Array.from(this.cache.entries());
            localStorage.setItem('immodash_data_cache', JSON.stringify(cacheArray));
        } catch (e) {
            console.warn('Failed to save cache to storage', e);
        }
    }

    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners('connectionChange', { online: true });
            this.pollData(); // Refresh when back online
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners('connectionChange', { online: false });
        });
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
            if (this.isPageVisible) {
                // Page became visible - check if data is stale
                const lastFetch = this.lastPollingTime || 0;
                if (Date.now() - lastFetch > this.cacheTimeout) {
                    this.pollData();
                }
            }
        });
    }

    // === FETCH & PARSE ===

    getSheetCsvUrl(gid) {
        return `${SHEET_CSV_BASE}?gid=${gid}&single=true&output=csv&t=${Date.now()}`; // Add timestamp to prevent browser caching
    }

    async fetchSheetCsv(gid, sheetName, forceRefresh = false) {
        const cacheKey = `sheet_${gid}`;
        const cached = this.cache.get(cacheKey);
        const now = Date.now();

        // If we have valid cache and not forcing refresh, return it
        if (!forceRefresh && cached && (now - cached.timestamp < this.cacheTimeout)) {
            return cached.data;
        }

        // If we have STALE cache, we can return it immediately but trigger a background refresh (Optimistic UI)
        // Only do this if we are not explicitly forcing a refresh
        if (!forceRefresh && cached) {
            // Return stale data immediately for UI responsiveness
            // BUT continue execution to fetch fresh data and update
            // We use a promise to update in background
            this.fetchAndCache(gid, sheetName, cacheKey).catch(err => console.warn('Background fetch failed', err));
            return cached.data;
        }

        // Otherwise (first load or forced refresh), wait for the fetch
        return this.fetchAndCache(gid, sheetName, cacheKey);
    }

    async fetchAndCache(gid, sheetName, cacheKey) {
        try {
            const response = await fetch(this.getSheetCsvUrl(gid), {
                method: 'GET',
                signal: AbortSignal.timeout(15000), // 15s timeout
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();

            const wasOffline = !this.isOnline;
            this.isOnline = true;
            if (wasOffline) this.notifyListeners('connectionChange', { online: true });

            const data = this.parseCsv(csvText);

            // Update cache and storage
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            this.saveCacheToStorage();

            return data;
        } catch (error) {
            console.warn(`Google Sheets fetch failed (${sheetName}):`, error.message);
            const wasOnline = this.isOnline;
            this.isOnline = false;

            // Check if it's a network error vs 404
            if (!navigator.onLine || error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
                if (wasOnline) this.notifyListeners('connectionChange', { online: false });
            }

            // Fallback to cache if available (even if stale)
            const cached = this.cache.get(cacheKey);
            if (cached) return cached.data;

            return []; // No data available
        }
    }

    parseCsv(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Double quote = escaped quote
                    currentField += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                currentRow.push(currentField.trim());
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // End of row (handle both \n and \r\n)
                if (char === '\r' && nextChar === '\n') {
                    i++; // Skip the \n in \r\n
                }
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField.trim());
                    if (currentRow.some(f => f.length > 0)) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentField = '';
                }
            } else {
                currentField += char;
            }
        }

        // Push last field and row
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.some(f => f.length > 0)) {
                rows.push(currentRow);
            }
        }

        if (rows.length === 0) return [];

        const headers = rows[0];

        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = (values[index] || '').trim();
            });
            data.push(obj);
        }
        return data;
    }

    // === DATA TRANSFORMATION ===
    // On garde les noms de colonnes EXACTS du Google Sheet
    // et on ajoute des champs calculés

    // Normaliser les types de biens pour éviter les doublons (Villa/villa, Studio/studio, etc.)
    normalizePropertyType(type) {
        if (!type) return '';

        // Convertir en minuscules pour la comparaison
        const lowerType = type.toLowerCase().trim();

        // Mapping des types normalisés (première lettre en majuscule)
        const typeMapping = {
            'villa': 'Villa',
            'studio': 'Studio',
            'appartement': 'Appartement',
            'duplex': 'Duplex',
            'maison': 'Maison',
            'bureau': 'Bureau',
            'local commercial': 'Local commercial',
            'terrain': 'Terrain',
            'immeuble': 'Immeuble',
            'entrepôt': 'Entrepôt',
            'entrepot': 'Entrepôt',
            'chambre': 'Chambre',
            'résidence': 'Résidence',
            'residence': 'Résidence',
            'loft': 'Loft',
            'penthouse': 'Penthouse',
            'rez-de-chaussée': 'Rez-de-chaussée',
            'rez de chaussee': 'Rez-de-chaussée',
            'rez-de-chaussee': 'Rez-de-chaussée'
        };

        // Retourner le type normalisé ou capitaliser la première lettre
        return typeMapping[lowerType] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }

    transformProperty(raw, index) {
        const priceStr = raw['Prix'] || '0';
        const rawPrice = parseInt(priceStr.replace(/[\s.,]/g, '')) || 0;
        const disponible = (raw['Disponible'] || '').toLowerCase();
        const isAvailable = disponible === 'oui' || disponible === 'true';
        const meubles = (raw['Meubles'] || '').toLowerCase();
        const isFurnished = meubles === 'oui' || meubles === 'true';

        // Parser les caractéristiques en liste
        const caracStr = raw['Caractéristiques'] || '';
        const features = caracStr ? caracStr.split(',').map(f => f.trim()).filter(Boolean) : [];
        if (features.length === 0 && caracStr) features.push(caracStr);

        return {
            id: index + 1,
            // Données brutes du sheet (avec normalisation du type)
            typeBien: this.normalizePropertyType(raw['Type de bien']),
            typeOffre: raw["Type d'offre"] || '',
            zone: raw['Zone géographique précise'] || '',
            commune: raw['Commune'] || '',
            prix: priceStr,
            rawPrice,
            telephone: raw['Téléphone'] || '',
            caracteristiques: caracStr,
            features,
            publiePar: raw['Publier par'] || '',
            meuble: isFurnished,
            chambres: parseInt(raw['Chambre']) || 0,
            disponible: isAvailable,
            groupeWhatsApp: raw['Groupe WhatsApp origine'] || '',
            datePublication: raw['Date de publication'] || '',
            // Champs calculés pour l'affichage
            status: isAvailable ? 'Disponible' : 'Occupé',
            prixFormate: rawPrice > 0 ? this.formatPrice(rawPrice) : priceStr,
        };
    }

    transformVisit(raw, index) {
        const dateStr = raw['Date-rv'] || '';
        const parsedDate = this.parseDate(dateStr);
        const visitProg = (raw['Visite prog'] || '').toLowerCase();
        const isScheduled = visitProg === 'oui' || visitProg === 'true';

        return {
            id: index + 1,
            // Données brutes du sheet
            nomPrenom: raw['Nom et Prenom'] || '',
            numero: raw['Numero'] || '',
            dateRv: dateStr,
            localInteresse: raw['Local interesse'] || '',
            visiteProg: isScheduled,
            // Champs calculés
            parsedDate,
            status: this.getVisitStatus(parsedDate, isScheduled),
        };
    }

    formatPrice(amount) {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M FCFA`;
        }
        return `${amount.toLocaleString('fr-FR')} FCFA`;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            return new Date(year, month, day, 10, 0, 0);
        }
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    getVisitStatus(date, isScheduled) {
        if (!isScheduled) return 'Non confirmée';
        if (!date) return 'En attente';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const visitDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (visitDay < today) return 'Terminée';
        if (visitDay.getTime() === today.getTime()) return "Aujourd'hui";
        return 'Programmée';
    }

    // === API PUBLIQUES ===

    async getProperties(forceRefresh = false) {
        // Use GID_LOCAUX for properties
        const rawData = await this.fetchSheetCsv(GID_LOCAUX, 'Locaux', forceRefresh);
        const properties = rawData
            .map((raw, i) => this.transformProperty(raw, i))
            .filter(p => p.typeBien); // Filtrer lignes vides
        return { success: true, data: properties, source: this.isOnline ? 'live' : 'cache' };
    }

    async getVisits(forceRefresh = false) {
        const rawData = await this.fetchSheetCsv(GID_VISITES, 'Visite programmé', forceRefresh);
        const visits = rawData
            .map((raw, i) => this.transformVisit(raw, i))
            .filter(v => v.nomPrenom); // Filtrer lignes vides
        return { success: true, data: visits, source: this.isOnline ? 'live' : 'cache' };
    }

    async getImagesProperties(forceRefresh = false) {
        const rawData = await this.fetchSheetCsv(GID_IMAGES, 'Images Immobilier', forceRefresh);
        const properties = rawData
            .map((raw, i) => this.transformImageProperty(raw, i))
            .filter(p => p.typeBien);
        return { success: true, data: properties, source: this.isOnline ? 'live' : 'cache' };
    }

    transformImageProperty(raw, index) {
        // La feuille "Images Immobilier" a des noms de colonnes différents (avec underscores)
        const priceStr = raw['Prix'] || '0';
        const rawPrice = parseInt(priceStr.replace(/[\s.,]/g, '')) || 0;
        const disponible = (raw['Disponible'] || '').toLowerCase();
        const isAvailable = disponible === 'oui' || disponible === 'true';
        const meubles = (raw['Meubles'] || '').toLowerCase();
        const isFurnished = meubles === 'oui' || meubles === 'true';

        // Parser les caractéristiques en liste
        const caracStr = raw['Caracteristiques'] || '';
        const features = caracStr ? caracStr.split(',').map(f => f.trim()).filter(Boolean) : [];
        if (features.length === 0 && caracStr) features.push(caracStr);

        // Récupérer l'URL de l'image - essayer différentes variantes
        const imageUrl = raw['image_url'] || raw['Image'] || raw['Photo'] || raw['url_image'] || '';

        return {
            id: index + 1,
            // Données du sheet (noms avec underscores)
            typeBien: raw['Type_de_bien'] || raw['Type de bien'] || '',
            typeOffre: raw['Type_offre'] || raw["Type d'offre"] || '',
            zone: raw['Zone_geographique'] || raw['Zone géographique précise'] || raw['Quartier'] || '',
            commune: raw['Commune'] || '',
            prix: priceStr,
            rawPrice,
            telephone: raw['Telephone'] || raw['Téléphone'] || '',
            caracteristiques: caracStr,
            features,
            publiePar: raw['Publier par'] || 'Non spécifié',
            meuble: isFurnished,
            chambres: parseInt(raw['Chambre']) || 0,
            disponible: isAvailable,
            datePublication: raw['timestamp'] || raw['Date de publication'] || '',
            // Image URL
            imageUrl: imageUrl,
            // Champs calculés
            status: isAvailable ? 'Disponible' : 'Occupé',
            prixFormate: rawPrice > 0 ? this.formatPrice(rawPrice) : priceStr,
        };
    }

    async getStats(forceRefresh = false) {
        // We reuse getProperties/getVisits which will use cache if available
        const [propertiesRes, visitsRes] = await Promise.all([
            this.getProperties(forceRefresh),
            this.getVisits(forceRefresh),
        ]);

        const properties = propertiesRes.data;
        const visits = visitsRes.data;

        // Stats calculées UNIQUEMENT depuis les données du Sheet
        const totalBiens = properties.length;
        const biensDisponibles = properties.filter(p => p.disponible).length;
        const biensOccupes = properties.filter(p => !p.disponible).length;
        const totalVisites = visits.length;
        const visitesConfirmees = visits.filter(v => v.visiteProg).length;
        const visitesAujourdhui = visits.filter(v => v.status === "Aujourd'hui").length;
        const visitesProgrammees = visits.filter(v => v.status === 'Programmée').length;
        const visitesTerminees = visits.filter(v => v.status === 'Terminée').length;

        // Distribution par type de bien
        const parType = {};
        properties.forEach(p => {
            const type = p.typeBien || 'Autre';
            parType[type] = (parType[type] || 0) + 1;
        });

        // Distribution par zone
        const parZone = {};
        properties.forEach(p => {
            // Extraire la ville/quartier principal
            const zone = (p.zone.split(',')[0] || 'Autre').trim();
            parZone[zone] = (parZone[zone] || 0) + 1;
        });

        // Distribution par disponibilité
        const parDisponibilite = {
            'Disponible': biensDisponibles,
            'Occupé': biensOccupes,
        };

        // Biens meublés vs non meublés
        const meubles = properties.filter(p => p.meuble).length;
        const nonMeubles = properties.filter(p => !p.meuble).length;

        // Prix moyen, min, max
        const prixList = properties.map(p => p.rawPrice).filter(p => p > 0);
        const prixMoyen = prixList.length > 0 ? prixList.reduce((a, b) => a + b, 0) / prixList.length : 0;
        const prixMin = prixList.length > 0 ? Math.min(...prixList) : 0;
        const prixMax = prixList.length > 0 ? Math.max(...prixList) : 0;

        // Nombre de chambres moyen
        const chambresList = properties.map(p => p.chambres).filter(c => c > 0);
        const chambresMoyen = chambresList.length > 0 ? chambresList.reduce((a, b) => a + b, 0) / chambresList.length : 0;

        return {
            success: true,
            data: {
                totalBiens,
                biensDisponibles,
                biensOccupes,
                totalVisites,
                visitesConfirmees,
                visitesAujourdhui,
                visitesProgrammees,
                visitesTerminees,
                parType,
                parZone,
                parDisponibilite,
                meubles,
                nonMeubles,
                prixMoyen,
                prixMin,
                prixMax,
                chambresMoyen,
                prixList,
            },
            source: this.isOnline ? 'live' : 'cache',
        };
    }

    // === CLIENTS - Extraits des visites ===
    async getClients(forceRefresh = false) {
        try {
            // Utiliser getVisits pour avoir les données déjà transformées et propres
            const visitsRes = await this.getVisits(forceRefresh);

            if (!visitsRes.success || !visitsRes.data) {
                return { success: false, data: [], source: 'cache' };
            }

            const visits = visitsRes.data;
            const clientsMap = new Map();

            visits.forEach(visit => {
                if (!visit.nomPrenom) return;

                // Clé de déduplication : Numéro (nettoyé) ou Nom
                const cleanPhone = visit.numero ? visit.numero.replace(/\s/g, '').replace(/-/g, '') : '';
                const key = cleanPhone || visit.nomPrenom.toLowerCase().trim();

                if (!clientsMap.has(key)) {
                    clientsMap.set(key, {
                        nomPrenom: visit.nomPrenom,
                        numero: visit.numero,
                        totalVisites: 0,
                        visitesConfirmees: 0,
                        zonesInteret: new Set(), // Set pour éviter les doublons
                        visites: [],
                        premiereVisite: null,
                        derniereVisite: null,
                        statut: 'Nouveau'
                    });
                }

                const client = clientsMap.get(key);

                // Agrégation des données
                client.totalVisites++;
                if (visit.visiteProg) client.visitesConfirmees++;

                if (visit.localInteresse) {
                    // Nettoyer un peu la zone (enlever les détails superflus si besoin)
                    const zone = visit.localInteresse.split(',')[0].trim();
                    client.zonesInteret.add(zone);
                }

                client.visites.push(visit);

                // Calcul dates min/max
                const vDate = visit.parsedDate;
                if (vDate) {
                    if (!client.premiereVisite || vDate < client.premiereVisite) client.premiereVisite = vDate;
                    if (!client.derniereVisite || vDate > client.derniereVisite) client.derniereVisite = vDate;
                }
            });

            // Transformation finale en tableau
            const clients = Array.from(clientsMap.values()).map((c, index) => {
                // Règles de gestion pour le statut
                let statut = 'Nouveau';
                if (c.visitesConfirmees > 0 || c.totalVisites > 2) {
                    statut = 'Actif';
                }

                // Inactif si dernière visite > 3 mois
                if (c.derniereVisite) {
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    if (c.derniereVisite < threeMonthsAgo) {
                        statut = 'Inactif';
                    }
                }

                return {
                    id: index + 1,
                    nomPrenom: c.nomPrenom,
                    numero: c.numero,
                    statut: statut,
                    totalVisites: c.totalVisites,
                    visitesConfirmees: c.visitesConfirmees,
                    zonesInteret: Array.from(c.zonesInteret), // Convertir Set en Array
                    visites: c.visites.sort((a, b) => (b.parsedDate || 0) - (a.parsedDate || 0)),
                    premiereVisite: c.premiereVisite,
                    derniereVisite: c.derniereVisite,
                };
            });

            // Tri par date de dernière visite décroissante
            clients.sort((a, b) => {
                const dateA = a.derniereVisite || new Date(0);
                const dateB = b.derniereVisite || new Date(0);
                return dateB - dateA;
            });

            return { success: true, data: clients, source: this.isOnline ? 'live' : 'cache' };

        } catch (error) {
            console.error('Error calculating clients:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    // === AUTH ===

    async login(email, password) {
        const validUsers = [
            { email: 'admin@immodash.ci', password: 'Admin2026!', name: 'Agent Immo', role: 'admin', avatar: 'AI' },
            { email: 'agent@immodash.ci', password: 'Agent2026!', name: 'Agent Terrain', role: 'agent', avatar: 'AT' },
            { email: 'demo@immodash.ci', password: 'Demo2026!', name: 'Utilisateur Demo', role: 'viewer', avatar: 'UD' },
        ];

        const user = validUsers.find(u => u.email === email && u.password === password);
        if (user) {
            const token = btoa(JSON.stringify({ email: user.email, role: user.role, exp: Date.now() + 86400000 }));
            return { success: true, token, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } };
        }
        return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    validateToken(token) {
        try {
            const payload = JSON.parse(atob(token));
            return payload.exp > Date.now();
        } catch {
            return false;
        }
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }

    // === POLLING ===

    startPolling(interval = 30000) {
        this.stopPolling();

        // Initial poll (after a short delay to allow app to mount)
        setTimeout(() => this.pollData(), 1000);

        this.pollingInterval = setInterval(() => this.pollData(), interval);
        console.log(`Polling started (every ${interval}ms)`);
    }

    async pollData() {
        // Skip polling if page is not visible
        if (!this.isPageVisible) {
            return;
        }

        try {
            this.lastPollingTime = Date.now();
            const [properties, visits] = await Promise.all([
                this.getProperties(),
                this.getVisits(),
            ]);

            const stats = await this.getStats();

            this.notifyListeners('dataUpdate', { properties, visits, stats });
        } catch (error) {
            console.warn('Polling error:', error);
        }
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // === EVENTS ===

    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) callbacks.splice(index, 1);
            }
        };
    }

    notifyListeners(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
}

export const googleSheetsApi = new GoogleSheetsService();
export default googleSheetsApi;
