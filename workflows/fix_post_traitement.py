import json, sys, requests
sys.stdout.reconfigure(encoding='utf-8')

path = r"c:\Users\WILFRIED\OneDrive - Gravel Ivoire\Bureau\Files Anti\real-estate-dashboard\workflows\Bogbe's multi service.json"

with open(path, 'r', encoding='utf-8') as f:
    wf = json.load(f)

POST_TRAITEMENT_CODE = """let contact_prop = '';

const envoi = $('Preparer Envoi').first().json;
const norm = $('Normaliser Filtrer Anti-Boucle').first().json;

let ref_bien = '';

// Always lookup REF from Supabase to guarantee it matches locaux table
if (envoi.bien_description && envoi.bien_description !== 'Non précisé') {
  try {
    const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

    // Parse bien_description: 'type | commune | quartier | prix'
    const parts = envoi.bien_description.split('|').map(s => s.trim());
    const typeBien = parts[0] || '';
    const commune  = parts[1] || '';
    const prixStr  = parts[3] || '';
    const prixNum  = prixStr.replace(/[^0-9]/g, '');

    if (typeBien && commune) {
      const url = SUPABASE_URL + '/rest/v1/locaux'
        + '?type_de_bien=ilike.*' + encodeURIComponent(typeBien) + '*'
        + '&commune=ilike.*' + encodeURIComponent(commune) + '*'
        + '&status=neq.archived'
        + '&order=date_publication.desc'
        + '&limit=5'
        + '&select=ref_bien,telephone_bien,telephone_expediteur,prix';

      const biens = await this.helpers.httpRequest({
        method: 'GET', url,
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });

      if (Array.isArray(biens) && biens.length > 0) {
        let match = null;
        if (prixNum) {
          match = biens.find(b => (b.prix || '').replace(/[^0-9]/g, '') === prixNum);
        }
        if (!match) match = biens[0];

        ref_bien = match.ref_bien || '';
        contact_prop = match.telephone_bien || match.telephone_expediteur || '';
        console.log('REF Supabase:', ref_bien, '| Contact:', contact_prop);
      }
    }
  } catch(e) { console.log('Erreur lookup REF:', e.message); }
}

return [{ json: {
  cleanOutput: envoi.text,
  hasVisite: envoi.hasVisite,
  hasPhotoRequest: envoi.hasPhotoRequest,
  demandeImages: envoi.demandeImages,
  ref_bien,
  bien_description: envoi.bien_description || '',
  contact_proprietaire: contact_prop,
  prospect_numero: envoi.prospect_numero || norm.cleanNumber || norm.replyTo,
  prospect_nom: envoi.prospect_nom || norm.pushName || '',
  logEntry: {
    numero_prospect: envoi.prospect_numero || norm.cleanNumber || norm.replyTo,
    nom_prospect: envoi.prospect_nom || norm.pushName || '',
    message_entrant: (norm.messageBody || '').substring(0, 500),
    reponse_agent: (envoi.text || '').substring(0, 500),
    ref_mentionne: ref_bien,
    visite_detectee: envoi.hasVisite,
    photo_request: envoi.hasPhotoRequest,
    horodatage: new Date().toISOString()
  }
}}];"""

changed = False
for n in wf['nodes']:
    if n['name'] == 'Post Traitement Agent':
        n['parameters']['jsCode'] = POST_TRAITEMENT_CODE
        changed = True
        print('Fixed: Post Traitement Agent')

if not changed:
    print('ERROR: node not found')
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
print('Saved.')

API_URL = 'https://yobed-n8n-supabase-claude.hf.space/api/v1/workflows/LTZJrc7tYwv6Qm6a5wtZ0'
API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwNDg4MjQwfQ.0fFaf7rPNdxP8swXVBDuEwcOokRZ3HaR4NDWPew8oiM'
payload = {
    'name': wf.get('name'),
    'nodes': wf.get('nodes', []),
    'connections': wf.get('connections', {}),
    'settings': {'executionOrder': 'v1'}
}
resp = requests.put(API_URL, json=payload, headers={'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json'}, timeout=30)
print('Push:', resp.status_code, 'OK' if resp.status_code == 200 else resp.text[:200])
