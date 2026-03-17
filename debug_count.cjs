const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEMAND_KEYWORDS = [
    "je cherche", "on cherche", "nous cherchons", "recherche urgente",
    "qui a un", "qui a une", "avec un budget", "quelqu'un qui a",
    "urgent pour", "asap", "chers collègues", "cher collègue", "chère collègue",
    "besoin de toute urgence", "besoin toute urgence", "un client a besoin",
    "ma cliente a besoin", "cherche pour", "sollicite", "mon client cherche",
    "ma cliente cherche", "mon client", "ma cliente", "ai un client",
    "ai une cliente", "besoin d'un", "besoin d'une", "cherche un",
    "cherche une", "recherche un", "recherche une", "besoin urgent",
    "qui dispose de", "quelqu'un a un", "quelqu'un a une",
    "qui a quelque chose", "cherche urgemment", "confrère", "consoeur",
    "client a besoin", "cliente a besoin", "budget de", "budget max",
    "au maximum", "maxi loyer", "loyer max", "prix maxi",
];

function _isDemand(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return DEMAND_KEYWORDS.some(kw => lower.includes(kw));
}

(async () => {
    // 1. Total en base
    const { count } = await supabase
        .from('locaux')
        .select('*', { count: 'exact', head: true });
    console.log(`\n=== ANALYSE DE LA BASE SUPABASE ===`);
    console.log(`Total enregistrements dans locaux: ${count}`);

    // 2. Fetch all with 5000 limit
    const { data, error } = await supabase
        .from('locaux')
        .select('id, publication_id, content_hash, message_initial, caracteristiques, commune, disponible, date_publication')
        .order('date_publication', { ascending: false })
        .limit(5000);

    if (error) {
        console.error('Erreur:', error.message);
        return;
    }

    console.log(`Récupérés avec limit(5000): ${data.length}`);

    // 3. Simulate deduplication
    let filteredByDemand = 0;
    let filteredByPubId = 0;
    let filteredByHash = 0;
    let filteredByText = 0;

    const seenPubIds = new Set();
    const seenHashes = new Set();
    const seenTextFp = new Set();
    const deduped = [];

    for (const p of data) {
        const description = p.message_initial || p.caracteristiques || '';

        if (_isDemand(description)) { filteredByDemand++; continue; }

        const pubKey = p.publication_id || ('id:' + p.id);
        if (seenPubIds.has(pubKey)) { filteredByPubId++; continue; }
        seenPubIds.add(pubKey);

        if (p.content_hash && seenHashes.has(p.content_hash)) { filteredByHash++; continue; }
        if (p.content_hash) seenHashes.add(p.content_hash);

        let isDupText = false;
        if (description && description.length > 20) {
            const textPart = description
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 250);
            const fp = (p.commune || '') + '|' + textPart;
            if (textPart.length > 20) {
                if (seenTextFp.has(fp)) { isDupText = true; filteredByText++; }
                else seenTextFp.add(fp);
            }
        }
        if (isDupText) continue;

        deduped.push(p);
    }

    console.log(`\n--- ANALYSE DEDUPLICATION ---`);
    console.log(`Filtrés (demandes mal classées): ${filteredByDemand}`);
    console.log(`Filtrés (publication_id en double): ${filteredByPubId}`);
    console.log(`Filtrés (content_hash en double): ${filteredByHash}`);
    console.log(`Filtrés (texte trop similaire): ${filteredByText}`);
    console.log(`\nBIENS UNIQUES FINAUX: ${deduped.length}`);
    console.log(`Disponibles: ${deduped.filter(p => p.disponible !== false && !(typeof p.disponible === 'string' && p.disponible.toLowerCase() === 'non')).length}`);

    // 4. Breakdown filtered by demand - sample
    console.log(`\n--- EXEMPLE: 5 BIENS FILTRES COMME DEMANDES ---`);
    let demandSamples = 0;
    for (const p of data) {
        const description = p.message_initial || p.caracteristiques || '';
        if (_isDemand(description) && demandSamples < 5) {
            const matchedKw = DEMAND_KEYWORDS.filter(kw => description.toLowerCase().includes(kw));
            console.log(`ID ${p.id}: "${description.substring(0, 60)}..." => mots-clés: [${matchedKw.slice(0, 3).join(', ')}]`);
            demandSamples++;
        }
    }

    // 5. Recent entries
    console.log(`\n--- 5 BIENS LES PLUS RECENTS EN BASE ---`);
    data.slice(0, 5).forEach(p => {
        const inDeduped = deduped.some(d => d.id === p.id);
        console.log(`ID ${p.id} [${p.date_publication?.substring(0, 10)}] ${inDeduped ? '✓ VISIBLE' : '✗ FILTRÉ'}: "${(p.message_initial || '').substring(0, 50)}"`);
    });
})();
