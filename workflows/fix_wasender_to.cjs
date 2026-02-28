const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 }
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

  const node = wf.nodes.find(function(n) { return n.name === 'Envoyer Reponse WhatsApp'; });
  if (!node) { console.log('Node not found'); return; }

  console.log('Current body:', JSON.stringify(node.parameters.jsonBody || node.parameters.bodyParameters || node.parameters.body || '').substring(0, 300));
  console.log('Current params keys:', Object.keys(node.parameters).join(', '));

  // Find and fix the "to" field — replace LID-broken remoteJid processing with cleanedSenderPn
  // Old: remoteJid.replace('@s.whatsapp.net','').replace('@lid','') → gives LID number for LID users
  // New: cleanedSenderPn → already the correct phone number from Normaliser
  const newParams = JSON.parse(JSON.stringify(node.parameters));

  // The JSON body is in jsonBody or similar field
  var jsonBodyKey = null;
  ['jsonBody', 'body', 'jsonParameters'].forEach(function(k) {
    if (newParams[k]) jsonBodyKey = k;
  });

  console.log('jsonBodyKey:', jsonBodyKey);

  if (jsonBodyKey) {
    var oldBody = newParams[jsonBodyKey];
    console.log('Old body:', oldBody);

    // Replace the broken remoteJid processing with cleanedSenderPn
    var newBody = oldBody
      .replace(
        /\$\('Normaliser Webhook'\)\.first\(\)\.json\.remoteJid\.replace\(['"@s\.whatsapp\.net['"]\s*,\s*['"]['"]?\s*\)\.replace\(['"@lid['"]\s*,\s*['"]['"]?\s*\)/,
        "$('Normaliser Webhook').first().json.cleanedSenderPn"
      );

    if (newBody === oldBody) {
      // Try a more aggressive replace - just find the "to" value pattern
      console.log('Regex did not match, trying string search...');
      if (oldBody.includes('remoteJid')) {
        // Replace entire to value
        newBody = oldBody.replace(
          /("to"\s*:\s*)\$\([^)]+\)[^,"}]*/,
          '"to": $$(\'Normaliser Webhook\').first().json.cleanedSenderPn'
        );
      }
    }

    console.log('New body:', newBody);
    newParams[jsonBodyKey] = newBody;
    console.log('Changed:', oldBody !== newBody ? 'YES' : 'NO');
  } else {
    // Try bodyParameters or other structures
    console.log('Full parameters:', JSON.stringify(newParams).substring(0, 500));
  }

  wf.nodes = wf.nodes.map(function(n) {
    return n.name === 'Envoyer Reponse WhatsApp' ? Object.assign({}, n, { parameters: newParams }) : n;
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
    const check = put.body.nodes.find(function(n) { return n.name === 'Envoyer Reponse WhatsApp'; });
    console.log('Verified body:', JSON.stringify(check && check.parameters).substring(0, 300));
    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
