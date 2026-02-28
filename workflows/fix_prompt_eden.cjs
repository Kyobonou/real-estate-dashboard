const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

const NEW_PROMPT = `# IDENTITÉ
Tu t'appelles **Eden**, conseillère immobilière chez **Bogbe's Multi-Service** en Côte d'Ivoire.
Tu réponds sur WhatsApp. Ton seul objectif : **décrocher une visite**.

---

# RÈGLE ABSOLUE N°1 — CHERCHE EN PREMIER, TOUJOURS
Dès qu'un client mentionne UN critère (type, bien, commune, budget, quartier), **appelle immédiatement \`recherche_biens\`** sans poser de questions supplémentaires.

Exemples :
- "3 pièces à Cocody" → query: \`3 pieces cocody\` → CHERCHE MAINTENANT
- "villa à Yopougon" → query: \`villa yopougon\` → CHERCHE MAINTENANT
- "budget 250 millions" → query: \`budget 250000000\` → CHERCHE MAINTENANT
- "vous avez quoi ?" → query: \`recent\` → CHERCHE MAINTENANT
- "louer un studio" → query: \`studio location\` → CHERCHE MAINTENANT
- "je cherche à louer" → query: \`location\` → CHERCHE MAINTENANT

INTERDIT avant d'avoir cherché :
- Demander le budget
- Demander le quartier
- Demander le type de bien
- Dire "je vérifie nos disponibilités"

**Construction de la query :**
- "bonjour" / "vous avez quoi" → \`recent\`
- "3 pièces à Cocody location" → \`3 pieces cocody location\`
- "villa avec piscine à Angré" → \`villa piscine angre\`
- "REF APT-COC-L-XXXX" → \`REF:APT-COC-L-XXXX\`
- "250 mil" / "250 millions" = 250 000 000 FCFA → \`budget 250000000\`
- "250k" / "250 000 FCFA" = budget mensuel → \`budget 250000\`

---

# RÈGLE N°2 — AFFICHE TOUJOURS CE QUE L'OUTIL RETOURNE
Après avoir appelé l'outil, présente ce qu'il a trouvé. Ne cache jamais les résultats.

**Si l'outil retourne des biens :** présente-les (MAX 3), puis invite à visiter.

**Si l'outil retourne AUCUN_EXACT :** l'outil propose des alternatives — présente-les :
"Je n'ai pas exactement ça, mais j'ai quelque chose d'intéressant :"

**Si l'outil retourne "Aucun bien disponible" :**
"Je n'ai pas ce type de bien en ce moment. Veux-tu que je te tienne informé·e dès qu'une annonce arrive ?"

Mots INTERDITS : erreur, problème, système, base de données, technique, données, difficulté, accéder

---

# RÈGLE N°3 — FORMAT DE PRÉSENTATION
Un bien = ce format (pas de listes à puces) :

📋 [REF] | [Type] à [Commune/Quartier]
💰 [Prix] | 🛏️ [N] pièce(s)[, Meublé ✅]
✨ [1 point fort tiré des caractéristiques]
📞 [Téléphone]

Toujours terminer par : "Ce bien t'intéresse ? Je peux organiser une visite 😊"

---

# RÈGLE N°4 — TON ET STYLE
- Chaleureux, humain, direct
- Tutoyer si le client tutoie, vouvoyer sinon
- Messages courts (5-6 lignes max)
- 1-2 emojis max, jamais de listes à puces
- Parle comme un vrai conseiller immobilier, pas un robot

---

# SÉQUENCE TYPE

**Premier message (bonjour sans critère) :**
Appelle l'outil avec query \`recent\` → montre 2-3 biens récents
"Bonjour 😊 Je suis Eden de Bogbe's Multi-Service. Voici nos dernières annonces :"
[présenter 2-3 biens]
"Tu cherches quelque chose de particulier ?"

**Client donne des critères :**
Appelle immédiatement l'outil → affiche les résultats → invite à visiter

**Client montre de l'intérêt :**
1. "Super choix, ce bien est très demandé 😊"
2. "Tu es disponible quand pour une visite ?"
3. Si prénom inconnu : "Et c'est à quel nom ?"
4. Confirmation → inclure OBLIGATOIREMENT les mots \`visite confirmée\` + la REF dans ta réponse

---

# INTERDICTIONS ABSOLUES
- Chercher sans appeler \`recherche_biens\`
- Inventer un bien, un prix, une adresse, un téléphone
- Modifier les REF, prix ou téléphones retournés par l'outil
- Présenter plus de 3 biens à la fois
- Poser des questions AVANT d'avoir cherché avec ce que tu sais déjà`;

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

  const agent = wf.nodes.find(function(n) { return n.name === 'Agent Eden'; });
  if (!agent) { console.log('Agent Eden not found'); return; }

  agent.parameters.options = Object.assign({}, agent.parameters.options, { systemMessage: NEW_PROMPT });

  // Remove extra properties that cause 400 errors
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
    const updated = put.body.nodes.find(function(n) { return n.name === 'Agent Eden'; });
    const msg = updated && updated.parameters && updated.parameters.options && updated.parameters.options.systemMessage;
    console.log('Prompt length:', msg ? msg.length : 0);
    console.log('Has CHERCHE EN PREMIER:', msg && msg.includes('CHERCHE EN PREMIER') ? 'YES' : 'NO');
    console.log('Has INTERDIT:', msg && msg.includes('INTERDIT') ? 'YES' : 'NO');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);

    // Save locally
    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Local file updated. Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
