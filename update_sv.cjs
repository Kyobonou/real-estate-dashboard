const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:/Users/WILFRIED/.gemini/antigravity/brain/cf802689-fca4-4b84-804f-be8f9e05bfee/.system_generated/steps/300/output.txt'));
const node = wf.data.nodes.find(n => n.name === 'Sauvegarder Visite');
node.parameters.jsonBody = '={{ JSON.stringify({ numero: $json.prospect_numero||"", nom_prenom: $json.prospect_nom||"", ref_bien: $json.ref_bien||"", local_interesse: ($json.bien_details||"").substring(0,500), date_rv: "À planifier", visite_prog: "Oui", created_at: new Date().toISOString() }) }}';

fs.writeFileSync('node_dump_sv.json', JSON.stringify([{
    nodeName: 'Sauvegarder Visite',
    type: 'updateNode',
    updates: { parameters: node.parameters }
}]));
