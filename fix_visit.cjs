const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('Bogbes multi service.json', 'utf8'));

// 1. Post Traitement Agent
const postTrait = wf.nodes.find(n => n.name === 'Post Traitement Agent');
let postJs = postTrait.parameters.jsCode;
postJs = postJs.replace('select=ref_bien', 'select=ref_bien,telephone_bien,telephone_expediteur');
postJs = postJs.replace('if (Array.isArray(biens) && biens.length > 0 && biens[0].ref_bien) { ref_bien = biens[0].ref_bien; }',
    `if (Array.isArray(biens) && biens.length > 0 && biens[0].ref_bien) { 
  ref_bien = biens[0].ref_bien; 
  contact_proprietaire = biens[0].telephone_bien || biens[0].telephone_expediteur || '';
}`);
postJs = postJs.replace("let ref_bien = '';", "let ref_bien = '';\nlet contact_proprietaire = '';");
postJs = postJs.replace(/ref_bien,\n\s*bien_description:/, "ref_bien, contact_proprietaire, bien_description:"); // adjust replace pattern inside object literal
postJs = postJs.replace(/ref_bien,\s*bien_description:/, "ref_bien, contact_proprietaire, bien_description:");
postTrait.parameters.jsCode = postJs;

// 2. Sauvegarder Visite
const sauvg = wf.nodes.find(n => n.name === 'Sauvegarder Visite');
const jsonBody = sauvg.parameters.jsonBody;
// Inject contact_proprietaire before date_visite if not present
let newJsonBody = jsonBody;
if (!newJsonBody.includes('contact_proprietaire')) {
    newJsonBody = newJsonBody.replace(/local_interesse:\$json\.bien_description,/, 'local_interesse:$json.bien_description, contact_proprietaire:$json.contact_proprietaire,');
    sauvg.parameters.jsonBody = newJsonBody;
}

fs.writeFileSync('Bogbes multi service.json', JSON.stringify(wf, null, 2));
console.log('Modified local JSON for Visit Data');
