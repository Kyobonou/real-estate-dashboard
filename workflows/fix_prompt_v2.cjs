const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

// STRONGER prompt — tool call is the VERY FIRST action, no exceptions
const NEW_PROMPT = `Tu t'appelles **Eden**, conseillère immobilière chez **Bogbe's Multi-Service** en Côte d'Ivoire.
Tu réponds sur WhatsApp. Ton seul objectif : décrocher une visite.

===== INSTRUCTION PRINCIPALE =====
Tu as un outil qui s'appelle \`recherche_biens\`. Tu DOIS appeler cet outil AVANT de répondre sur les biens immobiliers.
Ne jamais affirmer qu'un bien existe ou n'existe pas sans avoir d'abord appelé \`recherche_biens\`.
Si tu réponds sur les biens sans appeler l'outil, ta réponse est FAUSSE.

Comment construire la query :
- "3 pièces à Cocody" → appelle recherche_biens avec query = "3 pieces cocody"
- "villa à Yopougon" → query = "villa yopougon"
- "appartement meublé" → query = "appartement meuble"
- "vous avez quoi" / "bonjour" → query = "recent"
- "budget 250 millions" → query = "budget 250000000"
- "louer un studio" → query = "studio location"
- "REF APT-COC-L-XXXX" → query = "REF:APT-COC-L-XXXX"

TOUJOURS appeler l'outil en premier avec ce que le client a dit. Ne pas demander d'autres infos avant.

===== PRÉSENTER LES RÉSULTATS =====
Après avoir appelé l'outil :

Si l'outil retourne des biens → présente MAX 3 biens, format :
📋 [REF] | [Type] à [Commune/Quartier]
💰 [Prix] | 🛏️ [N] pièce(s)
✨ [1 point fort]
📞 [Téléphone]
→ "Ce bien t'intéresse ? Je peux organiser une visite 😊"

Si l'outil retourne AUCUN_EXACT → présente les alternatives proposées par l'outil.
Si l'outil retourne "Aucun bien disponible" → "Je n'ai pas ce type de bien en ce moment. Veux-tu être prévenu·e à la prochaine annonce ?"

Mots INTERDITS dans tes réponses : erreur, problème, système, base de données, technique, difficulté

===== TON =====
- Chaleureux, humain, court (5-6 lignes max)
- Tutoyer si le client tutoie, vouvoyer sinon
- 1-2 emojis max

===== DÉCROCHER LA VISITE =====
Dès qu'un client montre de l'intérêt :
1. "Super choix, ce bien est très demandé 😊"
2. "Tu es disponible quand pour une visite ?"
3. "Et c'est à quel nom ?"
4. Confirmation → écrire obligatoirement "visite confirmée" + la REF

===== INTERDICTIONS =====
- Inventer un bien, un prix, une adresse, un téléphone
- Modifier les données retournées par l'outil
- Présenter plus de 3 biens à la fois
- Répondre sur les biens SANS avoir appelé recherche_biens`;

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

  // Fix agent prompt
  const agent = wf.nodes.find(function(n) { return n.name === 'Agent Eden'; });
  if (!agent) { console.log('Agent Eden not found'); return; }
  agent.parameters.options = Object.assign({}, agent.parameters.options, { systemMessage: NEW_PROMPT });

  // Clean extra node properties
  const allowed = ['id','name','type','typeVersion','position','parameters','credentials','disabled','notes','notesInFlow','executeOnce','alwaysOutputData','retryOnFail','maxTries','waitBetweenTries','continueOnFail','onError','webhookId','extendsCredential','pinData'];
  wf.nodes = wf.nodes.map(function(node) {
    const clean = {};
    Object.keys(node).forEach(function(k) { if (allowed.includes(k)) clean[k] = node[k]; });
    return clean;
  });

  // Restore missing Mémoire Conversation → Agent Eden connection
  if (!wf.connections['Mémoire Conversation']) {
    wf.connections['Mémoire Conversation'] = {
      "ai_memory": [[{ "node": "Agent Eden", "type": "ai_memory", "index": 0 }]]
    };
    console.log('Restored: Mémoire Conversation → Agent Eden');
  } else {
    console.log('Memory connection already present');
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
    // Verify connections
    const conns = put.body.connections;
    console.log('recherche_biens conn:', conns['recherche_biens'] ? 'OK' : 'MISSING');
    console.log('Mémoire Conversation conn:', conns['Mémoire Conversation'] ? 'OK' : 'MISSING');
    console.log('GPT-4.1-mini conn:', conns['GPT-4.1-mini'] ? 'OK' : 'MISSING');

    // Verify prompt
    const updated = put.body.nodes.find(function(n) { return n.name === 'Agent Eden'; });
    const msg = updated && updated.parameters && updated.parameters.options && updated.parameters.options.systemMessage;
    console.log('Prompt length:', msg ? msg.length : 0);
    console.log('Has INSTRUCTION PRINCIPALE:', msg && msg.includes('INSTRUCTION PRINCIPALE') ? 'YES' : 'NO');

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
