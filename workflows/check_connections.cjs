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

  // Show all node names
  console.log('=== NODES (' + wf.nodes.length + ') ===');
  wf.nodes.forEach(function(n) { console.log(' ', n.name, '|', n.type.split('.').pop()); });

  // Show connections FROM Verifier Doublon Supabase
  console.log('\n=== CONNECTIONS FROM "Verifier Doublon Supabase" ===');
  const vds = wf.connections['Verifier Doublon Supabase'];
  console.log(JSON.stringify(vds, null, 2));

  // Show connections FROM "Parser IA REF Hash"
  console.log('\n=== CONNECTIONS FROM "Parser IA REF Hash" ===');
  const prf = wf.connections['Parser IA REF Hash'];
  console.log(JSON.stringify(prf, null, 2));

  // Show connections FROM "Decider Action"
  console.log('\n=== CONNECTIONS FROM "Decider Action" ===');
  const da = wf.connections['Decider Action'];
  console.log(JSON.stringify(da, null, 2));

  // Check if Decider Action node exists
  const decider = wf.nodes.find(function(n) { return n.name === 'Decider Action'; });
  console.log('\nDecider Action node exists:', !!decider);
  if (decider) console.log('  type:', decider.type, '| disabled:', decider.disabled);
})();
