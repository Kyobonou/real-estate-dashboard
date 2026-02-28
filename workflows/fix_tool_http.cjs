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

  const tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (!tool) { console.log('toolCode node not found'); return; }

  // Replace only the HTTP call: this.helpers → $helpers with fallback to fetch
  // Keep all the rest of the logic intact
  let jsCode = tool.parameters.jsCode;

  const oldHttp = `biens = await this.helpers.httpRequest({
      method: 'GET',
      url: SUPABASE_URL + '/rest/v1/locaux?select=' + FIELDS + '&order=date_publication.desc&limit=' + limit,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (!Array.isArray(biens)) biens = [];`;

  const newHttp = `// Try $helpers first, then fetch as fallback
    let httpErr1 = '', httpErr2 = '';
    try {
      biens = await $helpers.httpRequest({
        method: 'GET',
        url: SUPABASE_URL + '/rest/v1/locaux?select=' + FIELDS + '&order=date_publication.desc&limit=' + limit,
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      if (!Array.isArray(biens)) biens = [];
    } catch(httpE1) {
      httpErr1 = httpE1.message;
      try {
        const resp = await fetch(SUPABASE_URL + '/rest/v1/locaux?select=' + FIELDS + '&order=date_publication.desc&limit=' + limit, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        biens = await resp.json();
        if (!Array.isArray(biens)) biens = [];
      } catch(httpE2) {
        httpErr2 = httpE2.message;
        return '[ERR_HTTP] helpers: ' + httpErr1 + ' | fetch: ' + httpErr2;
      }
    }`;

  if (jsCode.includes('biens = await this.helpers.httpRequest(')) {
    jsCode = jsCode.replace(oldHttp, newHttp);
    console.log('HTTP call replaced:', jsCode.includes('$helpers.httpRequest') ? 'YES' : 'NO (no match)');
    if (!jsCode.includes('$helpers.httpRequest')) {
      // Try a broader replace
      jsCode = jsCode.replace(
        /biens = await this\.helpers\.httpRequest\(\{[\s\S]*?if \(!Array\.isArray\(biens\)\) biens = \[\];/,
        newHttp
      );
      console.log('Broad replace:', jsCode.includes('$helpers.httpRequest') ? 'YES' : 'STILL NO');
    }
  } else {
    console.log('Pattern not found — showing current HTTP section:');
    const idx = jsCode.indexOf('httpRequest');
    console.log(jsCode.substring(Math.max(0, idx-30), idx+200));
    return;
  }

  tool.parameters.jsCode = jsCode;

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
    const updTool = put.body.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
    const code = updTool && updTool.parameters && updTool.parameters.jsCode;
    console.log('Has $helpers:', code && code.includes('$helpers.httpRequest') ? 'YES' : 'NO');
    console.log('Has fetch fallback:', code && code.includes('await fetch(') ? 'YES' : 'NO');
    console.log('Has ERR_HTTP diagnostic:', code && code.includes('ERR_HTTP') ? 'YES' : 'NO');

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
