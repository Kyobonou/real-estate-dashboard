const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'yobed-n8n-supabase-claude.hf.space',
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    };
    const r = https.request(opts, function(res) {
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

// Code du nœud Pré-filtrer avec les bons keywords CI et regex correctes
const newPrefilterCode = [
  "// Pré-filtrer: Est-ce vraiment une annonce immobilière?",
  "// Évite les appels OpenAI coûteux sur du spam/messages hors-sujet",
  "try {",
  "  const input = $input.first().json;",
  "  const msg = input.message || input.messageBody || input.text || '';",
  "",
  "  if (!msg || msg.length < 10) {",
  "    console.log('Message trop court, ignoré');",
  "    return [];",
  "  }",
  "",
  "  const realEstateKeywords = [",
  "    // Types de biens",
  "    'appartement', 'studio', 'chambre', 'maison', 'villa', 'duplex', 'triplex',",
  "    'terrain', 'bureau', 'magasin', 'boutique', 'entrepot', 'local', 'residence',",
  "    'parking', 'garage', 'immeuble', 'lot', 'lotissement', 'parcelle',",
  "    // Communes CI",
  "    'cocody', 'yopougon', 'marcory', 'koumassi', 'treichville', 'plateau', 'adjame',",
  "    'abobo', 'attecoube', 'port-bouet', 'bingerville', 'songon', 'anyama', 'bassam',",
  "    'assinie', 'abidjan', 'riviera', 'angre', 'calavi', 'bapro', 'jacqueville',",
  "    // Caractéristiques",
  "    'meuble', 'climatise', 'neuf', 'renove', 'securise', 'piscine',",
  "    'jardin', 'balcon', 'terrasse', 'cuisine', 'salle', 'viabilise',",
  "    // Termes transaction",
  "    'prix', 'fcfa', 'louer', 'vendre', 'location', 'vente', 'bail', 'disponible',",
  "    'annonce', 'offre', 'demande', 'negociable', 'nego',",
  "    // Surfaces (CI informel)",
  "    'm2', 'm²', 'hectare', 'ha',",
  "    // Prix informel CI (avec typos fréquentes)",
  "    'million', 'milion', 'millon', 'millions', 'milions', 'millons',",
  "    'mille', 'kfcfa'",
  "  ];",
  "",
  "  const msgLower = msg.toLowerCase();",
  "  const keywordCount = realEstateKeywords.filter(function(kw) { return msgLower.includes(kw); }).length;",
  "",
  "  // Détecter surface + prix = annonce immobilière quasi-certaine",
  "  const hasSurface = /\\d+\\s*m[²2]/i.test(msg);",
  "  const hasPrice = /\\d+\\s*(million|milion|millon|mille|fcfa|k)/i.test(msg);",
  "  const hasSurfaceAndPrice = hasSurface && hasPrice;",
  "",
  "  const isRealEstate = keywordCount >= 2 || hasSurfaceAndPrice;",
  "",
  "  if (!isRealEstate) {",
  "    console.log('Pas une annonce immobilière (score ' + keywordCount + ' keywords, surface+prix: ' + hasSurfaceAndPrice + ')');",
  "    return [];",
  "  }",
  "",
  "  console.log('Annonce immobilière détectée (' + keywordCount + ' keywords, surface+prix: ' + hasSurfaceAndPrice + ')');",
  "  return [{ json: input }];",
  "} catch(e) {",
  "  console.log('Pré-filtrer erreur:', e.message);",
  "  return [];",
  "}"
].join('\n');

// Test local avant d'envoyer
function testPrefilter(msg) {
  const realEstateKeywords = [
    'appartement', 'studio', 'chambre', 'maison', 'villa', 'duplex', 'triplex',
    'terrain', 'bureau', 'magasin', 'boutique', 'entrepot', 'local', 'residence',
    'parking', 'garage', 'immeuble', 'lot', 'lotissement', 'parcelle',
    'cocody', 'yopougon', 'marcory', 'koumassi', 'treichville', 'plateau', 'adjame',
    'abobo', 'attecoube', 'port-bouet', 'bingerville', 'songon', 'anyama', 'bassam',
    'assinie', 'abidjan', 'riviera', 'angre', 'calavi', 'bapro', 'jacqueville',
    'meuble', 'climatise', 'neuf', 'renove', 'securise', 'piscine',
    'jardin', 'balcon', 'terrasse', 'cuisine', 'salle', 'viabilise',
    'prix', 'fcfa', 'louer', 'vendre', 'location', 'vente', 'bail', 'disponible',
    'annonce', 'offre', 'demande', 'negociable', 'nego',
    'm2', 'm²', 'hectare', 'ha',
    'million', 'milion', 'millon', 'millions', 'milions', 'millons',
    'mille', 'kfcfa'
  ];
  const msgLower = msg.toLowerCase();
  const keywordCount = realEstateKeywords.filter(kw => msgLower.includes(kw)).length;
  const hasSurface = /\d+\s*m[²2]/i.test(msg);
  const hasPrice = /\d+\s*(million|milion|millon|mille|fcfa|k)/i.test(msg);
  const hasSurfaceAndPrice = hasSurface && hasPrice;
  const isRealEstate = keywordCount >= 2 || hasSurfaceAndPrice;
  return { keywordCount, hasSurface, hasPrice, hasSurfaceAndPrice, isRealEstate };
}

// Tests
const tests = [
  "J'ai 600 M2 acd a 45 milions adbtre ko 42 milions",
  "Villa 4 pièces à Cocody Riviera, 1,500,000 FCFA/mois",
  "Bonjour comment allez-vous?",
  "Terrain 500m2 viabilisé Anyama 15 millions",
  "J'ai un lot de 300m2 a 8 million a songon",
];
console.log('=== TESTS LOCAUX ===');
tests.forEach(msg => {
  const r = testPrefilter(msg);
  console.log(r.isRealEstate ? '✓ PASSE' : '✗ BLOQUE', `(${r.keywordCount} kw, s+p:${r.hasSurfaceAndPrice})`, '|', msg.substring(0, 50));
});

(async function() {
  const r = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', null);
  const wf = r.body;

  wf.nodes = wf.nodes.map(function(n) {
    if (n.name && n.name.includes('Pré-filtrer')) {
      console.log('\nUpdating:', n.name);
      return Object.assign({}, n, {
        parameters: Object.assign({}, n.parameters, { jsCode: newPrefilterCode })
      });
    }
    return n;
  });

  const s = wf.settings || {};
  const cleanSettings = {};
  ['executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow', 'timezone'].forEach(function(k) {
    if (s[k] !== undefined) cleanSettings[k] = s[k];
  });

  const putRes = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings
  });

  console.log('PUT status:', putRes.status);
  if (putRes.body && putRes.body.id) {
    const n = putRes.body.nodes.find(function(x) { return x.name && x.name.includes('Pré-filtrer'); });
    const lines = n.parameters.jsCode.split('\n');
    // Verify regex lines
    const regexLines = lines.filter(l => l.includes('hasSurface') || l.includes('hasPrice'));
    console.log('SUCCESS - Regex lines:');
    regexLines.forEach(l => console.log(' ', l.trim()));
  } else {
    console.log('Error:', JSON.stringify(putRes.body).substring(0, 300));
  }
})();
