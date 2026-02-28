const https = require('https');
const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

function get(path) {
  return new Promise(function(resolve, reject) {
    let d = '';
    https.get({ hostname: 'udyfhzyvalansmhkynnc.supabase.co', path: path, headers: { apikey: K, Authorization: 'Bearer ' + K, Prefer: 'count=exact' } }, function(r) {
      r.on('data', function(c) { d += c; });
      r.on('end', function() { resolve({ body: JSON.parse(d), headers: r.headers }); });
    }).on('error', reject);
  });
}

(async function() {
  // 1. Total count in locaux
  const total = await get('/rest/v1/locaux?select=id&limit=1');
  console.log('Content-Range:', total.headers['content-range']);

  // 2. Simulate exact tool query: last 150 rows by date_publication desc
  const FIELDS = 'ref_bien,type_de_bien,commune,quartier,prix,chambre,disponible,status,date_expiration';
  const top150 = await get('/rest/v1/locaux?select=' + FIELDS + '&order=date_publication.desc&limit=150');
  const biens = top150.body;
  console.log('Rows fetched (limit 150):', biens.length);

  // 3. Apply same filter as tool
  const now = new Date();
  const filtered = biens.filter(function(b) {
    if (!b) return false;
    if (['non','false'].includes(String(b.disponible||'').toLowerCase())) return false;
    if (['archived','expired','supprime','pending_confirm'].includes(String(b.status||'').toLowerCase())) return false;
    if (b.date_expiration && new Date(b.date_expiration) < now) return false;
    if (!b.type_de_bien || !b.commune) return false;
    return true;
  });
  console.log('After filter:', filtered.length);

  // 4. Score for "villa basse cocody"
  const COMMUNES = {
    'cocody':['cocody','coco'],'yopougon':['yopougon','yopo'],
    'marcory':['marcory'],'bingerville':['bingerville'],
    'riviera':['riviera','rivi'],'angre':['angre'],
    'danga':['danga'],'bonoumin':['bonoumin']
  };
  const TYPES = {
    'villa':['villa'],'appartement':['appartement','appart'],
    'duplex':['duplex'],'studio':['studio']
  };

  const q = 'villa basse a cocody';
  var critCommune = '', critType = '';
  for (var c in COMMUNES) { if (COMMUNES[c].some(function(v){return q.includes(v);})) {critCommune=c;break;} }
  for (var t in TYPES) { if (TYPES[t].some(function(v){return q.includes(v);})) {critType=t;break;} }
  console.log('critCommune:', critCommune, '| critType:', critType);

  var scored = filtered.map(function(b) {
    var score = 0;
    var bLoc = [b.commune,b.quartier].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    var bT = (b.type_de_bien||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (critCommune && COMMUNES[critCommune].some(function(v){return bLoc.includes(v);})) score+=40;
    if (critType && TYPES[critType] && (TYPES[critType].some(function(v){return bT.includes(v);})||bT.includes(critType))) score+=40;
    return {b:b, score:score};
  });

  var top = scored.filter(function(r){return r.score>0;});
  console.log('\nBiens avec score > 0:', top.length);

  // Show Cocody villas in top
  var cocVillas = top.filter(function(r){return (r.b.commune||'').toLowerCase().includes('cocody') && (r.b.type_de_bien||'').toLowerCase().includes('villa');});
  console.log('Villas Cocody dans top:', cocVillas.length);
  cocVillas.slice(0,5).forEach(function(r){
    console.log(' ', r.b.ref_bien, '|', r.b.type_de_bien, '|', r.b.commune, '|', r.b.prix, '| score:', r.score);
  });

  // Show any villa basse in top150?
  console.log('\nTous les villa basse dans les 150 derniers:');
  biens.filter(function(b){return (b.type_de_bien||'').toLowerCase().includes('villa basse');}).forEach(function(b){
    console.log(' ', b.ref_bien, '|', b.commune, '|', b.disponible, '|', b.status, '|', 'exp:', b.date_expiration);
  });
})();
