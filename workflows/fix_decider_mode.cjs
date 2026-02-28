const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

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

// Fixed Decider Action code:
// - mode: runOnceForAllItems (set in parameters)
// - null-safe $input.first() (returns null when 0 items = nouveau bien)
// - Step 1: content_hash exact match
// - Step 2: scoring fallback si pas de hash match
const NEW_DECIDER_CODE = `const checkItem = $input.first();
const check = checkItem ? checkItem.json : null;
const annonce = $('Parser IA REF Hash').first().json;
let existing = Array.isArray(check) ? check : (check && check.id ? [check] : []);
const dateExp = new Date(); dateExp.setDate(dateExp.getDate() + 30);

// --- ETAPE 1: Match exact par content_hash (rapide) ---
if (existing.length > 0) {
  const ex = existing[0];
  const isExpired = ex.status === 'archived' || ex.status === 'expired';
  return [{ json: { ...annonce, action: isExpired ? 'REACTIVATE' : 'RENEW', existing_id: ex.id, existing_ref: ex.ref_bien, relance_count: isExpired ? 0 : (ex.relance_count || 0) + 1, date_expiration: dateExp.toISOString(), dedup_method: 'hash' } }];
}

// --- ETAPE 2: Scoring de deboublonnage avant attribution d'une nouvelle REF ---
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const commune  = (annonce.commune || '').trim();
const typeRaw  = (annonce.type_de_bien || '').trim();
const type1    = typeRaw.toLowerCase().split(' ')[0];
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
    console.log('[Scoring] Candidats trouves:', candidates.length);
  } catch(e) {
    console.log('[Scoring] Erreur query:', e.message);
  }
}

function scoreCandidat(c) {
  let s = 0;
  const cType = (c.type_de_bien || '').toLowerCase();
  const aType = typeRaw.toLowerCase();
  if (cType === aType) s += 40;
  else if (cType.split(' ')[0] === type1 || cType.includes(type1)) s += 20;

  const cComm = (c.commune || '').toLowerCase();
  const aComm = commune.toLowerCase();
  if (cComm === aComm) s += 30;
  else if (cComm.includes(aComm) || aComm.includes(cComm)) s += 15;

  const cCh = parseInt(c.chambre) || 0;
  const aCh = parseInt(chambre) || 0;
  if (aCh > 0 && cCh > 0) {
    if (cCh === aCh) s += 20;
    else if (Math.abs(cCh - aCh) === 1) s += 8;
    else s -= 10;
  }

  const cP = parseInt(String(c.prix || '').replace(/[^0-9]/g, '')) || 0;
  const aP = parseInt(String(annonce.prix || '').replace(/[^0-9]/g, '')) || 0;
  if (aP > 0 && cP > 0) {
    const ratio = Math.abs(cP - aP) / aP;
    if (ratio <= 0.05) s += 30;
    else if (ratio <= 0.15) s += 15;
    else if (ratio > 0.50) s -= 20;
  }

  const cTel = (c.telephone_bien || c.telephone_expediteur || '').replace(/[^0-9]/g, '');
  const aTel = ((annonce.telephone_bien || annonce.telephone_expediteur || '')).replace(/[^0-9]/g, '');
  if (aTel.length > 6 && cTel.length > 6 && aTel === cTel) s += 30;

  return s;
}

const SEUIL = 95;
let best = null, bestScore = 0;
for (const c of candidates) {
  const s = scoreCandidat(c);
  if (s > bestScore) { bestScore = s; best = c; }
}

if (best && bestScore >= SEUIL) {
  const isExpired = best.status === 'archived' || best.status === 'expired';
  console.log('[Scoring] DOUBLON detecte (score=' + bestScore + '): ' + annonce.ref_bien + ' -> reutilise ' + best.ref_bien);
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

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const decider = wf.nodes.find(function(n) { return n.name === 'Decider Action'; });
  if (!decider) { console.log('Decider Action not found'); return; }

  console.log('Mode actuel:', decider.parameters.mode || '(undefined = runOnceForEachItem par defaut)');

  // Fix: set mode + null-safe code
  decider.parameters = {
    mode: 'runOnceForAllItems',
    jsCode: NEW_DECIDER_CODE
  };

  console.log('Mode fixe: runOnceForAllItems');

  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

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
    console.log('Mode dans workflow:', updDecider && updDecider.parameters.mode);
    console.log('Code null-safe:', updDecider && updDecider.parameters.jsCode.includes('checkItem ? checkItem.json') ? 'OK' : 'ERREUR');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);

    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done.');
    console.log('\nFix applique:');
    console.log('  mode: runOnceForAllItems -> Decider Action tourne meme si Verifier Doublon retourne []');
    console.log('  $input.first() null-safe -> pas de crash quand 0 items en entree');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
