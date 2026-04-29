// Message composer: native flow baileys_helper, media header, CTA, dan fallback.
import * as baileysHelper from 'baileys_helper';

const helper = baileysHelper.default || baileysHelper;
const { sendButtons, sendInteractiveMessage } = helper;

function params(value) {
  return JSON.stringify(value);
}

function nativeButton(name, buttonParams) {
  return {
    name,
    buttonParamsJson: params(buttonParams)
  };
}

function quickReply(id, text) {
  return nativeButton('quick_reply', {
    display_text: text,
    id
  });
}

function ctaUrl(text, url) {
  return nativeButton('cta_url', {
    display_text: text,
    url,
    merchant_url: url
  });
}

function ctaCall(text, phoneNumber) {
  return nativeButton('cta_call', {
    display_text: text,
    phone_number: phoneNumber
  });
}

function ctaCopy(text, copyCode) {
  return nativeButton('cta_copy', {
    display_text: text,
    copy_code: copyCode
  });
}

function singleSelect(title, sections) {
  return nativeButton('single_select', {
    title,
    sections
  });
}

function buildFallback({ text, sections = [], quickReplies = [], cta = [] }) {
  const rows = sections.flatMap((section) => section.rows || []);
  const lines = [text, ''];

  if (rows.length) {
    lines.push('Menu:');
    for (const row of rows) lines.push(`- ${row.title}: ${row.id}`);
  }

  if (quickReplies.length) {
    lines.push('', 'Shortcut:');
    for (const button of quickReplies) lines.push(`- ${button.text}: ${button.id}`);
  }

  if (cta.length) {
    lines.push('', 'Info:');
    for (const item of cta) {
      if (item.url) lines.push(`- ${item.text}: ${item.url}`);
      if (item.phoneNumber) lines.push(`- ${item.text}: ${item.phoneNumber}`);
      if (item.copyCode) lines.push(`- ${item.text}: ${item.copyCode}`);
    }
  }

  return lines.join('\n').trim();
}

async function rememberSent(sock, sent) {
  if (!sent?.key || !sock.__messageStore) return;
  try {
    await sock.__messageStore.rememberMessage(sent, 'outgoing');
  } catch {
    // Message cache best-effort.
  }
}

export function buildNativeButtons({ sections = [], title = 'Pilih Menu', quickReplies = [], cta = [] }) {
  const interactiveButtons = [];
  if (sections.length) interactiveButtons.push(singleSelect(title, sections));

  for (const button of quickReplies.slice(0, 3)) {
    interactiveButtons.push(quickReply(button.id, button.text));
  }

  for (const item of cta.slice(0, 3)) {
    if (item.type === 'url' && item.url) interactiveButtons.push(ctaUrl(item.text, item.url));
    if (item.type === 'call' && item.phoneNumber) interactiveButtons.push(ctaCall(item.text, item.phoneNumber));
    if (item.type === 'copy' && item.copyCode) interactiveButtons.push(ctaCopy(item.text, item.copyCode));
  }

  return interactiveButtons;
}

export async function sendNativeFlow(sock, jid, { text, footer, title, sections = [], quickReplies = [], cta = [] }, options = {}) {
  const interactiveButtons = buildNativeButtons({ sections, title, quickReplies, cta });

  try {
    const sent = await sendInteractiveMessage(sock, jid, {
      text,
      footer,
      interactiveButtons
    }, options);
    await rememberSent(sock, sent);
    return sent;
  } catch {
    const sent = await sock.sendMessage(jid, {
      text: buildFallback({ text, sections, quickReplies, cta })
    }, options);
    await rememberSent(sock, sent);
    return sent;
  }
}

export async function sendSafeInteractive(sock, jid, payload, options = {}) {
  return sendNativeFlow(sock, jid, payload, options);
}

export async function sendMediaHeader(sock, jid, media = {}, options = {}) {
  if (!media?.enabled) return null;
  const source = media.url || media.path;
  if (!source) return null;

  const content = {
    caption: media.caption || ''
  };

  if (media.type === 'video') content.video = { url: source };
  else if (media.type === 'document') {
    content.document = { url: source };
    content.fileName = media.fileName || 'menu';
    content.mimetype = media.mimetype || 'application/octet-stream';
  } else {
    content.image = { url: source };
  }

  try {
    const sent = await sock.sendMessage(jid, content, options);
    await rememberSent(sock, sent);
    return sent;
  } catch {
    return null;
  }
}

export async function sendExperimentalAlbum(sock, jid, media = {}, options = {}) {
  if (!media?.album?.length) return null;
  const sent = [];

  for (const item of media.album.slice(0, 5)) {
    const result = await sendMediaHeader(sock, jid, {
      ...item,
      enabled: true
    }, options);
    if (result) sent.push(result);
  }

  return sent;
}

export async function sendDecoratedMenu(sock, jid, { media, experimentalAlbum = false, text, footer, title, sections, quickReplies = [], cta = [] }, options = {}) {
  if (experimentalAlbum) await sendExperimentalAlbum(sock, jid, media, options);
  else await sendMediaHeader(sock, jid, media, options);
  return sendSafeInteractive(sock, jid, {
    text,
    footer,
    title,
    sections,
    quickReplies,
    cta
  }, options);
}

export async function sendQuickButtons(sock, jid, { title, text, footer, buttons }, options = {}) {
  const safeButtons = buttons.slice(0, 3);

  try {
    const sent = await sendButtons(sock, jid, {
      title,
      text,
      footer,
      buttons: safeButtons.map((button) => ({ id: button.id, text: button.text }))
    }, options);
    await rememberSent(sock, sent);
    return sent;
  } catch {
    return sendNativeFlow(sock, jid, {
      text,
      footer,
      quickReplies: safeButtons
    }, options);
  }
}

export async function sendSingleSelect(sock, jid, { text, footer, title, sections, quickReplies = [], cta = [] }, options = {}) {
  return sendNativeFlow(sock, jid, {
    text,
    footer,
    title,
    sections,
    quickReplies,
    cta
  }, options);
}
