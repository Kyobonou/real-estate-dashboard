const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('Bogbes multi service.json'));
const node = wf.nodes.find(n => n.name === 'Sauvegarder Visite');
if (node && node.parameters) {
    node.parameters.jsonBody = "={{ JSON.stringify({ numero: $json.prospect_numero, nom_prenom: $json.prospect_nom, ref_bien: $json.ref_bien, local_interesse: $json.bien_description, contact_proprietaire: $json.contact_proprietaire, date_rv: \"A planifier\", visite_prog: \"Oui\", created_at: new Date().toISOString() }) }}";
    fs.writeFileSync('Bogbes multi service.json', JSON.stringify(wf, null, 2));
    console.log('Fixed visit node');
} else {
    console.log('Node not found');
}
