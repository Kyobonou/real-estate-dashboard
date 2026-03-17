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
  if (!wf || !wf.nodes) { console.log('GET failed:', r.status); return; }

  // Find the node that contains the keyword filter
  console.log('Looking for keyword filter node...');
  var targetNode = null;
  wf.nodes.forEach(function(n) {
    var code = '';
    if (n.parameters && n.parameters.jsCode) code = n.parameters.jsCode;
    if (code.includes("'disponible'") && code.includes('keywords')) {
      console.log('Found in:', n.name, '| type:', n.type);
      targetNode = n;
    }
  });

  if (!targetNode) {
    console.log('Keyword filter not found in any node. Checking all code nodes...');
    wf.nodes.forEach(function(n) {
      if (n.parameters && n.parameters.jsCode) {
        console.log(' ', n.name, ':', n.parameters.jsCode.substring(0, 60));
      }
    });
    return;
  }

  let code = targetNode.parameters.jsCode;
  let changes = [];

  // Fix 1: Add missing keywords
  if (code.includes("'disponible']")) {
    code = code.replace(
      "'disponible']",
      "'disponible','loyer','piece','pieces','piscine','yamoussoukro','bouake','daloa','san pedro','korhogo','divo','gagnoa','abengourou','mois','sanitaire','salon']"
    );
    changes.push('Added keywords: loyer, piece, pieces, villes interieur, mois, sanitaire, salon');
  }

  // Fix 2: Price regex to match "f" suffix (80.000f, 650000f)
  if (code.includes("(million|milion|mille|fcfa|k)")) {
    code = code.replace(
      "(million|milion|mille|fcfa|k)",
      "(million|milion|mille|fcfa|f\\b|k\\b)"
    );
    changes.push('Price regex: added f\\b to match "80.000f", "650000f"');
  }

  if (changes.length === 0) {
    console.log('No keyword/price changes needed.');
    console.log('Current keywords:', code.substring(code.indexOf('const keywords'), code.indexOf('];') + 2));
    return;
  }

  targetNode.parameters.jsCode = code;

  console.log('Changes:');
  changes.forEach(function(c) { console.log('  -', c); });

  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

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

    // Verify
    const updNode = put.body.nodes.find(function(n) { return n.name === targetNode.name; });
    if (updNode && updNode.parameters && updNode.parameters.jsCode) {
      console.log('Keyword loyer:', updNode.parameters.jsCode.includes("'loyer'") ? 'OK' : 'MISSING');
      console.log('Price regex f:', updNode.parameters.jsCode.includes("f\\\\b") || updNode.parameters.jsCode.includes("f\\b") ? 'OK' : 'MISSING');
    }

    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );

    // Test: "2 pieces loyer 80.000f" should now score >= 2
    var testMsg = "2 pieces avec toutes les commodites loyer 80.000f";
    var testLow = testMsg.toLowerCase();
    var newKeywords = ['appartement','studio','chambre','maison','villa','duplex','triplex','terrain','bureau','magasin','boutique','entrepot','local','residence','parking','garage','immeuble','parcelle','lotissement','cocody','yopougon','marcory','koumassi','treichville','plateau','adjame','abobo','port-bouet','bingerville','riviera','angre','bassam','assinie','meuble','climatise','piscine','louer','vendre','location','vente','bail','fcfa','m2','m2','hectare','million','disponible','loyer','piece','pieces','piscine','yamoussoukro','bouake','daloa','san pedro','korhogo','divo','gagnoa','abengourou','mois','sanitaire','salon'];
    var score = newKeywords.filter(function(k) { return testLow.includes(k); }).length;
    var hasPrice = /\d+[\s.]*(million|milion|mille|fcfa|f\b|k\b)/i.test(testMsg);
    console.log('\nTest "2 pieces loyer 80.000f":');
    console.log('  Score:', score, '(need >= 2)');
    console.log('  hasPrice:', hasPrice);
    console.log('  Result:', score >= 2 ? 'PASS' : 'FAIL');

    console.log('Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
