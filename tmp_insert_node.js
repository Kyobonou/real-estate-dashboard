const d = $input.first().json;
const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

function san(val, maxLen) {
  if (val === null || val === undefined) return '';
  maxLen = maxLen || 2000;
  var s = String(val); var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) { i++; continue; }
    if (c >= 0xDC00 && c <= 0xDFFF) continue;
    if (c < 0x20 && c !== 0x0A && c !== 0x09) continue;
    if (c === 0xFEFF) continue;
    out += s[i];
  }
  return out.trim().substring(0, maxLen);
}

var body = {
  ref_bien: san(d.ref_bien), content_hash: san(d.content_hash),
  type_de_bien: san(d.type_de_bien), type_offre: san(d.type_offre),
  zone_geographique: san(d.zone_geographique), commune: san(d.commune),
  quartier: san(d.quartier), prix: san(d.prix), surface: san(d.surface),
  chambre: san(d.chambre), meubles: san(d.meubles) || 'Non',
  caracteristiques: san(d.caracteristiques, 1000),
  telephone_bien: san(d.telephone_bien), telephone_expediteur: san(d.telephone_expediteur),
  expediteur: san(d.expediteur), publie_par: san(d.publie_par),
  disponible: san(d.disponible) || 'Oui', status: 'active',
  groupe_whatsapp_origine: san(d.groupe_whatsapp_origine),
  groupe_whatsapp_jid: san(d.groupe_whatsapp_jid),
  message_initial: san(d.message_initial, 1500),
  publication_id: san(d.publication_id),
  date_publication: d.date_publication || new Date().toISOString(),
  date_expiration: d.date_expiration || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
  relance_count: 0, lien_image: ''
};

try {
  const result = await this.helpers.httpRequest({
    method: 'POST', url: SUPABASE_URL + '/rest/v1/locaux',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body), timeout: 10000
  });
  var inserted = null;
  if (typeof result === 'string') { try { var arr = JSON.parse(result); inserted = Array.isArray(arr) ? arr[0] : arr; } catch(e) {} }
  else if (Array.isArray(result)) { inserted = result[0]; }
  else { inserted = result; }
  console.log('INSERT OK - ref:', body.ref_bien);
  return [{ json: { success: true, inserted_id: inserted ? inserted.id : null, ref_bien: body.ref_bien, ...d } }];
} catch(e) {
  console.log('Erreur INSERT:', e.message);
  return [{ json: { success: false, error: e.message, ref_bien: body.ref_bien, ...d } }];
}