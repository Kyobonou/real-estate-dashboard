try {
  const raw = $input.first().json;
  const source = $('Preparer Filtrer Groupe').first().json;

  let extracted = {};
  let parsed = false;

  const candidates = [
    () => raw?.choices?.[0]?.message?.content,
    () => raw?.output_text,
    () => raw?.message?.content,
    () => raw?.text,
    () => raw?.content,
    () => raw?.output?.[0]?.content?.[0]?.text,
    () => raw?.response,
    () => typeof raw === 'string' ? raw : null
  ];

  for (const fn of candidates) {
    if (parsed) break;
    try {
      const val = fn();
      if (!val) continue;
      if (typeof val === 'object' && val !== null && (val.type_de_bien !== undefined || val.commune !== undefined)) {
        extracted = val; parsed = true; break;
      }
      if (typeof val === 'string') {
        let clean = val.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const fb = clean.indexOf('{');
        const lb = clean.lastIndexOf('}');
        if (fb !== -1 && lb > fb) clean = clean.substring(fb, lb + 1);
        const obj = JSON.parse(clean);
        if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) {
          extracted = obj; parsed = true;
        }
      }
    } catch(e) {}
  }

  if (!parsed && (raw?.type_de_bien !== undefined || raw?.commune !== undefined || raw?.prix !== undefined)) {
    extracted = raw; parsed = true;
  }

  if (!parsed) {
    function findObj(obj, depth) {
      if (!obj || typeof obj !== 'object' || depth > 6) return null;
      if (obj.type_de_bien !== undefined || obj.commune !== undefined || obj.prix !== undefined) return obj;
      for (const k of Object.keys(obj)) {
        const f = findObj(obj[k], depth + 1);
        if (f) return f;
      }
      return null;
    }
    const found = findObj(raw, 0);
    if (found) { extracted = found; parsed = true; }
  }

  if (!parsed || Object.keys(extracted).length === 0) {
    console.log('[PARSER] REJETÉ: impossible de parser');
    return [];
  }

  const typeBien = String(extracted.type_de_bien || '').trim();
  const commune  = String(extracted.commune || '').trim();
  const zone     = String(extracted.zone_geographique || '').trim();
  const prix     = String(extracted.prix || '').trim();
  const typeOffre= String(extracted.type_offre || '').trim();

  // TRÈS ASSOUPLI: accepter si on a AU MOINS un champ utile
  if (!typeBien && !commune && !zone && !prix) {
    console.log('[PARSER] REJETÉ: aucune info');
    return [];
  }

  const communeFinale = commune || zone || 'Abidjan';
  const typeLow = (typeBien || 'non_specifie').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let prixNormalise = parseInt(String(extracted.prix_normalise || '').replace(/[^0-9]/g, '')) || 0;
  if (!prixNormalise && prix) {
    const prixRaw = prix.toLowerCase();
    const allDigits = prixRaw.replace(/[^\d]/g, '');
    const num = parseInt(allDigits) || 0;
    const isMillion = /million|milion/i.test(prixRaw);
    prixNormalise = (isMillion && num < 10000) ? num * 1000000 : num;
  }

  const communeNorm = communeFinale.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const quartierNorm = String(extracted.quartier || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const chambresNorm = String(extracted.chambre || '').replace(/[^0-9]/g, '').trim();
  const surfaceNorm = String(extracted.surface || '').replace(/[^0-9]/g, '').trim();

  // Téléphones: extraire depuis l'IA
  const telBrut = String(extracted.telephone || '').trim();
  const telephoneBien = telBrut ? telBrut.split(',')[0].replace(/[^0-9]/g, '').trim() : '';

  // cleanedSenderPn = numéro WhatsApp de l'expéditeur (de Wasender)
  const cleanedSenderPn = String(source.cleanedSenderPn || source.telephone || '').replace(/[^0-9]/g, '').trim();

  console.log('[PARSER] OK:', typeBien || '?', '|', communeFinale, '| Prix:', prix || '-', '| TelBien:', telephoneBien, '| SenderPn:', cleanedSenderPn);

  return [{ json: {
    type_de_bien: typeBien || 'non_specifie',
    type_offre: typeOffre,
    zone_geographique: zone,
    commune: communeFinale,
    quartier: String(extracted.quartier || '').trim(),
    prix,
    prix_normalise: prixNormalise,
    surface: String(extracted.surface || '').trim(),
    chambre: String(extracted.chambre || '').trim(),
    meubles: String(extracted.meubles || 'Non').trim(),
    caracteristiques: String(extracted.caracteristiques || '').substring(0, 1000).trim(),
    telephone_bien: telephoneBien,
    telephone_expediteur: cleanedSenderPn,
    cleanedSenderPn: cleanedSenderPn,
    expediteur: String(source.expediteur || '').trim(),
    publie_par: String(extracted.publie_par || source.expediteur || '').trim(),
    disponible: extracted.disponible === 'Non' ? 'Non' : 'Oui',
    _type_low: typeLow,
    _commune_norm: communeNorm,
    _quartier_norm: quartierNorm,
    _chambres_norm: chambresNorm,
    _surface_norm: surfaceNorm,
    groupe_whatsapp_origine: String(source.groupe || '').trim(),
    groupe_whatsapp_jid: String(source.groupe_jid || '').trim(),
    message_initial: String(source.message || '').substring(0, 2000).trim(),
    publication_id: String(source.messageId || '').trim(),
    horodatage_source: source.horodatage || ''
  }}];
} catch(e) {
  console.log('[PARSER] Erreur:', e.message);
  return [];
}