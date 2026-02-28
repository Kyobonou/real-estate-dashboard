const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

// Confirmed working: this.helpers.httpRequest (from diagnostic)
// Rebuilt with full scoring logic + visible error messages
const TOOL_CODE = `const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
const FIELDS = 'ref_bien,type_de_bien,type_offre,commune,quartier,zone_geographique,prix,chambre,meubles,caracteristiques,telephone_bien,telephone_expediteur,disponible,status,date_expiration';

const q = (query || '').trim().toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  .replace(/['']/g, "'").replace(/[-_]/g, ' ');

const isRef = /ref[: ]*([a-z]{2,3}-[a-z]{2,3}-[lv]-[a-z0-9]{4,10})/i.test(q);
const isRecent = q === 'recent' || q === '';
const limit = isRef ? 20 : isRecent ? 20 : 150;

// HTTP call — this.helpers confirmed working in this n8n version
let biens = [];
let httpErr = null;
try {
  const resp = await this.helpers.httpRequest({
    method: 'GET',
    url: SUPABASE_URL + '/rest/v1/locaux?select=' + FIELDS + '&order=date_publication.desc&limit=' + limit,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  biens = Array.isArray(resp) ? resp : [];
  if (!Array.isArray(resp)) httpErr = 'non-array: ' + JSON.stringify(resp).substring(0, 100);
} catch(e) {
  return '[ERR_HTTP] ' + e.message;
}

if (biens.length === 0 && httpErr) return '[ERR_EMPTY] ' + httpErr;

// Filter disponibles
const now = new Date();
biens = biens.filter(function(b) {
  if (!b) return false;
  if (['non','false'].includes(String(b.disponible||'').toLowerCase())) return false;
  if (['archived','expired','supprime','pending_confirm'].includes(String(b.status||'').toLowerCase())) return false;
  if (b.date_expiration && new Date(b.date_expiration) < now) return false;
  return true;
});

const total = biens.length;
if (total === 0) return 'Aucun bien disponible actuellement.';

// REF exacte
const refM = q.match(/ref[: ]*([a-z]{2,3}-[a-z]{2,3}-[lv]-[a-z0-9]{4,10})/i);
if (refM) {
  const refS = refM[1].toUpperCase();
  const found = biens.find(function(b) { return (b.ref_bien||'').toUpperCase().includes(refS); });
  if (!found) return 'Aucun bien avec la référence ' + refS + '.';
  return 'RESULTAT_REF:\\n' + detail(found);
}

if (isRecent) {
  return 'CATALOGUE (' + total + ' biens disponibles). Dernières annonces:\\n' + liste(biens.slice(0, 3));
}

// Critères
const COMMUNES = {
  'cocody':['cocody','coco'],'yopougon':['yopougon','yopo','yop'],
  'marcory':['marcory'],'koumassi':['koumassi'],
  'treichville':['treichville','treich'],'plateau':['plateau'],
  'adjame':['adjame'],'abobo':['abobo'],
  'port bouet':['port bouet','portbouet'],'bingerville':['bingerville'],
  'riviera':['riviera'],'angre':['angre'],
  'deux plateaux':['2 plateaux','deux plateaux'],'bonoumin':['bonoumin'],
  'bassam':['bassam','grand bassam'],'assinie':['assinie']
};
const TYPES = {
  'appartement':['appartement','appart'],'studio':['studio'],
  'maison':['maison'],'villa':['villa'],
  'duplex':['duplex'],'triplex':['triplex'],
  'terrain':['terrain','parcelle'],'bureau':['bureau'],
  'magasin':['magasin','boutique'],'local':['local'],
  'immeuble':['immeuble'],'garage':['garage']
};

var critCommune='', critType='', critOffre='', critMeuble=false, critChambres=-1, critBudget=0;
for (var c in COMMUNES) { if (COMMUNES[c].some(function(v){return q.includes(v);})){critCommune=c;break;} }
for (var t in TYPES) { if (TYPES[t].some(function(v){return q.includes(v);})){critType=t;break;} }
if (['location','louer','bail'].some(function(w){return q.includes(w);})) critOffre='location';
if (['vente','vendre','achat','acheter'].some(function(w){return q.includes(w);})) critOffre='vente';
if (['meuble'].some(function(w){return q.includes(w);})) critMeuble=true;
var chM=q.match(/(\\d+)\\s*(?:pieces?|chambres?|ch\\b)/);
if (chM) critChambres=parseInt(chM[1]);
var bM=q.match(/(\\d+)\\s*(million|milion|k|mille)/);
if (bM) {
  critBudget=parseInt(bM[1]);
  if (bM[2].startsWith('million')||bM[2].startsWith('milion')) critBudget*=1000000;
  else if (bM[2]==='k'||bM[2]==='mille') critBudget*=1000;
}
var bD=q.match(/\\b(\\d{5,})\\b/);
if (bD && !critBudget) critBudget=parseInt(bD[1]);

var scored = biens.map(function(b) {
  var score=0;
  var bLoc=[b.commune,b.quartier,b.zone_geographique].filter(Boolean).join(' ')
    .toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  var bText=[b.type_de_bien,b.commune,b.quartier,b.caracteristiques].filter(Boolean).join(' ')
    .toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  if (critCommune && COMMUNES[critCommune].some(function(v){return bLoc.includes(v);})) score+=40;
  if (critType) {
    var bT=(b.type_de_bien||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
    if (TYPES[critType].some(function(v){return bT.includes(v);})||bT.includes(critType)) score+=40;
  }
  if (critOffre) {
    var bO=(b.type_offre||'').toLowerCase();
    if (bO.includes(critOffre)) score+=25; else score-=20;
  }
  if (critMeuble) {
    if (['oui','true'].includes(String(b.meubles||'').toLowerCase())) score+=20; else score-=10;
  }
  if (critChambres>0) {
    var nb=parseInt(b.chambre);
    if (!isNaN(nb)){if(nb===critChambres)score+=25;else if(Math.abs(nb-critChambres)===1)score+=10;else score-=15;}
  }
  if (critBudget>0) {
    var pN=parseInt(String(b.prix||'').replace(/[^0-9]/g,''));
    if (pN>0){var r=pN/critBudget;if(r<=1.0)score+=20;else if(r<=1.2)score+=10;else if(r<=1.5)score-=10;else score-=30;}
  }
  return {b:b,score:score};
});

scored.sort(function(a,b){return b.score-a.score;});
var top=scored.filter(function(r){return r.score>0;});

if (top.length===0) {
  var alt=scored.slice(0,2);
  return 'AUCUN_EXACT pour "'+query+'". ALTERNATIVES:\\n'+liste(alt.map(function(r){return r.b;}));
}

var res=top.slice(0,3).map(function(r){return r.b;});
var prefix=top.length+' correspondance(s) sur '+total+' biens disponibles:\\n';
if (res.length===1) return prefix+detail(res[0]);
return prefix+liste(res);

function detail(b) {
  var m=['oui','true'].includes(String(b.meubles||'').toLowerCase());
  var lieu=[b.commune,b.quartier,b.zone_geographique].filter(Boolean).join(', ')||'Non précisé';
  var tel=b.telephone_bien||b.telephone_expediteur||"Contactez l'agence";
  var exp='';
  if (b.date_expiration){var j=Math.ceil((new Date(b.date_expiration)-new Date())/(864e5));if(j<=7)exp=' ⚠️ Expire dans '+j+'j';}
  return '📋 '+b.ref_bien+exp+' | '+(b.type_offre||'')+'\\n🏘️ '+(b.type_de_bien||'Bien')+(m?' ✅ Meublé':'')+' à '+lieu+'\\n💰 '+(b.prix||'Prix sur demande')+'\\n🛏️ '+(b.chambre||'N/A')+' pièce(s)'+(b.caracteristiques?'\\n✨ '+b.caracteristiques.substring(0,180):'')+' \\n📞 '+tel;
}

function liste(biens) {
  return biens.map(function(b,i){
    var m=['oui','true'].includes(String(b.meubles||'').toLowerCase());
    var lieu=[b.commune,b.quartier].filter(Boolean).join(', ')||'N/A';
    var tel=b.telephone_bien||b.telephone_expediteur||'Agence';
    return (i+1)+'. 📋 '+b.ref_bien+' | '+(b.type_de_bien||'')+(m?' ✅':'')+' à '+lieu+'\\n   💰 '+(b.prix||'N/A')+' | 🛏️ '+(b.chambre||'?')+' p. | 📞 '+tel;
  }).join('\\n───\\n');
}`;

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
    description: "Recherche des biens immobiliers disponibles. Appelle cet outil pour toute question sur les biens: disponibilité, prix, commune, type, chambres. Passe la demande telle quelle.",
    jsCode: TOOL_CODE
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
    const updTool = put.body.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
    const code = updTool && updTool.parameters && updTool.parameters.jsCode;
    console.log('Has this.helpers:', code && code.includes('this.helpers.httpRequest') ? 'YES' : 'NO');
    console.log('Has ERR_HTTP visible:', code && code.includes('[ERR_HTTP]') ? 'YES' : 'NO');
    console.log('Code length:', code ? code.length : 0);

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);

    fs.writeFileSync(
      'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Bogbes multi service.json',
      JSON.stringify(put.body, null, 2), 'utf8'
    );
    console.log('Done. Test with: je cherche une 3 pièces à Cocody');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
