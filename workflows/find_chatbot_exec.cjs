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
  // Sample a few executions to find chatbot one
  const execs = [31481, 31480, 31478, 31477, 31476, 31475, 31474, 31453, 31451, 31442, 31440, 31439];

  for (const id of execs) {
    try {
      const data = await req('/executions/' + id);
      if (!data.data || !data.data.resultData) continue;
      const nodes = Object.keys(data.data.resultData.runData || {});
      const isGroup = nodes.some(function(n) { return n.includes('Groupe') || n.includes('Publication'); });
      const isChat = nodes.some(function(n) { return n.includes('Agent') || n.includes('Outil Recherche') || n.includes('Recuperer'); });

      if (isChat) {
        console.log('\n=== CHATBOT EXEC', id, '===');
        console.log('Nodes:', nodes.join(', '));

        const toolRun = data.data.resultData.runData['Outil Recherche Annonces'];
        if (toolRun) {
          console.log('\n--- Tool node ---');
          const item = toolRun[0] || {};
          if (item.error) {
            console.log('ERROR:', JSON.stringify(item.error).substring(0, 400));
          } else {
            // Look for output data
            const mainOut = item.data && item.data.main && item.data.main[0];
            if (mainOut && mainOut[0]) {
              console.log('Output:', JSON.stringify(mainOut[0].json).substring(0, 400));
            }
          }
        }

        const agentRun = data.data.resultData.runData['Agent Conversationnel'];
        if (agentRun && agentRun[0]) {
          const item = agentRun[0];
          if (item.error) {
            console.log('\n--- Agent ERROR ---', JSON.stringify(item.error).substring(0, 300));
          } else {
            const mainOut = item.data && item.data.main && item.data.main[0];
            if (mainOut && mainOut[0]) {
              console.log('\n--- Agent output ---');
              console.log(JSON.stringify(mainOut[0].json).substring(0, 500));
            }
          }
        }
        break;
      } else if (!isGroup) {
        console.log('Exec', id, '- Unknown path - nodes:', nodes.join(', '));
      }
    } catch(e) {
      console.log('Error fetching exec', id, ':', e.message);
    }
  }

  console.log('\nDone searching.');
})();
