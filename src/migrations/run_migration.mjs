import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
// Using service_role key for DDL operations
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenlhdmFsYW5zbWhreW5uYyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTgwNzUzMDAsImV4cCI6MTg1NTg0MjcwMH0.3Zz6p7x8Y9q5K2w8L9m6O3p4Q5r6S7t8U9v0W1x2Y3';

async function runMigration() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const sqlPath = join(__dirname, 'create_whatsapp_groups.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('🚀 Running migration...\n');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;

      console.log(`Executing: ${statement.substring(0, 60)}...`);
      const { data, error } = await supabase.rpc('exec', {
        statement: statement.trim()
      });

      if (error && !error.message.includes('already exists')) {
        console.error('❌ Error:', error);
        continue;
      }

      console.log('✓ Success\n');
    }

    // Verify the table
    console.log('\n📊 Verifying table...');
    const { data, error: countError } = await supabase
      .from('whatsapp_groups')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✓ Table created and populated successfully`);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
