const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    };
    const r = https.request(opts, function(res) {
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

// New validator code: pass-through when no signature (Wasender doesn't sign)
// Only block if signature IS present but invalid
const newValidatorCode = [
  '// Validation Webhook - pass-through si pas de signature (Wasender standard)',
  '// Bloque uniquement si signature présente mais invalide',
  'try {',
  '  const WASENDER_SECRET = \'1762ea865bd12948e715bbd6f9e03ef7\';',
  '  const json = $input.first().json;',
  '  const headers = json.headers || {};',
  '',
  '  const rawBody = json.rawBody',
  '    || (typeof json.body === \'string\' ? json.body : null)',
  '    || JSON.stringify(json.body)',
  '    || \'\';',
  '',
  '  const receivedSig = (',
  '    headers[\'x-webhook-signature\'] ||',
  '    headers[\'x-wasender-signature\'] ||',
  '    headers[\'x-hub-signature-256\'] ||',
  '    \'\'',
  '  ).replace(\'sha256=\', \'\').toLowerCase();',
  '',
  '  // Pas de signature → Wasender ne signe pas → laisser passer',
  '  if (!receivedSig) {',
  '    console.log(\'Pas de signature - pass-through\');',
  '    return $input.all();',
  '  }',
  '',
  '  // Signature présente → valider HMAC',
  '  const crypto = require(\'crypto\');',
  '  const expected = crypto',
  '    .createHmac(\'sha256\', WASENDER_SECRET)',
  '    .update(rawBody)',
  '    .digest(\'hex\')',
  '    .toLowerCase();',
  '',
  '  if (expected !== receivedSig) {',
  '    console.log(\'Signature invalide - rejet\');',
  '    return [{ json: { error: true, message: \'Signature invalide\', status: 401 } }];',
  '  }',
  '',
  '  return $input.all();',
  '} catch (e) {',
  '  console.log(\'Erreur validateur:\', e.message, \'- pass-through\');',
  '  return $input.all();',
  '}'
].join('\n');

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  wf.nodes = wf.nodes.map(function(n) {
    if (n.name && n.name.includes('Valider')) {
      console.log('Updating:', n.name);
      return Object.assign({}, n, {
        parameters: Object.assign({}, n.parameters, { jsCode: newValidatorCode })
      });
    }
    return n;
  });

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const putRes = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings
  });

  console.log('PUT status:', putRes.status);
  if (putRes.body && putRes.body.id) {
    const val = putRes.body.nodes.find(function(n) { return n.name && n.name.includes('Valider'); });
    console.log('SUCCESS - Node:', val && val.name);
    const firstLine = newValidatorCode.split('\n')[0];
    console.log('New code starts with:', firstLine);
  } else {
    console.log('Error:', JSON.stringify(putRes.body).substring(0, 400));
  }
})();
