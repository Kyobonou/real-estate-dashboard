const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(path) {
  return new Promise(function(resolve, reject) {
    let d = '';
    https.request({ hostname: 'yobed-n8n-supabase-claude.hf.space', path: '/api/v1' + path, method: 'GET', headers: { 'X-N8N-API-KEY': API_KEY } }, function(r) {
      r.on('data', function(c) { d += c; });
      r.on('end', function() { resolve(JSON.parse(d)); });
    }).on('error', reject).end();
  });
}

(async function() {
  const wf = await req('/workflows/LTZJrc7tYwv6Qm6a5wtZ0');
  const tool = wf.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
  if (!tool) { console.log('Tool node not found'); return; }

  const code = tool.parameters.jsCode;

  // Check filter lines
  console.log('=== Disponible filter ===');
  const lines = code.split('\n').filter(function(l) { return l.includes('disponible') || l.includes('not.or') || l.includes('filters.push'); });
  lines.forEach(function(l) { console.log(l.trim()); });

  // Check HTTP method used
  console.log('\n=== HTTP method ===');
  console.log('Uses fetch:', code.includes('await fetch('));
  console.log('Uses $helpers:', code.includes('$helpers'));
  console.log('Uses https/http:', code.includes('require('));

  // Error handling
  console.log('\n=== Error handling ===');
  const errIdx = code.indexOf('response.ok');
  if (errIdx >= 0) console.log(code.substring(errIdx, errIdx + 200));

  // Last 10 lines of code
  const codeLines = code.split('\n');
  console.log('\n=== Last 10 lines ===');
  codeLines.slice(-10).forEach(function(l) { console.log(l); });
})();
