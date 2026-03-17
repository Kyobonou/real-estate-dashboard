import json, sys, requests
sys.stdout.reconfigure(encoding='utf-8')

path = r"c:\Users\WILFRIED\OneDrive - Gravel Ivoire\Bureau\Files Anti\real-estate-dashboard\workflows\Bogbe's multi service.json"

with open(path, 'r', encoding='utf-8') as f:
    wf = json.load(f)

# Correct JS — $ signs intact via Python string (no shell interpolation)
FIXED_CODE = (
    "const text = ($input.first().json.text || '').trim().toLowerCase();\n"
    "const cleanNumber = $('Normaliser Filtrer Anti-Boucle').first().json.cleanNumber || '';\n"
    "// Renouvellement desactive via WhatsApp - tout passe par Eden\n"
    "return [{ json: { isRelanceReply: false, text, cleanNumber } }];"
)

changed = False
for n in wf['nodes']:
    if n['name'] == 'Reponse Relance?':
        n['parameters']['jsCode'] = FIXED_CODE
        changed = True
        print('Fixed: Reponse Relance?')

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
