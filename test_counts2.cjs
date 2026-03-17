const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const DEMAND_KEYWORDS = ["je cherche", "quelqu'un qui a"];

function _isDemand(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return DEMAND_KEYWORDS.some(kw => lower.includes(kw));
}

(async () => {
    // 1) Test with limit 500 and no order
    let res = await fetch('https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/locaux?select=*&limit=500', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    let data = await res.json();

    // 2) Deduplicate
    let transformed = data.map(p => ({
        id: p.id,
        publicationId: p.publication_id,
        contentHash: p.content_hash,
        description: p.message_initial || p.caracteristiques || '',
        commune: p.commune || ''
    }));

    let seenPubIds = new Set();
    let seenHashes = new Set();
    let seenTextFp = new Set();
    let deduped = [];

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

    console.log('Deduped count (500 limit, no order):', deduped.length);
})();
