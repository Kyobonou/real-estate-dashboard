const https = require('https');
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

// Minimal diagnostic code: test what's available in the toolCode environment
// The chatbot will relay the exact result back to the user
const DIAGNOSTIC_CODE = `// DIAGNOSTIC - teste l'environnement toolCode n8n
const results = [];
const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
const testUrl = SUPABASE_URL + '/rest/v1/locaux?select=id&limit=1&disponible=neq.Non';

// Test 1: fetch disponible?
results.push('fetch=' + (typeof fetch));

// Test 2: $helpers disponible?
results.push('helpers=' + (typeof $helpers));

// Test 3: essai requête fetch
try {
  const r = await fetch(testUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  const body = await r.json();
  results.push('fetch_status=' + r.status + '_count=' + (Array.isArray(body) ? body.length : 'err'));
} catch(e1) {
  results.push('fetch_err=' + e1.message.substring(0, 80));
}

// Test 4: essai $helpers si disponible
if (typeof $helpers !== 'undefined' && $helpers.httpRequest) {
  try {
    const r2 = await $helpers.httpRequest({ method: 'GET', url: testUrl, headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }, returnFullResponse: true, ignoreHttpStatusErrors: true });
    results.push('helpers_status=' + r2.statusCode + '_count=' + (Array.isArray(r2.body) ? r2.body.length : 'err'));
  } catch(e2) {
    results.push('helpers_err=' + e2.message.substring(0, 80));
  }
}

return 'DIAG: ' + results.join(' | ');`;

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const node = wf.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
  if (!node) { console.log('Tool node not found'); return; }

  const newParams = JSON.parse(JSON.stringify(node.parameters));
  newParams.jsCode = DIAGNOSTIC_CODE;

  wf.nodes = wf.nodes.map(function(n) {
    return n.name === 'Outil Recherche Annonces' ? Object.assign({}, n, { parameters: newParams }) : n;
  });

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const put = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });
  console.log('PUT status:', put.status);

  if (put.body && put.body.id) {
    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    console.log('\nTool code deployed. Now ask chatbot "test" and tell me EXACTLY what it responds.');
    console.log('The response will show: fetch available? $helpers available? Which one works?');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
