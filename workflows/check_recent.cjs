const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(path) {
  return new Promise(function(resolve, reject) {
    const r = https.request({ hostname: 'yobed-n8n-supabase-claude.hf.space', path: '/api/v1' + path, method: 'GET', headers: { 'X-N8N-API-KEY': API_KEY } }, function(res) {
      let d = ''; res.on('data', function(c) { d += c; }); res.on('end', function() { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    }); r.on('error', reject); r.end();
  });
}

(async function() {
  // Get last 15 executions
  const list = await req('/executions?workflowId=LTZJrc7tYwv6Qm6a5wtZ0&limit=15');
  const execs = list.data || list;
  console.log('=== 15 dernieres executions ===');
  for (const e of execs) {
    console.log(e.id, '|', e.status, '|', e.startedAt, '| stoppedAt:', e.stoppedAt);
  }

  // Check the most recent one with full data
  const latest = execs[0];
  console.log('\n=== Execution la plus recente: #' + latest.id + ' ===');
  const detail = await req('/executions/' + latest.id + '?includeData=true');
  const data = detail.data && detail.data.resultData && detail.data.resultData.runData;
  if (!data) {
    console.log('No runData available');
    return;
  }

  const nodes = Object.keys(data);
  console.log('Nodes executes (' + nodes.length + '):');
  nodes.forEach(function(n) {
    const nd = data[n];
    var status = 'ok';
    var itemCount = 0;
    if (nd && nd[0]) {
      if (nd[0].error) status = 'ERROR: ' + (nd[0].error.message || '').substring(0, 100);
      if (nd[0].data && nd[0].data.main && nd[0].data.main[0]) itemCount = nd[0].data.main[0].length;
    }
    console.log('  ' + n + ' → items:' + itemCount + ' | ' + status);
  });

  // Check if Decider Action and INSERT/Sauvegarder are in the list
  var hasDecider = nodes.includes('Decider Action');
  var hasInsert = nodes.includes('Inserer Nouvelle Annonce');
  var hasRenew = nodes.includes('Renouveler ou Reactiver');
  var hasSavePub = nodes.includes('Sauvegarder Publication');
  console.log('\nPipeline annonce:');
  console.log('  Decider Action:', hasDecider ? 'OUI' : 'NON');
  console.log('  Inserer Nouvelle Annonce:', hasInsert ? 'OUI' : 'NON');
  console.log('  Renouveler ou Reactiver:', hasRenew ? 'OUI' : 'NON');
  console.log('  Sauvegarder Publication:', hasSavePub ? 'OUI' : 'NON');

  // Also check if it was a chatbot execution
  var hasAgent = nodes.includes('Agent Eden');
  console.log('  Agent Eden (chatbot):', hasAgent ? 'OUI' : 'NON');
})();
