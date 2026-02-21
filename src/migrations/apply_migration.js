import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://udyfhzyvalansmhkynnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenlhdmFsYW5zbWhreW5uYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk4MDc1MzAwLCJleHAiOjE4NTU4NDI3MDB9.6g5oBVTmJf_qAcNAWE9_0F1xKUkEn9oGBJhJNqcJcRM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    try {
        // Create the table with direct SQL
        const { error: createError } = await supabase.rpc('exec_sql', {
            sql: `
CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'auto',
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_name ON whatsapp_groups(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_active ON whatsapp_groups(is_active, last_updated);

CREATE OR REPLACE FUNCTION update_whatsapp_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_groups_update_timestamp ON whatsapp_groups;
CREATE TRIGGER whatsapp_groups_update_timestamp
BEFORE UPDATE ON whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_groups_timestamp();
            `
        });

        if (createError && !createError.message.includes('already exists')) {
            console.error('Error creating table:', createError);
            return false;
        }

        // Sync groups from publications
        const { data: publications, error: pubError } = await supabase
            .from('publications')
            .select('groupe, nom_groupe')
            .not('groupe', 'is', null)
            .limit(1000);

        if (pubError) throw pubError;

        const groupsToInsert = [];
        const seenGroups = new Set();

        (publications || []).forEach(pub => {
            if (pub.groupe && pub.nom_groupe && !seenGroups.has(pub.groupe)) {
                seenGroups.add(pub.groupe);
                groupsToInsert.push({
                    id: pub.groupe,
                    name: pub.nom_groupe,
                    source: 'publication'
                });
            }
        });

        if (groupsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('whatsapp_groups')
                .upsert(groupsToInsert, { onConflict: 'id' });

            if (insertError) throw insertError;
            console.log(`✓ Inserted ${groupsToInsert.length} groups`);
        }

        // Also sync from locaux
        const { data: locaux, error: locauxError } = await supabase
            .from('locaux')
            .select('groupe_whatsapp_origine')
            .not('groupe_whatsapp_origine', 'is', null)
            .limit(1000);

        if (locauxError) throw locauxError;

        const locauxGroups = [];
        (locaux || []).forEach(item => {
            if (item.groupe_whatsapp_origine && !seenGroups.has(item.groupe_whatsapp_origine)) {
                seenGroups.add(item.groupe_whatsapp_origine);
                locauxGroups.push({
                    id: item.groupe_whatsapp_origine,
                    name: item.groupe_whatsapp_origine.split('@')[0],
                    source: 'locaux'
                });
            }
        });

        if (locauxGroups.length > 0) {
            const { error: insertError } = await supabase
                .from('whatsapp_groups')
                .upsert(locauxGroups, { onConflict: 'id' });

            if (insertError) throw insertError;
            console.log(`✓ Inserted ${locauxGroups.length} locaux groups`);
        }

        console.log('✓ Migration complete!');
        return true;
    } catch (err) {
        console.error('Migration error:', err);
        return false;
    }
}

applyMigration();
