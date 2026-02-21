-- Create whatsapp_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'auto',
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_name ON public.whatsapp_groups(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_active ON public.whatsapp_groups(is_active, last_updated);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_whatsapp_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_groups_update_timestamp ON public.whatsapp_groups;
CREATE TRIGGER whatsapp_groups_update_timestamp
BEFORE UPDATE ON public.whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_whatsapp_groups_timestamp();

-- Sync groups from publications table
INSERT INTO public.whatsapp_groups (id, name, source, created_at, last_updated)
SELECT DISTINCT
    p.groupe,
    COALESCE(p.nom_groupe, p.groupe) as name,
    'publication' as source,
    NOW(),
    NOW()
FROM public.publications p
WHERE p.groupe IS NOT NULL
  AND p.groupe != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.whatsapp_groups wg WHERE wg.id = p.groupe
  )
ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.whatsapp_groups.name),
    source = 'publication',
    last_updated = NOW()
WHERE public.whatsapp_groups.source != 'wasender_api';

-- Also sync from locaux if groupe_whatsapp_origine exists
INSERT INTO public.whatsapp_groups (id, name, source, created_at, last_updated)
SELECT DISTINCT
    l.groupe_whatsapp_origine,
    COALESCE(l.groupe_whatsapp_origine, 'Groupe') as name,
    'locaux' as source,
    NOW(),
    NOW()
FROM public.locaux l
WHERE l.groupe_whatsapp_origine IS NOT NULL
  AND l.groupe_whatsapp_origine != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.whatsapp_groups wg WHERE wg.id = l.groupe_whatsapp_origine
  )
ON CONFLICT (id) DO NOTHING;

-- Display summary
SELECT COUNT(*) as total_groups FROM public.whatsapp_groups;
