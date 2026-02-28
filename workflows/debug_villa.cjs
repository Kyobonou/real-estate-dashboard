const https = require('https');
const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

function get(path) {
  return new Promise(function(resolve, reject) {
    let d = '';
    https.get({ hostname: 'udyfhzyvalansmhkynnc.supabase.co', path: path, headers: { apikey: K, Authorization: 'Bearer ' + K } }, function(r) {
      r.on('data', function(c) { d += c; });
      r.on('end', function() { resolve(JSON.parse(d)); });
    }).on('error', reject);
  });
}

(async function() {
  // 1. Toutes les villas
  const villas = await get('/rest/v1/locaux?type_de_bien=ilike.villa*&select=ref_bien,type_de_bien,commune,quartier,prix,chambre,disponible,status&order=date_publication.desc&limit=50');
  console.log('=== VILLAS (ilike.villa*) ===', villas.length, 'rows');
  villas.forEach(function(v) {
    console.log(' ', v.ref_bien, '|', JSON.stringify(v.type_de_bien), '|', v.commune, '|', v.quartier, '|', v.prix, '|', v.chambre, 'ch | dispo:', v.disponible, '| status:', v.status);
  });

  // 2. Toutes les villas avec prix entre 400M et 600M
  const budget = await get('/rest/v1/locaux?type_de_bien=ilike.villa*&prix=gte.400000000&prix=lte.600000000&select=ref_bien,type_de_bien,commune,prix,chambre&limit=20');
  console.log('\n=== VILLAS budget 400-600M ===', budget.length, 'rows');

  // 3. Prix stockés pour les villas - voir le format exact
  console.log('\n=== FORMAT PRIX des villas ===');
  villas.slice(0, 10).forEach(function(v) {
    console.log(' prix brut:', JSON.stringify(v.prix));
  });

  // 4. Villas disponibles à Cocody
  const cocody = await get('/rest/v1/locaux?type_de_bien=ilike.villa*&commune=ilike.*cocody*&select=ref_bien,type_de_bien,commune,quartier,prix,chambre,disponible&limit=20');
  console.log('\n=== VILLAS COCODY ===', cocody.length, 'rows');
  cocody.forEach(function(v) {
    console.log(' ', v.ref_bien, '|', JSON.stringify(v.type_de_bien), '|', v.commune, '|', v.prix, '| dispo:', v.disponible);
  });
})();
