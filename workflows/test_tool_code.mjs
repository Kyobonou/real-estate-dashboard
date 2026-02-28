// Simulate exact tool code execution for 'duplex 8 chambres cocody achat'
const query = 'duplex 8 chambres cocody 650 millions achat';

const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

const q = (query || '').toLowerCase().trim();

const SELECT_FIELDS = ['id','ref_bien','type_de_bien','type_offre','zone_geographique','commune','quartier','prix','chambre','meubles','caracteristiques','telephone_bien','telephone_expediteur','expediteur','publie_par','disponible','status','groupe_whatsapp_origine','lien_image','message_initial','date_publication','date_expiration','publication_id'].join(',');

const filters = [];
if (!q.includes('non disponible') && !q.includes('vendu') && !q.includes('loué')) {
  filters.push('not.or=(disponible.eq.Non,disponible.eq.false)');
}
const communes = [
  { variants: ['cocody'], value: 'Cocody' },
  { variants: ['yopougon', 'yopo'], value: 'Yopougon' },
  { variants: ['marcory'], value: 'Marcory' }
];
const communeTrouvee = communes.find(c => c.variants.some(v => q.includes(v)));
if (communeTrouvee) filters.push('commune=ilike.*' + encodeURIComponent(communeTrouvee.value) + '*');
const typesBien = ['villa','appartement','studio','duplex','triplex','maison','terrain','bureau','magasin','boutique','local','garage','immeuble','chambre'];
const typeTrouve = typesBien.find(t => q.includes(t));
if (typeTrouve) filters.push('type_de_bien=ilike.*' + encodeURIComponent(typeTrouve) + '*');
if (q.includes('vente') || q.includes('vendre') || q.includes('achat') || q.includes('acheter')) filters.push('type_offre=eq.Vente');
const chambreMatch = q.match(/(\d+)\s*(?:pièces?|chambres?|ch\b)/);
if (chambreMatch) filters.push('chambre=eq.' + chambreMatch[1]);

const baseUrl = SUPABASE_URL + '/rest/v1/locaux';
const queryParts = [...filters, 'select=' + SELECT_FIELDS, 'order=date_publication.desc', 'limit=15'];
const url = baseUrl + '?' + queryParts.join('&');

console.log('Filters applied:', filters);
console.log('URL:', url.substring(0, 250));

try {
  const response = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }
  });
  console.log('HTTP Status:', response.status, response.ok ? 'OK' : 'ERROR');
  if (!response.ok) {
    console.log('ERROR body:', await response.text());
  } else {
    const biens = await response.json();
    console.log('Results count:', biens.length);
    if (biens.length > 0) console.log('First result:', JSON.stringify(biens[0]).substring(0, 300));
  }
} catch(e) {
  console.log('EXCEPTION:', e.message);
}
