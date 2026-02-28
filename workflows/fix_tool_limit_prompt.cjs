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

  if (!wf || !wf.nodes) {
    console.log('GET failed. Status:', r.status, '| Body:', JSON.stringify(r.body).substring(0, 300));
    return;
  }

  let changed = 0;

  // --- FIX 1: Tool limit + server-side filters ---
  const tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (tool) {
    let jsCode = tool.parameters.jsCode;

    // Old: fetch all 150 most recent (many have empty commune → filtered out)
    const OLD_QUERY = `SUPABASE_URL + '/rest/v1/locaux?select=' + FIELDS + '&order=date_publication.desc&limit=' + limit`;
    // New: add server-side filters (commune and type_de_bien non-vides, status non-archived)
    // This gives 300 valid rows instead of 150 mixed rows
    const NEW_QUERY = `SUPABASE_URL + '/rest/v1/locaux?select=' + FIELDS + '&commune=neq.&type_de_bien=neq.&status=neq.archived&disponible=neq.Non&order=date_publication.desc&limit=' + (isRecent ? 20 : 300)`;

    if (jsCode.includes(OLD_QUERY)) {
      jsCode = jsCode.replace(OLD_QUERY, NEW_QUERY);
      // Also fix the limit variable (no longer needed separately since embedded above)
      jsCode = jsCode.replace(
        'const limit = isRecent ? 20 : 150;',
        'const limit = isRecent ? 20 : 300; // kept for reference'
      );
      console.log('Fix 1 (tool limit + server filters): OK');
      changed++;
    } else {
      console.log('Fix 1: pattern not found. Looking for URL...');
      const idx = jsCode.indexOf('/rest/v1/locaux?select=');
      console.log(jsCode.substring(idx, idx + 120));
    }

    tool.parameters.jsCode = jsCode;
  }

  // --- FIX 2: Agent Eden system prompt ---
  const agent = wf.nodes.find(function(n) { return n.name === 'Agent Eden'; });
  if (agent) {
    const prompt = agent.parameters.options && agent.parameters.options.systemMessage;
    if (prompt) {
      // Add 3 rules to the INTERDICTIONS ABSOLUES section
      const OLD_RULE14 = '14. Ne JAMAIS dire qu\'il n\'y a rien, que le catalogue est vide, qu\'aucun bien n\'existe ou toute formulation négative absolue.';
      const NEW_RULE14 = `14. Ne JAMAIS dire qu'il n'y a rien, que le catalogue est vide, qu'aucun bien n'existe ou toute formulation négative absolue. Cela inclut : "je n'ai pas", "je ne trouve pas", "aucun bien disponible", "pas de résultat". TOUJOURS présenter les alternatives les plus proches disponibles.
17. Quand le budget ne correspond pas exactement aux biens disponibles : présenter les biens les plus proches avec leur prix réel, en précisant la différence. Exemple : "Je n'ai pas exactement dans ce budget, mais j'ai une villa basse à Cocody Riviera Bonoumin à 650 000 FCFA par mois. Souhaitez-vous la visiter ?"
18. Dès le premier message contenant un type de bien ET une localisation, appeler l'outil et présenter les résultats directement, sans demander de critères supplémentaires.
19. Les messages "faites des propositions", "montrez-moi ce que vous avez", "qu'est-ce que vous avez", "oui proposez", "montrez" = appel OBLIGATOIRE de l'outil et présentation des biens disponibles les plus proches.`;

      if (prompt.includes(OLD_RULE14)) {
        agent.parameters.options.systemMessage = prompt.replace(OLD_RULE14, NEW_RULE14);
        console.log('Fix 2 (system prompt rules 14+17+18+19): OK');
        changed++;
      } else {
        console.log('Fix 2: rule 14 pattern not found. First 100 chars:', prompt.substring(0, 100));
      }
    }
  }

  if (changed === 0) { console.log('No changes applied.'); return; }

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
    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done.');
    console.log('\nChangements deployes:');
    console.log('  1. Tool: filtre Supabase-side (commune+type non-vides, non-archivé) + limite 300');
    console.log('     Avant: 150 rows bruts -> 50 valides. Apres: 300 rows tous valides');
    console.log('  2. Eden: regles 17-18-19 ajoutees (budget != afficher closest, type+lieu = chercher direct, propositions = appeler outil)');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
