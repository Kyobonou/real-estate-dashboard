const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    }, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const node = wf.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
  if (!node) { console.log('Node not found'); return; }

  const newParams = JSON.parse(JSON.stringify(node.parameters));

  // Fix: Supabase has disponible = "true" (330 rows), "Oui" (4 rows), "Non" (1 row)
  // Old filter: or=(disponible.eq.Oui,disponible.is.null) → misses ALL new "true" rows
  // New filter: not.or=(disponible.eq.Non,disponible.eq.false) → catches ALL available rows
  const oldFilter = "filters.push('or=(disponible.eq.Oui,disponible.is.null)');";
  const newFilter = "filters.push('not.or=(disponible.eq.Non,disponible.eq.false)');";

  if (!newParams.jsCode.includes(oldFilter)) {
    console.log('Old filter not found. Current disponible filter:');
    const lines = newParams.jsCode.split('\n').filter(l => l.includes('disponible'));
    console.log(lines.join('\n'));
    return;
  }

  newParams.jsCode = newParams.jsCode.replace(oldFilter, newFilter);
  console.log('Filter updated:', newParams.jsCode.includes(newFilter) ? 'YES' : 'NO');

  wf.nodes = wf.nodes.map(function(n) {
    return n.name === 'Outil Recherche Annonces' ? Object.assign({}, n, { parameters: newParams }) : n;
  });

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const put = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });
  console.log('\nPUT status:', put.status);

  if (put.body && put.body.id) {
    const check = put.body.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
    const hasNewFilter = check && check.parameters && check.parameters.jsCode &&
      check.parameters.jsCode.includes("not.or=(disponible.eq.Non,disponible.eq.false)");
    console.log('Fix verified:', hasNewFilter ? 'SUCCESS' : 'FAILED');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    console.log('Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
