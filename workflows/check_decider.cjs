const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path) {
  return new Promise(function(resolve, reject) {
    const r = https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: { 'X-N8N-API-KEY': API_KEY }
    }, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(d)); }
        catch(e) { resolve(d); }
      });
    });
    r.on('error', reject);
    r.end();
  });
}

(async function() {
  const wf = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0');

  const decider = wf.nodes.find(function(n) { return n.name === 'Decider Action'; });
  console.log('=== Decider Action node ===');
  console.log('type:', decider.type);
  console.log('typeVersion:', decider.typeVersion);
  console.log('Parameters keys:', Object.keys(decider.parameters));
  console.log('mode:', decider.parameters.mode);
  console.log('executeOnce:', decider.executeOnce);
  console.log('\nCode (first 300 chars):');
  console.log(decider.parameters.jsCode.substring(0, 300));

  // Check Verifier Doublon Supabase config
  const verif = wf.nodes.find(function(n) { return n.name === 'Verifier Doublon Supabase'; });
  console.log('\n=== Verifier Doublon Supabase ===');
  console.log('Parameters:', JSON.stringify(verif.parameters, null, 2).substring(0, 800));
})();
