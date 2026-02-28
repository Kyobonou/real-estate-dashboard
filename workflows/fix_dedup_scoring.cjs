const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

const NEW_DECIDER_CODE = `const check = $input.first().json;
const annonce = $('Parser IA REF Hash').first().json;
let existing = Array.isArray(check) ? check : (check && check.id ? [check] : []);
const dateExp = new Date(); dateExp.setDate(dateExp.getDate() + 30);

// --- ETAPE 1: Match exact par content_hash (rapide) ---
if (existing.length > 0) {
  const ex = existing[0];
  const isExpired = ex.status === 'archived' || ex.status === 'expired';
  return [{ json: { ...annonce, action: isExpired ? 'REACTIVATE' : 'RENEW', existing_id: ex.id, existing_ref: ex.ref_bien, relance_count: isExpired ? 0 : (ex.relance_count || 0) + 1, date_expiration: dateExp.toISOString(), dedup_method: 'hash' } }];
}

// --- ETAPE 2: Scoring de déboublonnage avant attribution d'une nouvelle REF ---
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const commune  = (annonce.commune || '').trim();
const typeRaw  = (annonce.type_de_bien || '').trim();
const type1    = typeRaw.toLowerCase().split(' ')[0]; // premier mot: 'villa' pour 'Villa Duplex'
const chambre  = (annonce.chambre || '').replace(/[^0-9]/g, '');

let candidates = [];
if (commune && type1 && chambre) {
  try {
    const url = 'https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/locaux'
      + '?commune=ilike.*' + encodeURIComponent(commune) + '*'
      + '&type_de_bien=ilike.' + encodeURIComponent(type1) + '*'
      + '&chambre=ilike.*' + chambre + '*'
      + '&disponible=neq.Non&status=neq.archived'
      + '&select=id,ref_bien,prix,telephone_bien,telephone_expediteur,chambre,commune,type_de_bien,content_hash,relance_count,date_expiration,status'
      + '&limit=20';
    const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

    let resp = null;
    try { resp = await this.helpers.httpRequest({ method: 'GET', url, headers: hdrs }); }
    catch(e1) {
      try { resp = await $helpers.httpRequest({ method: 'GET', url, headers: hdrs }); }
      catch(e2) { console.log('[Scoring] HTTP non dispo dans Code node, skip scoring'); }
    }
    if (Array.isArray(resp)) candidates = resp;
    console.log('[Scoring] Candidats trouvés:', candidates.length);
  } catch(e) {
    console.log('[Scoring] Erreur query:', e.message);
  }
}

function scoreCandidat(c) {
  let s = 0;

  // Type (40 pts): 'Duplex' === 'Duplex'
  const cType = (c.type_de_bien || '').toLowerCase();
  const aType = typeRaw.toLowerCase();
  if (cType === aType) s += 40;
  else if (cType.split(' ')[0] === type1 || cType.includes(type1)) s += 20;

  // Commune (30 pts)
  const cComm = (c.commune || '').toLowerCase();
  const aComm = commune.toLowerCase();
  if (cComm === aComm) s += 30;
  else if (cComm.includes(aComm) || aComm.includes(cComm)) s += 15;

  // Chambres (20 pts): écart 0 = full, écart 1 = partiel
  const cCh = parseInt(c.chambre) || 0;
  const aCh = parseInt(chambre) || 0;
  if (aCh > 0 && cCh > 0) {
    if (cCh === aCh) s += 20;
    else if (Math.abs(cCh - aCh) === 1) s += 8;
    else s -= 10;
  }

  // Prix (30 pts): ±5% = plein, ±15% = partiel, >50% = malus
  const cP = parseInt(String(c.prix || '').replace(/[^0-9]/g, '')) || 0;
  const aP = parseInt(String(annonce.prix || '').replace(/[^0-9]/g, '')) || 0;
  if (aP > 0 && cP > 0) {
    const ratio = Math.abs(cP - aP) / aP;
    if (ratio <= 0.05) s += 30;
    else if (ratio <= 0.15) s += 15;
    else if (ratio > 0.50) s -= 20;
  }

  // Téléphone (30 pts): signal très fort — même propriétaire ou même agent
  const cTel = (c.telephone_bien || c.telephone_expediteur || '').replace(/[^0-9]/g, '');
  const aTel = ((annonce.telephone_bien || annonce.telephone_expediteur || '')).replace(/[^0-9]/g, '');
  if (aTel.length > 6 && cTel.length > 6 && aTel === cTel) s += 30;

  return s;
}

// Seuil: 95 pts minimum
// type exact(40) + commune(30) + chambres(20) + prix ±5%(30) = 120 max
// type exact(40) + commune(30) + chambres(20) = 90 (sans prix → pas assez)
// type exact(40) + commune(30) + prix ±5%(30) = 100 (sans chambre → ok si tel confirme)
// type exact(40) + commune(30) + chambre(20) + prix ±15%(15) = 105 → doublon
let best = null, bestScore = 0;
for (const c of candidates) {
  const s = scoreCandidat(c);
  if (s > bestScore) { bestScore = s; best = c; }
}

const SEUIL = 95;
if (best && bestScore >= SEUIL) {
  const isExpired = best.status === 'archived' || best.status === 'expired';
  console.log('[Scoring] DOUBLON détecté (score=' + bestScore + '): ' + annonce.ref_bien + ' → réutilise ' + best.ref_bien);
  return [{ json: {
    ...annonce,
    action: isExpired ? 'REACTIVATE' : 'RENEW',
    existing_id: best.id,
    existing_ref: best.ref_bien,
    relance_count: isExpired ? 0 : (best.relance_count || 0) + 1,
    date_expiration: dateExp.toISOString(),
    dedup_method: 'scoring',
    dedup_score: bestScore
  }}];
}

console.log('[Scoring] NOUVEAU BIEN (meilleur score=' + bestScore + '<' + SEUIL + '): ' + annonce.ref_bien);
return [{ json: { ...annonce, action: 'INSERT', existing_id: null, dedup_best_score: bestScore } }];`;

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 }
    }, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const decider = wf.nodes.find(function(n) { return n.name === 'Decider Action'; });
  if (!decider) { console.log('Decider Action not found'); return; }

  console.log('Ancien code Decider Action:');
  console.log(decider.parameters.jsCode);

  decider.parameters = { jsCode: NEW_DECIDER_CODE };

  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

  if (!wf.connections['Mémoire Conversation']) {
    wf.connections['Mémoire Conversation'] = { "ai_memory": [[{ "node": "Agent Eden", "type": "ai_memory", "index": 0 }]] };
  }

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder','saveManualExecutions','callerPolicy','errorWorkflow','timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const put = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });
  console.log('PUT status:', put.status);

  if (put.body && put.body.id) {
    const updDecider = put.body.nodes.find(function(n) { return n.name === 'Decider Action'; });
    console.log('Scoring dans Decider:', updDecider && updDecider.parameters.jsCode.includes('scoreCandidat') ? 'OK' : 'ERREUR');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);

    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done.');
    console.log('\nLogique de scoring:');
    console.log('  type exact(40) + commune(30) + chambre(20) + prix±5%(30) = 120 (max)');
    console.log('  type(40) + commune(30) + chambre(20) + prix±15%(15) = 105 → doublon');
    console.log('  type(40) + commune(30) + chambre(20) = 90 → pas assez seul');
    console.log('  + telephone même (30) → très fort signal');
    console.log('  Seuil: 95 pts');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
