const fs = require('fs');
const fileContent = fs.readFileSync('C:/Users/WILFRIED/.gemini/antigravity/brain/39bd940f-1ec6-492e-be6d-c3493a698173/.system_generated/steps/271/output.txt', 'utf8');
const wfRaw = JSON.parse(fileContent);
const wf = (wfRaw.data && wfRaw.data.nodes) ? wfRaw.data : wfRaw;

// 1. Fix Normaliser Filtrer Anti-Boucle
const normaliser = wf.nodes.find(n => n.name === 'Normaliser Filtrer Anti-Boucle');
if (normaliser) {
    let code = normaliser.parameters.jsCode;
    code = code.replace(/\\!/g, '!');
    code = "function mainTask() {\n" + code + "\n}\nreturn mainTask();";
    normaliser.parameters.jsCode = code;
}

// 2. Fix Parser IA REF Hash
const parser = wf.nodes.find(n => n.name === 'Parser IA REF Hash');
if (parser) {
    let code = parser.parameters.jsCode;
    code = code.replace(/\}\}\];/g, '} } ];'); // fix expression brackets
    code = "function mainTask() {\n" + code + "\n}\nreturn mainTask();";
    parser.parameters.jsCode = code;
}

// 3. Fix Post Traitement Agent
const postTrait = wf.nodes.find(n => n.name === 'Post Traitement Agent');
if (postTrait) {
    let code = postTrait.parameters.jsCode;
    code = code.replace(/\}\}\];/g, '} } ];'); // fix expression brackets
    code = "function mainTask() {\n" + code + "\n}\nreturn mainTask();";
    postTrait.parameters.jsCode = code;
}

// 4. Fix Decider Action
const decider = wf.nodes.find(n => n.name === 'Decider Action');
if (decider) {
    let code = decider.parameters.jsCode;
    code = "async function mainTask() {\n" + code + "\n}\nreturn await mainTask();";
    decider.parameters.jsCode = code;
}

// 5. Fix recherche_biens tool
const recherche = wf.nodes.find(n => n.name === 'recherche_biens');
if (recherche) {
    if (!recherche.parameters.toolDescription) {
        recherche.parameters.toolDescription = 'Permet de rechercher des biens immobiliers dans la base de données selon des critères comme la commune, le type de bien, ou le budget.';
    }
}

fs.writeFileSync('Bogbes multi service FIXED.json', JSON.stringify(wf, null, 2));
console.log('Fixed file generated!');
