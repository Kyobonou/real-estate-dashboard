import { supabase } from './supabaseClient';
import { whatsappGroupService } from './whatsappGroupService';

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
        this._pendingRequests = {}; // Prévenir les appels parallèles dupliqués
        this._cacheTTL = 300000; // 5 minutes TTL pour améliorer la fluidité de la navigation
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

    _getErrorMessage(error) {
        if (!error) return 'Une erreur inconnue s\'est produite';

        const message = error.message || error.toString();

        // Network/Connection errors
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return 'Erreur de connexion. Vérifiez votre internet.';
        }

        // Timeout
        if (message.includes('timeout')) {
            return 'Temps d\'attente dépassé. Le serveur ne répond pas.';
        }

        // Auth errors
        if (message.includes('401') || message.includes('Unauthorized')) {
            return 'Authentification échouée. Veuillez vous reconnecter.';
        }

        // Permission errors
        if (message.includes('403') || message.includes('Forbidden')) {
            return 'Accès refusé. Vous n\'avez pas les permissions.';
        }

        // Not found
        if (message.includes('404') || message.includes('Not found')) {
            return 'Ressource non trouvée.';
        }

        // Server errors
        if (message.includes('500') || message.includes('Server')) {
            return 'Erreur serveur. Veuillez réessayer plus tard.';
        }

        // Default: use original message if it's meaningful
        return message.length > 100 ? 'Une erreur est survenue. Veuillez réessayer.' : message;
    }

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

    formatPrice(amount, messageText = '') {
        if (!amount) return '0';
        const num = typeof amount === 'number' ? amount : this.parsePrice(amount);

        let formatted = num.toLocaleString('fr-FR');
        if (num >= 1000000) {
            const millions = num / 1000000;
            formatted = Number.isInteger(millions)
                ? millions + ' Millions'
                : millions.toLocaleString('fr-FR') + ' Millions';
        }

        // Check BOTH conditions:
        // 1. Message contains "m²" or "m2" or "M2"
        // 2. Price format in message contains "prix ... / m²" with flexible syntax
        if (messageText) {
            const lowerMsg = messageText.toLowerCase();
            const hasMeterSquare = lowerMsg.includes('m²') || lowerMsg.includes('m2');

            // Multiple regex patterns for price format variants:
            // Pattern 1: "prix..." / "m²" - main pattern with prix keyword
            // Pattern 2: "frs/" or "fcfa/" - direct amount with currency
            // Pattern 3: "prix;" - semicolon variant without slash
            const pricePatterns = [
                /(?:au\s+)?prix\s*(?:de\s+)?[^\/]*\/\s*(m²|m2|M2)/i,  // "prix : 30000 / M2"
                /(?:frs|fcfa)\s*\/\s*(m²|m2|M2)/i,                      // "35.000 frs/ M2"
                /prix\s*[;:]\s*\d[\d\s,]*\s+(m²|m2|M2)/i                // "PRIX; 35000 m2" or "PRIX: 35000 m2"
            ];
            const hasPrice = pricePatterns.some(pattern => pattern.test(messageText));

            if (hasMeterSquare && hasPrice) {
                return `${formatted} FCFA/m²`;
            }

            // Patterns relaxés : prix par m2 sans slash explicite
            // "en vente à 35 milles m2", "35 000 le m2", "à partir de 35 000 FCFA m2"
            const relaxedPatterns = [
                /\d[\d\s.,]*\s*(mille|million)s?\s*(m²|m2)/i,     // "35 milles m2"
                /(?:à\s+partir\s+de|vente\s+à|vendu\s+à|proposé\s+à)\s+\d[\d\s.,]*(mille|million)s?\s*(m²|m2)/i,
                /\d[\d\s.,]*(frs?|fcfa)?\s+le\s+(m²|m2)/i,
            ];
            const hasRelaxedPrice = relaxedPatterns.some(pattern => pattern.test(messageText));
            if (hasMeterSquare && hasRelaxedPrice) {
                return `à partir de ${formatted} FCFA/m²`;
            }
        }

        return formatted;
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

            // Enrich with WhatsApp group names
            const enriched = await whatsappGroupService.enrichWithGroupNames(data || [], 'groupe');

            return { success: true, data: enriched, source: 'supabase' };
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
                .or(`publication_id.eq.${publicationId},message_id.eq.${publicationId}`)
                .order('image_order', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) { return []; }
    }

    // Batch fetch images grouped by publication_id (used for galleries)
    async getImagesForPublications(publicationIds) {
        if (!publicationIds || publicationIds.length === 0) return {};
        try {
            // First try with message_id as it contains the id in the current db state
            const { data: dataMsg, error: errMsg } = await supabase
                .from('images')
                .select('id, publication_id, lien_image, lien_thumb, horodatage, image_order, message_id')
                .in('message_id', publicationIds)
                .order('image_order', { ascending: true });

            // Then try with publication_id for backward compatibility
            const { data: dataPub, error: errPub } = await supabase
                .from('images')
                .select('id, publication_id, lien_image, lien_thumb, horodatage, image_order, message_id')
                .in('publication_id', publicationIds)
                .order('image_order', { ascending: true });

            const grouped = {};
            const allData = [...(dataMsg || []), ...(dataPub || [])];

            // Filter duplicates if any
            const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values());

            uniqueData.forEach(img => {
                const pubKey = img.publication_id;
                const msgKey = img.message_id;

                if (pubKey) {
                    if (!grouped[pubKey]) grouped[pubKey] = [];
                    grouped[pubKey].push(img);
                }
                // If message_id is different, add it there too to ensure mapping
                if (msgKey && msgKey !== pubKey) {
                    if (!grouped[msgKey]) grouped[msgKey] = [];
                    grouped[msgKey].push(img);
                }
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

            const allRequests = [...publications, ...locauxDemandes];

            // Enrich with WhatsApp group names
            const enriched = await whatsappGroupService.enrichWithGroupNames(allRequests, 'groupe');

            return { success: true, data: enriched, source: 'supabase' };
        } catch (error) {
            console.error('Supabase Requests Error:', error);
            const errorMessage = this._getErrorMessage(error);
            return { success: false, error: errorMessage, data: [] };
        }
    }

    // === CORE METHODS ===

    // Returns total count of locaux rows matching optional server-side filters
    async getTotalCount(filters = null) {
        try {
            let query = supabase.from('locaux').select('*', { count: 'exact', head: true });
            if (filters) {
                if (filters.commune && filters.commune !== 'all') query = query.eq('commune', filters.commune);
                if (filters.typeOffre && filters.typeOffre !== 'all') query = query.eq('type_offre', filters.typeOffre);
                if (filters.typeBien && filters.typeBien !== 'all') query = query.ilike('type_de_bien', `%${filters.typeBien}%`);
                if (filters.disponible) query = query.eq('disponible', true);
                if (filters.search) {
                    const s = filters.search;
                    query = query.or(`commune.ilike.%${s}%,type_de_bien.ilike.%${s}%,quartier.ilike.%${s}%`);
                }
            }
            const { count, error } = await query;
            if (error) throw error;
            return count || 0;
        } catch (e) {
            console.error('getTotalCount Error:', e);
            return 0;
        }
    }

    async getProperties(forceRefresh = false, filters = null) {
        // When server-side filters are provided, skip cache and fetch only matching rows
        if (filters) {
            return this._getPropertiesFiltered(filters);
        }

        if (!forceRefresh) {
            const cached = this._getCached('properties');
            if (cached) return cached;
        }

        if (this._pendingRequests['properties']) {
            return this._pendingRequests['properties'];
        }

        const fetchPromise = (async () => {
            try {
                // Fetch ALL rows via parallel batch pagination (1000 rows/batch).
                // Avoids missing older properties when DB grows beyond a fixed limit.
                const BATCH = 1000;
                // First batch to get total count
                const firstRes = await supabase
                    .from('locaux')
                    .select('*', { count: 'exact' })
                    .order('date_publication', { ascending: false })
                    .range(0, BATCH - 1);
                if (firstRes.error) throw firstRes.error;
                const totalCount = firstRes.count ?? 0;
                let data = firstRes.data || [];
                // Fetch remaining batches in parallel if needed
                if (totalCount > BATCH) {
                    const batchCount = Math.ceil((totalCount - BATCH) / BATCH);
                    const batchPromises = Array.from({ length: batchCount }, (_, i) => {
                        const from = BATCH + i * BATCH;
                        const to = from + BATCH - 1;
                        return supabase
                            .from('locaux')
                            .select('*')
                            .order('date_publication', { ascending: false })
                            .range(from, to);
                    });
                    const results = await Promise.all(batchPromises);
                    for (const res of results) {
                        if (!res.error && res.data) data = data.concat(res.data);
                    }
                }
                console.debug(`[locaux] Fetched ${data.length} / ${totalCount} rows`);


                const transformed = data.map(p => {
                    // Default to Disponible (true) unless explicitly set to 'Non'/false
                    const isDispo = p.disponible !== false && !(typeof p.disponible === 'string' && p.disponible.toLowerCase() === 'non');
                    const isMeuble = (p.meubles && typeof p.meubles === 'string' && p.meubles.toLowerCase() === 'oui') || p.meubles === true;

                    // Parse Price (handle text with shorthand M, k, FCFA)
                    const priceStr = p.prix || '0';
                    const rawPrice = this.parsePrice(priceStr);

                    // Attempt to extract salle d'eau count from text if 0
                    let sallesEau = 0;
                    const textForSde = (p.caracteristiques || p.message_initial || '').toLowerCase();
                    const sdeMatch = textForSde.match(/(\d+)\s*(salle[s]?\s*d'eau|douche[s]?|sdb|salle[s]?\s*de\s*bain)/i);
                    if (sdeMatch) {
                        sallesEau = parseInt(sdeMatch[1]);
                    }

                    return {
                        id: p.id,
                        refBien: p.ref_bien || '',
                        publicationId: p.publication_id || '',
                        contentHash: p.content_hash || '',
                        messageHash: p.message_hash || '',
                        typeBien: this.normalizePropertyType(p.type_de_bien),
                        typeOffre: p.type_offre || '',
                        zone: p.zone_geographique || '',
                        commune: p.commune || '',
                        quartier: p.quartier || '',
                        locationLabel: [p.commune, p.quartier].filter(Boolean).join(' - ') || p.zone_geographique || '',
                        prix: priceStr,
                        rawPrice: rawPrice,
                        telephoneBien: p.telephone_bien || p.telephone || p.numero || '',
                        telephoneExpediteur: p.telephone_expediteur || p.telephone || p.numero || '',
                        telephone: p.telephone || '',
                        contact: p.contact || p.numero || p.numero_agent || '',
                        cleanedSenderPn: p.cleanedSenderPn || p.cleaned_sender_pn || '',
                        // Source pour l'extraction textuelle
                        message_initial: p.message_initial || '',
                        caracteristiques: p.caracteristiques || '',
                        description: p.message_initial || p.caracteristiques || '',
                        features: p.caracteristiques ? p.caracteristiques.split(/,|\||\n/).map(s => s.trim()) : [],
                        publiePar: p.publie_par || '',
                        expediteur: p.expediteur || '',
                        surface: p.surface || '',
                        superficie: (p.surface && typeof p.surface === 'string') ? p.surface.replace(/m2|m²/gi, '').trim() : (p.surface || ''),
                        groupeWhatsAppJid: p.groupe_whatsapp_jid || p.groupe_whatsapp_origine || '',
                        meubles: p.meubles || 'Non',
                        meuble: isMeuble,
                        chambre: p.chambre || 0,
                        chambres: parseInt(p.chambre) || 0,
                        salles_eau: sallesEau,
                        disponible: isDispo,
                        groupeWhatsApp: p.groupe_whatsapp_origine || '',
                        imageUrl: p.lien_image || '',
                        datePublication: this.formatDateShort(p.date_publication),
                        datePublicationRaw: p.date_publication || null,
                        shares: (() => { try { return p.shares ? (typeof p.shares === 'string' ? JSON.parse(p.shares) : p.shares) : []; } catch { return []; } })(),
                        status: isDispo ? 'Disponible' : 'Occupé',
                        prixFormate: this.formatPrice(rawPrice, p.message_initial || p.caracteristiques),
                        dateExpiration: p.date_expiration || null,
                        renewalStatus: p.status || 'active',
                        relanceCount: p.relance_count || 0,
                        lastRelanceDate: p.date_derniere_relance || null
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
                    // Include commune in key: same message can contain multiple distinct properties
                    // from different communes — they are NOT duplicates
                    let isDupText = false;
                    if (p.description && p.description.length > 20) {
                        const textPart = p.description
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, '')
                            .substring(0, 250);
                        const fp = (p.commune || '') + '|' + textPart;
                        if (textPart.length > 20) {
                            if (seenTextFp.has(fp)) isDupText = true;
                            else seenTextFp.add(fp);
                        }
                    }
                    if (isDupText) continue;

                    deduped.push(p);
                }

                console.debug(`[Dédup] DB:${transformed.length} → deduplicated:${deduped.length}`);
                const trueProperties = deduped;

                // Enrich with WhatsApp group names
                const enriched = await whatsappGroupService.enrichWithGroupNames(trueProperties, 'groupeWhatsApp');

                // WaSender decrypted-media URLs are ephemeral (expire in hours).
                // Only trust ImgBB (i.ibb.co), Supabase Storage, and similar permanent hosts.
                const isPermanentUrl = (url) => {
                    if (!url) return false;
                    return !url.includes('wasenderapi.com/decrypted-media');
                };

                // Enrich with images from the `images` table (batch fetch, single query)
                // For old locaux without publication_id, use the integer id as fallback key
                const lookupKeys = enriched.map(p => p.publicationId || String(p.id)).filter(Boolean);
                const imagesMap = lookupKeys.length > 0 ? await this.getImagesForPublications(lookupKeys) : {};
                const enrichedWithImages = enriched.map(p => {
                    const lookupKey = p.publicationId || String(p.id);
                    const linkedImages = imagesMap[lookupKey] || [];
                    // Only keep permanent URLs (skip expired WaSender temp links)
                    const validImages = linkedImages.filter(i => isPermanentUrl(i.lien_thumb || i.lien_image));
                    const extraUrls = validImages.map(i => i.lien_thumb || i.lien_image).filter(Boolean);
                    const primaryUrl = isPermanentUrl(p.imageUrl) ? p.imageUrl : '';
                    return {
                        ...p,
                        images: validImages,
                        imageUrls: extraUrls,
                        imageUrl: primaryUrl || extraUrls[0] || '',
                        photoCount: validImages.length || (primaryUrl ? 1 : 0),
                    };
                });

                const result = { success: true, data: enrichedWithImages, source: 'supabase' };
                this._setCache('properties', result);
                return result;
            } catch (error) {
                console.error('Supabase Properties Error:', error);
                const errorMessage = this._getErrorMessage(error);
                return { success: false, error: errorMessage, data: [] };
            } finally {
                delete this._pendingRequests['properties'];
            }
        })();

        this._pendingRequests['properties'] = fetchPromise;
        return fetchPromise;
    }

    // Filtered server-side fetch — used when user has active filters in Properties page.
    // Bypasses cache. Applies Supabase query conditions for commune, typeOffre, typeBien,
    // search text, disponible, and pagination (page + pageSize).
    async _getPropertiesFiltered(filters) {
        try {
            const pageSize = filters.pageSize || 20;
            const page = (filters.page || 1) - 1; // 0-indexed
            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('locaux')
                .select('*')
                .order('date_publication', { ascending: false })
                .range(from, to);

            if (filters.commune && filters.commune !== 'all') {
                query = query.eq('commune', filters.commune);
            }
            if (filters.typeOffre && filters.typeOffre !== 'all') {
                query = query.eq('type_offre', filters.typeOffre);
            }
            if (filters.typeBien && filters.typeBien !== 'all') {
                query = query.ilike('type_de_bien', `%${filters.typeBien}%`);
            }
            if (filters.disponible) {
                query = query.eq('disponible', true);
            }
            if (filters.search) {
                const s = filters.search;
                query = query.or(`commune.ilike.%${s}%,type_de_bien.ilike.%${s}%,quartier.ilike.%${s}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            const transformed = (data || []).map(p => {
                const isDispo = p.disponible !== false && !(typeof p.disponible === 'string' && p.disponible.toLowerCase() === 'non');
                const isMeuble = (p.meubles && typeof p.meubles === 'string' && p.meubles.toLowerCase() === 'oui') || p.meubles === true;
                const rawPrice = this.parsePrice(p.prix || '0');
                return {
                    id: p.id,
                    refBien: p.ref_bien || '',
                    publicationId: p.publication_id || '',
                    contentHash: p.content_hash || '',
                    typeBien: this.normalizePropertyType(p.type_de_bien),
                    typeOffre: p.type_offre || '',
                    zone: p.zone_geographique || '',
                    commune: p.commune || '',
                    quartier: p.quartier || '',
                    locationLabel: [p.commune, p.quartier].filter(Boolean).join(' - ') || p.zone_geographique || '',
                    prix: p.prix || '0',
                    rawPrice,
                    telephoneBien: p.telephone_bien || p.telephone || '',
                    telephoneExpediteur: p.telephone_expediteur || p.telephone || '',
                    telephone: p.telephone || '',
                    message_initial: p.message_initial || '',
                    caracteristiques: p.caracteristiques || '',
                    description: p.message_initial || p.caracteristiques || '',
                    features: p.caracteristiques ? p.caracteristiques.split(/,|\||\n/).map(s => s.trim()) : [],
                    publiePar: p.publie_par || '',
                    expediteur: p.expediteur || '',
                    surface: p.surface || '',
                    meubles: p.meubles || 'Non',
                    meuble: isMeuble,
                    chambre: p.chambre || 0,
                    chambres: parseInt(p.chambre) || 0,
                    disponible: isDispo,
                    groupeWhatsApp: p.groupe_whatsapp_origine || '',
                    imageUrl: p.lien_image || '',
                    datePublication: this.formatDateShort(p.date_publication),
                    datePublicationRaw: p.date_publication || null,
                    status: isDispo ? 'Disponible' : 'Occupé',
                    prixFormate: this.formatPrice(rawPrice, p.message_initial || p.caracteristiques),
                    dateExpiration: p.date_expiration || null,
                    renewalStatus: p.status || 'active',
                    relanceCount: p.relance_count || 0,
                    lastRelanceDate: p.date_derniere_relance || null
                };
            });

            // Exclude demand-type entries (misclassified by AI)
            const filtered = transformed.filter(p => !_isDemand(p.description));

            // Enrich with images from `images` table — safe fallback if it fails
            let enriched = filtered;
            try {
                const isPermanentUrl = (url) => url && !url.includes('wasenderapi.com/decrypted-media');
                const lookupKeys = filtered.map(p => p.publicationId || String(p.id)).filter(Boolean);
                const imagesMap = lookupKeys.length > 0 ? await this.getImagesForPublications(lookupKeys) : {};
                enriched = filtered.map(p => {
                    const lookupKey = p.publicationId || String(p.id);
                    const linkedImages = imagesMap[lookupKey] || [];
                    const validImages = linkedImages.filter(i => isPermanentUrl(i.lien_thumb || i.lien_image));
                    const extraUrls = validImages.map(i => i.lien_thumb || i.lien_image).filter(Boolean);
                    const primaryUrl = isPermanentUrl(p.imageUrl) ? p.imageUrl : '';
                    return {
                        ...p,
                        images: validImages,
                        imageUrls: extraUrls,
                        imageUrl: primaryUrl || extraUrls[0] || '',
                        photoCount: validImages.length || (primaryUrl ? 1 : 0),
                    };
                });
            } catch (imgErr) {
                console.warn('Image enrichment skipped in filtered path:', imgErr.message);
            }

            return { success: true, data: enriched, source: 'supabase_filtered' };
        } catch (error) {
            console.error('_getPropertiesFiltered Error:', error);
            return { success: false, error: this._getErrorMessage(error), data: [] };
        }
    }

    async getImagesProperties(forceRefresh = false) {
        const response = await this.getProperties(forceRefresh);
        if (!response.success) return response;
        // getProperties() already enriches with images — just filter to those that have any
        const withImages = response.data.filter(p => p.imageUrl || (p.images && p.images.length > 0));
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
                    prixFormate: this.formatPrice(data.prix, data.message_initial || data.caracteristiques),
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

        if (this._pendingRequests['visits']) {
            return this._pendingRequests['visits'];
        }

        const fetchPromise = (async () => {
            try {
                const { data, error } = await supabase.from('visite_programmee').select('*').order('id', { ascending: false }).limit(5000);
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
                        localInteresse: v.bien_description || v.local_interesse || '',
                        refBien: v.ref_bien || '',  // NEW: property reference code from workflow
                        agence_nom: v.agence_nom || v.publie_par || '',
                        agence_tel: v.agence_tel || v.contact_proprietaire || '',
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
                const errorMessage = this._getErrorMessage(error);
                return { success: false, error: errorMessage, data: [] };
            } finally {
                delete this._pendingRequests['visits'];
            }
        })();

        this._pendingRequests['visits'] = fetchPromise;
        return fetchPromise;
    }

    async getStats(forceRefresh = false) {
        try {
            // Fetch both in parallel
            const [propsRes, visitsRes] = await Promise.all([
                this.getProperties(forceRefresh),
                this.getVisits(forceRefresh)
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
            const errorMessage = this._getErrorMessage(error);
            return { success: false, error: errorMessage };
        }
    }

    async createVisit(visitData) {
        try {
            const payload = {
                nom_prenom: visitData.nomPrenom,
                numero: visitData.numero,
                date_rv: visitData.dateRv,
                local_interesse: visitData.localInteresse || '',
                ref_bien: visitData.refBien || '',
                visite_prog: visitData.visiteProg || false,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('visite_programmee')
                .insert([payload])
                .select();

            if (error) throw error;
            this._invalidate('visits');
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('createVisit Error:', error);
            return { success: false, error: this._getErrorMessage(error) };
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
                address: v.localInteresse || "",
                date: v.dateRv ? new Date(v.dateRv).toLocaleDateString() : "Date inconnue",
                price: "Budget N/A",
                phone: v.numero || '',
                ref: v.refBien || '',
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
        // Direct query selecting only needed columns — avoids N+1 pattern.
        // Groups visits by client phone/name client-side (unavoidable without RPC).
        try {
            const { data, error } = await supabase
                .from('visite_programmee')
                .select('nom_prenom, numero, date_rv, local_interesse, ref_bien, visite_prog')
                .order('date_rv', { ascending: false });

            if (error) throw error;

            const clientMap = {};
            for (const visit of data || []) {
                if (!visit.nom_prenom) continue;
                const cleanPhone = visit.numero ? visit.numero.replace(/\s/g, '').replace(/-/g, '') : '';
                const key = cleanPhone || visit.nom_prenom.toLowerCase().trim();

                if (!clientMap[key]) {
                    clientMap[key] = {
                        nomPrenom: visit.nom_prenom,
                        numero: visit.numero,
                        totalVisites: 0,
                        visitesConfirmees: 0,
                        derniereVisite: null,
                        premiereVisite: null,
                        zonesInteret: new Set(),
                        biensInteret: new Set(),
                        visites: [],
                    };
                }
                const client = clientMap[key];
                const isScheduled = (visit.visite_prog && typeof visit.visite_prog === 'string' && visit.visite_prog.toLowerCase() === 'oui') || visit.visite_prog === true;

                client.totalVisites++;
                if (isScheduled) client.visitesConfirmees++;
                if (visit.local_interesse) client.zonesInteret.add(visit.local_interesse.split(',')[0].trim());
                if (visit.ref_bien) client.biensInteret.add(visit.ref_bien);

                const vDate = visit.date_rv ? new Date(visit.date_rv) : null;
                const validDate = vDate && !isNaN(vDate.getTime()) ? vDate : null;
                if (validDate) {
                    if (!client.premiereVisite || validDate < client.premiereVisite) client.premiereVisite = validDate;
                    if (!client.derniereVisite || validDate > client.derniereVisite) client.derniereVisite = validDate;
                }

                client.visites.push({
                    nomPrenom: visit.nom_prenom,
                    numero: visit.numero,
                    dateRv: visit.date_rv,
                    localInteresse: visit.local_interesse || '',
                    refBien: visit.ref_bien || '',
                    visiteProg: isScheduled,
                    parsedDate: validDate,
                });
            }

            const clients = Object.values(clientMap).map((c, idx) => {
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
                    statut,
                    totalVisites: c.totalVisites,
                    visitesConfirmees: c.visitesConfirmees,
                    zonesInteret: Array.from(c.zonesInteret),
                    biensInteret: Array.from(c.biensInteret),
                    visites: c.visites,
                    premiereVisite: c.premiereVisite,
                    derniereVisite: c.derniereVisite,
                };
            });

            clients.sort((a, b) => (b.derniereVisite || 0) - (a.derniereVisite || 0));
            return { success: true, data: clients };
        } catch (error) {
            console.error('Supabase Clients Error:', error);
            return { success: false, error: this._getErrorMessage(error), data: [] };
        }
    }

    // === PROPERTY LIFECYCLE ACTIONS ===

    async renewProperty(propertyId, days = 30) {
        if (!propertyId) return { success: false, error: 'ID manquant' };
        try {
            const newExpiration = new Date();
            newExpiration.setDate(newExpiration.getDate() + days);

            const { error } = await supabase
                .from('locaux')
                .update({
                    date_expiration: newExpiration.toISOString(),
                    status: 'active',
                    relance_count: supabase.rpc ? undefined : 0, // reset ou increment selon config
                })
                .eq('id', propertyId);

            if (error) throw error;
            this._invalidate('properties');
            return { success: true, newExpiration: newExpiration.toISOString() };
        } catch (error) {
            console.error('renewProperty Error:', error);
            return { success: false, error: this._getErrorMessage(error) };
        }
    }

    async archiveProperty(propertyId) {
        if (!propertyId) return { success: false, error: 'ID manquant' };
        try {
            const { error } = await supabase
                .from('locaux')
                .update({
                    status: 'archived',
                    disponible: 'Non',
                })
                .eq('id', propertyId);

            if (error) throw error;
            this._invalidate('properties');
            return { success: true };
        } catch (error) {
            console.error('archiveProperty Error:', error);
            return { success: false, error: this._getErrorMessage(error) };
        }
    }

    async toggleDisponible(propertyId, currentDisponible) {
        if (!propertyId) return { success: false, error: 'ID manquant' };
        try {
            const newValue = currentDisponible ? 'Non' : 'Oui';
            const { error } = await supabase
                .from('locaux')
                .update({ disponible: newValue })
                .eq('id', propertyId);

            if (error) throw error;
            this._invalidate('properties');
            return { success: true, disponible: newValue === 'Oui' };
        } catch (error) {
            console.error('toggleDisponible Error:', error);
            return { success: false, error: this._getErrorMessage(error) };
        }
    }

    async getExpiringProperties(daysThreshold = 30) {
        try {
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

            // Fallback: properties published 25+ days ago (30-day shelf life, 5 days warning)
            const fallbackDate = new Date();
            fallbackDate.setDate(fallbackDate.getDate() - 25);

            // Query 1: properties with explicit date_expiration set, expiring within threshold
            // Query 2: properties without date_expiration, published 25+ days ago (approaching 30-day shelf life)
            const [res1, res2] = await Promise.all([
                supabase
                    .from('locaux')
                    .select('*')
                    .eq('disponible', 'Oui')
                    .or('status.eq.active,status.eq.pending_confirm,status.is.null')
                    .not('date_expiration', 'is', null)
                    .lte('date_expiration', thresholdDate.toISOString())
                    .order('date_expiration', { ascending: true })
                    .limit(150),
                supabase
                    .from('locaux')
                    .select('*')
                    .eq('disponible', 'Oui')
                    .or('status.eq.active,status.eq.pending_confirm,status.is.null')
                    .is('date_expiration', null)
                    .not('date_publication', 'is', null)
                    .lte('date_publication', fallbackDate.toISOString())
                    .order('date_publication', { ascending: true })
                    .limit(150)
            ]);

            // Merge and deduplicate by id
            const seen = new Set();
            const merged = [...(res1.data || []), ...(res2.data || [])].filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });

            // For properties without date_expiration, compute from date_publication + 30 days
            const data = merged.map(p => {
                if (!p.date_expiration && p.date_publication) {
                    try {
                        const pub = new Date(p.date_publication);
                        if (!isNaN(pub.getTime())) {
                            const computed = new Date(pub);
                            computed.setDate(computed.getDate() + 30);
                            return { ...p, date_expiration: computed.toISOString() };
                        }
                    } catch { /* keep null */ }
                }
                return p;
            });

            const transformed = data.map(p => {
                const isDispo = p.disponible !== false && !(typeof p.disponible === 'string' && p.disponible.toLowerCase() === 'non');
                const rawPrice = this.parsePrice(p.prix || '0');
                return {
                    id: p.id,
                    refBien: p.ref_bien || '',
                    publicationId: p.publication_id || '',
                    typeBien: this.normalizePropertyType(p.type_de_bien),
                    typeOffre: p.type_offre || '',
                    zone: p.zone_geographique || '',
                    commune: p.commune || '',
                    quartier: p.quartier || '',
                    prix: p.prix || '',
                    rawPrice,
                    prixFormate: this.formatPrice(rawPrice, p.message_initial || ''),
                    telephoneBien: p.telephone_bien || p.telephone || '',
                    telephoneExpediteur: p.telephone_expediteur || p.telephone || '',
                    expediteur: p.expediteur || '',
                    surface: p.surface || '',
                    caracteristiques: p.caracteristiques || '',
                    description: p.message_initial || p.caracteristiques || '',
                    disponible: isDispo,
                    meuble: p.meubles?.toLowerCase() === 'oui',
                    chambres: parseInt(p.chambre) || 0,
                    groupeWhatsApp: p.groupe_whatsapp_origine || '',
                    groupeWhatsAppOrigine: p.groupe_whatsapp_origine || '',
                    groupeWhatsAppJid: p.groupe_whatsapp_jid || '',
                    imageUrl: p.lien_image || '',
                    datePublication: this.formatDateShort(p.date_publication),
                    datePublicationRaw: p.date_publication || null,
                    dateExpiration: p.date_expiration || null,
                    renewalStatus: p.status || 'active',
                    relanceCount: p.relance_count || 0,
                    status: isDispo ? 'Disponible' : 'Occupé',
                };
            });

            // Enrich with WhatsApp group names (same as getProperties)
            const enriched = await whatsappGroupService.enrichWithGroupNames(transformed, 'groupeWhatsApp');

            return { success: true, data: enriched };
        } catch (error) {
            console.error('getExpiringProperties Error:', error);
            return { success: false, error: this._getErrorMessage(error), data: [] };
        }
    }

    // === AUTH ===

    // Fixed app secret used for token checksum — not a full crypto HMAC, but prevents trivial tampering.
    _tokenSalt() { return 'immo2026'; }

    _makeToken(payload) {
        const salt = this._tokenSalt();
        const checksum = btoa(JSON.stringify(payload) + salt).slice(-8);
        return btoa(JSON.stringify({ ...payload, cs: checksum }));
    }

    async login(email, password) {
        // Fallback legacy login for smooth transition
        const validUsers = [
            { email: 'admin@immodash.ci', password: 'Admin2026!', name: 'Agent Immo', role: 'admin', avatar: 'AI' },
            { email: 'agent@immodash.ci', password: 'Agent2026!', name: 'Agent Terrain', role: 'agent', avatar: 'AT' },
            { email: 'demo@immodash.ci', password: 'Demo2026!', name: 'Utilisateur Demo', role: 'viewer', avatar: 'UD' },
        ];
        const user = validUsers.find(u => u.email === email && u.password === password);
        if (user) {
            const payload = { email: user.email, role: user.role, exp: Date.now() + 86400000 };
            const token = this._makeToken(payload);
            return { success: true, token, user: { name: user.name, email: user.email, role: user.role, avatar: user.avatar } };
        }
        return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    // Returns the decoded payload if the token is valid and unexpired, or null otherwise.
    validateToken(token) {
        try {
            const decoded = JSON.parse(atob(token));
            if (!decoded || decoded.exp < Date.now()) return null; // missing or expired
            const { cs, ...payload } = decoded;
            const expectedCs = btoa(JSON.stringify(payload) + this._tokenSalt()).slice(-8);
            if (cs !== expectedCs) return null; // tampered
            return payload;
        } catch { return null; }
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

    // Realtime subscription on locaux — triggers 'newProperty' event for live catalog sync
    subscribeToNewProperties(callback) {
        const channel = supabase
            .channel('locaux-catalogue')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locaux' }, (payload) => {
                console.log('[Realtime] Nouveau bien:', payload.new?.ref_bien);
                // Invalidate cache so next getProperties() fetches fresh data
                delete this._cache['properties'];
                if (callback) callback(payload.new);
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
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

    /**
     * Manually refresh all core data sources (force-bypass cache).
     * Returns a combined result object.
     */
    async refreshData() {
        try {
            const [properties, visits, stats] = await Promise.all([
                this.getProperties(true),
                this.getVisits(true),
                this.getStats(true),
            ]);
            if (properties.success && visits.success) {
                this.notifyListeners('dataUpdate', {
                    properties: properties.data,
                    visits: visits.data,
                    stats: stats?.data,
                });
            }
            return { success: true };
        } catch (e) {
            console.error('refreshData error', e);
            return { success: false, error: e.message };
        }
    }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
