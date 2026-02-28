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

// Correct body: use cleanedSenderPn for private messages (handles @s.whatsapp.net AND @lid)
const CORRECT_BODY = '={{ JSON.stringify({ "to": $(' + "'Normaliser Webhook'" + ').first().json.cleanedSenderPn, "text": $(' + "'Parser Analyse'" + ').first().json.reply }) }}';

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const node = wf.nodes.find(function(n) { return n.name === 'Envoyer Reponse WhatsApp'; });
  if (!node) { console.log('Node not found'); return; }

  console.log('Current jsonBody:', node.parameters.jsonBody.substring(0, 200));

  node.parameters = Object.assign({}, node.parameters, { jsonBody: CORRECT_BODY });

  console.log('New jsonBody:', CORRECT_BODY);

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const put = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });
  console.log('PUT status:', put.status);

  if (put.body && put.body.id) {
    const check = put.body.nodes.find(function(n) { return n.name === 'Envoyer Reponse WhatsApp'; });
    const body = check && check.parameters && check.parameters.jsonBody;
    console.log('Verified:', body);
    console.log('Has cleanedSenderPn:', body && body.includes('cleanedSenderPn') ? 'YES' : 'NO');
    console.log('No remoteJid leftover:', body && !body.includes('remoteJid') ? 'YES' : 'NO');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
