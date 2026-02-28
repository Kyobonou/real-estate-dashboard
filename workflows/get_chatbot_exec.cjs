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
  // Get latest 5 executions with full data
  var list = await req('/executions?workflowId=LTZJrc7tYwv6Qm6a5wtZ0&limit=5');
  var execs = list.data || list;
  console.log('Latest 5 execs:');
  execs.forEach(function(e) { console.log(' ', e.id, e.status, e.startedAt); });

  // Check each one for chatbot nodes
  for (var i = 0; i < execs.length; i++) {
    var full = await req('/executions/' + execs[i].id + '?includeData=true');
    if (!full || !full.data || !full.data.resultData) continue;
    var nodes = Object.keys(full.data.resultData.runData || {});
    var isChat = nodes.some(function(n) {
      return n === 'Agent Conversationnel' || n === 'recherche_biens_immobiliers' || n === 'Recuperer Message Texte';
    });
    if (!isChat) continue;

    console.log('\n=== CHATBOT EXEC', execs[i].id, '===');
    console.log('Nodes:', nodes.join(', '));

    // Get tool output
    var toolRun = full.data.resultData.runData['recherche_biens_immobiliers'];
    if (toolRun && toolRun[0]) {
      var item = toolRun[0];
      console.log('\n--- Tool output ---');
      if (item.error) {
        console.log('ERROR:', JSON.stringify(item.error).substring(0, 500));
      } else {
        console.log(JSON.stringify(item).substring(0, 1000));
      }
    }

    // Get agent intermediate steps (shows tool calls)
    var agentRun = full.data.resultData.runData['Agent Conversationnel'];
    if (agentRun && agentRun[0]) {
      var agItem = agentRun[0];
      if (agItem.data && agItem.data.main) {
        var out = agItem.data.main[0];
        if (out && out[0]) {
          console.log('\n--- Agent output ---');
          console.log(JSON.stringify(out[0].json).substring(0, 500));
        }
      }
    }
    break;
  }
})();
