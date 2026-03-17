const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:/Users/WILFRIED/.gemini/antigravity/brain/cf802689-fca4-4b84-804f-be8f9e05bfee/.system_generated/steps/253/output.txt'));

['Preparer Filtrer Groupe', 'Parser Extraction IA', 'Inserer Nouvelle Annonce'].forEach(name => {
    const node = wf.data.nodes.find(n => n.name === name);
    if (!node) return console.log(name, 'NOT FOUND');
    const param = node.parameters.jsCode || node.parameters.jsonBody;
    fs.writeFileSync(`node_${name.replace(/ /g, '_')}.txt`, param || '');
});
