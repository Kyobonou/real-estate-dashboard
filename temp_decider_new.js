const check = $input.first().json;
const annonce = $('Parser IA REF Hash').first().json;
let existing = Array.isArray(check) ? check : (check && check.id ? [check] : []);
const dateExp = new Date(); dateExp.setDate(dateExp.getDate() + 30);

// --- ETAPE 1: Match exact par content_hash (rapide) ---
if (existing.length > 0) {
    const ex = existing[0];
    const isExpired = ex.status === 'archived' || ex.status === 'expired';
    return [{ json: { ...annonce, action: isExpired ? 'REACTIVATE' : 'RENEW', existing_id: ex.id, existing_ref: ex.ref_bien, relance_count: isExpired ? 0 : (ex.relance_count || 0) + 1, date_expiration: dateExp.toISOString(), dedup_method: 'hash' } }];
}

// --- ETAPE 2: Scoring robuste sur le texte initial ---
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const commune = (annonce.commune || '').trim();
const typeRaw = (annonce.type_de_bien || '').trim();
const type1 = typeRaw.toLowerCase().split(' ')[0]; // premier mot: 'villa'
const chambre = (annonce.chambre || '').replace(/[^0-9]/g, '');

let candidates = [];
if (commune && type1) {
    try {
        // On sélectionne le message_initial pour la comparaison exacte du texte
        const url = 'https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/locaux'
            + '?commune=ilike.*' + encodeURIComponent(commune) + '*'
            + '&type_de_bien=ilike.' + encodeURIComponent(type1) + '*'
            + '&disponible=neq.Non&status=neq.archived'
            + '&select=id,ref_bien,prix,telephone_bien,telephone_expediteur,chambre,commune,type_de_bien,message_initial,relance_count,date_expiration,status'
            + '&limit=50';
        const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

        let resp = null;
        try { resp = await this.helpers.httpRequest({ method: 'GET', url, headers: hdrs }); }
        catch (e1) {
            try { resp = await $helpers.httpRequest({ method: 'GET', url, headers: hdrs }); }
            catch (e2) { console.log('[Scoring] HTTP non dispo dans Code node, skip scoring'); }
        }
        if (Array.isArray(resp)) candidates = resp;
    } catch (e) {
        console.log('[Scoring] Erreur query:', e.message);
    }
}

// Fonction pour évaluer la similarité textuelle robuste (Dice Coefficient / n-grams)
function textSimilarity(str1, str2) {
    const s1 = (str1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = (str2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === s2) return 1;
    if (s1.length < 3 || s2.length < 3) return 0;

    let bigrams1 = new Map();
    for (let i = 0; i < s1.length - 2; i++) {
        const big = s1.substring(i, i + 3);
        bigrams1.set(big, (bigrams1.get(big) || 0) + 1);
    }

    let intersectionSize = 0;
    for (let i = 0; i < s2.length - 2; i++) {
        const big = s2.substring(i, i + 3);
        const count = bigrams1.get(big);
        if (count > 0) {
            bigrams1.set(big, count - 1);
            intersectionSize++;
        }
    }
    return (2.0 * intersectionSize) / (s1.length + s2.length - 4);
}

let best = null;
let bestScore = 0;
const annonceText = (annonce.message_initial || '');

for (const c of candidates) {
    let score = 0;

    // 1. Similarité pure sur le texte initial (0 à 100 points)
    const candidateText = (c.message_initial || '');
    const sim = textSimilarity(annonceText, candidateText);
    score += (sim * 100);

    // 2. Bonus si c'est le même téléphone (30 points)
    const cTel = (c.telephone_bien || c.telephone_expediteur || '').replace(/[^0-9]/g, '');
    const aTel = (annonce.telephone_bien || annonce.telephone_expediteur || '').replace(/[^0-9]/g, '');
    if (aTel.length >= 8 && cTel.length >= 8 && aTel.includes(cTel)) {
        score += 30;
    }

    // 3. Bonus même prix exact (20 points)
    const cPrix = (c.prix || '').replace(/[^0-9]/g, '');
    const aPrix = (annonce.prix || '').replace(/[^0-9]/g, '');
    if (cPrix && aPrix && cPrix === aPrix) score += 20;

    if (score > bestScore) {
        bestScore = score;
        best = c;
    }
}

// Seuil de détection très strict : 90 points minimum.
// Une simple variation de ponctuation ou 1-2 mots dans le texte donne > 90% (90 pts).
// Si le texte est très différent (score texte ~60) mais même prix(20) + même numéro(30) -> 110 pts = doublon.
const SEUIL = 90;

if (best && bestScore >= SEUIL) {
    const isExpired = best.status === 'archived' || best.status === 'expired';
    console.log(`[Scoring] DOUBLON détecté (score=${bestScore.toFixed(2)}): ref ${annonce.ref_bien} -> match existant ${best.ref_bien}`);
    return [{
        json: {
            ...annonce,
            action: isExpired ? 'REACTIVATE' : 'RENEW',
            existing_id: best.id,
            existing_ref: best.ref_bien,
            relance_count: isExpired ? 0 : (best.relance_count || 0) + 1,
            date_expiration: dateExp.toISOString(),
            dedup_method: 'text_scoring',
            dedup_score: bestScore
        }
    }];
}

console.log(`[Scoring] NOUVEAU BIEN (meilleur score=${bestScore.toFixed(2)} < ${SEUIL}): ref ${annonce.ref_bien}`);
return [{ json: { ...annonce, action: 'INSERT', existing_id: null, dedup_best_score: bestScore } }];
