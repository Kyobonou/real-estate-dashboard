const https = require('https');
const SUPABASE_URL = 'udyfhzyvalansmhkynnc.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const DEMAND_KEYWORDS = [
    'je cherche', 'on cherche', 'nous cherchons', 'recherche urgente',
    'qui a un', 'qui a une', 'avec un budget', "quelqu'un qui a",
    'urgent pour', 'asap', 'chers collègues', 'cher collègue', 'chère collègue',
    'besoin de toute urgence', 'besoin toute urgence', 'un client a besoin',
    'ma cliente a besoin', 'cherche pour', 'sollicite', 'mon client cherche',
    'ma cliente cherche', 'mon client', 'ma cliente', 'ai un client',
    'ai une cliente', "besoin d'un", "besoin d'une", 'cherche un',
    'cherche une', 'recherche un', 'recherche une', 'besoin urgent',
    'qui dispose de', "quelqu'un a un", "quelqu'un a une",
    'qui a quelque chose', 'cherche urgemment', 'confrère', 'consoeur',
    'client a besoin', 'cliente a besoin', 'budget de', 'budget max',
    'au maximum', 'maxi loyer', 'loyer max', 'prix maxi',
];
function isDemand(t) {
    if (!t) return false;
    const l = t.toLowerCase();
    return DEMAND_KEYWORDS.some(k => l.includes(k));
}

const opts = {
    hostname: SUPABASE_URL,
    path: '/rest/v1/locaux?commune=ilike.*Cocody*&chambre=ilike.*3*&select=ref_bien,id,publication_id,content_hash,chambre,commune,caracteristiques,message_initial&limit=50',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
};
let d = '';
https.get(opts, r => {
    r.on('data', c => d += c);
    r.on('end', () => {
        const rows = JSON.parse(d);
        console.log('Total rows from DB:', rows.length);

        const seenPubIds = new Set();
        const seenHashes = new Set();
        const seenTextFp = new Set();
        const deduped = [];

        for (const p of rows) {
            const desc = p.message_initial || p.caracteristiques || '';
            if (isDemand(desc)) { console.log('DEMAND_SKIP:', p.ref_bien); continue; }

            const pubKey = p.publication_id || ('id:' + p.id);
            if (seenPubIds.has(pubKey)) { console.log('PUBID_SKIP:', p.ref_bien, 'key:', pubKey); continue; }
            seenPubIds.add(pubKey);

            if (p.content_hash && seenHashes.has(p.content_hash)) { console.log('HASH_SKIP:', p.ref_bien); continue; }
            if (p.content_hash) seenHashes.add(p.content_hash);

            let isDupText = false;
            if (desc && desc.length > 20) {
                const fp = desc.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 250);
                if (fp.length > 20) {
                    if (seenTextFp.has(fp)) {
                        isDupText = true;
                        console.log('TEXTFP_SKIP:', p.ref_bien, '| fp:', fp.substring(0, 50));
                    } else {
                        seenTextFp.add(fp);
                    }
                }
            }
            if (isDupText) continue;

            deduped.push(p);
            console.log('KEEP:', p.ref_bien, '| chambre:', p.chambre, '| commune:', p.commune);
        }

        console.log('\n--- After dedup:', deduped.length, 'total kept ---');

        const filtered = deduped.filter(p => {
            const chambres = parseInt(p.chambre) || 0;
            const matchPieces = chambres === 3;
            const matchCommune = p.commune === 'Cocody';
            if (!matchPieces) console.log('PIECES_MISMATCH:', p.ref_bien, 'chambre=', p.chambre, '-> parseInt=', parseInt(p.chambre));
            if (!matchCommune) console.log('COMMUNE_MISMATCH:', p.ref_bien, JSON.stringify(p.commune));
            return matchPieces && matchCommune;
        });

        console.log('\nFiltered Cocody 3-pièces:', filtered.length, 'results');
        filtered.forEach(p => console.log(' -', p.ref_bien, '|', p.commune, '|', p.chambre));
    });
});
