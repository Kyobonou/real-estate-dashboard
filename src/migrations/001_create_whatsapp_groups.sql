-- Migration: Create WhatsApp Groups Cache Table
-- Purpose: Cache WhatsApp group IDs with their display names
-- Created: 2026-02-21

CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'auto',
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_name ON whatsapp_groups(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_active ON whatsapp_groups(is_active, last_updated);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_whatsapp_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_groups_update_timestamp
BEFORE UPDATE ON whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_groups_timestamp();

COMMENT ON TABLE whatsapp_groups IS 'Cache table mapping WhatsApp group IDs to their display names';
COMMENT ON COLUMN whatsapp_groups.id IS 'WhatsApp group ID (format: xxx@g.us)';
COMMENT ON COLUMN whatsapp_groups.name IS 'Display name of the group';
