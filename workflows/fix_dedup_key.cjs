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

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (!tool) { console.log('toolCode not found'); return; }

  let jsCode = tool.parameters.jsCode;

  // Old dedup key (quartier-based — fails when AI extracts commune/quartier inconsistently)
  const OLD_DEDUP = `var seen = {};
biens = biens.filter(function(b) {
  var q = (b.quartier||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').substring(0,15);
  var key = [
    (b.prix||'').replace(/[^0-9]/g,'').substring(0,10),
    (b.chambre||'').replace(/[^0-9]/g,''),
    (b.type_de_bien||'').toLowerCase().substring(0,5),
    q
  ].join('|');
  if (seen[key]) return false;
  seen[key] = true;
  return true;
});`;

  // New dedup key: telephone + type + chambre + prix arrondi à 1 chiffre significatif
  // Exemple: 380 000 et 400 000 → tous les deux → 400 000 → même clé → dédupliqués
  // Signal fort: même propriétaire (tel) + même bien (type + chambres) + même prix ≈
  const NEW_DEDUP = `// Clé de dédup: telephone | type | chambre | prix arrondi (1 chiffre significatif)
// Résiste aux incohérences d'extraction commune/quartier de l'IA
// Exemple: 380 000 et 400 000 = même bucket → même bien partagé à prix légèrement différent
var seen = {};
biens = biens.filter(function(b) {
  var tel = (b.telephone_bien || b.telephone_expediteur || '').replace(/[^0-9]/g,'').slice(-8);
  var type5 = (b.type_de_bien || '').toLowerCase().split(' ')[0].substring(0,5);
  var ch = (b.chambre || '').replace(/[^0-9]/g,'');
  var p = parseInt((b.prix||'').replace(/[^0-9]/g,'')) || 0;
  var pBucket = p > 0 ? String(Math.round(p / Math.pow(10, Math.floor(Math.log10(p)))) * Math.pow(10, Math.floor(Math.log10(p)))) : '0';
  var key = [tel, type5, ch, pBucket].join('|');
  if (seen[key]) return false;
  seen[key] = true;
  return true;
});`;

  // Try exact replace first, then fall back to broader pattern match
  if (jsCode.includes('var q = (b.quartier')) {
    const replaced = jsCode.replace(OLD_DEDUP, NEW_DEDUP);
    if (replaced !== jsCode) {
      jsCode = replaced;
    } else {
      // Broader pattern: find and replace the whole seen+filter block
      const idx = jsCode.indexOf('var q = (b.quartier');
      if (idx > 0) {
        const blockStart = jsCode.lastIndexOf('var seen = {};', idx);
        const blockEnd = jsCode.indexOf('\n});', idx) + 4;
        if (blockStart > 0 && blockEnd > 0) {
          jsCode = jsCode.substring(0, blockStart) + NEW_DEDUP + jsCode.substring(blockEnd);
        }
      }
    }
  }

  const check1 = jsCode.includes('pBucket');
  const check2 = jsCode.includes('telephone_bien');
  console.log('Dedup key updated:', check1 && check2 ? 'OK' : 'ERREUR');
  if (!check1 || !check2) {
    const idx = jsCode.indexOf('var seen = {');
    console.log('Current dedup section:', jsCode.substring(idx, idx + 400));
    return;
  }

  tool.parameters.jsCode = jsCode;

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
    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done.');
    console.log('\nNouvelle clé de dédup:');
    console.log('  telephone(last 8) | type_first5 | chambres | prix_1sig_fig');
    console.log('  380 000 et 400 000 → bucket 400 000 → même clé → 1 seul résultat');
    console.log('  Résiste aux extractions commune/quartier incohérentes de l\'IA');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
