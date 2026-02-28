const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

const opts = {
  hostname: 'yobed-n8n-supabase-claude.hf.space',
  path: '/api/v1/workflows/LTZJrc7tYwv6Qm6a5wtZ0',
  method: 'GET',
  headers: { 'X-N8N-API-KEY': API_KEY }
};

https.request(opts, function(res) {
  let d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    const wf = JSON.parse(d);
    console.log('updatedAt:', wf.updatedAt);
    console.log('active:', wf.active);

    // Check Enregistrer node
    const n = wf.nodes.find(function(x) { return x.name === 'Enregistrer Publication Supabase'; });
    console.log('\nEnregistrer Publication Supabase:');
    console.log('  url:', n && n.parameters && n.parameters.url);
    console.log('  method:', n && n.parameters && n.parameters.method);

    // Check ALL httpRequest nodes for missing URL
    console.log('\n=== HTTPrequest nodes missing URL ===');
    wf.nodes.filter(function(x) { return x.type === 'n8n-nodes-base.httpRequest'; }).forEach(function(node) {
      const hasUrl = node.parameters && node.parameters.url;
      if (!hasUrl) {
        console.log('MISSING URL:', node.name);
        console.log('  params keys:', Object.keys(node.parameters || {}));
      }
    });
    console.log('Done');
  });
}).on('error', function(e) { console.error(e); }).end();
