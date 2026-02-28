const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function get(path) {
  return new Promise(function(resolve, reject) {
    const opts = {
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: 'GET',
      headers: { 'X-N8N-API-KEY': API_KEY }
    };
    https.request(opts, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    }).on('error', reject).end();
  });
}

(async function() {
  // List all credentials
  console.log('=== CREDENTIALS LIST ===');
  const creds = await get('/credentials');
  console.log('Status:', creds.status);
  if (Array.isArray(creds.body)) {
    creds.body.forEach(function(c) {
      console.log(' -', c.id, '|', c.name, '|', c.type, '| updated:', c.updatedAt);
    });
  } else if (creds.body && creds.body.data) {
    creds.body.data.forEach(function(c) {
      console.log(' -', c.id, '|', c.name, '|', c.type, '| updated:', c.updatedAt);
    });
  } else {
    console.log(JSON.stringify(creds.body).substring(0, 500));
  }

  // Check workflow nodes vs credentials
  console.log('\n=== WORKFLOW CREDENTIAL REFERENCES ===');
  const wf = await get('/workflows/LTZJrc7tYwv6Qm6a5wtZ0');
  const wfdata = wf.body;
  wfdata.nodes.forEach(function(n) {
    if (n.credentials && Object.keys(n.credentials).length > 0) {
      Object.keys(n.credentials).forEach(function(type) {
        const cred = n.credentials[type];
        console.log(n.name + ':', type, '-> id:', cred.id, 'name:', cred.name);
      });
    }
  });
})();
