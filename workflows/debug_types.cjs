const https = require('https');
const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';
let d = '';
https.get({
  hostname: 'udyfhzyvalansmhkynnc.supabase.co',
  path: '/rest/v1/locaux?type_de_bien=ilike.*duplex*&select=ref_bien,type_de_bien,commune,quartier,chambre,prix,date_publication&order=date_publication.desc&limit=50',
  headers: { apikey: K, 'Authorization': 'Bearer ' + K }
}, r => {
  r.on('data', c => d += c);
  r.on('end', () => {
    const rows = JSON.parse(d);
    console.log('Total rows:', rows.length);

    // Unique types
    const types = {};
    rows.forEach(r => { types[r.type_de_bien] = (types[r.type_de_bien] || 0) + 1; });
    console.log('\nTypes found:');
    Object.entries(types).forEach(([k, v]) => console.log(' ', JSON.stringify(k), '->', v, 'rows'));

    // Show the Cocody duplex from user's dashboard - check if it's in limit 50
    console.log('\nLooking for DPX-COC-39757F58 (650M, 18:22):');
    const target = rows.find(r => r.ref_bien === 'DPX-COC-39757F58');
    console.log(target ? 'FOUND at position ' + rows.indexOf(target) : 'NOT FOUND (beyond limit 50)');

    // Simulate the dedup
    rows.sort(function(a, b) {
      if (a.commune && !b.commune) return -1;
      if (!a.commune && b.commune) return 1;
      return 0;
    });

    var seen = {};
    var deduped = rows.filter(function(b) {
      var q = (b.quartier || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
      var key = [
        (b.prix || '').replace(/[^0-9]/g, '').substring(0, 10),
        (b.chambre || '').replace(/[^0-9]/g, ''),
        (b.type_de_bien || '').toLowerCase().substring(0, 5),
        q
      ].join('|');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    console.log('\nAfter dedup:', deduped.length, 'unique entries');
    console.log('Top 5:');
    deduped.slice(0, 5).forEach((b, i) =>
      console.log(' ' + (i+1) + '.', b.ref_bien, '|', JSON.stringify(b.type_de_bien), '|', b.commune, '|', b.chambre, 'ch |', b.prix)
    );
  });
});
