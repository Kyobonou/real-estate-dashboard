import { supabase } from './supabaseClient';

/**
 * WhatsApp Group Service
 * Manages WhatsApp group ID → Name mapping with intelligent caching
 *
 * Features:
 * - Smart cache (memory + Supabase)
 * - Automatic fallback to publication names
 * - Wasender API integration (future)
 * - Batch operations for performance
 */
class WhatsAppGroupService {
    constructor() {
        // In-memory cache: groupId -> groupName
        this._cache = new Map();
        this._cacheExpiry = 3600000; // 1 hour
        this._lastCacheSync = 0;
    }

    /**
     * Get group name by ID
     * Strategy: Memory cache → Supabase → Auto-generate from ID
     */
    async getGroupName(groupId) {
        if (!groupId) return 'Groupe inconnu';

        // 1. Check memory cache first (fastest)
        if (this._cache.has(groupId)) {
            const cached = this._cache.get(groupId);
            if (cached.expiry > Date.now()) {
                return cached.name;
            } else {
                this._cache.delete(groupId);
            }
        }

        // 2. Fetch from Supabase (persistent)
        try {
            const { data, error } = await supabase
                .from('whatsapp_groups')
                .select('name, last_updated')
                .eq('id', groupId)
                .eq('is_active', true)
                .single();

            if (data && !error) {
                // Store in memory cache
                this._setMemoryCache(groupId, data.name);
                return data.name;
            }
        } catch (err) {
            console.warn(`Error fetching group name for ${groupId}:`, err.message);
        }

        // 3. Return formatted ID as fallback
        return this._formatGroupIdAsName(groupId);
    }

    /**
     * Get multiple group names efficiently (batch)
     */
    async getGroupNames(groupIds) {
        if (!groupIds || groupIds.length === 0) return {};

        const result = {};
        const uncachedIds = [];

        // Separate cached vs uncached
        for (const id of groupIds) {
            if (this._cache.has(id) && this._cache.get(id).expiry > Date.now()) {
                result[id] = this._cache.get(id).name;
            } else {
                uncachedIds.push(id);
            }
        }

        // Batch fetch uncached
        if (uncachedIds.length > 0) {
            try {
                const { data, error } = await supabase
                    .from('whatsapp_groups')
                    .select('id, name')
                    .in('id', uncachedIds)
                    .eq('is_active', true);

                if (data && !error) {
                    for (const group of data) {
                        this._setMemoryCache(group.id, group.name);
                        result[group.id] = group.name;
                    }
                }
            } catch (err) {
                console.warn('Error batch fetching group names:', err.message);
            }
        }

        // Fallback for any remaining
        for (const id of uncachedIds) {
            if (!result[id]) {
                result[id] = this._formatGroupIdAsName(id);
            }
        }

        return result;
    }

    /**
     * Save or update group name
     */
    async saveGroupName(groupId, groupName, source = 'manual') {
        if (!groupId || !groupName) return false;

        try {
            const { error } = await supabase
                .from('whatsapp_groups')
                .upsert({
                    id: groupId,
                    name: groupName,
                    source: source,
                    is_active: true,
                    last_updated: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (!error) {
                // Invalidate and update memory cache
                this._setMemoryCache(groupId, groupName);
                return true;
            } else {
                console.error('Error saving group name:', error);
                return false;
            }
        } catch (err) {
            console.error('Error in saveGroupName:', err);
            return false;
        }
    }

    /**
     * Sync group names from publications table (extract from existing data)
     * Useful for discovering groups from historical data
     */
    async syncFromPublications() {
        try {
            // Get unique groups from publications
            const { data, error } = await supabase
                .from('publications')
                .select('groupe, nom_groupe')
                .not('groupe', 'is', null)
                .not('nom_groupe', 'is', null);

            if (error) {
                console.error('Error syncing from publications:', error);
                return 0;
            }

            let synced = 0;
            const uniqueGroups = new Map();

            // Build unique map
            for (const pub of data) {
                if (pub.groupe && pub.nom_groupe) {
                    uniqueGroups.set(pub.groupe, pub.nom_groupe);
                }
            }

            // Bulk upsert
            for (const [groupId, groupName] of uniqueGroups.entries()) {
                const success = await this.saveGroupName(groupId, groupName, 'publication');
                if (success) synced++;
            }

            console.log(`Synced ${synced} group names from publications`);
            return synced;
        } catch (err) {
            console.error('Error in syncFromPublications:', err);
            return 0;
        }
    }

    /**
     * Get all groups (for admin view)
     */
    async getAllGroups(activeOnly = true) {
        try {
            let query = supabase
                .from('whatsapp_groups')
                .select('*')
                .order('name', { ascending: true });

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching all groups:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('Error in getAllGroups:', err);
            return [];
        }
    }

    /**
     * Enrich property/publication data with group names
     */
    async enrichWithGroupNames(items, groupIdField = 'groupeWhatsApp') {
        if (!items || items.length === 0) return items;

        // Extract unique group IDs
        const groupIds = [...new Set(items
            .map(item => item[groupIdField])
            .filter(Boolean)
        )];

        // Batch fetch names
        const groupNames = await this.getGroupNames(groupIds);

        // Enrich items
        return items.map(item => ({
            ...item,
            groupName: groupNames[item[groupIdField]] || item[groupIdField]
        }));
    }

    /**
     * Private: Set memory cache entry
     */
    _setMemoryCache(groupId, groupName) {
        this._cache.set(groupId, {
            name: groupName,
            expiry: Date.now() + this._cacheExpiry
        });
    }

    /**
     * Private: Format group ID as displayable name
     * Example: "120363xxx@g.us" -> "Groupe xxx"
     */
    _formatGroupIdAsName(groupId) {
        if (!groupId) return 'Groupe inconnu';

        // Extract last 4 chars of ID
        const match = groupId.match(/(\d{4,6})@g\.us/);
        if (match && match[1]) {
            return `Groupe ${match[1]}`;
        }

        return `Groupe ${groupId.substring(0, 12)}...`;
    }

    /**
     * Clear memory cache
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Manually sync cache with Supabase (refresh)
     */
    async refreshCache() {
        this.clearCache();
        await this.syncFromPublications();
    }
}

export const whatsappGroupService = new WhatsAppGroupService();
export default whatsappGroupService;
