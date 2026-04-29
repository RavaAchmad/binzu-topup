// Resolver JID untuk Baileys v7: pisahkan chat tujuan balasan dan identitas user.
function jidUser(jid = '') {
  return String(jid).split('@')[0].split(':')[0];
}

function isLidJid(jid = '') {
  return String(jid).endsWith('@lid');
}

function isPnJid(jid = '') {
  return String(jid).endsWith('@s.whatsapp.net');
}

function isGroupJid(jid = '') {
  return String(jid).endsWith('@g.us');
}

function toPnFromNumber(value = '') {
  const number = String(value).replace(/\D/g, '');
  return number ? `${number}@s.whatsapp.net` : '';
}

function normalizeJid(jid = '') {
  if (!jid) return '';
  const value = String(jid);
  if (value.includes('@')) {
    const [left, domain] = value.split('@');
    return `${left.split(':')[0]}@${domain}`;
  }
  return toPnFromNumber(value);
}

function preferCanonical(candidates, store) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = store.resolveJid(candidate);
    if (resolved && resolved !== candidate) return resolved;
  }

  return candidates.find(isLidJid) || candidates.find(isPnJid) || candidates.find(Boolean) || '';
}

function parseMappingItem(item = {}) {
  const lid = normalizeJid(item.lid || item.lidJid || item.lidPnMapping?.lid || item.lidMapping?.lid);
  const pn = normalizeJid(item.pn || item.pnJid || item.phoneNumber || item.lidPnMapping?.pn || item.lidMapping?.pn);
  return { lid, pn };
}

export class JidService {
  constructor({ store, logger }) {
    this.store = store;
    this.logger = logger;
  }

  async resolveMessage(message = {}) {
    const key = message.key || {};
    const remoteJid = normalizeJid(key.remoteJid);
    const remoteJidAlt = normalizeJid(key.remoteJidAlt);
    const participant = normalizeJid(key.participant);
    const participantAlt = normalizeJid(key.participantAlt);
    const chatJid = remoteJid;
    const senderCandidates = isGroupJid(remoteJid)
      ? [participant, participantAlt, remoteJidAlt]
      : [remoteJid, remoteJidAlt, participant, participantAlt];
    const userJid = preferCanonical(senderCandidates, this.store);

    await this.rememberAliases({
      userJid,
      aliases: senderCandidates,
      pushName: message.pushName || ''
    });

    return {
      chatJid,
      userJid,
      senderJid: userJid,
      remoteJid,
      remoteJidAlt,
      participant,
      participantAlt,
      isGroup: isGroupJid(remoteJid),
      isLid: isLidJid(userJid),
      isPn: isPnJid(userJid),
      phoneNumber: senderCandidates.find(isPnJid)?.split('@')[0] || ''
    };
  }

  async rememberAliases({ userJid, aliases = [], pushName = '' }) {
    const normalizedAliases = aliases.map(normalizeJid).filter(Boolean);
    const lid = normalizedAliases.find(isLidJid) || (isLidJid(userJid) ? userJid : '');
    const pn = normalizedAliases.find(isPnJid) || (isPnJid(userJid) ? userJid : '');
    const canonicalJid = userJid || lid || pn;
    if (!canonicalJid) return null;

    return this.store.upsertJidAlias({
      canonicalJid,
      aliases: normalizedAliases,
      phoneNumber: pn ? jidUser(pn).replace(/\D/g, '') : '',
      lid,
      pn,
      pushName
    });
  }

  async handleLidMappingUpdate(update) {
    const items = Array.isArray(update) ? update : update?.mappings || update?.lidMappings || update?.data || [];
    const pairs = items
      .map(parseMappingItem)
      .filter((item) => item.lid || item.pn);
    if (!pairs.length) return [];
    return this.store.upsertJidMappings(pairs);
  }

  async handleContactsUpdate(update) {
    const contacts = Array.isArray(update) ? update : [update];
    const saved = [];
    for (const contact of contacts) {
      const id = normalizeJid(contact.id || contact.jid);
      const lid = normalizeJid(contact.lid || contact.lidJid);
      const phoneNumber = contact.phoneNumber || (isPnJid(id) ? jidUser(id) : '');
      const savedContact = await this.store.upsertContact({
        ...contact,
        id,
        lid,
        phoneNumber
      });
      if (savedContact) saved.push(savedContact);
    }
    return saved;
  }

  normalize(jid) {
    return normalizeJid(jid);
  }
}
