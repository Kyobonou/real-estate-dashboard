const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('Bogbes multi service.json'));
const ptAgent = wf.nodes.find(n => n.name === 'Post Traitement Agent');

if (ptAgent) {
    let code = ptAgent.parameters.jsCode;

    // Change select=ref_bien to select=ref_bien,telephone_bien,telephone_expediteur
    code = code.replace(/select=ref_bien'/g, "select=ref_bien,telephone_bien,telephone_expediteur'");

    // Where we read bens[0].ref_bien, let's also read the contact
    code = code.replace(
        "if (Array.isArray(biens) && biens.length > 0 && biens[0].ref_bien) { ref_bien = biens[0].ref_bien; }",
        "if (Array.isArray(biens) && biens.length > 0 && biens[0].ref_bien) { ref_bien = biens[0].ref_bien; contact_prop = biens[0].telephone_bien || biens[0].telephone_expediteur || ''; }"
    );

    // Add initialization for contact_prop if not present
    if (!code.includes('let contact_prop =') && !code.includes('var contact_prop =')) {
        code = code.replace("let ref_bien = norm.messageBody", "let contact_prop = '';\nlet ref_bien = norm.messageBody");
    }

    // In the regex try block, add a fetch for the exact ref to get the contact if we matched a ref
    const refMatchBlock = `
    const m = RegExp(regexStr, 'i').exec(norm.messageBody);
    if (m) {
      ref_bien = m[0].trim().toUpperCase();
      try {
        const { data } = await this.helpers.axios({
            method: 'GET',
            url: SUPABASE_URL + '/rest/v1/locaux?ref_bien=eq.' + encodeURIComponent(ref_bien) + '&select=telephone_bien,telephone_expediteur',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        if (data && data.length > 0) {
            contact_prop = data[0].telephone_bien || data[0].telephone_expediteur || '';
        }
      } catch(e) {}
    }
    `;
    code = code.replace(/const m = RegExp\(regexStr, 'i'\)\.exec\(norm\.messageBody\);\s*if \(m\) \{ ref_bien = m\[0\]\.trim\(\)\.toUpperCase\(\); \}/s, refMatchBlock);

    // Update the return object to use contact_prop instead of ''
    code = code.replace(/contact_proprietaire: ''/g, "contact_proprietaire: contact_prop");
    code = code.replace(/contact_proprietaire: \'\'/g, "contact_proprietaire: contact_prop");

    ptAgent.parameters.jsCode = code;

    // Also fix Sauvegarder Visite just in case it missed something
    const svNode = wf.nodes.find(n => n.name === 'Sauvegarder Visite');
    if (svNode) {
        svNode.parameters.jsonBody = "={{ JSON.stringify({\n  numero: $json.prospect_numero,\n  nom_prenom: $json.prospect_nom,\n  ref_bien: $json.ref_bien,\n  local_interesse: $json.bien_description,\n  contact_proprietaire: $json.contact_proprietaire || '',\n  date_rv: \"A planifier\",\n  visite_prog: \"Oui\",\n  created_at: new Date().toISOString()\n}) }}";
    }

    fs.writeFileSync('Bogbes multi service.json', JSON.stringify(wf, null, 2));
    console.log('Fixed contact_proprietaire resolution in Post Traitement Agent');

    // Upload via API to keep in sync
    const https = require('https');
    const payload = JSON.stringify({
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
        meta: wf.meta,
        tags: wf.tags
    });
    const req = https.request('https://yobed-n8n-supabase-claude.hf.space/api/v1/workflows/' + (wf.id || 'LTZJrc7tYwv6Qm6a5wtZ0'), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ'
        }
    }, res => {
        console.log(`Pushed to n8n. Status: ${res.statusCode}`);
    });

    req.on('error', e => console.error(e));
    req.write(payload);
    req.end();
}
