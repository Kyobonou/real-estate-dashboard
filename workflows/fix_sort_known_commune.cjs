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
  if (!tool) { console.log('toolCode node not found'); return; }

  let jsCode = tool.parameters.jsCode;

  // Replace the sort block to use 3-level commune ranking:
  // 0 = commune connue d'Abidjan → TOP
  // 1 = commune non-vide mais inconnue (7eme tranche, Abatta...)
  // 2 = commune vide
  const OLD_SORT = `// Deduplicate: sort by (1) exact type match, (2) commune filled
// e.g. for 'duplex': "Duplex" before "Villa Duplex" before empty-commune rows
biens.sort(function(a, b) {
  if (critType) {
    var aN = (a.type_de_bien||'').toLowerCase().replace(/[^a-z]/g,'');
    var bN = (b.type_de_bien||'').toLowerCase().replace(/[^a-z]/g,'');
    var aExact = aN === critType ? 1 : 0;
    var bExact = bN === critType ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
  }
  if (a.commune && !b.commune) return -1;
  if (!a.commune && b.commune) return 1;
  return 0;
});`;

  const NEW_SORT = `// Tri avant dédup: (1) type exact, (2) commune connue d'Abidjan, (3) commune non-vide, (4) commune vide
var COMMUNES_CONNUES = ['cocody','yopougon','marcory','koumassi','treichville','plateau','adjame','abobo','port bouet','bingerville','riviera','angre','deux plateaux','bonoumin','bassam','assinie','riviera 2','riviera 3','palmeraie','attoban','niangon','danga','orly'];
function rangCommune(c) {
  if (!c) return 2;
  var cn = c.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  if (COMMUNES_CONNUES.some(function(k){ return cn.includes(k); })) return 0;
  return 1;
}
biens.sort(function(a, b) {
  if (critType) {
    var aN = (a.type_de_bien||'').toLowerCase().replace(/[^a-z]/g,'');
    var bN = (b.type_de_bien||'').toLowerCase().replace(/[^a-z]/g,'');
    var aExact = aN === critType ? 1 : 0;
    var bExact = bN === critType ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
  }
  return rangCommune(a.commune) - rangCommune(b.commune);
});`;

  if (jsCode.includes('// Deduplicate: sort by (1) exact type match, (2) commune filled')) {
    jsCode = jsCode.replace(OLD_SORT, NEW_SORT);
    console.log('Sort replaced:', jsCode.includes('COMMUNES_CONNUES') ? 'OK' : 'ERREUR');
  } else {
    console.log('Pattern not found. Current sort:');
    const idx = jsCode.indexOf('biens.sort');
    console.log(jsCode.substring(idx, idx + 300));
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
    console.log('\nOrdre de priorité des communes:');
    console.log('  1. Communes connues Abidjan (Cocody, Yopougon, Marcory...)');
    console.log('  2. Communes non-vides inconnues (7eme tranche, Abatta...)');
    console.log('  3. Commune vide');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
