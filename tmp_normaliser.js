// ===== NORMALISER LA STRUCTURE DU WEBHOOK =====
// Gestion robuste des LIDs WhatsApp (Linked IDs vs vrais numéros)
try {
  const body = $input.first().json.body || $input.first().json;
  const event = body.event || '';
  const data = body.data || body;

  if (event && !event.includes('message')) return [];

  let msg = null;
  if (Array.isArray(data.messages)) msg = data.messages[0];
  else if (data.messages && typeof data.messages === 'object') msg = data.messages;
  else if (data.message) msg = data.message;
  else msg = data;

  if (!msg) return [];

  const key = msg.key || {};
  const message = msg.message || {};
  const remoteJid = key.remoteJid || msg.remoteJid || '';
  const fromMe = key.fromMe === true || key.fromMe === 'true';
  const pushName = msg.pushName || msg.senderName || '';
  const messageTimestamp = msg.messageTimestamp || msg.timestamp || Math.floor(Date.now() / 1000);
  const messageId = key.id || msg.id || '';
  const participant = key.participant || msg.participant || '';

  if (!remoteJid) return [];
  if (remoteJid === 'status@broadcast') return [];
  
  // Correction: Un message peut contenir senderKeyDistributionMessage ET un videoMessage/imageMessage en même temps
  // On ignore la réaction et le protocole s'il n'y a pas d'autre contenu utile
  let messageBody = msg.messageBody || msg.body || '';
  if (!messageBody) messageBody = message.conversation || '';
  if (!messageBody) messageBody = (message.extendedTextMessage && message.extendedTextMessage.text) || '';
  if (!messageBody) messageBody = (message.imageMessage && message.imageMessage.caption) || '';
  if (!messageBody) messageBody = (message.videoMessage && message.videoMessage.caption) || '';

  const hasAudio = !!message.audioMessage;
  const hasImage = !!message.imageMessage;
  const hasVideo = !!message.videoMessage;
  const hasText = messageBody.trim().length > 0;
  
  // On ignore si ce n'est qu'une réaction ou un message de protocole sans texte/media
  if ((message.reactionMessage || message.protocolMessage) && !hasText && !hasImage && !hasAudio && !hasVideo) return [];

  const isGroup = remoteJid.includes('@g.us');

  let groupName = '';
  if (isGroup) {
    groupName = msg.groupName || msg.groupSubject || '';
    if (!groupName) groupName = data.groupName || data.groupSubject || '';
    if (!groupName) groupName = body.groupName || body.groupSubject || '';
    if (!groupName && msg.groupMetadata) groupName = msg.groupMetadata.subject || msg.groupMetadata.name || '';
    if (!groupName && data.groupMetadata) groupName = data.groupMetadata.subject || data.groupMetadata.name || '';
    if (!groupName && message.extendedTextMessage && message.extendedTextMessage.contextInfo) {
      groupName = message.extendedTextMessage.contextInfo.groupSubject || '';
    }
    if (!groupName) {
      const search = (obj, depth) => {
        depth = depth || 0;
        if (!obj || typeof obj !== 'object' || depth > 4) return '';
        for (const k of ['groupName', 'groupSubject', 'subject']) { if (obj[k] && typeof obj[k] === 'string') return obj[k]; }
        for (const k of Object.keys(obj)) { if (typeof obj[k] === 'object') { const f = search(obj[k], depth + 1); if (f) return f; } }
        return '';
      };
      groupName = search(body);
    }
    if (!groupName) groupName = remoteJid.replace('@g.us', '');
  }

  function isValidPhoneNumber(num) {
    if (!num) return false;
    const cleaned = num.replace(/[^0-9]/g, '');
    if (cleaned.length < 10 || cleaned.length > 13) return false;
    return true;
  }

  function extractCleanNumber(str) {
    if (!str) return '';
    return str.replace(/@s\.whatsapp\.net/g, '').replace(/@lid/g, '').replace(/@g\.us/g, '').replace(/@[a-z.]+/g, '').trim();
  }

  let cleanedSenderPn = '';
  const numberSources = [];

  if (isGroup) {
    numberSources.push(key.participantPn, key.cleanedParticipantPn, msg.participantPn, msg.cleanedParticipantPn, participant);
  } else {
    numberSources.push(remoteJid);
  }

  numberSources.push(key.cleanedSenderPn, msg.cleanedSenderPn, key.senderPn, msg.senderPn, msg.from, data.from, body.from);

  function findPhoneInObj(obj, depth) {
    depth = depth || 0;
    if (!obj || typeof obj !== 'object' || depth > 3) return '';
    for (const k of ['senderPn', 'cleanedSenderPn', 'participantPn', 'cleanedParticipantPn', 'from', 'sender']) {
      if (obj[k] && typeof obj[k] === 'string') {
        const cleaned = extractCleanNumber(obj[k]);
        if (isValidPhoneNumber(cleaned)) return cleaned;
      }
    }
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'object') { const found = findPhoneInObj(obj[k], depth + 1); if (found) return found; }
    }
    return '';
  }

  for (const src of numberSources) {
    if (src) {
      const cleaned = extractCleanNumber(String(src));
      if (isValidPhoneNumber(cleaned)) { cleanedSenderPn = cleaned; break; }
    }
  }

  if (!cleanedSenderPn) {
    cleanedSenderPn = findPhoneInObj(msg) || findPhoneInObj(data) || findPhoneInObj(body);
  }

  const isLid = !isValidPhoneNumber(cleanedSenderPn);

  if (!hasAudio && !hasText && !hasImage && !hasVideo) return [];

  if (!isGroup && isLid && !cleanedSenderPn) {
    console.log('LID détecté, message ignoré:', remoteJid);
    return [];
  }

  return [{ json: { remoteJid, fromMe, pushName, messageTimestamp, messageBody, messageId, participant, cleanedSenderPn, isGroup, groupName, isLid, key, message, rawMsg: msg, hasAudio, hasImage, hasVideo, hasText } }];
} catch(e) {
  console.log('Normaliser Webhook erreur:', e.message);
  return [];
}