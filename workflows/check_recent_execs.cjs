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
  var ids = [31536, 31535, 31534, 31533, 31532, 31531, 31530, 31529, 31528];

  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var data = await req('/executions/' + id);
    if (!data || !data.data || !data.data.resultData) {
      console.log(id, '- no data');
      continue;
    }
    var nodes = Object.keys(data.data.resultData.runData || {});
    var isChat = nodes.some(function(n) {
      return n.indexOf('Agent') >= 0 || n.indexOf('Outil Recherche') >= 0 || n.indexOf('Recuperer Message') >= 0;
    });
    console.log(id, '-', isChat ? 'CHATBOT' : 'Group', '- nodes:', nodes.slice(0,4).join(', '));

    if (isChat) {
      var toolRun = data.data.resultData.runData['Outil Recherche Annonces'];
      if (toolRun && toolRun.length > 0) {
        console.log('\n=== TOOL RUN DATA ===');
        console.log(JSON.stringify(toolRun).substring(0, 2000));
      }
      var agentRun = data.data.resultData.runData['Agent Conversationnel'];
      if (agentRun && agentRun.length > 0) {
        console.log('\n=== AGENT RUN DATA ===');
        console.log(JSON.stringify(agentRun[0]).substring(0, 1000));
      }
      break;
    }
  }
  console.log('\nDone.');
})();
