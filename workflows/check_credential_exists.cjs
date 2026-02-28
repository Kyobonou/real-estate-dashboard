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
  // Try to get the credential by ID
  console.log('=== Checking credential toKKNKCxt5GPmAor ===');
  const r = await req('GET', '/credentials/toKKNKCxt5GPmAor', null);
  console.log('Status:', r.status);
  if (r.status === 200) {
    console.log('EXISTS - name:', r.body.name, '| type:', r.body.type);
  } else if (r.status === 404) {
    console.log('NOT FOUND - credential was deleted or lost');
  } else {
    console.log('Response:', JSON.stringify(r.body).substring(0, 200));
  }

  // Also try schema endpoint to see what credential types are available
  console.log('\n=== Trying POST /credentials/test ===');
  const test = await req('POST', '/credentials/test', {
    credentials: { id: 'toKKNKCxt5GPmAor', name: 'API Agent Immo' },
    nodeToTestWith: 'n8n-nodes-base.openAi'
  });
  console.log('Test status:', test.status);
  console.log('Test body:', JSON.stringify(test.body).substring(0, 200));
})();
