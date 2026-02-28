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
  // 1. Get workflow
  const r = await get('/workflows/LTZJrc7tYwv6Qm6a5wtZ0');
  const wf = r.body;
  console.log('Workflow active:', wf.active);
  console.log('Workflow updatedAt:', wf.updatedAt);
  console.log('Total nodes:', wf.nodes.length);

  // 2. Check ALL nodes for missing required params by type
  console.log('\n=== NODES WITH POTENTIAL ISSUES ===');
  let issues = 0;

  wf.nodes.forEach(function(n) {
    const problems = [];
    const p = n.parameters || {};

    // httpRequest nodes must have url
    if (n.type === 'n8n-nodes-base.httpRequest') {
      if (!p.url) problems.push('missing url');
      if (!p.method) problems.push('missing method');
    }

    // OpenAI / LangChain nodes must have credentials
    if (n.type && (n.type.includes('openAi') || n.type.includes('openai') || n.type.includes('OpenAi') || n.type.includes('langchain'))) {
      if (!n.credentials || Object.keys(n.credentials).length === 0) {
        problems.push('NO CREDENTIALS');
      } else {
        const creds = JSON.stringify(n.credentials);
        problems.push('creds: ' + creds.substring(0, 80));
      }
    }

    // Webhook nodes
    if (n.type === 'n8n-nodes-base.webhook') {
      if (!p.path) problems.push('missing path');
    }

    // Supabase nodes
    if (n.type && n.type.includes('supabase')) {
      if (!n.credentials || Object.keys(n.credentials).length === 0) {
        problems.push('NO CREDENTIALS');
      }
    }

    if (problems.length > 0) {
      console.log('[' + n.name + '] (' + n.type + '):');
      problems.forEach(function(p) { console.log('  - ' + p); });
      issues++;
    }
  });

  if (issues === 0) console.log('No parameter issues found in nodes');

  // 3. List ALL node types for overview
  console.log('\n=== ALL LANGCHAIN/AI NODES ===');
  wf.nodes.filter(function(n) {
    return n.type && (n.type.includes('langchain') || n.type.includes('openAi') || n.type.includes('agent') || n.type.includes('Agent'));
  }).forEach(function(n) {
    console.log(n.name + ':');
    console.log('  type:', n.type);
    console.log('  credentials:', JSON.stringify(n.credentials || {}));
    console.log('  params keys:', Object.keys(n.parameters || {}).join(', '));
  });

  // 4. Get last few executions to see error details
  console.log('\n=== LAST 5 EXECUTIONS ===');
  const execs = await get('/executions?limit=5&workflowId=LTZJrc7tYwv6Qm6a5wtZ0');
  const execList = execs.body.data || execs.body;
  if (Array.isArray(execList)) {
    execList.forEach(function(ex) {
      console.log('ID:', ex.id, '| status:', ex.status, '| started:', ex.startedAt);
      if (ex.data && ex.data.resultData && ex.data.resultData.error) {
        console.log('  ERROR:', JSON.stringify(ex.data.resultData.error).substring(0, 200));
      }
    });
  } else {
    console.log(JSON.stringify(execs.body).substring(0, 300));
  }

  // 5. Get a failed execution details
  console.log('\n=== LAST FAILED EXECUTION DETAILS ===');
  const failedExec = Array.isArray(execList) && execList.find(function(ex) { return ex.status === 'error'; });
  if (failedExec) {
    const detail = await get('/executions/' + failedExec.id);
    const data = detail.body.data;
    if (data && data.resultData) {
      console.log('Error message:', JSON.stringify(data.resultData.error || 'none').substring(0, 400));
      // Check which nodes ran
      const runData = data.resultData.runData || {};
      console.log('Nodes that ran:', Object.keys(runData).join(', ') || 'NONE - blocked before any node');
    }
  }
})();
