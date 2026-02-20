import { supabase } from './supabaseClient';

// ── Mots-clés indiquant une demande de recherche (pas une offre immobilière) ──
// Si le message_initial d'une entrée locaux contient l'un de ces mots-clés,
// c'est une demande mal classifiée → exclure de Biens, inclure dans Demandes.
const DEMAND_KEYWORDS = [
    'je cherche', 'on cherche', 'nous cherchons', 'recherche urgente',
    'qui a un', 'qui a une', 'avec un budget', 'quelqu\'un qui a',
    'urgent pour', 'asap', 'chers collègues', 'cher collègue', 'chère collègue',
    'besoin de toute urgence', 'besoin toute urgence', 'un client a besoin',
    'ma cliente a besoin', 'cherche pour', 'sollicite', 'mon client cherche',
    'ma cliente cherche', 'mon client', 'ma cliente', 'ai un client',
    'ai une cliente', 'besoin d\'un', 'besoin d\'une', 'cherche un',
    'cherche une', 'recherche un', 'recherche une', 'besoin urgent',
    'qui dispose de', 'quelqu\'un a un', 'quelqu\'un a une',
    'qui a quelque chose', 'cherche urgemment', 'confrère', 'consoeur',
    'client a besoin', 'cliente a besoin', 'budget de', 'budget max',
    'au maximum', 'maxi loyer', 'loyer max', 'prix maxi',
];

function _isDemand(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return DEMAND_KEYWORDS.some(kw => lower.includes(kw));
}

class SupabaseService {
    constructor() {
        this.listeners = new Map();
        // In-memory cache with 90s TTL — avoids duplicate Supabase calls across pages
        this._cache = {};
        this._cacheTTL = 90000;
    }

    _getCached(key) {
        const entry = this._cache[key];
        if (entry && Date.now() - entry.ts < this._cacheTTL) return entry.data;
        return null;
    }

    _setCache(key, data) {
        this._cache[key] = { data, ts: Date.now() };
    }

    _invalidate(key) {
        delete this._cache[key];
    }

    // === HELPERS ===

    parsePrice(amount) {
        if (!amount) return 0;
        let str = String(amount).replace(/FCFA|CFA|F/gi, '').trim();
        let lowerStr = str.toLowerCase();
        let multiplier = 1;
        let hasShorthand = false;

        if (lowerStr.endsWith('m') || lowerStr.includes('mill')) {
            multiplier = 1000000;
            str = str.replace(/m|millions?|mill/gi, '').trim();
            hasShorthand = true;
        } else if (lowerStr.endsWith('k')) {
            multiplier = 1000;
            str = str.replace(/k/gi, '').trim();
            hasShorthand = true;
        }

        let cleaned;
        if (hasShorthand) {
            cleaned = str.replace(',', '.');
            const parts = cleaned.split('.');
            if (parts.length > 2) cleaned = cleaned.replace(/\./g, '');
        } else {
            cleaned = str.replace(/[\s.,]/g, '');
        }

        const num = parseFloat(cleaned) * multiplier;
        return isNaN(num) ? 0 : Math.floor(num);
    }

    formatPrice(amount) {
        if (!amount) return '0';
        const num = typeof amount === 'number' ? amount : this.parsePrice(amount);
        return num.toLocaleString('fr-FR');
    }

    formatDateShort(raw) {
        if (!raw) return '';
        try {
            const d = new Date(raw);
            if (isNaN(d.getTime())) return raw;
            return d.toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return raw; }
    }

