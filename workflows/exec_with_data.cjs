const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(path) {
  return new Promise(function(resolve, reject) {
    let d = '';
    https.request({ hostname: 'yobed-n8n-supabase-claude.hf.space', path: '/api/v1' + path, method: 'GET', headers: { 'X-N8N-API-KEY': API_KEY } }, function(r) {
      r.on('data', function(c) { d += c; });
      r.on('end', function() { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }});
    }).on('error', reject).end();
  });
}

(async function() {
  // Try exec 31536 with includeData=true
  var data = await req('/executions/31536?includeData=true');
  if (!data) { console.log('null response'); return; }

  console.log('Keys:', Object.keys(data).join(', '));
  console.log('mode:', data.mode, '| status:', data.status, '| duration:', data.startedAt, '->', data.stoppedAt);

  if (data.data && data.data.resultData) {
    var nodes = Object.keys(data.data.resultData.runData || {});
    console.log('\nNodes that ran:', nodes.join(', '));

    var isChat = nodes.some(function(n) { return n.indexOf('Agent') >= 0 || n.indexOf('Outil') >= 0 || n.indexOf('Recuperer') >= 0; });
    console.log('Is chatbot?', isChat);

    if (isChat) {
      var toolRun = data.data.resultData.runData['Outil Recherche Annonces'];
      if (toolRun) {
        console.log('\n=== OUTIL RECHERCHE ANNONCES ===');
        console.log(JSON.stringify(toolRun).substring(0, 2000));
      }
      var agentRun = data.data.resultData.runData['Agent Conversationnel'];
      if (agentRun) {
        console.log('\n=== AGENT CONVERSATIONNEL ===');
        var agStr = JSON.stringify(agentRun[0] || {});
        console.log(agStr.substring(0, 1500));
      }
    }
  } else {
    console.log('No resultData');
    // Show what data we DO have
    if (data.data) console.log('data keys:', Object.keys(data.data).join(', '));
  }
})();
