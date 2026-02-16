import { supabase } from './supabaseClient';

class SupabaseService {
    constructor() {
        // No manual polling needed for Supabase (it supports realtime), but to keep consistent with existing
        // architecture which expects polling or periodic refresh, we can keep some local state or just fetch fresh.
        // For this V1 migration, we will fetch fresh data on every call but rely on React Query or useEffect in components
        // to handle the "when to call" logic.
        this.listeners = new Map();
    }

    // === HELPERS ===

    formatPrice(amount) {
        if (!amount) return '0 FCFA';
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M FCFA`;
        }
        return `${amount.toLocaleString('fr-FR')} FCFA`;
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
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, data: data, source: 'supabase' };
        } catch (error) {
            console.error('Supabase Images Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    // === DEMANDES (REQUESTS) ===
    async getRequests(forceRefresh = false) {
        try {
            // Fetch all raw publications
            // We will filter them client-side or we could add a .ilike('message', '%cherche%') filter here
            // For now, let's fetch recent ones and filter in the UI to be more flexible
            const { data, error } = await supabase
                .from('publications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500); // Limit to last 500 messages to maintain performance

            if (error) throw error;

            // Optional: Basic server-side filtering could be done, but "requests" detection is complex.
            // We'll return the raw data and let the component handle the heuristic.
            return { success: true, data: data, source: 'supabase' };
        } catch (error) {
            console.error('Supabase Requests Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    // === CORE METHODS ===

    async getProperties(forceRefresh = false) {
        try {
            // Select from 'locaux' (NEW TABLE) based on n8n workflow
            // Columns: type_de_bien, type_offre, zone_geographique, commune, quartier, prix, telephone, caracteristiques, publie_par, meubles, chambre, disponible, groupe_whatsapp_origine, lien_image, date_publication
            const { data, error } = await supabase.from('locaux').select('*');
            if (error) throw error;

            const transformed = data.map(p => {
                // Determine boolean values from text 'Oui'/'Non'
                const isDispo = (p.disponible && typeof p.disponible === 'string' && p.disponible.toLowerCase() === 'oui') || p.disponible === true;
                const isMeuble = (p.meubles && typeof p.meubles === 'string' && p.meubles.toLowerCase() === 'oui') || p.meubles === true;

                // Parse Price (handle text with non-numeric chars)
                const priceStr = p.prix || '0';
                const rawPrice = parseInt(String(priceStr).replace(/[\D]/g, '')) || 0;

                return {
                    id: p.id,
                    typeBien: this.normalizePropertyType(p.type_de_bien),
                    typeOffre: p.type_offre || '',
                    zone: p.zone_geographique || '',
                    commune: p.commune || '',
                    quartier: p.quartier || '',
                    // Combined location for display if needed
                    locationLabel: [p.commune, p.quartier].filter(Boolean).join(' - ') || p.zone_geographique || '',
                    prix: priceStr,
                    rawPrice: rawPrice,
                    telephone: p.telephone || '',
                    caracteristiques: p.caracteristiques || '',
                    features: p.caracteristiques ? p.caracteristiques.split(/,|\||\n/).map(s => s.trim()) : [],
                    publiePar: p.publie_par || '',
                    meuble: isMeuble,
                    chambres: parseInt(p.chambre) || 0,
                    disponible: isDispo,
                    groupeWhatsApp: p.groupe_whatsapp_origine || '',
                    imageUrl: p.lien_image || '',
                    datePublication: p.date_publication || '',
                    // Calculated
                    status: isDispo ? 'Disponible' : 'Occupé',
                    prixFormate: this.formatPrice(rawPrice)
                };
            });

            return { success: true, data: transformed, source: 'supabase' };
        } catch (error) {
            console.error('Supabase Properties Error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    async getVisits(forceRefresh = false) {
        try {
            // Select from 'visite_programmee' (NEW TABLE)
            // Columns: nom_prenom, numero, date_rv, local_interesse, visite_prog
            const { data, error } = await supabase.from('visite_programmee').select('*');
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
                    visiteProg: isScheduled,
                    // Calculated
                    parsedDate: (dateRv && !isNaN(dateRv.getTime())) ? dateRv : null,
                    status: this.getVisitStatus(dateRv, isScheduled)
                };
            });

            return { success: true, data: transformed, source: 'supabase' };
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
