const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

// Test ALL possible HTTP methods in n8n toolCode sandbox
const DIAG_CODE = `const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
const url = SUPABASE_URL + '/rest/v1/locaux?select=ref_bien,commune&limit=2';
const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };
let results = [];

// 1. $helpers
try { const r = await $helpers.httpRequest({method:'GET',url,headers:hdrs}); results.push('$helpers:OK:'+r.length); }
catch(e) { results.push('$helpers:ERR:'+e.message.substring(0,50)); }

// 2. fetch
try { const r = await fetch(url,{headers:hdrs}); const j = await r.json(); results.push('fetch:OK:'+j.length); }
catch(e) { results.push('fetch:ERR:'+e.message.substring(0,50)); }

// 3. this.helpers.httpRequest
try { const r = await this.helpers.httpRequest({method:'GET',url,headers:hdrs}); results.push('this.helpers:OK:'+r.length); }
catch(e) { results.push('this.helpers:ERR:'+e.message.substring(0,50)); }

// 4. $http
try { const r = await $http.request({method:'GET',url,headers:hdrs}); results.push('$http:OK'); }
catch(e) { results.push('$http:ERR:'+e.message.substring(0,50)); }

// 5. require('https')
try {
  const httpsM = require('https');
  const r = await new Promise((res,rej)=>{let d='';httpsM.request({hostname:'udyfhzyvalansmhkynnc.supabase.co',path:'/rest/v1/locaux?select=ref_bien&limit=2',headers:hdrs},(resp)=>{resp.on('data',c=>d+=c);resp.on('end',()=>res(JSON.parse(d)));}).on('error',rej).end();});
  results.push('require(https):OK:'+r.length);
}
catch(e) { results.push('require(https):ERR:'+e.message.substring(0,50)); }

// 6. require('node-fetch')
try { const nf = require('node-fetch'); const r = await nf(url,{headers:hdrs}); const j = await r.json(); results.push('node-fetch:OK:'+j.length); }
catch(e) { results.push('node-fetch:ERR:'+e.message.substring(0,50)); }

// 7. axios
try { const ax = require('axios'); const r = await ax.get(url,{headers:hdrs}); results.push('axios:OK:'+r.data.length); }
catch(e) { results.push('axios:ERR:'+e.message.substring(0,50)); }

// What globals exist?
const globals = [];
try { if(typeof $helpers !== 'undefined') globals.push('$helpers'); } catch(e){}
try { if(typeof $input !== 'undefined') globals.push('$input'); } catch(e){}
try { if(typeof $json !== 'undefined') globals.push('$json'); } catch(e){}
try { if(typeof $http !== 'undefined') globals.push('$http'); } catch(e){}
try { if(typeof fetch !== 'undefined') globals.push('fetch'); } catch(e){}
try { if(typeof require !== 'undefined') globals.push('require'); } catch(e){}
try { if(typeof this !== 'undefined') globals.push('this='+typeof this); } catch(e){}
try { if(typeof this.helpers !== 'undefined') globals.push('this.helpers'); } catch(e){}

return results.join(' | ') + ' || GLOBALS: ' + globals.join(',');`;

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
    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    console.log('Diagnostic deployed. Envoie un message WhatsApp et je lirai le résultat.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
