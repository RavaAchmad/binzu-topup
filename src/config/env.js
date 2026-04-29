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
  const mockPayment = bool(process.env.PAYMENT_MOCK, SETTINGS.payment.mock);

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
      mode: process.env.TRIPAY_MODE || SETTINGS.payment.mode,
      sandboxBaseUrl: process.env.TRIPAY_SANDBOX_BASE_URL || SETTINGS.payment.sandboxBaseUrl,
      productionBaseUrl: process.env.TRIPAY_PRODUCTION_BASE_URL || SETTINGS.payment.productionBaseUrl,
      merchantCode: process.env.TRIPAY_MERCHANT_CODE || SETTINGS.payment.merchantCode,
      apiKey: process.env.TRIPAY_API_KEY || SETTINGS.payment.apiKey,
      privateKey: process.env.TRIPAY_PRIVATE_KEY || SETTINGS.payment.privateKey,
      signatureHeader: (process.env.TRIPAY_SIGNATURE_HEADER || SETTINGS.payment.signatureHeader).toLowerCase(),
      pollingEnabled: bool(process.env.PAYMENT_POLLING_ENABLED, SETTINGS.payment.pollingEnabled),
      pollIntervalMs: number(process.env.PAYMENT_POLL_INTERVAL_MS, SETTINGS.payment.pollIntervalMs),
      invoiceTtlMinutes: number(process.env.INVOICE_TTL_MINUTES, SETTINGS.payment.invoiceTtlMinutes),
      mockAutoPaySeconds: number(process.env.MOCK_AUTO_PAY_SECONDS, SETTINGS.payment.mockAutoPaySeconds)
    },
    pricing: SETTINGS.pricing,
    providers: {
      digiflazz: {
        ...SETTINGS.providers.digiflazz,
        mock: bool(process.env.DIGIFLAZZ_MOCK, SETTINGS.providers.digiflazz.mock),
        username: process.env.DIGIFLAZZ_USERNAME || SETTINGS.providers.digiflazz.username,
        apiKey: process.env.DIGIFLAZZ_API_KEY || SETTINGS.providers.digiflazz.apiKey,
        baseUrl: process.env.DIGIFLAZZ_BASE_URL || SETTINGS.providers.digiflazz.baseUrl,
        testing: bool(process.env.DIGIFLAZZ_TESTING, SETTINGS.providers.digiflazz.testing),
        callbackUrl: process.env.DIGIFLAZZ_CALLBACK_URL || SETTINGS.providers.digiflazz.callbackUrl
      },
      moogold: {
        ...SETTINGS.providers.moogold,
        mock: bool(process.env.MOOGOLD_MOCK, SETTINGS.providers.moogold.mock),
        partnerId: process.env.MOOGOLD_PARTNER_ID || SETTINGS.providers.moogold.partnerId,
        secret: process.env.MOOGOLD_SECRET || SETTINGS.providers.moogold.secret,
        baseUrl: process.env.MOOGOLD_BASE_URL || SETTINGS.providers.moogold.baseUrl,
        currency: process.env.MOOGOLD_CURRENCY || SETTINGS.providers.moogold.currency
      }
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
  if (!config.payment.mock && config.payment.gateway === 'tripay') {
    const missing = [];
    if (!config.payment.apiKey) missing.push('TRIPAY_API_KEY');
    if (!config.payment.privateKey) missing.push('TRIPAY_PRIVATE_KEY');
    if (!config.payment.merchantCode) missing.push('TRIPAY_MERCHANT_CODE');
    if (!config.server.publicWebhookUrl) missing.push('PUBLIC_WEBHOOK_URL');

    if (missing.length) {
      throw new Error(`Konfigurasi live Tripay belum lengkap: ${missing.join(', ')}`);
    }
  }

  if (!config.providers.digiflazz.mock) {
    const missing = [];
    if (!config.providers.digiflazz.username) missing.push('DIGIFLAZZ_USERNAME');
    if (!config.providers.digiflazz.apiKey) missing.push('DIGIFLAZZ_API_KEY');
    if (missing.length) throw new Error(`Konfigurasi live Digiflazz belum lengkap: ${missing.join(', ')}`);
  }

  if (!config.providers.moogold.mock) {
    const missing = [];
    if (!config.providers.moogold.partnerId) missing.push('MOOGOLD_PARTNER_ID');
    if (!config.providers.moogold.secret) missing.push('MOOGOLD_SECRET');
    if (missing.length) throw new Error(`Konfigurasi live Moogold belum lengkap: ${missing.join(', ')}`);
  }
}
