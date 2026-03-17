const fs = require('fs');
const oldWf = JSON.parse(fs.readFileSync('Bogbes multi service.json', 'utf8'));
const newWfData = JSON.parse(fs.readFileSync('production_workflow.json', 'utf8'));
const newWf = newWfData.data;
const oldNodes = new Map(oldWf.nodes.map(n => [n.name, n]));
const newNodes = new Map(newWf.nodes.map(n => [n.name, n]));
let differences = [];
for (const [name, newNode] of newNodes) {
    const oldNode = oldNodes.get(name);
    if (!oldNode) {
        differences.push(`+ Node added: ${name}`);
    } else {
        if (JSON.stringify(oldNode.parameters) !== JSON.stringify(newNode.parameters))
            differences.push(`~ Node modified: ${name} (parameters changed)`);
        if (oldNode.type !== newNode.type)
            differences.push(`~ Node modified: ${name} (type changed from ${oldNode.type} to ${newNode.type})`);
    }
}
for (const name of oldNodes.keys()) {
    if (!newNodes.has(name)) differences.push(`- Node removed: ${name}`);
}
if (differences.length === 0) {
    differences.push("No differences in nodes found.");
}
console.log(differences.join('\n'));
