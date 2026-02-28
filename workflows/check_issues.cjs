const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

const opts = {
  hostname: 'yobed-n8n-supabase-claude.hf.space',
  path: '/api/v1/workflows/LTZJrc7tYwv6Qm6a5wtZ0',
  method: 'GET',
  headers: { 'X-N8N-API-KEY': API_KEY }
};

const r = https.request(opts, function(res) {
  let d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    const wf = JSON.parse(d);

    console.log('Workflow active:', wf.active);
    console.log('Total nodes:', wf.nodes.length);

    // Check nodes with issues field
    console.log('\n=== NODES WITH ISSUES ===');
    let issueCount = 0;
    wf.nodes.forEach(function(n) {
      if (n.issues && Object.keys(n.issues).length > 0) {
        issueCount++;
        console.log('NODE:', n.name, '(' + n.type + ')');
        console.log('  issues:', JSON.stringify(n.issues));
      }
    });
    if (issueCount === 0) console.log('None found in node.issues');

    // Check httpRequest nodes - they need URL and method
    console.log('\n=== HTTP REQUEST NODES (checking config) ===');
    wf.nodes.filter(function(n) { return n.type === 'n8n-nodes-base.httpRequest'; }).forEach(function(n) {
      const hasUrl = n.parameters && n.parameters.url;
      const hasMethod = n.parameters && n.parameters.method;
      console.log(n.name + ':', hasUrl ? 'has URL' : 'NO URL', '|', hasMethod ? 'has method' : 'NO method');
    });

    // Show all credentials
    console.log('\n=== CREDENTIALS BY NODE ===');
    wf.nodes.forEach(function(n) {
      if (n.credentials && Object.keys(n.credentials).length > 0) {
        console.log(n.name + ':', JSON.stringify(Object.keys(n.credentials)));
      }
    });

    // Check connections validity - all referenced nodes exist
    console.log('\n=== CONNECTION VALIDITY ===');
    const nodeNames = wf.nodes.map(function(n) { return n.name; });
    let brokenConns = 0;
    Object.keys(wf.connections).forEach(function(source) {
      if (nodeNames.indexOf(source) === -1) {
        console.log('BROKEN source:', source);
        brokenConns++;
      }
      const branches = wf.connections[source].main || [];
      branches.forEach(function(branch, i) {
        (branch || []).forEach(function(conn) {
          if (nodeNames.indexOf(conn.node) === -1) {
            console.log('BROKEN target from', source, 'branch', i, ':', conn.node);
            brokenConns++;
          }
        });
      });
    });
    if (brokenConns === 0) console.log('All connections valid');

    // Show Sauvegarder Nouvelle Annonce params
    console.log('\n=== SAUVEGARDER NOUVELLE ANNONCE ===');
    const sauv = wf.nodes.find(function(n) { return n.name === 'Sauvegarder Nouvelle Annonce'; });
    if (sauv) {
      console.log('type:', sauv.type);
      console.log('params:', JSON.stringify(sauv.parameters).substring(0, 500));
    }
  });
});
r.on('error', function(e) { console.error(e); });
r.end();
