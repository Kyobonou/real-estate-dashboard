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

  // FIX: La branche TRUE de "Est un Doublon?" doit aller vers "Sauvegarder Nouvelle Annonce"
  // Actuellement: main[0] (TRUE) = vide, main[1] (FALSE) = Sauvegarder
  // Corrigé:      main[0] (TRUE) = Sauvegarder, main[1] (FALSE) = vide
  console.log('AVANT:', JSON.stringify(wf.connections['Est un Doublon?']));

  wf.connections['Est un Doublon?'] = {
    main: [
      [{ node: 'Sauvegarder Nouvelle Annonce', type: 'main', index: 0 }],
      []
    ]
  };

  console.log('APRES:', JSON.stringify(wf.connections['Est un Doublon?']));

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
    const newConn = putRes.body.connections['Est un Doublon?'];
    console.log('SUCCESS');
    console.log('TRUE branch:', JSON.stringify(newConn.main[0]));
    console.log('FALSE branch:', JSON.stringify(newConn.main[1]));
  } else {
    console.log('Error:', JSON.stringify(putRes.body).substring(0, 400));
  }
})();
