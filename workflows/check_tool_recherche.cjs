const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

https.request({
  hostname: 'yobed-n8n-supabase-claude.hf.space',
  path: '/api/v1/workflows/LTZJrc7tYwv6Qm6a5wtZ0',
  method: 'GET',
  headers: { 'X-N8N-API-KEY': API_KEY }
}, function(res) {
  let d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    const wf = JSON.parse(d);

    // Check Outil Recherche Annonces
    const outil = wf.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
    console.log('=== Outil Recherche Annonces ===');
    console.log('type:', outil && outil.type);
    console.log('name param:', outil && outil.parameters && outil.parameters.name);
    console.log('description:', outil && outil.parameters && outil.parameters.description);
    console.log('\nCode:');
    console.log(outil && outil.parameters && outil.parameters.jsCode);

    // Check Agent node options
    const agent = wf.nodes.find(function(n) { return n.name === 'Agent Conversationnel'; });
    console.log('\n=== Agent Conversationnel options ===');
    console.log(JSON.stringify(agent && agent.parameters && agent.parameters.options, null, 2));

    // Check connections TO the agent (what tools are connected)
    console.log('\n=== Connections to Agent Conversationnel ===');
    Object.entries(wf.connections).forEach(function([fromNode, conns]) {
      const main = conns.main || [];
      const ai = conns.ai_tool || [];
      if (ai.length > 0) {
        ai.forEach(function(branch) {
          (branch || []).forEach(function(c) {
            if (c.node === 'Agent Conversationnel') {
              console.log('Tool connected:', fromNode);
            }
          });
        });
      }
      // Also check if agent is the target
      (main || []).forEach(function(branch) {
        (branch || []).forEach(function(c) {
          if (c.node === 'Agent Conversationnel') {
            console.log('Main connected from:', fromNode);
          }
        });
      });
    });

    // Check all connection keys for agent
    const agentConns = wf.connections['Agent Conversationnel'];
    console.log('\n=== Agent outgoing connections ===');
    console.log(JSON.stringify(agentConns, null, 2));
  });
}).on('error', function(e) { console.error(e); }).end();
