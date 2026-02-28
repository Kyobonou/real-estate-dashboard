const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';
function req(method, path) {
  return new Promise(function(resolve, reject) {
    const r = https.request({ hostname: 'yobed-n8n-supabase-claude.hf.space', path: '/api/v1' + path, method: method, headers: { 'X-N8N-API-KEY': API_KEY } }, function(res) {
      let d = ''; res.on('data', function(c) { d += c; }); res.on('end', function() { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    }); r.on('error', reject); r.end();
  });
}
(async function() {
  const wf = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0');
  const agent = wf.nodes.find(function(n) { return n.name === 'Agent Eden'; });
  console.log('=== AGENT EDEN - system prompt ===');
  const prompt = agent.parameters.options && agent.parameters.options.systemMessage;
  if (prompt) console.log(prompt);
  else console.log('systemMessage not found. Parameters keys:', Object.keys(agent.parameters));
})();
