const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

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
    const res = await fetch('https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/locaux?select=*&order=date_publication.desc&limit=1000', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const data = await res.json();
    console.log('Fetched:', data.length);

    const transformed = data.map(p => ({
        id: p.id,
        publicationId: p.publication_id,
        contentHash: p.content_hash,
        description: p.message_initial || p.caracteristiques || '',
        commune: p.commune || ''
    }));

    const seenPubIds = new Set();
    const seenHashes = new Set();
    const seenTextFp = new Set();
    const deduped = [];

    for (const p of transformed) {
        if (_isDemand(p.description)) continue;

        const pubKey = p.publicationId || ('id:' + p.id);
        if (seenPubIds.has(pubKey)) continue;
        seenPubIds.add(pubKey);

        if (p.contentHash && seenHashes.has(p.contentHash)) continue;
        if (p.contentHash) seenHashes.add(p.contentHash);

        let isDupText = false;
        if (p.description && p.description.length > 20) {
            const textPart = p.description
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 250);
            const fp = (p.commune || '') + '|' + textPart;
            if (textPart.length > 20) {
                if (seenTextFp.has(fp)) isDupText = true;
                else seenTextFp.add(fp);
            }
        }
        if (isDupText) continue;

        deduped.push(p);
    }

    console.log('Deduped count (1000 limit):', deduped.length);

    // Let's also check for 2000
    const res2 = await fetch('https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/locaux?select=*&order=date_publication.desc&limit=2000', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const data2 = await res2.json();
    console.log('Fetched (2000 limit):', data2.length);

    const transformed2 = data2.map(p => ({
        id: p.id,
        publicationId: p.publication_id,
        contentHash: p.content_hash,
        description: p.message_initial || p.caracteristiques || '',
        commune: p.commune || ''
    }));

    const seenPubIds2 = new Set();
    const seenHashes2 = new Set();
    const seenTextFp2 = new Set();
    const deduped2 = [];

    for (const p of transformed2) {
        if (_isDemand(p.description)) continue;

        const pubKey = p.publicationId || ('id:' + p.id);
        if (seenPubIds2.has(pubKey)) continue;
        seenPubIds2.add(pubKey);

        if (p.contentHash && seenHashes2.has(p.contentHash)) continue;
        if (p.contentHash) seenHashes2.add(p.contentHash);

        let isDupText = false;
        if (p.description && p.description.length > 20) {
            const textPart = p.description
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 250);
            const fp = (p.commune || '') + '|' + textPart;
            if (textPart.length > 20) {
                if (seenTextFp2.has(fp)) isDupText = true;
                else seenTextFp2.add(fp);
            }
        }
        if (isDupText) continue;

        deduped2.push(p);
    }
    console.log('Deduped count (2000 limit):', deduped2.length);
})();
