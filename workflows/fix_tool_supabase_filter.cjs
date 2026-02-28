const https = require('https');
const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

// Fix: filter on Supabase side (not JS side) so results are always accurate
// regardless of DB size. this.helpers.httpRequest confirmed working.
const TOOL_CODE = `const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
const FIELDS = 'ref_bien,type_de_bien,type_offre,commune,quartier,zone_geographique,prix,chambre,meubles,caracteristiques,telephone_bien,telephone_expediteur,disponible,status,date_expiration';

const q = (query || '').trim().toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  .replace(/['']/g, "'").replace(/[-_]/g, ' ');

// Build Supabase-side filters (so DB does the work, not JS)
const filters = [
  'disponible=neq.Non',
  'disponible=neq.false',
  'status=neq.archived',
  'status=neq.expired'
];

// Commune filter
const COMMUNES = {
  'cocody':['cocody','coco'], 'yopougon':['yopougon','yopo','yop'],
  'marcory':['marcory'], 'koumassi':['koumassi'],
  'treichville':['treichville','treich'], 'plateau':['plateau'],
  'adjame':['adjame'], 'abobo':['abobo'],
  'port bouet':['port bouet','portbouet'], 'bingerville':['bingerville'],
  'riviera':['riviera'], 'angre':['angre'],
  'deux plateaux':['2 plateaux','deux plateaux'], 'bonoumin':['bonoumin'],
  'bassam':['bassam','grand bassam'], 'assinie':['assinie']
};
var critCommune = '';
for (var c in COMMUNES) {
  if (COMMUNES[c].some(function(v){return q.includes(v);})) { critCommune=c; break; }
}
if (critCommune) {
  // Use the first alias as the ilike value
  var comVal = Object.keys(COMMUNES).indexOf(critCommune) >= 0 ? critCommune : critCommune;
  // Map back to proper case for Supabase
  var COMMUNE_PROPER = {
    'cocody':'Cocody','yopougon':'Yopougon','marcory':'Marcory','koumassi':'Koumassi',
    'treichville':'Treichville','plateau':'Plateau','adjame':'Adjamé','abobo':'Abobo',
    'port bouet':'Port-Bouët','bingerville':'Bingerville','riviera':'Riviera',
    'angre':'Angré','deux plateaux':'Plateaux','bonoumin':'Bonoumin',
    'bassam':'Grand-Bassam','assinie':'Assinie'
  };
  var comSearch = COMMUNE_PROPER[critCommune] || critCommune;
  filters.push('commune=ilike.*' + comSearch + '*');
}

// Type de bien filter
const TYPES = ['villa','appartement','studio','duplex','triplex','maison','terrain','bureau','magasin','boutique','local','immeuble','garage'];
var critType = '';
for (var ti=0; ti<TYPES.length; ti++) {
  if (q.includes(TYPES[ti])) { critType=TYPES[ti]; break; }
}
if (critType) filters.push('type_de_bien=ilike.*' + critType + '*');

// Type offre filter
if (['location','louer','bail'].some(function(w){return q.includes(w);})) {
  filters.push('type_offre=eq.Location');
} else if (['vente','vendre','achat','acheter'].some(function(w){return q.includes(w);})) {
  filters.push('type_offre=eq.Vente');
}

// Chambres filter
var chM = q.match(/(\\d+)\\s*(?:pieces?|chambres?|ch\\b)/);
if (chM) filters.push('chambre=ilike.*' + chM[1] + '*');

// Meublé filter
if (['meuble'].some(function(w){return q.includes(w);})) {
  filters.push('meubles=eq.true');
}

// REF filter
var refM = q.match(/ref[: ]*([a-z]{2,3}-[a-z]{2,3}-[a-z]-[a-z0-9]{4,10})/i);
if (refM) filters.push('ref_bien=ilike.*' + refM[1].toUpperCase() + '*');

// Quartier filter
const QUARTIERS = ['angre','riviera','bonoumin','niangon','orly','zone 4','danga','campement','vallon','palmeraie','attoban'];
for (var qi=0; qi<QUARTIERS.length; qi++) {
  var qNorm = QUARTIERS[qi].normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  if (q.includes(qNorm) && qNorm.length > 3) {
    filters.push('quartier=ilike.*' + QUARTIERS[qi] + '*');
    break;
  }
}

const isRecent = q === 'recent' || q === '' || (!critCommune && !critType && !chM && !refM);
const limit = isRecent ? 20 : 30;

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

// Secondary filter: date_expiration (can't easily do this in PostgREST without parentheses)
const now = new Date();
biens = biens.filter(function(b) {
  if (b.date_expiration && new Date(b.date_expiration) < now) return false;
  return true;
});

if (biens.length === 0) {
  return 'Aucun bien' + (critCommune ? ' à ' + critCommune : '') + (chM ? ' de ' + chM[1] + ' pièce(s)' : '') + ' disponible actuellement.';
}

// Format results
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
    return (i+1)+'. 📋 '+b.ref_bien+' | '+(b.type_de_bien||'')+(m?' ✅':'')+' à '+lieu+'\\n   💰 '+(b.prix||'N/A')+' | 🛏️ '+(b.chambre||'?')+' pièce(s) | 📞 '+tel;
  }).join('\\n───\\n');
}

var prefix = biens.length + ' résultat(s):\\n';
if (biens.length === 1) return prefix + detail(biens[0]);
return prefix + liste(biens.slice(0, 3));`;

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
    description: "Recherche des biens immobiliers disponibles en Côte d'Ivoire. Appelle pour toute question: disponibilité, prix, commune, type, chambres, REF. Passe la demande telle quelle.",
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
    console.log('Has Supabase filters:', code && code.includes('filters.push') ? 'YES' : 'NO');
    console.log('Has this.helpers:', code && code.includes('this.helpers.httpRequest') ? 'YES' : 'NO');
    console.log('Code length:', code ? code.length : 0);

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
