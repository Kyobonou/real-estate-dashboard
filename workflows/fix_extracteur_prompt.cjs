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

  const node = wf.nodes.find(function(n) { return n.name === 'Extracteur Metadonnees'; });
  if (!node) { console.log('Node not found'); return; }

  // The messages are in parameters.responses.values
  const values = node.parameters.responses && node.parameters.responses.values;
  if (!values) { console.log('No responses.values found'); return; }

  // Find the user message (index 1, no role or role=user)
  let fixed = false;
  const newValues = values.map(function(m) {
    const content = m.content || '';
    if (typeof content === 'string' && content.includes('$json.text')) {
      fixed = true;
      const newContent = content.replace(/\$json\.text/g, "$('Recuperer Message Texte').first().json.text");
      console.log('OLD content (first 150):', content.substring(0, 150));
      console.log('NEW content (first 150):', newContent.substring(0, 150));
      return Object.assign({}, m, { content: newContent });
    }
    return m;
  });

  if (!fixed) { console.log('$json.text not found in responses.values'); return; }

  // Update node params
  const newParams = Object.assign({}, node.parameters, {
    responses: Object.assign({}, node.parameters.responses, { values: newValues })
  });

  wf.nodes = wf.nodes.map(function(n) {
    return n.name === 'Extracteur Metadonnees' ? Object.assign({}, n, { parameters: newParams }) : n;
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
    const check = put.body.nodes.find(function(n) { return n.name === 'Extracteur Metadonnees'; });
    const vals = check && check.parameters && check.parameters.responses && check.parameters.responses.values;
    const userMsg = vals && vals.find(function(m) { return (m.content || '').includes('Recuperer Message Texte'); });
    console.log('Fix verified:', userMsg ? 'SUCCESS' : 'FAILED');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
