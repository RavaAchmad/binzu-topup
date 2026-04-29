// Koneksi Baileys multi-device dan lifecycle reconnect.
import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { TtlCache } from '../utils/ttlCache.js';
import { acquireSessionLock } from '../utils/sessionLock.js';

function sniff(logger, config, eventName, payload) {
  if (!config.socket.enableEventSniff) return;
  const raw = JSON.stringify(payload, (_key, value) => {
    if (value && typeof value === 'object' && value.buffer instanceof ArrayBuffer) return '[buffer]';
    return value;
  });
  logger.debug(`event=${eventName} ${raw.slice(0, config.socket.eventSniffMaxChars)}`);
}

function patchSendMessage(sock, store, logger) {
  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.__messageStore = store;
  sock.sendMessage = async (...args) => {
    const sent = await originalSendMessage(...args);
    if (sent?.key) {
      store.rememberMessage(sent, 'outgoing').catch((error) => {
        logger.debug('Gagal cache outgoing message', error.message);
      });
    }
    return sent;
  };
}

export async function startWhatsApp({ config, store, jidService, logger, onSocket, onOpen, onClose, onMessage }) {
  let reconnecting = false;
  let pairingRequested = false;
  await acquireSessionLock(config.whatsapp.sessionDir, logger);
  const retryCache = new TtlCache({
    ttlMs: config.socket.messageCacheTtlMs,
    max: config.socket.messageCacheMax
  });
  const resendCache = new TtlCache({
    ttlMs: config.socket.messageCacheTtlMs,
    max: config.socket.messageCacheMax
  });
  const userDevicesCache = new TtlCache({
    ttlMs: config.socket.messageCacheTtlMs,
    max: config.socket.messageCacheMax
  });

  async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionDir);
    const waLogger = P({ level: config.bot.logLevel });
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, waLogger)
      },
      logger: waLogger,
      browser: [config.bot.name, 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      emitOwnEvents: config.socket.emitOwnEvents,
      enableAutoSessionRecreation: config.socket.enableAutoSessionRecreation,
      enableRecentMessageCache: config.socket.enableRecentMessageCache,
      maxMsgRetryCount: config.socket.maxMsgRetryCount,
      retryRequestDelayMs: config.socket.retryRequestDelayMs,
      connectTimeoutMs: config.socket.connectTimeoutMs,
      keepAliveIntervalMs: config.socket.keepAliveIntervalMs,
      defaultQueryTimeoutMs: config.socket.defaultQueryTimeoutMs,
      generateHighQualityLinkPreview: config.socket.generateHighQualityLinkPreview,
      shouldIgnoreJid: (jid) => config.socket.ignoreStatusBroadcast && jid === 'status@broadcast',
      msgRetryCounterCache: retryCache,
      placeholderResendCache: resendCache,
      userDevicesCache,
      getMessage: async (key) => store.getMessageForRetry(key)
    });

    patchSendMessage(sock, store, logger);
    onSocket?.(sock);
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (event) => {
      sniff(logger, config, 'messages.upsert', {
        type: event.type,
        count: event.messages?.length || 0,
        firstKey: event.messages?.[0]?.key
      });
      await onMessage?.(sock, event);
    });
    sock.ev.on('contacts.upsert', async (contacts) => {
      sniff(logger, config, 'contacts.upsert', { count: contacts?.length || 0 });
      await jidService.handleContactsUpdate(contacts).catch((error) => logger.debug('contacts.upsert gagal', error.message));
    });
    sock.ev.on('contacts.update', async (contacts) => {
      sniff(logger, config, 'contacts.update', { count: contacts?.length || 0 });
      await jidService.handleContactsUpdate(contacts).catch((error) => logger.debug('contacts.update gagal', error.message));
    });
    sock.ev.on('lid-mapping.update', async (update) => {
      sniff(logger, config, 'lid-mapping.update', update);
      await jidService.handleLidMappingUpdate(update).catch((error) => logger.debug('lid-mapping.update gagal', error.message));
    });
    sock.ev.on('messages.update', (updates) => {
      sniff(logger, config, 'messages.update', { count: updates?.length || 0 });
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      sniff(logger, config, 'connection.update', {
        connection,
        statusCode: lastDisconnect?.error?.output?.statusCode,
        message: lastDisconnect?.error?.message
      });

      if (qr && !config.whatsapp.pairingPhone) {
        logger.info('Scan QR berikut dari WhatsApp Linked Devices:');
        qrcode.generate(qr, { small: true });
      }

      if ((connection === 'connecting' || qr) && config.whatsapp.pairingPhone && !state.creds.registered && !pairingRequested) {
        pairingRequested = true;
        try {
          const code = await sock.requestPairingCode(config.whatsapp.pairingPhone);
          logger.info(`Pairing code untuk ${config.whatsapp.pairingPhone}: ${code}`);
        } catch (error) {
          logger.warn('Gagal request pairing code', error.message);
        }
      }

      if (connection === 'open') {
        reconnecting = false;
        logger.info('WhatsApp tersambung.');
        await onOpen?.(sock);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        if (String(lastDisconnect?.error?.message || '').toLowerCase().includes('bad mac')) {
          logger.warn('Terdeteksi bad mac. Bot akan membiarkan retry/session recreation Baileys berjalan sebelum tindakan manual.');
        }
        logger.warn(`Koneksi tertutup. status=${statusCode || 'unknown'} reconnect=${!loggedOut}`);
        await onClose?.(sock, { loggedOut, statusCode });

        if (!loggedOut && !reconnecting) {
          reconnecting = true;
          setTimeout(() => {
            reconnecting = false;
            connect().catch((error) => logger.error('Reconnect gagal', error));
          }, 5000).unref?.();
        }
      }
    });

    return sock;
  }

  return connect();
}
