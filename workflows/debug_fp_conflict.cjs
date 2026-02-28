const https = require('https');
const SUPABASE_URL = 'udyfhzyvalansmhkynnc.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

// Get the fingerprint of APT-COC-4A62F4AB
const opts1 = {
    hostname: SUPABASE_URL,
    path: '/rest/v1/locaux?ref_bien=eq.APT-COC-4A62F4AB&select=ref_bien,message_initial,caracteristiques',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
};

let d = '';
https.get(opts1, r => {
    r.on('data', c => d += c);
    r.on('end', () => {
        const row = JSON.parse(d)[0];
        const desc = row.message_initial || row.caracteristiques || '';
        const fp = desc.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 250);
        console.log('Target FP (250 chars):', fp);
        console.log('FP length:', fp.length);

        // Now find ALL rows with this same fingerprint across the entire DB
        // Fetch all rows and check
        const opts2 = {
            hostname: SUPABASE_URL,
            path: '/rest/v1/locaux?select=ref_bien,id,commune,message_initial,caracteristiques&limit=1000',
            headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
        };
        let d2 = '';
        https.get(opts2, r2 => {
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
                const all = JSON.parse(d2);
                console.log('\nSearching across', all.length, 'total rows...');
                const matches = all.filter(p => {
                    const desc2 = p.message_initial || p.caracteristiques || '';
                    if (!desc2 || desc2.length <= 20) return false;
                    const fp2 = desc2.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 250);
                    return fp2 === fp;
                });
                console.log('\nRows with same text fingerprint:', matches.length);
                matches.forEach(p => console.log(' -', p.ref_bien, '| commune:', p.commune, '| id:', p.id));

                // Check if any of these has a different commune (would steal the FP slot)
                const diffCommune = matches.filter(p => p.commune !== 'Cocody');
                if (diffCommune.length > 0) {
                    console.log('\n⚠️  FOUND FP CONFLICT: These rows have same text but different commune:');
                    diffCommune.forEach(p => console.log(' -', p.ref_bien, '| commune:', p.commune, '| id:', p.id));
                } else {
                    console.log('\nNo FP conflict with other communes.');
                }
            });
        });
    });
});
