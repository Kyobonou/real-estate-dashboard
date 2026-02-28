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

// What we look for (exact string to replace)
const OLD_SLICE = `  var res = top.slice(0,3).map(function(r){return r.b;});`;

// Dedup key: telephone(last 8) | type(first word, 5 chars) | chambre | prix bucket (1 significant figure)
// 380 000 et 400 000 → bucket 400 000 → même clé → 1 seul résultat
const NEW_SLICE = `  // Dedup: telephone | type | chambre | prix arrondi (1 chiffre significatif)
  // Resiste aux extractions commune/quartier/prix incoherentes de l'IA
  var seenDedup = {};
  top = top.filter(function(r) {
    var b = r.b;
    var tel = (b.telephone_bien || b.telephone_expediteur || b.telephone || '').replace(/[^0-9]/g,'').slice(-8);
    var type5 = (b.type_de_bien || '').toLowerCase().split(' ')[0].substring(0,5);
    var ch = (b.chambre || '').replace(/[^0-9]/g,'');
    var p = parseInt((b.prix||'').replace(/[^0-9]/g,'')) || 0;
    var pBucket = p > 0 ? String(Math.round(p / Math.pow(10, Math.floor(Math.log10(p)))) * Math.pow(10, Math.floor(Math.log10(p)))) : '0';
    var key = [tel, type5, ch, pBucket].join('|');
    if (seenDedup[key]) return false;
    seenDedup[key] = true;
    return true;
  });
  var res = top.slice(0,3).map(function(r){return r.b;});`;

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (!tool) { console.log('toolCode not found'); return; }

  let jsCode = tool.parameters.jsCode;

  if (!jsCode.includes(OLD_SLICE.trim())) {
    console.log('Pattern not found. Current context:');
    const idx = jsCode.indexOf('var res = top.slice');
    console.log(jsCode.substring(idx - 50, idx + 150));
    return;
  }

  // Already patched?
  if (jsCode.includes('seenDedup')) {
    console.log('Dedup already present (seenDedup found). No change needed.');
    return;
  }

  jsCode = jsCode.replace(OLD_SLICE, NEW_SLICE);

  const check1 = jsCode.includes('seenDedup');
  const check2 = jsCode.includes('pBucket');
  const check3 = jsCode.includes('telephone_bien');
  console.log('Dedup injected:', (check1 && check2 && check3) ? 'OK' : 'ERREUR');
  if (!check1 || !check2 || !check3) return;

  tool.parameters.jsCode = jsCode;

  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

  if (!wf.connections['Memoire Conversation'] && !wf.connections['\u039c\u03ae\u03bc\u03bf\u03c1\u03b7 Conversation']) {
    // Preserve existing AI connections from fetched workflow
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
    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done.');
    console.log('\nCle de dedup injectee avant top.slice(0,3):');
    console.log('  telephone(last 8) | type(first word, 5ch) | chambre | prix bucket');
    console.log('  380 000 et 400 000 -> bucket 400 000 -> meme cle -> 1 seul resultat');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
