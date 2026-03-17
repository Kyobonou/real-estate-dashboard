try {
  const d = $input.first().json;
  if (!d.hasText && !d.hasImage && !d.hasVideo) return [];

  const msg = d.messageBody || '';
  const msgLow = msg.toLowerCase();

  // Image/video sans texte : accepter si c'est dans un groupe immobilier
  if ((d.hasImage || d.hasVideo) && !d.hasText) {
    console.log('[FILTRE] Media sans texte, ignoré');
    return [];
  }

  const keywords = [
    'appartement','appart','studio','chambre','maison','villa','duplex','triplex',
    'terrain','bureau','magasin','boutique','entrepot','local','residence',
    'parking','garage','immeuble','parcelle','lotissement','penthouse',
    'cocody','yopougon','yopo','marcory','koumassi','treichville','plateau',
    'adjame','abobo','port-bouet','bingerville','riviera','angre',
    'bassam','assinie','meuble','climatise','piscine',
    'louer','a louer','vendre','a vendre','location','vente','bail',
    'fcfa','cfa','m2','m²','hectare','million','disponible','dispo','loyer',
    'piece','pieces','sanitaire','salon','cuisine',
    'yamoussoukro','bouake','daloa','san pedro','korhogo',
    'divo','gagnoa','abengourou','mois','standing',
    'bonoumin','faya','palmeraie','2 plateaux','niangon','songon','anyama',
    'autoroute','promotion','immobiliere','acd','lotir','ha',
    'haut standing','basse','cloture','gardien','securise',
    'danga','attoban','pk18','pk21','gonzagueville','vridi','zone 4',
    'cite','vallon','bloc','residentiel','commercial',
    'f3','f4','f5','f2','s+1','s+2',
    'charges','caution','avance','amenage','non amenage',
    'bord','lagune','mer','route','goudron',
    'titre foncier','acd','permis','arreter'
  ];

  const score = keywords.filter(k => msgLow.includes(k)).length;
  const hasSurface = /\d+\s*m[²2]/i.test(msg) || /\d+\s*hectare/i.test(msg) || /\d+\s*ha\b/i.test(msg);
  const hasPrice = /\d[\d\s.,]*\s*(million|milion|mille|fcfa|cfa|frs?|f\b|k\b)/i.test(msg) || /\d+[\s.]?\d*\s*f\b/i.test(msg) || /\d+\s*000/i.test(msg);
  const hasPhone = /(\+?225[\s.-]?)?(\d[\s.-]?){8,10}/.test(msg);
  const hasRoomCount = /\d+\s*(pieces?|chambres?|pces?|sanitaires?|salons?|sdb)/i.test(msg);

  // ASSOUPLI: accepter si au moins 1 critère est rempli
  if (score < 1 && !hasSurface && !hasPrice && !hasPhone && !hasRoomCount) {
    console.log('[FILTRE] Rejeté (score=' + score + '): ' + msg.substring(0, 80));
    return [];
  }

  return [{ json: {
    message: msg,
    expediteur: d.pushName || '',
    telephone: d.cleanNumber || '',
    cleanedSenderPn: d.cleanedSenderPn || '',
    groupe: d.groupName || '',
    groupe_jid: d.remoteJid || '',
    horodatage: d.horodatage,
    messageId: d.messageId,
    has_image: d.hasImage,
    has_video: d.hasVideo,
    imageMessage: d.imageMessage
  }}];
} catch(e) {
  console.log('[FILTRE] Erreur:', e.message);
  return [];
}