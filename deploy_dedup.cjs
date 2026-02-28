const fs = require('fs');
const https = require('https');

const refSrc = fs.readFileSync('workflows/fix_deploy_final.cjs', 'utf8');
const apikeyMatch = refSrc.match(/const API_KEY = '([^']+)'/);
const API_KEY = apikeyMatch[1];
console.log('Got API KEY');

function req(method, path, data) {
    return new Promise((resolve, reject) => {
        const dataStr = data ? JSON.stringify(data) : '';
        const options = {
            hostname: 'yobed-n8n-supabase-claude.hf.space',
            port: 443,
            path: '/api/v1' + path,
            method: method,
            headers: {
                'X-N8n-Api-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        };
        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(dataStr);
        }

        const request = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
                } else {
                    console.log('[ERROR] limit body:', body.substring(0, 500));
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        request.on('error', reject);
        if (data) request.write(dataStr);
        request.end();
    });
}

async function main() {
    try {
        const wfRes = await req('GET', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0');
        const wf = wfRes.body;
        console.log('Fetched workflow:', wf.name);

        const targetNode = wf.nodes.find(n => n.name === 'Decider Action');
        if (!targetNode) {
            console.log('Decider Action node not found');
            return;
        }

        // UPDATE JS CODE
        targetNode.parameters.jsCode = fs.readFileSync('temp_decider_new.js', 'utf8');

        // PUT REQUEST
        const payload = {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: {}
        };

        console.log('Sending PUT to update workflow...');
        const putRes = await req('PUT', '/workflows/LTZJrc7tYwv6Qm6a5wtZ0', payload);
        console.log('Success! ID:', putRes.body.id);
    } catch (e) {
        console.error('Error in main:', e.message);
    }
}

main();
