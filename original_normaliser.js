try {
  const BOTS = ['2250142694380', '2250789263373'];
  const body = $input.first().json.body || $input.first().json;
  const data = body.data || body;

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
  const messageId = key.id || msg.id || '';

  if (fromMe) return [];
  if (!remoteJid || remoteJid === 'status@broadcast') return [];
  if (message.reactionMessage || message.protocolMessage) return [];

  let messageBody = msg.messageBody || msg.body
    || message.conversation
    || message.extendedTextMessage?.text
    || message.imageMessage?.caption
    || '';
  messageBody = (messageBody || '').replace(/[\x00-\x1f]/g, '').substring(0, 2000).trim();

  const hasAudio = !!message.audioMessage;
  const hasImage = !!message.imageMessage;
  const hasText = messageBody.length > 0;
  if (!hasText && !hasAudio && !hasImage) return [];

  const isGroup = remoteJid.includes('@g.us');
  const isLid = remoteJid.includes('@lid');
  const isNormal = remoteJid.includes('@s.whatsapp.net');

  function extractNum(str) {
    if (!str) return '';
    return String(str).replace(/@[\w.]+/g, '').replace(/[^0-9]/g, '');
  }
  function isValidPhone(n) { return !!(n && n.length >= 8 && n.length <= 15); }
  function isLidNumber(str) {
    const s = String(str || '');
    return s.includes('@lid') || (s.replace(/[^0-9]/g, '').length > 15);
  }

  let cleanNumber = '';
  const phoneSources = [
    msg.cleanedParticipantPn, key.cleanedParticipantPn, data.cleanedParticipantPn, body.cleanedParticipantPn,
    msg.participantPn, key.participantPn, data.participantPn, body.participantPn,
    msg.cleanedSenderPn, key.cleanedSenderPn, data.cleanedSenderPn, body.cleanedSenderPn,
    msg.senderPn, key.senderPn, data.senderPn, body.senderPn,
    msg.phoneNumber, msg.phone, data.phoneNumber, data.phone
  ];
  for (const src of phoneSources) {
    if (src && !isLidNumber(src)) {
      const n = extractNum(String(src));
      if (isValidPhone(n) && !BOTS.some(b => n.includes(b))) { cleanNumber = n; break; }
    }
  }
  if (!cleanNumber && isGroup) {
    const participant = key.participant || msg.participant || '';
    if (participant && !isLidNumber(participant)) {
      const p = extractNum(participant);
      if (isValidPhone(p) && !BOTS.some(b => p.includes(b))) cleanNumber = p;
    }
  }
  if (!cleanNumber && isNormal) {
    const n = extractNum(remoteJid);
    if (isValidPhone(n) && !BOTS.some(b => n.includes(b))) cleanNumber = n;
  }
  if (!cleanNumber) {
    function findPhoneInObj(obj, depth) {
      if (!obj || typeof obj !== 'object' || depth > 5) return '';
      const keys = ['cleanedParticipantPn','participantPn','cleanedSenderPn','senderPn','phoneNumber','phone','from','sender'];
      for (const k of keys) {
        if (obj[k] && !isLidNumber(obj[k])) {
          const n = extractNum(String(obj[k]));
          if (isValidPhone(n) && !BOTS.some(b => n.includes(b))) return n;
        }
      }
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'object' && obj[k] !== null) { const f = findPhoneInObj(obj[k], depth + 1); if (f) return f; }
      }
      return '';
    }
    cleanNumber = findPhoneInObj(msg, 0) || findPhoneInObj(data, 0) || findPhoneInObj(body, 0);
  }

  if (BOTS.some(b => (cleanNumber && cleanNumber.includes(b)) || remoteJid.includes(b))) return [];

  if (messageId) {
    const sd = $getWorkflowStaticData('node');
    if (!sd.seen) sd.seen = {};
    const now = Date.now();
    Object.keys(sd.seen).forEach(id => { if (now - sd.seen[id] > 600000) delete sd.seen[id]; });
    if (sd.seen[messageId]) return [];
    sd.seen[messageId] = now;
  }

  const sd2 = $getWorkflowStaticData('global');
  if (!sd2.flood) sd2.flood = {};
  const nowF = Date.now();
  const userKey = cleanNumber || remoteJid;
  if (sd2.flood[userKey] && (nowF - sd2.flood[userKey]) < 3000) return [];
  sd2.flood[userKey] = nowF;

  let replyTo = '';
  if (isNormal) replyTo = extractNum(remoteJid);
  else if (isGroup) replyTo = remoteJid;
  else if (isLid) replyTo = cleanNumber;
  else replyTo = cleanNumber || extractNum(remoteJid);

  const replyToIsValid = isGroup ? true : /^[0-9]{8,15}$/.test(replyTo);
  const groupName = isGroup ? (msg.groupMetadata?.subject || data.groupName || data.groupSubject || remoteJid.replace('@g.us', '')) : '';
  const horodatage = new Date((msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' });
  const wasenderPhone = cleanNumber;

  return [{ json: { replyTo, replyToIsValid, remoteJid, cleanNumber, wasenderPhone, isLid, isNormal, isGroup, groupName, pushName: (msg.pushName || '').replace(/[\x00-\x1f]/g, '').substring(0, 100), messageBody, messageId, hasAudio, hasImage, hasText, audioMessage: message.audioMessage || null, imageMessage: message.imageMessage || null, timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000), horodatage } }];
} catch(e) { console.log('Erreur normalisation:', e.message); return []; }