    normalizePropertyType(type) {
        if (!type) return 'Autre';
        const lowerType = type.toLowerCase().trim();
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
            'loft': 'Loft',
            'penthouse': 'Penthouse'
        };
        return typeMapping[lowerType] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }

    getVisitStatus(dateVal, isScheduled) {
        if (!isScheduled) return 'Non confirmée';
        if (!dateVal) return 'En attente';

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const visitDay = new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());

        if (visitDay < today) return 'Terminée';
        if (visitDay.getTime() === today.getTime()) return "Aujourd'hui";
        return 'Programmée';
    }

    // === IMAGES (NEW FEATURE) ===
    async getImages(forceRefresh = false) {
        try {
            const { data, error } = await supabase
                .from('images')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2000);

            if (error) throw error;

            return { success: true, data: data, source: 'supabase' };
        } catch (error) {
            console.error('Supabase Images Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    // Fetch all images for a single publication (used in property modal)
    async getImagesForPublication(publicationId) {
        if (!publicationId) return [];
        try {
            const { data, error } = await supabase
                .from('images')
                .select('id, publication_id, lien_image, lien_thumb, horodatage, image_order, message_id')
                .eq('publication_id', publicationId)
                .order('image_order', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) { return []; }
    }

    // Batch fetch images grouped by publication_id (used for galleries)
    async getImagesForPublications(publicationIds) {
        if (!publicationIds || publicationIds.length === 0) return {};
        try {
            const { data, error } = await supabase
                .from('images')
                .select('id, publication_id, lien_image, lien_thumb, horodatage, image_order, message_id')
                .in('publication_id', publicationIds)
                .order('image_order', { ascending: true });
            if (error) return {};
            const grouped = {};
            (data || []).forEach(img => {
                if (!grouped[img.publication_id]) grouped[img.publication_id] = [];
                grouped[img.publication_id].push(img);
            });
            return grouped;
        } catch (e) { return {}; }
    }

    // === DEMANDES (REQUESTS) ===
    async getRequests(forceRefresh = false) {
        try {
            // Fetch publications (group + private WA messages) and
            // demand-matching entries from locaux (misclassified by AI) in parallel
            const [pubRes, locauxRes] = await Promise.all([
                supabase
                    .from('publications')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(500),
                supabase
                    .from('locaux')
                    .select('id, message_initial, expediteur, telephone_expediteur, telephone_bien, telephone, groupe_whatsapp_origine, date_publication, ref_bien')
                    .order('date_publication', { ascending: false })
                    .limit(300)
            ]);

            const publications = pubRes.error ? [] : (pubRes.data || []);

            // Convert demand-matching locaux entries into publication-shaped objects
            const locauxDemandes = (locauxRes.error ? [] : (locauxRes.data || []))
                .filter(p => _isDemand(p.message_initial))
                .map(p => ({
                    id: 'locaux_' + p.id,
                    message: p.message_initial || '',
                    expediteur: p.expediteur || '',
                    telephone: p.telephone_expediteur || p.telephone_bien || p.telephone || '',
                    // Normalize groupe to @g.us format so RequestsPage treats as group message
                    groupe: p.groupe_whatsapp_origine
                        ? (p.groupe_whatsapp_origine.includes('@') ? p.groupe_whatsapp_origine : p.groupe_whatsapp_origine + '@g.us')
                        : 'groupe@g.us',
                    nom_groupe: p.groupe_whatsapp_origine || '',
                    horodatage: p.date_publication || '',
                    type: 'text',
                    _from_locaux: true,
                    _ref_bien: p.ref_bien || '',
                }));

            return { success: true, data: [...publications, ...locauxDemandes], source: 'supabase' };
        } catch (error) {
            console.error('Supabase Requests Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    // === CORE METHODS ===

    async getProperties(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = this._getCached('properties');
            if (cached) return cached;
        }
        try {
            // Add LIMIT to prevent loading ALL records - fetch in batches if needed
            const { data, error } = await supabase.from('locaux').select('*').limit(1000);
            if (error) throw error;

            const transformed = data.map(p => {
                // Determine boolean values from text 'Oui'/'Non'
                const isDispo = (p.disponible && typeof p.disponible === 'string' && p.disponible.toLowerCase() === 'oui') || p.disponible === true;
                const isMeuble = (p.meubles && typeof p.meubles === 'string' && p.meubles.toLowerCase() === 'oui') || p.meubles === true;

                // Parse Price (handle text with shorthand M, k, FCFA)
                const priceStr = p.prix || '0';
                const rawPrice = this.parsePrice(priceStr);

                return {
                    id: p.id,
                    refBien: p.ref_bien || '',
                    publicationId: p.publication_id || '',
                    contentHash: p.content_hash || '',  // NEW: deduplication hash
                    messageHash: p.message_hash || '',
                    typeBien: this.normalizePropertyType(p.type_de_bien),
                    typeOffre: p.type_offre || '',
                    zone: p.zone_geographique || '',
                    commune: p.commune || '',
                    quartier: p.quartier || '',
                    locationLabel: [p.commune, p.quartier].filter(Boolean).join(' - ') || p.zone_geographique || '',
                    prix: priceStr,
                    rawPrice: rawPrice,
                    telephoneBien: p.telephone_bien || p.telephone || '',  // Contact number for the property
                    telephoneExpediteur: p.telephone_expediteur || p.telephone || '',  // Sharer's phone number
                    caracteristiques: p.caracteristiques || '',
                    description: p.message_initial || p.caracteristiques || '',
                    features: p.caracteristiques ? p.caracteristiques.split(/,|\||\n/).map(s => s.trim()) : [],
                    publiePar: p.publie_par || '',
                    expediteur: p.expediteur || '',  // NEW: name of sharer
                    meubles: p.meubles || 'Non',
                    meuble: isMeuble,
                    chambre: p.chambre || 0,
                    chambres: parseInt(p.chambre) || 0,
                    disponible: isDispo,
                    groupeWhatsApp: p.groupe_whatsapp_origine || '',
                    imageUrl: p.lien_image || '',
                    datePublication: this.formatDateShort(p.date_publication),
                    shares: (() => { try { return p.shares ? (typeof p.shares === 'string' ? JSON.parse(p.shares) : p.shares) : []; } catch { return []; } })(),
                    status: isDispo ? 'Disponible' : 'Occupé',
                    prixFormate: this.formatPrice(rawPrice)
                };
            });

            // Optimized single-pass deduplication
            // Combines: publication_id, content_hash, and text fingerprint checks
            const seenPubIds = new Set();
            const seenHashes = new Set();
            const seenTextFp = new Set();
            const deduped = [];

            for (const p of transformed) {
                // Skip if demand (misclassified)
                if (_isDemand(p.description)) continue;

                // Check publication_id (same message processed multiple times)
                const pubKey = p.publicationId || ('id:' + p.id);
                if (seenPubIds.has(pubKey)) continue;
                seenPubIds.add(pubKey);

                // Check content_hash (same property shared in multiple groups)
                if (p.contentHash && seenHashes.has(p.contentHash)) continue;
                if (p.contentHash) seenHashes.add(p.contentHash);

                // Check text fingerprint (copied messages with same content)
                let isDupText = false;
                if (p.description && p.description.length > 20) {
                    const fp = p.description
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .substring(0, 250);
                    if (fp.length > 20) {
                        if (seenTextFp.has(fp)) isDupText = true;
                        else seenTextFp.add(fp);
                    }
                }
                if (isDupText) continue;

                deduped.push(p);
            }

            console.debug(`[Dédup] DB:${transformed.length} → deduplicated:${deduped.length}`);
            const trueProperties = deduped;

            const result = { success: true, data: trueProperties, source: 'supabase' };
            this._setCache('properties', result);
            return result;
        } catch (error) {
            console.error('Supabase Properties Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    async getImagesProperties(forceRefresh = false) {
        const response = await this.getProperties(forceRefresh);
        if (!response.success) return response;

        // Batch-fetch all images for all properties in one query
        const pubIds = response.data.filter(p => p.publicationId).map(p => p.publicationId);
        const imagesMap = await this.getImagesForPublications(pubIds);

        // Enrich each property with its linked images
        const enriched = response.data.map(p => {
            const linkedImages = imagesMap[p.publicationId] || [];
            const extraUrls = linkedImages.map(i => i.lien_image).filter(Boolean);
            return {
                ...p,
                images: linkedImages,
                imageUrls: extraUrls,
                // Primary image: lien_image from locaux first, then first from images table
                imageUrl: p.imageUrl || extraUrls[0] || '',
                photoCount: linkedImages.length
            };
        });

        const withImages = enriched.filter(p => p.imageUrl || p.images.length > 0);
        return { success: true, data: withImages, source: response.source };
    }

    async getPropertyByRef(refBien) {
        if (!refBien) return { success: false, data: null };
        try {
            const { data, error } = await supabase
                .from('locaux')
                .select('*')
                .ilike('ref_bien', refBien)
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return { success: false, data: null };
            return {
                success: true,
                data: {
                    refBien: data.ref_bien || '',
                    typeBien: this.normalizePropertyType(data.type_de_bien),
                    typeOffre: data.type_offre || '',
                    zone: data.zone_geographique || '',
                    commune: data.commune || '',
                    quartier: data.quartier || '',
                    prix: data.prix || '',
                    prixFormate: this.formatPrice(data.prix),
                    telephoneBien: data.telephone_bien || data.telephone || '',
                    telephoneExpediteur: data.telephone_expediteur || data.telephone || '',
                    expediteur: data.expediteur || data.publie_par || '',
                    groupeWhatsappOrigine: data.groupe_whatsapp_origine || '',
                    description: data.message_initial || data.caracteristiques || '',
                    disponible: data.disponible || '',
                    chambre: data.chambre || '',
                    meubles: data.meubles || '',
                }
            };
        } catch (error) {
            console.error('getPropertyByRef Error:', error);
            return { success: false, data: null };
        }
    }

    async getVisits(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = this._getCached('visits');
            if (cached) return cached;
        }
        try {
            const { data, error } = await supabase.from('visite_programmee').select('*').limit(500);
            if (error) throw error;

            const transformed = data.map(v => {
                // Parse date
                let dateRv = null;
                if (v.date_rv) {
                    dateRv = new Date(v.date_rv);
                    // Fallback for custom formats if JS Date fails or simple ISO check
                    if (isNaN(dateRv.getTime()) && typeof v.date_rv === 'string') {
                        // Try DD/MM/YYYY or DD/MM/YYYY HH:MM
                        // Or try stripping " le " etc.
                        // Simplest fallback for now if standard parsing fails
                    }
                }

                const isScheduled = (v.visite_prog && typeof v.visite_prog === 'string' && v.visite_prog.toLowerCase() === 'oui') || v.visite_prog === true;

                return {
                    id: v.id,
                    nomPrenom: v.nom_prenom || 'Client Inconnu',
                    numero: v.numero || '',
                    dateRv: v.date_rv, // keep raw text
                    localInteresse: v.local_interesse || '',
                    refBien: v.ref_bien || '',  // NEW: property reference code from workflow
                    visiteProg: isScheduled,
                    // Calculated
                    parsedDate: (dateRv && !isNaN(dateRv.getTime())) ? dateRv : null,
                    status: this.getVisitStatus(dateRv, isScheduled)
                };
            });

            const result = { success: true, data: transformed, source: 'supabase' };
            this._setCache('visits', result);
            return result;
        } catch (error) {
            console.error('Supabase Visits Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    async getStats(forceRefresh = false) {
        try {
            // Fetch both in parallel
            const [propsRes, visitsRes] = await Promise.all([
                this.getProperties(),
                this.getVisits()
            ]);

            const properties = propsRes.data || [];
            const visits = visitsRes.data || [];

            // Calculate stats locally (same logic as GoogleSheetsService to maintain consistent UI)
            const totalBiens = properties.length;
            const biensDisponibles = properties.filter(p => p.disponible).length;
            const biensOccupes = properties.filter(p => !p.disponible).length;

            const totalVisites = visits.length;
            const visitesConfirmees = visits.filter(v => v.visiteProg).length;
            const visitesAujourdhui = visits.filter(v => v.status === "Aujourd'hui").length;
            const visitesProgrammees = visits.filter(v => v.status === 'Programmée').length;
            const visitesTerminees = visits.filter(v => v.status === 'Terminée').length;

            const parType = {};
            properties.forEach(p => {
                const t = p.typeBien || 'Autre';
                parType[t] = (parType[t] || 0) + 1;
            });

            const parZone = {};
            properties.forEach(p => {
                const z = (p.zone.split(',')[0] || 'Autre').trim();
                parZone[z] = (parZone[z] || 0) + 1;
            });

            const parCommune = {};
            properties.forEach(p => {
                const c = (p.commune || p.zone.split(',')[0] || 'Autre').trim();
                parCommune[c] = (parCommune[c] || 0) + 1;
            });

            const uniqueClients = new Set(visits.map(v => v.numero || v.nomPrenom).filter(Boolean));

            // Prices
            const prixList = properties.map(p => p.rawPrice).filter(p => p > 0);
            const prixMoyen = prixList.length ? prixList.reduce((a, b) => a + b, 0) / prixList.length : 0;
            const prixMin = prixList.length ? Math.min(...prixList) : 0;
            const prixMax = prixList.length ? Math.max(...prixList) : 0;

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
                    parCommune,
                    totalClients: uniqueClients.size,
                    parDisponibilite: { 'Disponible': biensDisponibles, 'Occupé': biensOccupes },
                    prixMoyen,
                    prixMin,
                    prixMax,
                    prixList
                },
                source: 'supabase'
            };

        } catch (error) {
            console.error('Supabase Stats Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPipeline(forceRefresh = false) {
        try {
            const visitsRes = await this.getVisits();
            if (!visitsRes.success) return { success: false, data: [] };

            const visits = visitsRes.data;
            const items = visits.map(v => ({
                id: v.id.toString(),
                content: v.nomPrenom || "Client Inconnu",
                property: v.localInteresse || "Bien non spécifié",
                date: v.dateRv ? new Date(v.dateRv).toLocaleDateString() : "Date inconnue",
                price: "Budget N/A",
                tags: v.visiteProg ? ["Programmée"] : ["À planifier"],
                status: this.mapVisitToPipelineStatus(v),
                originalData: v
            }));

            return { success: true, data: items };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    mapVisitToPipelineStatus(visit) {
        if (visit.status === 'Terminée') return 'closed';
        if (visit.status === "Aujourd'hui") return 'scheduled';
        if (visit.visiteProg) return 'scheduled';
        return 'leads';
    }

    async getClients(forceRefresh = false) {
        // Logic reused from getVisits + aggregation locally
        // (Similar to googleSheetsApi version)
        try {
            const visitsRes = await this.getVisits();
            if (!visitsRes.success) return { success: false, data: [] };

            const visits = visitsRes.data;
            const clientsMap = new Map();

            visits.forEach(visit => {
                if (!visit.nomPrenom) return;
                const cleanPhone = visit.numero ? visit.numero.replace(/\s/g, '').replace(/-/g, '') : '';
                const key = cleanPhone || visit.nomPrenom.toLowerCase().trim();

                if (!clientsMap.has(key)) {
                    clientsMap.set(key, {
                        nomPrenom: visit.nomPrenom,
                        numero: visit.numero,
                        totalVisites: 0,
                        visitesConfirmees: 0,
                        zonesInteret: new Set(),
                        biensInteret: new Set(),  // NEW: track interested property refs
                        visites: [],
                        premiereVisite: null,
                        derniereVisite: null,
                        statut: 'Nouveau'
                    });
                }
                const client = clientsMap.get(key);
                client.totalVisites++;
                if (visit.visiteProg) client.visitesConfirmees++;
                if (visit.localInteresse) client.zonesInteret.add(visit.localInteresse.split(',')[0].trim());
                if (visit.refBien) client.biensInteret.add(visit.refBien);  // NEW: track by ref_bien
                client.visites.push(visit);

                const vDate = visit.parsedDate;
                if (vDate) {
                    if (!client.premiereVisite || vDate < client.premiereVisite) client.premiereVisite = vDate;
                    if (!client.derniereVisite || vDate > client.derniereVisite) client.derniereVisite = vDate;
                }
            });

            // Status logic
            const clients = Array.from(clientsMap.values()).map((c, idx) => {
                let statut = 'Nouveau';
                if (c.visitesConfirmees > 0 || c.totalVisites > 2) statut = 'Actif';

                if (c.derniereVisite) {
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    if (c.derniereVisite < threeMonthsAgo) statut = 'Inactif';
                }

                return {
                    id: idx + 1,
                    nomPrenom: c.nomPrenom,
                    numero: c.numero,
                    statut: statut,
                    totalVisites: c.totalVisites,
                    visitesConfirmees: c.visitesConfirmees,
                    zonesInteret: Array.from(c.zonesInteret),
                    biensInteret: Array.from(c.biensInteret),  // NEW: list of interested property refs
                    visites: c.visites,
                    premiereVisite: c.premiereVisite,
                    derniereVisite: c.derniereVisite
                };
            });

            clients.sort((a, b) => (b.derniereVisite || 0) - (a.derniereVisite || 0));
            return { success: true, data: clients };

        } catch (error) {
            return { success: false, error: error.message, data: [] };
        }
    }

    // === AUTH ===
    // Use Supabase Auth for real usage, but for now fallback to the hardcoded list 
    // to maintain existing "demo" users without forcing user to create Auth Users in Supabase yet.
    // Or we can query a 'users' table if created.
    async login(email, password) {
        // Fallback legacy login for smooth transition
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
        } catch { return false; }
    }

    getToken() { return localStorage.getItem('auth_token'); }

    // === POLLING COMPATIBILITY ===
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

    startPolling(interval = 30000) {
        // Just do one initial fetch and then notify
        this.pollData();
        this.pollingInterval = setInterval(() => this.pollData(), interval);
    }

    stopPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    }

    async pollData() {
        // Fetch new data and notify listeners 'dataUpdate'
        try {
            const stats = await this.getStats();
            const properties = await this.getProperties();
            const visits = await this.getVisits();

            if (stats.success && properties.success && visits.success) {
                this.notifyListeners('dataUpdate', {
                    properties: properties.data,
                    visits: visits.data,
                    stats: stats.data
                });
            }
        } catch (e) { console.error("Poll error", e); }
    }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
