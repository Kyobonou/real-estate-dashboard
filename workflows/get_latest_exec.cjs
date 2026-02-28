const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(path) {
  return new Promise(function(resolve, reject) {
    let d = '';
    https.request({ hostname: 'yobed-n8n-supabase-claude.hf.space', path: '/api/v1' + path, method: 'GET', headers: { 'X-N8N-API-KEY': API_KEY } }, function(r) {
      r.on('data', function(c) { d += c; });
      r.on('end', function() {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }
      });
    }).on('error', reject).end();
  });
}

(async function() {
  // Get latest executions
  const list = await req('/executions?workflowId=LTZJrc7tYwv6Qm6a5wtZ0&limit=10');
  const execs = list.data || list;

  console.log('Latest 10 executions:');
  execs.forEach(function(ex, i) {
    console.log(i, '| ID:', ex.id, '| Status:', ex.status, '| Started:', ex.startedAt);
  });

  // Check the most recent ones for chatbot
  for (var i = 0; i < Math.min(5, execs.length); i++) {
    var ex = execs[i];
    var data = await req('/executions/' + ex.id);
    if (!data.data || !data.data.resultData) continue;
    var nodes = Object.keys(data.data.resultData.runData || {});
    var isChat = nodes.some(function(n) { return n.includes('Agent') || n.includes('Outil Recherche') || n.includes('Recuperer Message'); });

    if (isChat) {
      console.log('\n=== CHATBOT EXEC FOUND:', ex.id, '===');
      console.log('Nodes:', nodes.join(', '));

      var toolRun = data.data.resultData.runData['Outil Recherche Annonces'];
      if (toolRun && toolRun[0]) {
        var item = toolRun[0];
        if (item.error) {
          console.log('\nTOOL ERROR:', JSON.stringify(item.error).substring(0, 600));
        } else {
          // Get tool output text
          var allData = JSON.stringify(item.data || {});
          console.log('\nTool data (first 800):', allData.substring(0, 800));
        }
      } else {
        console.log('\nNo "Outil Recherche Annonces" run data found');
      }

      var agentRun = data.data.resultData.runData['Agent Conversationnel'];
      if (agentRun && agentRun[0]) {
        var aItem = agentRun[0];
        if (aItem.error) {
          console.log('\nAGENT ERROR:', JSON.stringify(aItem.error).substring(0, 400));
        } else {
          var aOut = JSON.stringify(aItem.data || {});
          console.log('\nAgent data (first 600):', aOut.substring(0, 600));
        }
      }
      break;
    }
  }
})();
