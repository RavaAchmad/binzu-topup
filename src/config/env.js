// Membaca konfigurasi hardcoded dari settings.js, dengan env sebagai override opsional.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SETTINGS } from './settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFromRoot(value) {
  if (!value) return value;
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

export function loadConfig() {
  const mockPayment = bool(process.env.MUSTIKA_MOCK, SETTINGS.payment.mock);

  return {
    rootDir,
    bot: {
      ...SETTINGS.bot,
      name: process.env.BOT_NAME || SETTINGS.bot.name,
      prefix: process.env.BOT_PREFIX || SETTINGS.bot.prefix,
      logLevel: process.env.LOG_LEVEL || SETTINGS.bot.logLevel
    },
    owner: {
      ...SETTINGS.owner,
      numbers: (process.env.OWNER_NUMBERS || SETTINGS.owner.numbers.join(','))
        .split(',')
        .map((numberValue) => numberValue.replace(/\D/g, ''))
        .filter(Boolean),
      lids: (process.env.OWNER_LIDS || SETTINGS.owner.lids.join(','))
        .split(',')
        .map((lid) => lid.trim())
        .filter(Boolean)
    },
    whatsapp: {
      ...SETTINGS.whatsapp,
      sessionDir: resolveFromRoot(process.env.SESSION_DIR || SETTINGS.whatsapp.sessionDir),
      pairingPhone: (process.env.WA_PAIRING_PHONE || SETTINGS.whatsapp.pairingPhone || '').replace(/\D/g, '')
    },
    storage: {
      file: resolveFromRoot(process.env.DB_FILE || SETTINGS.storage.file)
    },
    socket: {
      ...SETTINGS.socket,
      ignoreStatusBroadcast: bool(process.env.SOCKET_IGNORE_STATUS_BROADCAST, SETTINGS.socket.ignoreStatusBroadcast),
      enableEventSniff: bool(process.env.SOCKET_EVENT_SNIFF, SETTINGS.socket.enableEventSniff),
      eventSniffMaxChars: number(process.env.SOCKET_EVENT_SNIFF_MAX_CHARS, SETTINGS.socket.eventSniffMaxChars),
      emitOwnEvents: bool(process.env.SOCKET_EMIT_OWN_EVENTS, SETTINGS.socket.emitOwnEvents),
      enableAutoSessionRecreation: bool(process.env.SOCKET_AUTO_SESSION_RECREATE, SETTINGS.socket.enableAutoSessionRecreation),
      enableRecentMessageCache: bool(process.env.SOCKET_RECENT_MESSAGE_CACHE, SETTINGS.socket.enableRecentMessageCache),
      maxMsgRetryCount: number(process.env.SOCKET_MAX_MSG_RETRY, SETTINGS.socket.maxMsgRetryCount),
      retryRequestDelayMs: number(process.env.SOCKET_RETRY_DELAY_MS, SETTINGS.socket.retryRequestDelayMs),
      connectTimeoutMs: number(process.env.SOCKET_CONNECT_TIMEOUT_MS, SETTINGS.socket.connectTimeoutMs),
      keepAliveIntervalMs: number(process.env.SOCKET_KEEPALIVE_MS, SETTINGS.socket.keepAliveIntervalMs),
      defaultQueryTimeoutMs: number(process.env.SOCKET_QUERY_TIMEOUT_MS, SETTINGS.socket.defaultQueryTimeoutMs),
      generateHighQualityLinkPreview: bool(process.env.SOCKET_HIGH_QUALITY_PREVIEW, SETTINGS.socket.generateHighQualityLinkPreview),
      messageCacheTtlMs: number(process.env.SOCKET_MESSAGE_CACHE_TTL_MS, SETTINGS.socket.messageCacheTtlMs),
      messageCacheMax: number(process.env.SOCKET_MESSAGE_CACHE_MAX, SETTINGS.socket.messageCacheMax)
    },
    server: {
      ...SETTINGS.server,
      port: number(process.env.PORT, SETTINGS.server.port),
      publicWebhookUrl: process.env.PUBLIC_WEBHOOK_URL || SETTINGS.server.publicWebhookUrl
    },
    payment: {
      ...SETTINGS.payment,
      mock: mockPayment,
      baseUrl: process.env.MUSTIKA_BASE_URL || SETTINGS.payment.baseUrl,
      apiKey: process.env.MUSTIKA_API_KEY || SETTINGS.payment.apiKey,
      apiSecret: process.env.MUSTIKA_API_SECRET || SETTINGS.payment.apiSecret,
      createPath: process.env.MUSTIKA_CREATE_PATH || SETTINGS.payment.createPath,
      statusPath: process.env.MUSTIKA_STATUS_PATH || SETTINGS.payment.statusPath,
      signatureHeader: (process.env.MUSTIKA_SIGNATURE_HEADER || SETTINGS.payment.signatureHeader).toLowerCase(),
      webhookSecret: process.env.MUSTIKA_WEBHOOK_SECRET || SETTINGS.payment.webhookSecret,
      pollingEnabled: bool(process.env.PAYMENT_POLLING_ENABLED, SETTINGS.payment.pollingEnabled),
      pollIntervalMs: number(process.env.PAYMENT_POLL_INTERVAL_MS, SETTINGS.payment.pollIntervalMs),
      invoiceTtlMinutes: number(process.env.INVOICE_TTL_MINUTES, SETTINGS.payment.invoiceTtlMinutes),
      mockAutoPaySeconds: number(process.env.MOCK_AUTO_PAY_SECONDS, SETTINGS.payment.mockAutoPaySeconds)
    },
    order: {
      ...SETTINGS.order,
      cooldownMs: number(process.env.ORDER_COOLDOWN_MS, SETTINGS.order.cooldownMs)
    },
    autoOrder: {
      ...SETTINGS.autoOrder,
      mode: process.env.AUTO_ORDER_MODE || SETTINGS.autoOrder.mode,
      baseUrl: process.env.AUTO_ORDER_BASE_URL || SETTINGS.autoOrder.baseUrl,
      apiKey: process.env.AUTO_ORDER_API_KEY || SETTINGS.autoOrder.apiKey,
      path: process.env.AUTO_ORDER_PATH || SETTINGS.autoOrder.path,
      simulatedDelayMs: number(process.env.AUTO_ORDER_SIMULATED_DELAY_MS, SETTINGS.autoOrder.simulatedDelayMs)
    },
    deposit: SETTINGS.deposit,
    menu: SETTINGS.menu
  };
}

export function assertConfig(config) {
  if (!config.payment.mock) {
    const missing = [];
    if (!config.payment.baseUrl) missing.push('MUSTIKA_BASE_URL');
    if (!config.payment.apiKey) missing.push('MUSTIKA_API_KEY');
    if (!config.server.publicWebhookUrl) missing.push('PUBLIC_WEBHOOK_URL');

    if (missing.length) {
      throw new Error(`Konfigurasi live MustikaPayment belum lengkap: ${missing.join(', ')}`);
    }
  }
}
