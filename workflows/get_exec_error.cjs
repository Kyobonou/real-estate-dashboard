const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function get(path) {
  return new Promise(function(resolve, reject) {
    https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: 'GET',
      headers: { 'X-N8N-API-KEY': API_KEY }
    }, function(res) {
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
  // Fetch execution 30527 directly
  const exec = await get('/executions/30527?includeData=true');
  console.log('Status:', exec.status);

  const body = exec.body;
  if (body.data) {
    const data = body.data;
    if (data.resultData) {
      const err = data.resultData.error;
      console.log('\n=== ERROR ===');
      console.log(JSON.stringify(err, null, 2));

      const runData = data.resultData.runData || {};
      const nodeNames = Object.keys(runData);
      console.log('\nNodes that ran:', nodeNames.length > 0 ? nodeNames.join(', ') : 'NONE');
    }
  } else {
    console.log(JSON.stringify(body).substring(0, 800));
  }
})();
