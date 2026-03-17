import fs from 'fs';

const WF_PATH = 'Bogbes multi service.json';

const NODE_CODE = `// ============================================================
// UPLOADER IMAGE ANNONCE - Décrypter, uploader, lier au bien
// ============================================================
const d = $input.first().json;
const src = $('Preparer Filtrer Groupe').first().json;

// Si pas d'image dans ce message, passer directement
if (!src.has_image || !src.imageMessage) {
  console.log('Uploader Image: pas d image, skip');
  return [{ json: d }];
}

const ref_bien = d.ref_bien || d.existing_ref || '';
if (!ref_bien) {
  console.log('Uploader Image: ref_bien manquant, skip');
  return [{ json: d }];
}

const WASENDER_KEY = 'd5c9e3e991ef6c1032622dea850799388f52e917f8e2dae3351459c1f447f5cd';
const IMGBB_KEY = '9f8a1a2b1ec266006878b8e5e20f713e';
const SUPABASE_URL = 'https://udyfhzyvalansmhkynnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWZoenl2YWxhbnNtaGt5bm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NjM1NywiZXhwIjoyMDg2NzcyMzU3fQ.XToUDvcD-crlO0bA8HuJ5g1GjhqTl790fHG6H8bujAk';

let lien_image = '';

try {
  // Etape 1: Decrypter l image via WaSender
  let publicUrl = '';
  try {
    const decryptResp = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://www.wasenderapi.com/api/decrypt-media',
      headers: { 'Authorization': 'Bearer ' + WASENDER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { messages: { key: { id: src.messageId }, message: { imageMessage: src.imageMessage } } }
      }),
      timeout: 30000
    });
    publicUrl = decryptResp.publicUrl || decryptResp.data?.publicUrl || '';
    console.log('Uploader Image: URL decryptee =', publicUrl ? 'OK' : 'VIDE');
  } catch(e) {
    console.log('Uploader Image: decrypt echoue:', e.message);
  }

  if (!publicUrl) {
    return [{ json: { ...d, lien_image: '' } }];
  }

  // Etape 2: Telecharger l image en binaire
  let imgData = null;
  try {
    imgData = await this.helpers.httpRequest({
      method: 'GET',
      url: publicUrl,
      encoding: 'arraybuffer',
      timeout: 30000
    });
  } catch(e) {
    console.log('Uploader Image: telechargement echoue:', e.message);
  }

  if (!imgData) {
    return [{ json: { ...d, lien_image: '' } }];
  }

  // Etape 3a: Essayer ImgBB si cle disponible
  if (IMGBB_KEY !== 'VOTRE_CLE_IMGBB') {
    try {
      const base64 = Buffer.from(imgData).toString('base64');
      const imgbbResp = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.imgbb.com/1/upload?key=' + IMGBB_KEY,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'image=' + encodeURIComponent(base64),
        timeout: 30000
      });
      lien_image = (imgbbResp.data?.display_url || imgbbResp.data?.url || '').replace(/\\/g, '');
      console.log('Uploader Image: ImgBB OK ->', lien_image ? 'URL' : 'ECHEC');
    } catch(e) {
      console.log('Uploader Image: ImgBB echoue:', e.message);
    }
  }

  // Etape 3b: Fallback Supabase Storage
  if (!lien_image) {
    try {
      const fileName = ref_bien.replace(/[^a-zA-Z0-9-_]/g, '_') + '_' + Date.now() + '.jpg';
      const uploadResp = await this.helpers.httpRequest({
        method: 'POST',
        url: SUPABASE_URL + '/storage/v1/object/biens-images/' + fileName,
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true'
        },
        body: Buffer.from(imgData),
        timeout: 30000
      });
      lien_image = SUPABASE_URL + '/storage/v1/object/public/biens-images/' + fileName;
      console.log('Uploader Image: Supabase Storage OK ->', fileName);
    } catch(e) {
      console.log('Uploader Image: Supabase Storage echoue:', e.message);
    }
  }

  // Etape 4: PATCH locaux.lien_image
  if (lien_image && ref_bien) {
    try {
      await this.helpers.httpRequest({
        method: 'PATCH',
        url: SUPABASE_URL + '/rest/v1/locaux?ref_bien=eq.' + encodeURIComponent(ref_bien),
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ lien_image }),
        timeout: 10000
      });
      console.log('Image liee au bien:', ref_bien);
    } catch(e) {
      console.log('Uploader Image: PATCH locaux echoue:', e.message);
    }
  }

} catch(e) {
  console.log('Uploader Image Annonce erreur globale:', e.message);
}

return [{ json: { ...d, lien_image } }];`;

const NEW_NODE = {
    parameters: { jsCode: NODE_CODE },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-41608, -4032],
    id: 'img-uploader-annonce-v1',
    name: 'Uploader Image Annonce',
    onError: 'continueRegularOutput'
};

try {
    let wf = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));
    const nodeNames = wf.nodes.map(n => n.name);
    if (nodeNames.includes('Uploader Image Annonce')) {
        wf.nodes = wf.nodes.map(n => n.name === 'Uploader Image Annonce' ? { ...n, parameters: { jsCode: NODE_CODE } } : n);
    } else {
        wf.nodes.push(NEW_NODE);
    }

    const conn = wf.connections;
    ['Inserer Nouvelle Annonce', 'Renouveler ou Reactiver'].forEach(srcNode => {
        if (conn[srcNode] && conn[srcNode].main) {
            conn[srcNode].main.forEach(outputs => {
                outputs.forEach(link => {
                    if (link.node === 'Sauvegarder Publication') {
                        link.node = 'Uploader Image Annonce';
                        console.log('Rerouted', srcNode);
                    }
                });
            });
        }
    });

    conn['Uploader Image Annonce'] = {
        main: [[{ node: 'Sauvegarder Publication', type: 'main', index: 0 }]]
    };

    fs.writeFileSync(WF_PATH, JSON.stringify(wf, null, 2), 'utf8');
} catch (err) {
    console.error(err);
}
