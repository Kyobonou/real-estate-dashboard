import { supabase } from './supabaseClient';

class WhatsappGroupService {
    constructor() {
        // In-memory cache: { groupId -> { name, timestamp } }
        this.memoryCache = {};
        this.cacheTTL = 3600000; // 1 hour
        this.isInitialized = false;
        // Wasender API configuration (from environment)
        this.wasenderToken = process.env.REACT_APP_WASENDER_MCP_TOKEN || '';
        this.wasenderEndpoint = process.env.REACT_APP_WASENDER_MCP_ENDPOINT || 'https://wasenderapi.com/api';
    }

    async initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Auto-sync group names from existing publications
        try {
            await this.syncFromPublications();
        } catch (e) {
            console.warn('[WhatsApp Groups] Auto-sync failed:', e.message);
        }
    }

    /**
     * Fetch group metadata from Wasender API
     * Extracts subject/name field from group info
     * @param {string} groupId - WhatsApp group ID (format: xxx@g.us)
     * @returns {Promise<string|null>} - Group name or null if unavailable
     */
    async fetchGroupMetadataFromWasender(groupId) {
        if (!this.wasenderToken || !groupId) return null;

        try {
            // Call Wasender API to get group info
            // Expected response structure: { subject, name, participants, ... }
            const response = await fetch(`${this.wasenderEndpoint}/groups/${groupId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.wasenderToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.debug(`[Wasender API] Failed to fetch group ${groupId}: ${response.status}`);
                return null;
            }

            const data = await response.json();

            // Extract name from response - try multiple field names
            const groupName = data.subject || data.name || data.groupName || null;

            if (groupName) {
                console.debug(`[Wasender API] Retrieved group name: ${groupName} for ${groupId}`);
                return groupName;
            }

            return null;
        } catch (error) {
            console.warn(`[Wasender API] Error fetching group metadata: ${error.message}`);
            return null;
        }
    }

    // Sync group names from publications table to cache
    async syncFromPublications() {
        try {
            const { data, error } = await supabase
                .from('publications')
                .select('id, groupe, nom_groupe')
                .not('groupe', 'is', null)
                .limit(500);

            if (error) throw error;

            const grouped = {};
            (data || []).forEach(pub => {
                if (pub.groupe && pub.nom_groupe) {
                    grouped[pub.groupe] = pub.nom_groupe;
                }
            });

            // Store to database
            for (const [groupId, groupName] of Object.entries(grouped)) {
                try {
                    await supabase
                        .from('whatsapp_groups')
                        .upsert({
                            id: groupId,
                            name: groupName,
                            source: 'publication',
                            last_updated: new Date().toISOString()
                        }, { onConflict: 'id' });
                } catch (e) {
                    // Silently fail for individual upserts
                }
            }

            console.debug(`[WhatsApp Groups] Synced ${Object.keys(grouped).length} groups`);
        } catch (e) {
            console.warn('[WhatsApp Groups] Sync failed:', e.message);
        }
    }

    async getGroupName(groupId) {
        if (!groupId) return '';

        // 1. Check memory cache first (fastest)
        const cached = this.memoryCache[groupId];
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.name;
        }

        try {
            // 2. Try database (persistent storage)
            const { data, error } = await supabase
                .from('whatsapp_groups')
                .select('name')
                .eq('id', groupId)
                .single();

            if (!error && data?.name) {
                const name = data.name;
                this.memoryCache[groupId] = { name, timestamp: Date.now() };
                return name;
            }
        } catch (e) {
            // Silent fallback
        }

        // 3. Try Wasender API to fetch real group metadata
        try {
            const wasenderName = await this.fetchGroupMetadataFromWasender(groupId);
            if (wasenderName) {
                // Store in database for future use
                await supabase
                    .from('whatsapp_groups')
                    .upsert({
                        id: groupId,
                        name: wasenderName,
                        source: 'wasender_api',
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'id' });

                this.memoryCache[groupId] = { name: wasenderName, timestamp: Date.now() };
                return wasenderName;
            }
        } catch (e) {
            console.warn(`[WhatsApp Groups] Error fetching from Wasender: ${e.message}`);
        }

        // 4. Fallback: return formatted ID
        return `Groupe ${groupId}`;
    }

    async enrichWithGroupNames(items, groupIdField = 'groupeWhatsApp') {
        if (!items || items.length === 0) return items;

        // Collect unique group IDs
        const groupIds = [...new Set(
            items
                .map(item => item[groupIdField])
                .filter(Boolean)
        )];

        if (groupIds.length === 0) return items;

        // Batch fetch names for all unique group IDs
        const groupNames = {};
        for (const groupId of groupIds) {
            groupNames[groupId] = await this.getGroupName(groupId);
        }

        // Enrich items
        return items.map(item => ({
            ...item,
            groupName: groupNames[item[groupIdField]] || `Groupe ${item[groupIdField]}`
        }));
    }
}

export const whatsappGroupService = new WhatsappGroupService();
