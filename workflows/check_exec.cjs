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
  // Try with includeData=true
  const e = await req('GET', '/executions/32673?includeData=true');
  const data = e.data && e.data.resultData && e.data.resultData.runData;
  if (!data) {
    console.log('Still no runData. Keys:', Object.keys(e.data || e));
    // Check last 3 executions with errors
    const list = await req('GET', '/executions?workflowId=LTZJrc7tYwv6Qm6a5wtZ0&limit=5&status=error');
    console.log('\nError executions:', JSON.stringify(list).substring(0, 500));
    return;
  }

  const nodes = Object.keys(data);
  console.log('Nodes executes (' + nodes.length + '):\n ', nodes.join('\n  '));

  console.log('\nOutputs par node:');
  nodes.forEach(function(n) {
    const nd = data[n];
    if (nd && nd[0] && nd[0].data) {
      const out = nd[0].data.main;
      if (out && out[0] && out[0][0]) {
        const item = out[0][0].json;
        if (item) console.log(' [' + n + ']:', JSON.stringify(item).substring(0, 200));
      }
    }
  });
})();
