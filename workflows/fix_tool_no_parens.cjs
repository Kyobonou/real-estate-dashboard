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

// Tool code: uses array of filters (no object with duplicate keys), no parentheses in URL
const NEW_TOOL_CODE = `// ===== OUTIL RECHERCHE BIENS IMMOBILIERS =====
// Accès complet à TOUS les champs de la table locaux Supabase

const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

try {
  const q = (query || '').toLowerCase().trim();

  const SELECT_FIELDS = [
    'id', 'ref_bien', 'type_de_bien', 'type_offre', 'zone_geographique',
    'commune', 'quartier', 'prix', 'chambre', 'meubles', 'caracteristiques',
    'telephone_bien', 'telephone_expediteur', 'expediteur', 'publie_par',
    'disponible', 'status', 'groupe_whatsapp_origine', 'lien_image',
    'message_initial', 'date_publication', 'date_expiration', 'publication_id'
  ].join(',');

  // Use array (not object) to allow duplicate keys like disponible=neq.X twice
  // disponible stores "true"/"false" (n8n v2) and "Oui"/"Non" (older data)
  // Two neq filters = AND condition, no parentheses needed
  const filters = [
    'disponible=neq.Non',
    'disponible=neq.false'
  ];

  // Filtre commune
  const communes = [
    { variants: ['cocody'], value: 'Cocody' },
    { variants: ['yopougon', 'yopo'], value: 'Yopougon' },
    { variants: ['marcory'], value: 'Marcory' },
    { variants: ['koumassi'], value: 'Koumassi' },
    { variants: ['treichville', 'treiche'], value: 'Treichville' },
    { variants: ['plateau'], value: 'Plateau' },
    { variants: ['adjamé', 'adjame'], value: 'Adjamé' },
    { variants: ['abobo'], value: 'Abobo' },
    { variants: ['attécoubé', 'attecoube'], value: 'Attécoubé' },
    { variants: ['port-bouët', 'port-bouet', 'portbouet'], value: 'Port-Bouët' },
    { variants: ['bingerville'], value: 'Bingerville' },
    { variants: ['songon'], value: 'Songon' },
    { variants: ['anyama'], value: 'Anyama' },
    { variants: ['grand-bassam', 'bassam'], value: 'Grand-Bassam' },
    { variants: ['assinie'], value: 'Assinie' }
  ];
  const communeTrouvee = communes.find(c => c.variants.some(v => q.includes(v)));
  if (communeTrouvee) filters.push('commune=ilike.*' + communeTrouvee.value + '*');

  // Filtre type de bien
  const typesBien = ['villa', 'appartement', 'studio', 'duplex', 'triplex', 'maison', 'terrain', 'bureau', 'magasin', 'boutique', 'local', 'garage', 'immeuble', 'chambre'];
  const typeTrouve = typesBien.find(t => q.includes(t));
  if (typeTrouve) filters.push('type_de_bien=ilike.*' + typeTrouve + '*');

  // Filtre type d'offre
  if (q.includes('vente') || q.includes('vendre') || q.includes('achat') || q.includes('acheter') || q.includes('céder')) {
    filters.push('type_offre=eq.Vente');
  } else if (q.includes('location') || q.includes('louer') || q.includes('locat') || q.includes('bail') || q.includes('mensuel')) {
    filters.push('type_offre=eq.Location');
  }

  // Filtre meuble
  if (q.includes('meublé') || q.includes('meuble')) filters.push('meubles=eq.true');

  // Filtre REF bien
  const refMatch = q.match(/([a-z]{2,3}[-_][a-z]{2,3}[-_][a-zA-Z0-9]{4,10})/i);
  if (refMatch) filters.push('ref_bien=ilike.*' + refMatch[1].toUpperCase() + '*');

  // Filtre quartier
  const quartiersConnus = ['angré', 'angre', '2 plateaux', 'deux plateaux', 'riviera', 'bonoumin', 'attoban', 'niangon', 'orly', 'zone 4', 'zone4', 'solibra', 'danga', 'remblai'];
  const quartierTrouve = quartiersConnus.find(qt => q.includes(qt));
  if (quartierTrouve) filters.push('quartier=ilike.*' + quartierTrouve + '*');

  // Filtre nombre de chambres
  const chambreMatch = q.match(/(\\d+)\\s*(?:pièces?|chambres?|ch\\b)/);
  if (chambreMatch) filters.push('chambre=eq.' + chambreMatch[1]);

  // Construire URL (array = pas de problème de clés dupliquées, pas de parenthèses)
  const url = SUPABASE_URL + '/rest/v1/locaux?' + filters.join('&') + '&select=' + SELECT_FIELDS + '&order=date_publication.desc&limit=15';

  // Requête via $helpers.httpRequest
  const response = await $helpers.httpRequest({
    method: 'GET',
    url: url,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return 'Erreur Supabase ' + response.statusCode + ': ' + JSON.stringify(response.body).substring(0, 300);
  }

  const biens = response.body;

  if (!biens || biens.length === 0) {
    return 'Aucun bien disponible ne correspond à votre recherche. Essayez avec des critères différents (autre commune, autre type de bien...).';
  }

  const resultats = biens.map(b => {
    const meuble = b.meubles ? ' | ✅ Meublé' : ' | ❌ Non meublé';
    const chambres = b.chambre ? b.chambre + ' pièce(s)' : 'N/A';
    const image = b.lien_image ? '🖼️ Image: ' + b.lien_image : '';
    const datePubli = b.date_publication ? new Date(b.date_publication).toLocaleDateString('fr-FR') : '';
    const groupe = b.groupe_whatsapp_origine ? 'Groupe: ' + b.groupe_whatsapp_origine : '';

    return [
      '---',
      '🏠 *' + (b.ref_bien || 'N/A') + '* | ' + (b.type_offre || '') + ' | ' + (b.type_de_bien || ''),
      '📍 ' + [b.commune, b.quartier, b.zone_geographique].filter(Boolean).join(', '),
      '💰 Prix: ' + (b.prix || 'Non communiqué'),
      '🛏️ Pièces: ' + chambres + meuble,
      '📝 Caractéristiques: ' + (b.caracteristiques || 'Non précisé'),
      '📞 Contact: ' + (b.telephone_bien || b.telephone_expediteur || 'Non disponible'),
      '👤 Publié par: ' + (b.publie_par || b.expediteur || 'Inconnu'),
      datePubli ? '📅 Date: ' + datePubli : '',
      groupe,
      image
    ].filter(Boolean).join('\\n');
  }).join('\\n\\n');

  return 'Résultats (' + biens.length + ' bien(s) trouvé(s)):\\n\\n' + resultats + '\\n\\n[Pour une visite, citez le REF du bien]';

} catch(err) {
  return 'Exception dans l\\'outil: ' + err.message + ' | ' + (err.stack || '').substring(0, 150);
}`;

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  const node = wf.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
  if (!node) { console.log('Tool node not found'); return; }

  const newParams = JSON.parse(JSON.stringify(node.parameters));
  newParams.jsCode = NEW_TOOL_CODE;

  wf.nodes = wf.nodes.map(function(n) {
    return n.name === 'Outil Recherche Annonces' ? Object.assign({}, n, { parameters: newParams }) : n;
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
    const check = put.body.nodes.find(function(n) { return n.name === 'Outil Recherche Annonces'; });
    const code = check && check.parameters && check.parameters.jsCode;
    console.log('Has neq.Non:', code && code.includes('disponible=neq.Non') ? 'YES' : 'NO');
    console.log('Has neq.false:', code && code.includes('disponible=neq.false') ? 'YES' : 'NO');
    console.log('Has try-catch:', code && code.includes('try {') ? 'YES' : 'NO');
    console.log('No parentheses filter:', code && !code.includes('not.or=(') ? 'YES' : 'NO');

    const act = await req('POST', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0/activate', null);
    console.log('Active:', act.body.active);
    console.log('Done.');
  } else {
    console.log('Error:', JSON.stringify(put.body).substring(0, 400));
  }
})();
