const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';
const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    };
    const r = https.request(opts, function(res) {
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

  // Show current params of Enregistrer Publication Supabase
  const node = wf.nodes.find(function(n) { return n.name === 'Enregistrer Publication Supabase'; });
  console.log('Current params:', JSON.stringify(node.parameters).substring(0, 200));

  // Build complete parameters like Sauvegarder Nouvelle Annonce but for publications table
  // Keep the jsonBody expression, add URL + method + headers
  const newParams = {
    method: 'POST',
    url: SUPABASE_URL + '/rest/v1/publications',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'apikey', value: '=' + SUPABASE_SERVICE_KEY },
        { name: 'Authorization', value: '=Bearer ' + SUPABASE_SERVICE_KEY },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=minimal' }
      ]
    },
    sendBody: true,
    contentType: 'raw',
    rawContentType: 'application/json',
    body: node.parameters.jsonBody  // keep the existing expression
  };

  wf.nodes = wf.nodes.map(function(n) {
    if (n.name === 'Enregistrer Publication Supabase') {
      console.log('Fixing node:', n.name);
      return Object.assign({}, n, { parameters: newParams });
    }
    return n;
  });

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const putRes = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });

  console.log('PUT status:', putRes.status);
  if (putRes.body && putRes.body.id) {
    const fixed = putRes.body.nodes.find(function(n) { return n.name === 'Enregistrer Publication Supabase'; });
    console.log('SUCCESS');
    console.log('url:', fixed && fixed.parameters && fixed.parameters.url);
    console.log('method:', fixed && fixed.parameters && fixed.parameters.method);
    console.log('active:', putRes.body.active);
  } else {
    console.log('Error:', JSON.stringify(putRes.body).substring(0, 400));
  }

  // Reactivate after PUT (PUT deactivates workflows)
  const activate = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
  console.log('Reactivated:', activate.body.active);
})();
