import { supabase } from './supabaseClient';

class WhatsappGroupService {
    constructor() {
        // In-memory cache: { groupId -> { name, timestamp } }
        this.memoryCache = {};
        this.cacheTTL = 3600000; // 1 hour
        this.isInitialized = false;
        this._initPromise = null;
    }

    async initialize() {
        // Only initialize once - return existing promise if already in progress
        if (this._initPromise) return this._initPromise;
        if (this.isInitialized) return;

        this._initPromise = this._doInit();
        return this._initPromise;
    }

    async _doInit() {
        try {
            await this._loadAllGroupNames();
            this.isInitialized = true;
        } catch (e) {
            console.warn('[WhatsApp Groups] Init failed:', e.message);
            this.isInitialized = true; // Don't retry forever
        } finally {
            this._initPromise = null;
        }
    }

    /**
     * Load ALL group names in a single batch query - much faster than N individual queries
     */
    async _loadAllGroupNames() {
        const now = Date.now();

        // 1. Batch load from locaux table (the group JID + origin name)
        try {
            const { data: locauxData } = await supabase
                .from('locaux')
                .select('groupe_whatsapp_jid, groupe_whatsapp_origine')
                .not('groupe_whatsapp_jid', 'is', null)
                .limit(1000);

            (locauxData || []).forEach(row => {
                const jid = row.groupe_whatsapp_jid;
                const name = row.groupe_whatsapp_origine;
                if (jid && name && !this.memoryCache[jid]) {
                    this.memoryCache[jid] = { name, timestamp: now };
                }
            });
        } catch (e) {
            console.debug('[WhatsApp Groups] locaux batch load failed:', e.message);
        }

        // 2. Try publications table (has nom_groupe)
        try {
            const { data: pubData } = await supabase
                .from('publications')
                .select('groupe, nom_groupe')
                .not('groupe', 'is', null)
                .not('nom_groupe', 'is', null)
                .limit(500);

            (pubData || []).forEach(row => {
                if (row.groupe && row.nom_groupe) {
                    this.memoryCache[row.groupe] = { name: row.nom_groupe, timestamp: now };
                }
            });
        } catch (e) {
            console.debug('[WhatsApp Groups] publications batch load failed:', e.message);
        }

        // 3. Try whatsapp_groups table
        try {
            const { data: wgData } = await supabase
                .from('whatsapp_groups')
                .select('id, name')
                .limit(500);

            (wgData || []).forEach(row => {
                if (row.id && row.name) {
                    this.memoryCache[row.id] = { name: row.name, timestamp: now };
                }
            });
        } catch (e) {
            console.debug('[WhatsApp Groups] whatsapp_groups table not found (ok):', e.message);
        }

        console.debug(`[WhatsApp Groups] Loaded ${Object.keys(this.memoryCache).length} group names from cache`);
    }

    /**
     * Fetch group metadata from Wasender API
     * Extracts subject/name field from group info
     * @param {string} groupId - WhatsApp group ID (format: xxx@g.us)
     * @returns {Promise<string|null>} - Group name or null if unavailable
     */


    /**
     * Get a single group name - uses memory cache only (fast, synchronous-like)
     * Cache is pre-populated by initialize()
     */
    getGroupNameFromCache(groupId) {
        if (!groupId) return '';
        const cached = this.memoryCache[groupId];
        if (cached) return cached.name;
        // Derive a readable name from the JID: "22505357765-1625741435@g.us" => "Groupe 22505357765"
        const jidPart = String(groupId).split('@')[0].split('-')[0];
        return jidPart ? `Groupe ${jidPart}` : groupId;
    }

    /**
     * Enrich items with group names - purely synchronous using memory cache.
     * Must call initialize() first (done in App.jsx on startup).
     */
    enrichWithGroupNames(items, groupIdField = 'groupeWhatsApp') {
        if (!items || items.length === 0) return items;
        return items.map(item => ({
            ...item,
            groupName: this.getGroupNameFromCache(item[groupIdField])
        }));
    }
}

export const whatsappGroupService = new WhatsappGroupService();
