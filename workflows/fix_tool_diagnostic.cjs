const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

// Diagnostic: exposes actual error so we see what HTTP method works
const DIAG_CODE = `const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
const url = SUPABASE_URL + '/rest/v1/locaux?select=ref_bien,commune,chambre,disponible&order=date_publication.desc&limit=3';
const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

// Test which HTTP method works
let result = '';

// Method 1: $helpers.httpRequest
try {
  const r = await $helpers.httpRequest({ method: 'GET', url: url, headers: hdrs });
  if (Array.isArray(r)) {
    result += '[OK $helpers] ' + r.length + ' biens. ';
  } else {
    result += '[FAIL $helpers] not array: ' + JSON.stringify(r).substring(0, 80) + '. ';
  }
} catch(e1) {
  result += '[ERR $helpers] ' + e1.message + '. ';
}

// Method 2: fetch
try {
  const resp = await fetch(url, { headers: hdrs });
  const data = await resp.json();
  if (Array.isArray(data)) {
    result += '[OK fetch] ' + data.length + ' biens. ';
  } else {
    result += '[FAIL fetch] ' + JSON.stringify(data).substring(0, 80) + '. ';
  }
} catch(e2) {
  result += '[ERR fetch] ' + e2.message + '. ';
}

// Method 3: this.helpers
try {
  const r3 = await this.helpers.httpRequest({ method: 'GET', url: url, headers: hdrs });
  if (Array.isArray(r3)) {
    result += '[OK this.helpers] ' + r3.length + ' biens.';
  } else {
    result += '[FAIL this.helpers] not array.';
  }
} catch(e3) {
  result += '[ERR this.helpers] ' + e3.message + '.';
}

return result;`;

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

  const tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (!tool) { console.log('toolCode node not found'); return; }

  // Save original code for restoration
  const origCode = tool.parameters.jsCode;
  console.log('Original code length:', origCode.length);

  tool.parameters = {
    name: 'recherche_biens',
    description: "Recherche des biens immobiliers. Appelle cet outil pour toute question sur les biens.",
    jsCode: DIAG_CODE
  };

  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

  if (!wf.connections['Mémoire Conversation']) {
    wf.connections['Mémoire Conversation'] = { "ai_memory": [[{ "node": "Agent Eden", "type": "ai_memory", "index": 0 }]] };
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
    // Save original code separately for restoration
    fs.writeFileSync('c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/orig_tool_code.js', origCode, 'utf8');
    console.log('Diagnostic deployed. Original code saved to orig_tool_code.js');
    console.log('Now send a WhatsApp message like "test diagnostic" to trigger the tool.');
    console.log('Then run: node check_last_exec.cjs');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
