const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

const NEW_PROMPT = `Tu t'appelles Eden, conseillère immobilière chez Bogbe's Multi-Service en Côte d'Ivoire.
Tu réponds sur WhatsApp. Ton objectif : décrocher une visite.

===== INSTRUCTION PRINCIPALE =====
Tu as un outil qui s'appelle recherche_biens. Tu DOIS appeler cet outil AVANT de répondre sur les biens.
Ne jamais affirmer qu'un bien existe ou n'existe pas sans avoir d'abord appelé recherche_biens.

Comment construire la query :
- "3 pièces à Cocody" -> query: "3 pieces cocody"
- "villa à Yopougon" -> query: "villa yopougon"
- "vous avez quoi" / "bonjour" -> query: "recent"
- "budget 250 millions" -> query: "budget 250000000"
- "louer un studio" -> query: "studio location"

TOUJOURS appeler l'outil en premier avec ce que le client a dit. Ne pas demander d'autres infos avant.

===== PRÉSENTER LES BIENS =====
Après avoir appelé l'outil, présente les biens de façon naturelle et conversationnelle.

Format pour chaque bien (sans REF, sans emojis) :
[Type] [N] pièces à [Commune], [Quartier]
Prix : [montant]
[Caractéristiques principales si disponibles]
Contact : [numéro de téléphone]

Exemple :
Appartement 3 pièces à Cocody, Palmeraie
Prix : 230 000 FCFA/mois
Climatisation, gardien
Contact : 07 XX XX XX

INTERDICTIONS ABSOLUES :
- Jamais de codes REF dans les messages au client (c'est un code interne)
- Jamais d'emojis
- Jamais plus de 3 biens à la fois
- Jamais inventer des données non retournées par l'outil

Si l'outil retourne AUCUN_EXACT -> propose les alternatives retournées
Si l'outil retourne "Aucun bien" -> "Je n'ai pas ce type de bien en ce moment. Tu veux que je te prévienne dès qu'une annonce arrive ?"

Mots INTERDITS : erreur, problème, système, base de données, technique, difficulté

===== TON =====
- Chaleureux, humain, court (5-6 lignes max)
- Tutoyer si le client tutoie, vouvoyer sinon
- Pas d'emojis. Jamais.

===== DÉCROCHER LA VISITE =====
Dès qu'un client montre de l'intérêt :
1. "Super choix, ce bien est très demandé"
2. "Tu es disponible quand pour une visite ?"
3. "Et c'est à quel nom ?"
4. Confirmation -> écrire obligatoirement "visite confirmée" + la REF (usage interne uniquement)`;

