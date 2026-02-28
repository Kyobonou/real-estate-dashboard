const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(path) {
  return new Promise(function(resolve, reject) {
    let d = '';
    https.request({ hostname: 'yobed-n8n-supabase-claude.hf.space', path: '/api/v1' + path, method: 'GET', headers: { 'X-N8N-API-KEY': API_KEY } }, function(r) {
      r.on('data', function(c) { d += c; });
      r.on('end', function() { resolve(d); });
    }).on('error', reject).end();
  });
}

(async function() {
  // Raw dump of exec 31536
  var raw = await req('/executions/31536');
  var parsed = JSON.parse(raw);
  console.log('Keys:', Object.keys(parsed).join(', '));
  console.log('id:', parsed.id);
  console.log('status:', parsed.status);
  console.log('mode:', parsed.mode);
  console.log('startedAt:', parsed.startedAt);
  console.log('stoppedAt:', parsed.stoppedAt);
  console.log('data type:', typeof parsed.data);
  if (parsed.data) {
    console.log('data keys:', Object.keys(parsed.data).join(', '));
    if (parsed.data.resultData) {
      var runNodes = Object.keys(parsed.data.resultData.runData || {});
      console.log('runData nodes:', runNodes.join(', '));
    }
  } else {
    console.log('data is null/undefined');
  }

  // Also raw snippet
  console.log('\nRaw (first 500):', raw.substring(0, 500));
})();
