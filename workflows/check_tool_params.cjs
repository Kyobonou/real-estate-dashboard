const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

var d = '';
https.request({
  hostname: 'yobed-n8n-supabase-claude.hf.space',
  path: '/api/v1/workflows/LTZJrc7tYwv6Qm6a5wtZ0',
  method: 'GET',
  headers: { 'X-N8N-API-KEY': API_KEY }
}, function(r) {
  r.on('data', function(c) { d += c; });
  r.on('end', function() {
    var wf = JSON.parse(d);
    var tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });

    console.log('=== Tool Node ===');
    console.log('name:', tool && tool.name);
    console.log('type:', tool && tool.type);
    console.log('parameters keys:', tool && Object.keys(tool.parameters || {}).join(', '));

    if (tool && tool.parameters) {
      console.log('\nparameters.name:', tool.parameters.name);
      console.log('parameters.description (first 100):', (tool.parameters.description || '').substring(0, 100));
      console.log('parameters.jsCode length:', (tool.parameters.jsCode || '').length);
      console.log('jsCode first 200:', (tool.parameters.jsCode || '').substring(0, 200));
    }
  });
}).on('error', console.error).end();
