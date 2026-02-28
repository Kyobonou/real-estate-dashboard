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

    // Check all Code nodes for syntax errors
    console.log('=== CODE NODES SYNTAX CHECK ===');
    wf.nodes.filter(function(n) { return n.type === 'n8n-nodes-base.code'; }).forEach(function(n) {
      const code = n.parameters && (n.parameters.jsCode || n.parameters.pythonCode || '');
      if (code) {
        try {
          new Function(code);
          console.log('OK:', n.name);
        } catch(e) {
          console.log('SYNTAX ERROR in [' + n.name + ']:', e.message);
          // Show problematic lines
          const lines = code.split('\n');
          const match = e.message.match(/line (\d+)/i);
          if (match) {
            const lineNum = parseInt(match[1]) - 1;
            console.log('  Around line', lineNum + ':', lines[lineNum]);
          }
        }
      }
    });

    // Check all nodes with issues field set
    console.log('\n=== NODES WITH .issues FIELD ===');
    let found = 0;
    wf.nodes.forEach(function(n) {
      if (n.issues) {
        const keys = Object.keys(n.issues);
        if (keys.length > 0) {
          found++;
          console.log(n.name + ':', JSON.stringify(n.issues));
        }
      }
    });
    if (found === 0) console.log('None in API response');

    // Check OpenAI Chat Model node full config
    console.log('\n=== OpenAI Chat Model ===');
    const oai = wf.nodes.find(function(n) { return n.name === 'OpenAI Chat Model'; });
    if (oai) {
      console.log('type:', oai.type);
      console.log('typeVersion:', oai.typeVersion);
      console.log('credentials:', JSON.stringify(oai.credentials));
      console.log('parameters:', JSON.stringify(oai.parameters).substring(0, 300));
    }
  });
}).on('error', function(e) { console.error(e); }).end();
