try {
  const raw = $input.first().json;
  const source = $('Preparer Filtrer Groupe').first().json;

  let extracted = {};
  try {
    const t = raw.output?.[0]?.content?.[0]?.text;
    extracted = typeof t === 'object' ? t : JSON.parse(typeof t === 'string' ? t : JSON.stringify(raw));
  } catch(e) { extracted = raw || {}; }

  // VALIDATION STRICTE: rejeter les annonces incomplètes
  const hasTypeBien = extracted.type_de_bien && extracted.type_de_bien.trim().length > 0;
  const hasCommune = extracted.commune && extracted.commune.trim().length > 0;
  const hasPrix = extracted.prix && extracted.prix.trim().length > 0;
  const hasTypeOffre = extracted.type_offre && extracted.type_offre.trim().length > 0;

  // Rejeter si données insuffisantes
  if (!hasTypeBien || !hasCommune) {
    console.log('REJETÉ: type_de_bien ou commune manquant. Données:', JSON.stringify(extracted).substring(0, 200));
    return [];
  }
  if (!hasPrix && !hasTypeOffre) {
    console.log('REJETÉ: prix et type_offre manquants');
    return [];
  }

  // Valider le prix (rejeter les prix aberrants)
  if (hasPrix) {
    const prixRaw = extracted.prix.toLowerCase();
    // Extraire valeur numérique
    const numMatch = prixRaw.match(/(\d[\d\s.,]*)/);
    if (numMatch) {
      const numStr = numMatch[1].replace(/[\s,]/g, '').replace('.', '');
      const num = parseInt(numStr);
      // Prix en FCFA: minimum 50 000 FCFA, maximum 5 milliards
      // Prix /m²: peut être plus bas mais pas moins de 1 000 FCFA/m²
      const isPerM2 = prixRaw.includes('/m') || prixRaw.includes('m²') || prixRaw.includes('m2') || prixRaw.includes('metre');
      const isMillion = prixRaw.includes('million') || prixRaw.includes('milion');
      let prixReel = num;
      if (isMillion) prixReel = num * 1000000;
      if (isPerM2) {
        if (prixReel < 1000) { console.log('REJETÉ: prix/m² aberrant:', prixReel); return []; }
      } else {
        if (prixReel < 50000 && !isMillion) { console.log('REJETÉ: prix trop bas:', prixReel, '| prix brut:', extracted.prix); return []; }
      }
    }
  }

  // Rejeter types de bien génériques ou invalides
  const typeValides = ['appartement','studio','chambre','maison','villa','duplex','triplex','terrain','bureau','magasin','boutique','entrepot','local','immeuble','parking','garage','penthouse','parcelle','lot'];
  const typeLow = extracted.type_de_bien.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const typeValide = typeValides.some(t => typeLow.includes(t));
  if (!typeValide) {
    console.log('REJETÉ: type_de_bien invalide:', extracted.type_de_bien);
    return [];
  }

  // Générer REF structurée
  const typeMap = {'appartement':'APT','studio':'STU','chambre':'CHB','maison':'MAS','villa':'VIL','duplex':'DPX','triplex':'TRX','terrain':'TER','parcelle':'PAR','lot':'LOT','bureau':'BUR','magasin':'MAG','boutique':'BTQ','local':'LOC','entrepot':'ENT','immeuble':'IMM','garage':'GAR','parking':'PRK','penthouse':'PNT'};
  const typeCode = Object.entries(typeMap).find(([k]) => typeLow.includes(k))?.[1] || null;
  if (!typeCode) { console.log('REJETÉ: impossible de coder le type:', extracted.type_de_bien); return []; }

  const commCode = extracted.commune.substring(0, 3).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const offreCode = (extracted.type_offre || '').toLowerCase().includes('vente') ? 'V' : 'L';
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  const ref_bien = typeCode + '-' + commCode + '-' + offreCode + '-' + rand;

  // Hash pour déduplication
  const hashInput = [
    typeLow,
    (extracted.prix || '').toLowerCase().replace(/\s/g, ''),
    (extracted.commune || '').toLowerCase(),
    (extracted.quartier || '').toLowerCase(),
    (extracted.chambre || '').toString(),
    (extracted.surface || '').toString(),
    (extracted.caracteristiques || '').substring(0, 150).toLowerCase().replace(/\s/g, '')
  ].join('|');

  let hash = 5381;
  for (let i = 0; i < hashInput.length; i++) hash = ((hash << 5) + hash + hashInput.charCodeAt(i)) & 0xFFFFFFFF;
  const content_hash = (hash >>> 0).toString(16).padStart(8, '0');

  const dateExp = new Date();
  dateExp.setDate(dateExp.getDate() + 30);

  console.log('ANNONCE VALIDEE:', ref_bien, '| Type:', extracted.type_de_bien, '| Commune:', extracted.commune, '| Prix:', extracted.prix);

  return [{ json: {
    ref_bien, content_hash,
    type_de_bien: extracted.type_de_bien,
    type_offre: extracted.type_offre || '',
    zone_geographique: extracted.zone_geographique || '',
    commune: extracted.commune,
    quartier: extracted.quartier || '',
    prix: extracted.prix || '',
    surface: extracted.surface || '',
    chambre: extracted.chambre || '',
    meubles: extracted.meubles || 'Non',
    caracteristiques: extracted.caracteristiques || '',
    telephone_bien: extracted.telephone || source.telephone || '',
    telephone_expediteur: source.telephone || '',
    expediteur: source.expediteur || '',
    publie_par: extracted.publie_par || source.expediteur || '',
    disponible: extracted.disponible === 'Non' ? 'Non' : 'Oui',
    status: 'active',
    groupe_whatsapp_origine: source.groupe || '',
    groupe_whatsapp_jid: source.groupe_jid || '',
    message_initial: source.message || '',
    publication_id: source.messageId || '',
    date_publication: new Date().toISOString(),
    date_expiration: dateExp.toISOString(),
    relance_count: 0,
    lien_image: ''
  }}];
} catch(e) { console.log('Erreur parser:', e.message); return []; }