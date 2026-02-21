-- Migration: Create WhatsApp Groups Cache Table
-- Purpose: Map WhatsApp group IDs to group names for efficient lookup
-- Created: 2026-02-21

-- Drop existing if needed (for dev)
-- DROP TABLE IF EXISTS whatsapp_groups CASCADE;

-- Create main table
CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    participant_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    source TEXT DEFAULT 'auto',  -- 'manual', 'wasender', 'publication'
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_name ON whatsapp_groups(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_active ON whatsapp_groups(is_active, last_updated);

-- Add trigger to auto-update last_updated
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

-- Comments
COMMENT ON TABLE whatsapp_groups IS 'Cache table mapping WhatsApp group IDs to their display names';
COMMENT ON COLUMN whatsapp_groups.id IS 'WhatsApp group ID (format: xxx@g.us)';
COMMENT ON COLUMN whatsapp_groups.name IS 'Display name of the group';
COMMENT ON COLUMN whatsapp_groups.source IS 'Source of the group name (manual, wasender, publication)';
COMMENT ON COLUMN whatsapp_groups.is_active IS 'Whether group is currently active';
