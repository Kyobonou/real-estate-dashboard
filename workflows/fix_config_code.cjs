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

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  // Code JS clair que l'utilisateur peut éditer directement
  var configCode = [
    '// ============================================================',
    '// \u2699\uFE0F  CONFIG NUM\u00c9ROS - \u00c9ditez les valeurs ci-dessous',
    '// ============================================================',
    '',
    'const NUMERO_AGENCE       = "2250142694380"; // \u2190 Num\u00e9ro de l\'agence',
    'const NUMERO_PROPRIETAIRE = "2250789263373"; // \u2190 Num\u00e9ro propri\u00e9taire (fallback)',
    '',
    '// ============================================================',
    '// Ne pas modifier en-dessous de cette ligne',
    '// ============================================================',
    '',
    '// Passer les donn\u00e9es de l\'entr\u00e9e + les configs',
    'const inputData = $input.all();',
    'return inputData.map(function(item) {',
    '  return {',
    '    json: Object.assign({}, item.json, {',
    '      numero_agence: NUMERO_AGENCE,',
    '      numero_proprietaire: NUMERO_PROPRIETAIRE',
    '    })',
    '  };',
    '});'
  ].join('\n');

  wf.nodes = wf.nodes.map(function(n) {
    if (n.name === '\u2699\uFE0F Config Num\u00e9ros') {
      console.log('Converting Set node -> Code node');
      return Object.assign({}, n, {
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: configCode
        }
      });
    }
    return n;
  });

  var s = wf.settings || {};
  var cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  var putRes = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings
  });

  console.log('PUT status:', putRes.status);
  if (putRes.body && putRes.body.id) {
    var conf = putRes.body.nodes.find(function(n) { return n.name && n.name.includes('Config'); });
    console.log('SUCCESS');
    console.log('Type:', conf && conf.type);
    console.log('Has jsCode:', conf && conf.parameters && !!conf.parameters.jsCode);
  } else {
    console.log('Error:', JSON.stringify(putRes.body).substring(0, 400));
  }
})();
