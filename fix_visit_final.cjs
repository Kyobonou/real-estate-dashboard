const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('Bogbes multi service.json'));
const node = wf.nodes.find(n => n.name === 'Sauvegarder Visite');

if (node && node.parameters) {
    node.parameters.jsonBody = "={{ JSON.stringify({ numero: $json.prospect_numero, nom_prenom: $json.prospect_nom, ref_bien: $json.ref_bien, local_interesse: $json.bien_description, contact_proprietaire: $json.contact_proprietaire, date_rv: \"A planifier\", visite_prog: \"Oui\", created_at: new Date().toISOString() }) }}";

    // Save locally
    fs.writeFileSync('Bogbes multi service.json', JSON.stringify(wf, null, 2));
    console.log('Fixed visit node locally.');

    // Upload via API to keep in sync
    const http = require('http');
    const https = require('https');
    const url = 'https://yobed-n8n-supabase-claude.hf.space/api/v1/workflows/' + (wf.id || 'LTZJrc7tYwv6Qm6a5wtZ0');

    const req = https.request(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'n8n_api_463b216503f44390637f90f230dafd4811a7c0628ade76c4caacfa073db5bbac935fcc4872cffb041c2c31e9c0c70ce3'
        }
    }, res => {
        console.log(`Pushed to n8n. Status: ${res.statusCode}`);
    });

    req.on('error', e => console.error(e));
    req.write(JSON.stringify(wf));
    req.end();
}
