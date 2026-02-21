import { supabase } from './supabaseClient';

class WhatsappGroupService {
    constructor() {
        // In-memory cache: { groupId -> { name, timestamp } }
        this.memoryCache = {};
        this.cacheTTL = 3600000; // 1 hour
        this.isInitialized = false;
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

        // Check memory cache first
        const cached = this.memoryCache[groupId];
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.name;
        }

        try {
            // Try database
            const { data, error } = await supabase
                .from('whatsapp_groups')
                .select('name')
                .eq('id', groupId)
                .single();

            if (!error && data) {
                const name = data.name;
                this.memoryCache[groupId] = { name, timestamp: Date.now() };
                return name;
            }
        } catch (e) {
            // Silent fallback
        }

        // Fallback: return formatted ID
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
