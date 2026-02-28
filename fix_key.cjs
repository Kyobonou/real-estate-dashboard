const fs = require('fs');
const refSrc = fs.readFileSync('workflows/fix_deploy_final.cjs', 'utf8');
const apikeyMatch = refSrc.match(/const API_KEY = '([^']+)'/);
if (!apikeyMatch) throw new Error('API key not found');
const apikey = apikeyMatch[1];
const target = fs.readFileSync('deploy_dedup.cjs', 'utf8');
const updated = target.replace(/const API_KEY = '[^']+';/, `const API_KEY = '${apikey}';`);
fs.writeFileSync('deploy_dedup.cjs', updated);
console.log('Fixed API key');
