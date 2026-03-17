import { createClient } from '@supabase/supabase-js';

async function test() {
    try {
        const supabase = createClient('https://udyfhzyvalansmhkynnc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk');

        // 1. On récupère un bien valide
        const { data: biens } = await supabase.from('locaux').select('ref_bien, type_de_bien, commune, telephone_expediteur').limit(1);
        if (!biens || biens.length === 0) {
            console.log("Aucun bien trouvé");
            return;
        }
        const bien = biens[0];
        console.log("Bien test:", bien.ref_bien);

        // 2. On insère une visite factice liée à ce bien
        const testVisit = {
            numero: '22500000000',
            nom_prenom: 'TEST VISITEUR',
            ref_bien: bien.ref_bien,
            date_rv: 'demain à 10h',
            local_interesse: `${bien.type_de_bien} à ${bien.commune}`,
            contact_proprietaire: bien.telephone_expediteur || '00000000',
            visite_prog: 'Oui',
            created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase.from('visite_programmee').insert([testVisit]);
        if (insertError) throw insertError;

        console.log("Visite de test insérée avec succès !");
    } catch (e) {
        console.error("Erreur:", e.message);
    }
}
test();
