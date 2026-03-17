const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/WILFRIED/.gemini/antigravity/brain/0a1bbb61-6425-4573-97b9-7fb1f284a36c/.system_generated/steps/442/output.txt', 'utf8'));
const prep = d.data.nodes.find(n => n.name === 'Preparer Envoi');

let code = prep.parameters.jsCode || prep.parameters.code;
code = code.replace(
    'if (agenceData.numero) prospect_numero = agenceData.numero;',
    'if (agenceData.numero && /\\d/.test(agenceData.numero) && !agenceData.numero.toLowerCase().includes("prospect")) prospect_numero = agenceData.numero;'
);

prep.parameters.jsCode = code;
if (prep.parameters.code) prep.parameters.code = code;

fs.writeFileSync('prep_update.json', JSON.stringify({ operations: [{ type: 'updateNode', nodeName: 'Preparer Envoi', parameters: prep.parameters }] }, null, 2));
