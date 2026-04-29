// Helper otorisasi owner untuk command konfigurasi bot.
export function jidToNumber(jid = '') {
  return String(jid).split('@')[0].replace(/\D/g, '');
}

export function isOwnerJid(jid, config) {
  if (!jid) return false;
  if (config.owner.lids.includes(jid)) return true;
  const number = jidToNumber(jid);
  return config.owner.numbers.includes(number);
}

export function requireOwner(ctx) {
  const candidates = [
    ctx.userJid,
    ctx.sender,
    ctx.senderAlt,
    ctx.jid,
    ctx.remoteJidAlt,
    ctx.participant,
    ctx.participantAlt
  ];
  if (candidates.some((jid) => isOwnerJid(jid, ctx.config))) return true;
  return false;
}

export function ownerMention(config) {
  const firstOwner = config.owner.numbers[0] || '';
  return firstOwner ? `wa.me/${firstOwner}` : 'Owner belum diset';
}
