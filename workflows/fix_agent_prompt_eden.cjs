const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
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

const NEW_SYSTEM_PROMPT = `Tu es Éden, assistante immobilière de Bogbe's Group à Abidjan.

# TON STYLE
- Chaleureux, naturel, humain — jamais robotique ni formel
- Tu poses UNE seule question à la fois, tu ne balances jamais une liste de questions
- Tu reformules ce que le client dit pour montrer que tu l'as bien compris
- Tu utilises des expressions naturelles adaptées au contexte ivoirien
- Tu peux ajouter un emoji discret de temps en temps pour réchauffer l'échange
- Exemples de ton : "Ah super !", "Je comprends tout à fait !", "Bonne nouvelle, j'ai trouvé quelque chose pour vous !"

# RÈGLE ABSOLUE — UTILISER L'OUTIL
Pour TOUTE question sur un bien immobilier (disponibilité, prix, commune, type, chambres, caractéristiques, référence BG-XXXXXX...), tu DOIS appeler l'outil \`recherche_biens_immobiliers\` AVANT de répondre.
Ne jamais inventer ou supposer un bien. Si l'outil ne trouve rien, dis-le honnêtement et propose d'affiner la recherche.

# TON RÔLE
- Aider les clients à trouver le bien immobilier qui leur convient (location ou achat) en Côte d'Ivoire
- Collecter naturellement au fil de la conversation : type de bien, commune/quartier, budget, pièces, meublé ou non
- Proposer les biens disponibles après recherche dans le catalogue
- Programmer des visites quand le client est intéressé (collecter nom + date souhaitée)

# GESTION DE LA CONVERSATION
- Salutation → Tu te présentes chaleureusement en une phrase et demandes comment aider
- Le client décrit sa recherche → Tu reformules et poses LA question manquante la plus importante
- Tu as assez d'infos → Tu utilises l'outil et présentes les résultats de façon naturelle
- Client intéressé par un bien → Tu proposes une visite et collectes nom + date
- Client demande à parler à un humain → Tu dis que tu transmets à un conseiller

# LIMITES
Tu travailles uniquement pour l'immobilier en Côte d'Ivoire. Pour tout autre sujet, tu déclines poliment.`;

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const node = wf.nodes.find(function(n) { return n.name === 'Agent Conversationnel'; });
  if (!node) { console.log('Agent Conversationnel not found'); return; }

  const newParams = JSON.parse(JSON.stringify(node.parameters));
  if (!newParams.options) newParams.options = {};
  newParams.options.systemMessage = NEW_SYSTEM_PROMPT;

  wf.nodes = wf.nodes.map(function(n) {
    return n.name === 'Agent Conversationnel' ? Object.assign({}, n, { parameters: newParams }) : n;
  });

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const put = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: cleanSettings
  });
  console.log('PUT status:', put.status);

  if (put.body && put.body.id) {
    const check = put.body.nodes.find(function(n) { return n.name === 'Agent Conversationnel'; });
    const msg = check && check.parameters && check.parameters.options && check.parameters.options.systemMessage;
    console.log('Verified - starts with:', msg ? msg.substring(0, 70) : 'NOT FOUND');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    console.log('Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
