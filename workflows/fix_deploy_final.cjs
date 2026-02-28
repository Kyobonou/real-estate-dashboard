const https = require('https');
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

// Complete tool code - uses fetch (available in n8n toolCode), no parentheses in URL
// Double neq filter: disponible=neq.Non AND disponible=neq.false
const TOOL_CODE = `// ===== OUTIL RECHERCHE BIENS IMMOBILIERS =====
const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

try {
  const q = (query || '').toLowerCase().trim();

  const FIELDS = 'id,ref_bien,type_de_bien,type_offre,zone_geographique,commune,quartier,prix,chambre,meubles,caracteristiques,telephone_bien,telephone_expediteur,expediteur,publie_par,disponible,status,groupe_whatsapp_origine,lien_image,date_publication';

  // Double neq filter: exclure Non et false (pas de parentheses dans l'URL)
  const filters = ['disponible=neq.Non', 'disponible=neq.false'];

  const communes = [
    {v:['cocody'],val:'Cocody'},{v:['yopougon','yopo'],val:'Yopougon'},
    {v:['marcory'],val:'Marcory'},{v:['koumassi'],val:'Koumassi'},
    {v:['treichville','treiche'],val:'Treichville'},{v:['plateau'],val:'Plateau'},
    {v:['adjamé','adjame'],val:'Adjamé'},{v:['abobo'],val:'Abobo'},
    {v:['attécoubé','attecoube'],val:'Attécoubé'},
    {v:['port-bouët','port-bouet','portbouet'],val:'Port-Bouët'},
    {v:['bingerville'],val:'Bingerville'},{v:['songon'],val:'Songon'},
    {v:['anyama'],val:'Anyama'},{v:['grand-bassam','bassam'],val:'Grand-Bassam'},
    {v:['assinie'],val:'Assinie'}
  ];
  const comm = communes.find(c => c.v.some(v => q.includes(v)));
  if (comm) filters.push('commune=ilike.*' + comm.val + '*');

  const types = ['villa','appartement','studio','duplex','triplex','maison','terrain','bureau','magasin','boutique','local','garage','immeuble'];
  const typ = types.find(t => q.includes(t));
  if (typ) filters.push('type_de_bien=ilike.*' + typ + '*');

  if (q.includes('vente') || q.includes('vendre') || q.includes('achat') || q.includes('acheter')) {
    filters.push('type_offre=eq.Vente');
  } else if (q.includes('location') || q.includes('louer') || q.includes('locat') || q.includes('bail')) {
    filters.push('type_offre=eq.Location');
  }

  if (q.includes('meublé') || q.includes('meuble')) filters.push('meubles=eq.true');

  const chambreMatch = q.match(/(\\d+)\\s*(?:pièces?|chambres?|ch\\b)/);
  if (chambreMatch) filters.push('chambre=eq.' + chambreMatch[1]);

  const refMatch = q.match(/([a-z]{2,3}[-_][a-z]{2,3}[-_][a-zA-Z0-9]{4,10})/i);
  if (refMatch) filters.push('ref_bien=ilike.*' + refMatch[1].toUpperCase() + '*');

  const quartiers = ['angré','angre','2 plateaux','deux plateaux','riviera','bonoumin','attoban','niangon','orly','zone 4','danga','campement','solibra'];
  const qrt = quartiers.find(qt => q.includes(qt));
  if (qrt) filters.push('quartier=ilike.*' + qrt + '*');

  const url = SUPABASE_URL + '/rest/v1/locaux?' + filters.join('&') + '&select=' + FIELDS + '&order=date_publication.desc&limit=15';

  const resp = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }
  });

  if (!resp.ok) {
    const err = await resp.text();
    return '[ERR ' + resp.status + '] ' + err.substring(0, 200);
  }

  const biens = await resp.json();

  if (!biens || biens.length === 0) {
    return 'Aucun bien disponible ne correspond à ta recherche. Essaie avec des critères différents.';
  }

  return 'Résultats (' + biens.length + ' bien(s)):\\n\\n' + biens.map(b => {
    return [
      '---',
      '*' + (b.ref_bien||'N/A') + '* | ' + (b.type_offre||'') + ' | ' + (b.type_de_bien||''),
      '📍 ' + [b.commune,b.quartier,b.zone_geographique].filter(Boolean).join(', '),
      '💰 ' + (b.prix||'Prix non communiqué'),
      '🛏️ ' + (b.chambre||'N/A') + ' pièce(s)' + (b.meubles?' | Meublé':' | Non meublé'),
      '📝 ' + (b.caracteristiques||'Non précisé'),
      '📞 ' + (b.telephone_bien||b.telephone_expediteur||'Non disponible'),
      '👤 ' + (b.publie_par||b.expediteur||'Inconnu')
    ].join('\\n');
  }).join('\\n\\n') + '\\n\\n[Pour une visite, citez le REF]';

} catch(err) {
  return '[EXCEPTION] ' + err.message + ' | ' + (err.stack||'').substring(0, 100);
}`;

const TOOL_DESCRIPTION = 'Recherche des biens immobiliers disponibles en Côte d\'Ivoire dans la base de données. Utilise cet outil pour toute question sur les biens: disponibilité, prix, localisation, caractéristiques, chambres, etc. Passe le critère de recherche tel que reçu de l\'utilisateur (commune, type, quartier, budget, REF, etc.). Si aucun critère spécifique, passe "tous" pour lister les biens récents.';

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  // Find by type (not name — name may have changed)
  const toolNode = wf.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
  if (!toolNode) { console.log('toolCode node not found'); return; }
  console.log('Found tool node:', toolNode.name);

  // Update parameters
  toolNode.parameters = {
    name: 'recherche_biens_immobiliers',
    description: TOOL_DESCRIPTION,
    jsCode: TOOL_CODE
  };

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
    const updated = put.body.nodes.find(function(n) { return n.type === '@n8n/n8n-nodes-langchain.toolCode'; });
    const code = updated && updated.parameters && updated.parameters.jsCode;
    console.log('name param:', updated && updated.parameters && updated.parameters.name);
    console.log('code length:', code ? code.length : 0);
    console.log('Has neq.Non:', code && code.includes('neq.Non') ? 'YES' : 'NO');
    console.log('Has fetch:', code && code.includes('await fetch(') ? 'YES' : 'NO');
    console.log('Has try-catch:', code && code.includes('try {') ? 'YES' : 'NO');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    console.log('Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
