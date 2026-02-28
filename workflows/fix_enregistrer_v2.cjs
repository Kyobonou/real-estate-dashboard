const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

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

  // Get FULL params of Sauvegarder Nouvelle Annonce (the one that WORKS)
  const sauv = wf.nodes.find(function(n) { return n.name === 'Sauvegarder Nouvelle Annonce'; });
  console.log('=== Sauvegarder FULL params ===');
  console.log(JSON.stringify(sauv.parameters, null, 2).substring(0, 1000));

  // Get FULL params of Enregistrer Publication Supabase
  const enreg = wf.nodes.find(function(n) { return n.name === 'Enregistrer Publication Supabase'; });
  console.log('\n=== Enregistrer CURRENT params ===');
  console.log(JSON.stringify(enreg.parameters, null, 2));

  // Strategy: Copy Sauvegarder's structure but point to publications table
  // and keep the existing body expression from jsonBody
  const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
  const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

  // Build params using EXACT same structure as Sauvegarder Nouvelle Annonce
  // but replace table name and jsonBody expression
  const newParams = JSON.parse(JSON.stringify(sauv.parameters));
  newParams.url = SUPABASE_URL + '/rest/v1/publications';
  // Replace the body expression to use the publications fields
  // Find the body field in Sauvegarder's params and replace it
  console.log('\nSauvegarder body field keys:', Object.keys(newParams).filter(function(k) {
    return k.toLowerCase().includes('body') || k.toLowerCase().includes('json');
  }));

  // Copy the jsonBody expression from Enregistrer into the new params
  // But we need to find the right key name
  const bodyKeys = Object.keys(newParams).filter(function(k) {
    return typeof newParams[k] === 'string' && newParams[k].includes('json');
  });
  console.log('Body expression keys in new params:', bodyKeys);

  // Show what Sauvegarder sends as body
  Object.keys(newParams).forEach(function(k) {
    if (typeof newParams[k] === 'string' && newParams[k].length > 30) {
      console.log('Key "' + k + '":', newParams[k].substring(0, 100));
    }
  });
})();
