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

  let changes = [];

  // --- FIX 1: Verifier Doublon Supabase → alwaysOutputData: true ---
  // When content_hash not found, Supabase returns [] → 0 items → n8n stops execution
  // alwaysOutputData ensures at least 1 empty item passes to Decider Action
  const verif = wf.nodes.find(function(n) { return n.name === 'Verifier Doublon Supabase'; });
  if (verif) {
    verif.alwaysOutputData = true;
    changes.push('Verifier Doublon Supabase: alwaysOutputData=true');
  }

  // --- FIX 2: Groupe ou Prospect? → add missing keywords + fix price regex ---
  // "2 pièces loyer 80.000f" → score < 2 because:
  //   "pièces" not in keywords (only English-ish forms)
  //   "loyer" not in keywords
  //   "80.000f" → "f" alone not matched by price regex (only "fcfa", "million", etc.)
  const groupeNode = wf.nodes.find(function(n) { return n.name === 'Groupe ou Prospect?'; });
  if (groupeNode && groupeNode.parameters && groupeNode.parameters.jsCode) {
    let code = groupeNode.parameters.jsCode;

    // Add missing keywords
    const OLD_KEYWORDS = "'disponible']";
    const NEW_KEYWORDS = "'disponible','loyer','piece','pieces','chambre salon','yamoussoukro','bouake','daloa','san pedro','korhogo','divo','gagnoa','abengourou','f/mois','mois']";

    if (code.includes(OLD_KEYWORDS)) {
      code = code.replace(OLD_KEYWORDS, NEW_KEYWORDS);
      changes.push('Groupe ou Prospect: +9 keywords (loyer,piece,pieces,villes interieur)');
    }

    // Fix price regex to also match "f" suffix (e.g. "80.000f", "650000f")
    const OLD_PRICE = "const hasPrice = /\\d+\\s*(million|milion|mille|fcfa|k)/i.test(msg);";
    const NEW_PRICE = "const hasPrice = /\\d+[\\s.]*(?:million|milion|mille|fcfa|f\\b|k\\b)/i.test(msg);";

    if (code.includes(OLD_PRICE)) {
      code = code.replace(OLD_PRICE, NEW_PRICE);
      changes.push('Groupe ou Prospect: price regex matches "f" suffix (80.000f)');
    }

    groupeNode.parameters.jsCode = code;
  }

  // --- FIX 3: Also set alwaysOutputData on IA Extraction Annonce (Parser IA REF Hash) ---
  // When AI returns empty, downstream nodes should still receive data to log the rejection
  // Actually the Parser already returns [] for rejections → that's correct behavior
  // But let's ensure Parser IA REF Hash has alwaysOutputData just in case
  const parser = wf.nodes.find(function(n) { return n.name === 'Parser IA REF Hash'; });
  if (parser) {
    // Don't set alwaysOutputData here — if AI extraction fails, we WANT to stop
    // (no point inserting empty data)
    console.log('Parser IA REF Hash: keeping default (stop on empty = correct)');
  }

  if (changes.length === 0) { console.log('No changes needed.'); return; }

  console.log('Changes to apply:');
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
    // Verify fixes
    const updVerif = put.body.nodes.find(function(n) { return n.name === 'Verifier Doublon Supabase'; });
    console.log('Verifier alwaysOutputData:', updVerif && updVerif.alwaysOutputData);

    const updGroupe = put.body.nodes.find(function(n) { return n.name === 'Groupe ou Prospect?'; });
    console.log('Keywords "loyer":', updGroupe && updGroupe.parameters.jsCode.includes("'loyer'"));
    console.log('Price regex "f\\b":', updGroupe && updGroupe.parameters.jsCode.includes("f\\b"));

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
