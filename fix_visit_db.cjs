const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('Bogbes multi service.json'));
const ptAgent = wf.nodes.find(n => n.name === 'Post Traitement Agent');

if (!ptAgent.parameters.jsCode.includes('contact_proprietaire')) {
    // Try to find the exact line to replace or append to the end of the return object
    ptAgent.parameters.jsCode = ptAgent.parameters.jsCode.replace(
        'bien_description: envoi.bien_description || \'\',',
        'bien_description: envoi.bien_description || \'\', contact_proprietaire: \'\','
    );

    fs.writeFileSync('Bogbes multi service.json', JSON.stringify(wf, null, 2));
    console.log('Added contact_proprietaire to Post Traitement Agent');
} else {
    console.log('contact_proprietaire is already in Post Traitement Agent');
}

const svNode = wf.nodes.find(n => n.name === 'Sauvegarder Visite');
if (svNode) {
    svNode.parameters.jsonBody = "={{ JSON.stringify({\n  numero: $json.prospect_numero,\n  nom_prenom: $json.prospect_nom,\n  ref_bien: $json.ref_bien,\n  local_interesse: $json.bien_description,\n  contact_proprietaire: $json.contact_proprietaire || '',\n  date_rv: \"A planifier\",\n  visite_prog: \"Oui\",\n  created_at: new Date().toISOString()\n}) }}";
    fs.writeFileSync('Bogbes multi service.json', JSON.stringify(wf, null, 2));
    console.log('Fixed Sauvegarder Visite');
}

// Upload via API to keep in sync
const http = require('http');
const https = require('https');
const url = 'https://yobed-n8n-supabase-claude.hf.space/api/v1/workflows/' + (wf.id || 'LTZJrc7tYwv6Qm6a5wtZ0');

const req = https.request(url, {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ'
    }
}, res => {
    console.log(`Pushed to n8n. Status: ${res.statusCode}`);
});

req.on('error', e => console.error(e));
req.write(JSON.stringify(wf));
req.end();
