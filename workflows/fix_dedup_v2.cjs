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

  // Old dedup block (telephone-based, doesn't sort by commune)
  const OLD = `// Deduplicate: same price + same commune + same chambre + same phone = same bien
var seen = {};
biens = biens.filter(function(b) {
  var key = [
    (b.prix||'').replace(/[^0-9]/g,''),
    (b.commune||'').toLowerCase(),
    (b.chambre||'').replace(/[^0-9]/g,''),
    (b.telephone_bien||b.telephone_expediteur||''),
    (b.type_de_bien||'').toLowerCase().substring(0,5)
  ].join('|');
  if (seen[key]) return false;
  seen[key] = true;
  return true;
});`;

  // New dedup block: sort commune-filled rows first, then dedup by prix+chambre+type+quartier
  const NEW = `// Deduplicate: prefer biens with commune over empty-commune rows (move them first)
// Key: prix+chambre+type+quartier — no telephone, same bien shared by different numbers still deduped
biens.sort(function(a, b) {
  if (a.commune && !b.commune) return -1;
  if (!a.commune && b.commune) return 1;
  return 0;
});
var seen = {};
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

  if (!jsCode.includes('// Deduplicate: same price + same commune + same chambre + same phone = same bien')) {
    console.log('Pattern not found in jsCode. Current dedup section:');
    const idx = jsCode.indexOf('Deduplicate');
    console.log(jsCode.substring(Math.max(0, idx - 10), idx + 300));
    return;
  }

  jsCode = jsCode.replace(OLD, NEW);
  console.log('Dedup replaced:', jsCode.includes('// Deduplicate: prefer biens') ? 'YES' : 'NO');

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
    console.log('Done. Test: vous avez des duplex ?');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
