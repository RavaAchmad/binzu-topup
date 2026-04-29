// Parser pesan masuk: text, button response, list response, dan native flow.
function unwrapMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function findFirstActionId(value) {
  if (!value || typeof value !== 'object') return '';
  const keys = [
    'id',
    'selectedId',
    'selected_id',
    'selectedRowId',
    'selected_row_id',
    'row_id',
    'button_id',
    'copy_code',
    'code'
  ];

  for (const key of keys) {
    if (value[key]) return String(value[key]);
  }

  for (const nested of Object.values(value)) {
    const found = findFirstActionId(nested);
    if (found) return found;
  }

  return '';
}

function extractContent(rawMessage) {
  const message = unwrapMessage(rawMessage);
  if (!message) return { type: 'unknown', text: '', buttonId: '' };

  if (message.conversation) {
    return { type: 'text', text: message.conversation, buttonId: '' };
  }

  if (message.extendedTextMessage?.text) {
    return { type: 'text', text: message.extendedTextMessage.text, buttonId: '' };
  }

  if (message.buttonsResponseMessage) {
    return {
      type: 'button',
      text: message.buttonsResponseMessage.selectedDisplayText || '',
      buttonId: message.buttonsResponseMessage.selectedButtonId || ''
    };
  }

  if (message.templateButtonReplyMessage) {
    return {
      type: 'button',
      text: message.templateButtonReplyMessage.selectedDisplayText || '',
      buttonId: message.templateButtonReplyMessage.selectedId || ''
    };
  }

  if (message.listResponseMessage) {
    return {
      type: 'list',
      text: message.listResponseMessage.title || '',
      buttonId: message.listResponseMessage.singleSelectReply?.selectedRowId || ''
    };
  }

  if (message.interactiveResponseMessage) {
    const native = message.interactiveResponseMessage.nativeFlowResponseMessage;
    const params = parseJsonSafe(native?.paramsJson);
    return {
      type: 'interactive',
      text: params.display_text || params.title || params.text || native?.name || '',
      buttonId: findFirstActionId(params) || native?.name || ''
    };
  }

  if (message.interactiveMessage?.nativeFlowMessage) {
    const buttons = message.interactiveMessage.nativeFlowMessage.buttons || [];
    const params = parseJsonSafe(buttons[0]?.buttonParamsJson);
    return {
      type: 'interactive',
      text: params.display_text || params.title || '',
      buttonId: findFirstActionId(params)
    };
  }

  if (message.imageMessage?.caption) {
    return { type: 'text', text: message.imageMessage.caption, buttonId: '' };
  }

  return { type: 'unknown', text: '', buttonId: '' };
}

export function parseIncomingMessage(waMessage, config) {
  const jid = waMessage.key?.remoteJid;
  const fromMe = Boolean(waMessage.key?.fromMe);
  const messageId = waMessage.key?.id;
  const content = extractContent(waMessage.message);
  const input = (content.buttonId || content.text || '').trim();
  const prefix = config.bot.prefix;

  let command = '';
  let args = [];
  let isCommand = false;

  if (input.startsWith(prefix)) {
    const parts = input.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
    command = (parts.shift() || '').toLowerCase();
    args = parts;
    isCommand = Boolean(command);
  } else if (input.startsWith('/')) {
    const parts = input.slice(1).trim().split(/\s+/).filter(Boolean);
    command = (parts.shift() || '').toLowerCase();
    args = parts;
    isCommand = Boolean(command);
  } else {
    const parts = input.split(/\s+/).filter(Boolean);
    const maybeCommand = (parts[0] || '').toLowerCase();
    if (['menu', 'order', 'status', 'deposit'].includes(maybeCommand)) {
      command = maybeCommand;
      args = parts.slice(1);
      isCommand = true;
    }
  }

  return {
    jid,
    sender: waMessage.key?.participant || jid,
    senderAlt: waMessage.key?.participantAlt || '',
    remoteJidAlt: waMessage.key?.remoteJidAlt || '',
    participant: waMessage.key?.participant || '',
    participantAlt: waMessage.key?.participantAlt || '',
    userJid: jid,
    pushName: waMessage.pushName || '',
    messageId,
    fromMe,
    type: content.type,
    text: content.text.trim(),
    buttonId: content.buttonId.trim(),
    input,
    isCommand,
    command,
    args,
    raw: waMessage
  };
}
