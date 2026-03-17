const fs = require('fs');
const fileContent = fs.readFileSync('C:/Users/WILFRIED/.gemini/antigravity/brain/39bd940f-1ec6-492e-be6d-c3493a698173/.system_generated/steps/271/output.txt', 'utf8');
const wfRaw = JSON.parse(fileContent);
const wf = (wfRaw.data && wfRaw.data.nodes) ? wfRaw.data : wfRaw;

let operations = [];

// 1. Fix Normaliser Filtrer Anti-Boucle
const normaliser = wf.nodes.find(n => n.name === 'Normaliser Filtrer Anti-Boucle');
if (normaliser) {
    let code = normaliser.parameters.jsCode;

    // Wrap entire script in a function and return its result, effectively neutralizing
    // any static analysis issue where the last expression evaluates to a primitive 
    // (like assignment or function call in catch block).
    // Also replace `\!` if it exists.
    code = code.replace(/\\!/g, '!');
    code = `function mainTask() {\n${code}\n}\nreturn mainTask();`;
    operations.push({ type: 'updateNode', nodeName: 'Normaliser Filtrer Anti-Boucle', updates: { parameters: { jsCode: code } } });
}

// 2. Fix Parser IA REF Hash
const parser = wf.nodes.find(n => n.name === 'Parser IA REF Hash');
if (parser) {
    let code = parser.parameters.jsCode;
    code = code.replace(/\}\}\];/g, '} } ];'); // fix expression brackets
    code = `function mainTask() {\n${code}\n}\nreturn mainTask();`;
    operations.push({ type: 'updateNode', nodeName: 'Parser IA REF Hash', updates: { parameters: { jsCode: code } } });
}

// 3. Fix Post Traitement Agent
const postTrait = wf.nodes.find(n => n.name === 'Post Traitement Agent');
if (postTrait) {
    let code = postTrait.parameters.jsCode;
    code = code.replace(/\}\}\];/g, '} } ];'); // fix expression brackets
    code = `function mainTask() {\n${code}\n}\nreturn mainTask();`;
    operations.push({ type: 'updateNode', nodeName: 'Post Traitement Agent', updates: { parameters: { jsCode: code } } });
}

// 4. Fix Decider Action
const decider = wf.nodes.find(n => n.name === 'Decider Action');
if (decider) {
    let code = decider.parameters.jsCode;
    code = `async function mainTask() {\n${code}\n}\nreturn await mainTask();`;
    operations.push({ type: 'updateNode', nodeName: 'Decider Action', updates: { parameters: { jsCode: code } } });
}

// 5. Fix recherche_biens tool
const recherche = wf.nodes.find(n => n.name === 'recherche_biens');
if (recherche) {
    const p = { ...recherche.parameters };
    if (!p.toolDescription) p.toolDescription = 'Permet de rechercher des biens immobiliers dans la base de données selon des critères comme la commune, le type de bien, ou le budget.';
    operations.push({ type: 'updateNode', nodeName: 'recherche_biens', updates: { parameters: p } });
}

fs.writeFileSync('wf_autofix.json', JSON.stringify({ operations }, null, 2));
console.log('generated wf_autofix.json', operations.length);