// Updated tool code: deduplicate + format without REF + no emojis
const TOOL_CODE = `const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
const FIELDS = 'ref_bien,type_de_bien,type_offre,commune,quartier,zone_geographique,prix,chambre,meubles,caracteristiques,telephone_bien,telephone_expediteur,disponible,status,date_expiration';

const q = (query || '').trim().toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  .replace(/['']/g, "'").replace(/[-_]/g, ' ');

const filters = [
  'disponible=neq.Non',
  'disponible=neq.false',
  'status=neq.archived',
  'status=neq.expired'
];

const COMMUNES = {
  'cocody':['cocody','coco'], 'yopougon':['yopougon','yopo','yop'],
  'marcory':['marcory'], 'koumassi':['koumassi'],
  'treichville':['treichville','treich'], 'plateau':['plateau'],
  'adjame':['adjame'], 'abobo':['abobo'],
  'port bouet':['port bouet','portbouet'], 'bingerville':['bingerville'],
  'deux plateaux':['2 plateaux','deux plateaux'], 'bonoumin':['bonoumin'],
  'bassam':['bassam','grand bassam'], 'assinie':['assinie']
};
const COMMUNE_PROPER = {
  'cocody':'Cocody','yopougon':'Yopougon','marcory':'Marcory','koumassi':'Koumassi',
  'treichville':'Treichville','plateau':'Plateau','adjame':'Adjame','abobo':'Abobo',
  'port bouet':'Port-Bouet','bingerville':'Bingerville',
  'deux plateaux':'Plateaux','bonoumin':'Bonoumin',
  'bassam':'Grand-Bassam','assinie':'Assinie'
};
var critCommune = '';
for (var c in COMMUNES) {
  if (COMMUNES[c].some(function(v){return q.includes(v);})) { critCommune=c; break; }
}
if (critCommune) filters.push('commune=ilike.*' + (COMMUNE_PROPER[critCommune]||critCommune) + '*');

const TYPES = ['villa','appartement','studio','duplex','triplex','maison','terrain','bureau','magasin','boutique','local','immeuble','garage'];
var critType = '';
for (var ti=0; ti<TYPES.length; ti++) {
  if (q.includes(TYPES[ti])) { critType=TYPES[ti]; break; }
}
if (critType) filters.push('type_de_bien=ilike.*' + critType + '*');

if (['location','louer','bail'].some(function(w){return q.includes(w);})) {
  filters.push('type_offre=eq.Location');
} else if (['vente','vendre','achat','acheter'].some(function(w){return q.includes(w);})) {
  filters.push('type_offre=eq.Vente');
}

var chM = q.match(/(\\d+)\\s*(?:pieces?|chambres?|ch\\b)/);
if (chM) filters.push('chambre=ilike.*' + chM[1] + '*');

if (q.includes('meuble')) filters.push('meubles=eq.true');

var refM = q.match(/ref[: ]*([a-z]{2,3}-[a-z]{2,3}-[a-z]-[a-z0-9]{4,10})/i);
if (refM) filters.push('ref_bien=ilike.*' + refM[1].toUpperCase() + '*');

const QUARTIERS = ['angre','angree','riviera','bonoumin','niangon','orly','zone 4','vallon','palmeraie','attoban','gesco','djibi'];
for (var qi=0; qi<QUARTIERS.length; qi++) {
  var qn = QUARTIERS[qi].normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  if (q.includes(qn) && qn.length > 3) { filters.push('quartier=ilike.*' + QUARTIERS[qi] + '*'); break; }
}

const isRecent = q === 'recent' || q === '' || (!critCommune && !critType && !chM && !refM);
const limit = isRecent ? 20 : 50;
const url = SUPABASE_URL + '/rest/v1/locaux?' + filters.join('&') + '&select=' + FIELDS + '&order=date_publication.desc&limit=' + limit;

let biens = [];
try {
  const resp = await this.helpers.httpRequest({
    method: 'GET',
    url: url,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  biens = Array.isArray(resp) ? resp : [];
  if (!Array.isArray(resp)) return '[ERR_RESP] ' + JSON.stringify(resp).substring(0, 150);
} catch(e) {
  return '[ERR_HTTP] ' + e.message;
}

// Filter expired
const now = new Date();
biens = biens.filter(function(b) {
  return !(b.date_expiration && new Date(b.date_expiration) < now);
});

// Deduplicate: same price + same commune + same chambre + same phone = same bien
var seen = {};
biens = biens.filter(function(b) {
  var key = [
    (b.prix||'').replace(/[^0-9]/g,''),
    (b.commune||'').toLowerCase(),
    (b.chambre||'').replace(/[^0-9]/g,''),
    (b.telephone_bien||b.telephone_expediteur||''),
    (b.type_de_bien||'').toLowerCase().substring(0,5)
  ].join('|');
  if (seen[key]) return false;
  seen[key] = true;
  return true;
});

if (biens.length === 0) {
  var ctx = '';
  if (critCommune) ctx += ' à ' + critCommune;
  if (chM) ctx += ' de ' + chM[1] + ' pièce(s)';
  return 'Aucun bien' + ctx + ' disponible actuellement.';
}

// Format: natural, no REF shown to client, REF kept internally for confirmation
function fmt(b, idx) {
  var m = ['oui','true'].includes(String(b.meubles||'').toLowerCase());
  var lieu = [b.commune, b.quartier, b.zone_geographique].filter(Boolean).join(', ') || 'Non précisé';
  var tel = b.telephone_bien || b.telephone_expediteur || "Contactez l'agence";
  var type = b.type_de_bien || 'Bien';
  var ch = b.chambre ? b.chambre.replace(/[^0-9]/g,'') : '';
  var pieces = ch ? ' ' + ch + ' piece(s)' : '';
  var meuble = m ? ', meuble' : '';
  var caract = b.caracteristiques ? '\\n' + b.caracteristiques.substring(0, 150) : '';
  var exp = '';
  if (b.date_expiration) {
    var j = Math.ceil((new Date(b.date_expiration) - new Date()) / (864e5));
    if (j <= 7) exp = ' (expire dans ' + j + 'j)';
  }
  var num = idx !== undefined ? (idx + 1) + '. ' : '';
  return num + type + pieces + meuble + ' a ' + lieu + exp + '\\nPrix : ' + (b.prix || 'Sur demande') + '\\n' + (b.type_offre ? b.type_offre + ' | ' : '') + caract + '\\nContact : ' + tel + '\\n[REF:' + b.ref_bien + ']';
}

var result = biens.slice(0, 3);
if (result.length === 1) return '1 résultat :\\n' + fmt(result[0]);
return result.length + ' résultats :\\n\\n' + result.map(function(b, i){ return fmt(b, i); }).join('\\n\\n');`;

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

  // Update agent prompt
  const agent = wf.nodes.find(function(n) { return n.name === 'Agent Eden'; });
  if (agent) {
    agent.parameters.options = Object.assign({}, agent.parameters.options, { systemMessage: NEW_PROMPT });
  }

  // Update tool code
  const tool = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (tool) {
    tool.parameters = {
      name: 'recherche_biens',
      description: "Recherche des biens immobiliers disponibles en Côte d'Ivoire. Appelle pour toute question: disponibilité, prix, commune, type, chambres, REF. Passe la demande telle quelle.",
      jsCode: TOOL_CODE
    };
  }

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
    const conns = put.body.connections;
    console.log('Memory conn:', conns['Mémoire Conversation'] ? 'OK' : 'MISSING');
    console.log('Tool conn:', conns['recherche_biens'] ? 'OK' : 'MISSING');

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
