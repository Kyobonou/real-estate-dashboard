const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 }
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
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  // 1. Modify Agent Eden: inject tool call instruction into the text (human message)
  //    This forces the LLM to see the instruction in every message turn
  const agent = wf.nodes.find(function(n) { return n.name === 'Agent Eden'; });
  if (agent) {
    // Wrap the user message to force tool invocation
    agent.parameters.text = "={{ '[ACTION REQUISE: appelle d\\'abord recherche_biens avec une query adaptée avant de répondre] ' + $json.text }}";
    console.log('Agent text updated');
  }

  // 2. Add toolChoice: "required" to GPT-4.1-mini model node
  //    Forces OpenAI API to always call a function/tool
  const gpt = wf.nodes.find(function(n) { return n.name === 'GPT-4.1-mini'; });
  if (gpt) {
    gpt.parameters.options = Object.assign({}, gpt.parameters.options, {
      toolChoice: 'required'
    });
    console.log('GPT toolChoice set to required');
  }

  // Clean extra node properties
  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

  // Ensure Mémoire Conversation connection is present
  if (!wf.connections['Mémoire Conversation']) {
    wf.connections['Mémoire Conversation'] = {
      "ai_memory": [[{ "node": "Agent Eden", "type": "ai_memory", "index": 0 }]]
    };
    console.log('Restored: Mémoire Conversation');
  }

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder','saveManualExecutions','callerPolicy','errorWorkflow','timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const put = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });
  console.log('PUT status:', put.status);

  if (put.body && put.body.id) {
    const updAgent = put.body.nodes.find(function(n) { return n.name === 'Agent Eden'; });
    const updGpt = put.body.nodes.find(function(n) { return n.name === 'GPT-4.1-mini'; });

    console.log('Agent text:', updAgent && updAgent.parameters && updAgent.parameters.text);
    console.log('GPT toolChoice:', updGpt && updGpt.parameters && updGpt.parameters.options && updGpt.parameters.options.toolChoice);

    const conns = put.body.connections;
    console.log('Memory conn:', conns['Mémoire Conversation'] ? 'OK' : 'MISSING');
    console.log('Tool conn:', conns['recherche_biens'] ? 'OK' : 'MISSING');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);

    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
