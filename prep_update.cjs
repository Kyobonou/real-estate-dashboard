const fs = require('fs');
const fileContent = fs.readFileSync('C:/Users/WILFRIED/.gemini/antigravity/brain/39bd940f-1ec6-492e-be6d-c3493a698173/.system_generated/steps/271/output.txt', 'utf8');
const wfRaw = JSON.parse(fileContent);
const wf = (wfRaw.data && wfRaw.data.nodes) ? wfRaw.data : wfRaw;

const svNode = wf.nodes.find(n => n.name === 'Sauvegarder Visite');
svNode.parameters.jsonBody = "={{ JSON.stringify({ numero:$json.prospect_numero, nom_prenom:$json.prospect_nom, ref_bien:$json.ref_bien, local_interesse:$json.bien_description, date_rv:'A planifier', visite_prog:'Oui', created_at:new Date().toISOString() }) }}";

fs.writeFileSync('wf_to_update.json', JSON.stringify({
    operations: [{
        type: 'updateNode',
        nodeName: 'Sauvegarder Visite',
        updates: {
            parameters: svNode.parameters
        }
    }]
}, null, 2));
console.log('done');
