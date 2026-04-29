// Entry point: wiring storage, services, webhook, dan event Baileys.
import { loadConfig, assertConfig } from './config/env.js';
import { createLogger } from './utils/logger.js';
import { JsonStore } from './storage/jsonStore.js';
import { MustikaPayment } from './integrations/mustikaPayment.js';
import { NotificationService } from './services/notificationService.js';
import { FulfillmentService } from './services/fulfillmentService.js';
import { PaymentService } from './services/paymentService.js';
import { MenuService } from './services/menuService.js';
import { JidService } from './services/jidService.js';
import { OrderService } from './services/orderService.js';
import { DepositService } from './services/depositService.js';
import { StatusService } from './services/statusService.js';
import { CommandRouter } from './core/router.js';
import { startWebhookServer } from './server/webhookServer.js';
import { startWhatsApp } from './core/connection.js';

const config = loadConfig();
assertConfig(config);

const logger = createLogger('main');
const store = new JsonStore(config.storage.file, {
  menu: config.menu
});
await store.load();

const notificationService = new NotificationService({
  store,
  logger: createLogger('notify')
});

const gateway = new MustikaPayment({
  config,
  logger: createLogger('mustika')
});

const jidService = new JidService({
  store,
  logger: createLogger('jid')
});

const fulfillmentService = new FulfillmentService({
  store,
  notificationService,
  config,
  logger: createLogger('fulfillment')
});

const paymentService = new PaymentService({
  store,
  gateway,
  fulfillmentService,
  notificationService,
  config,
  logger: createLogger('payment')
});

const services = {
  jid: jidService,
  menu: new MenuService({ store, config }),
  order: new OrderService({ store, paymentService, config }),
  deposit: new DepositService({ store, paymentService, config }),
  status: new StatusService({ store }),
  payment: paymentService,
  notification: notificationService
};

const router = new CommandRouter({
  store,
  services,
  config,
  logger: createLogger('router')
});

startWebhookServer({
  config,
  paymentService,
  gateway,
  logger: createLogger('webhook')
});

paymentService.startPolling();

await startWhatsApp({
  config,
  store,
  jidService,
  logger: createLogger('baileys'),
  onSocket(sock) {
    notificationService.setSocket(sock);
  },
  async onOpen() {
    notificationService.setConnected(true);
    await notificationService.flushQueued();
    await paymentService.pollPendingPayments();
  },
  async onClose(_sock, info) {
    notificationService.setConnected(false);
    if (info.loggedOut) {
      logger.warn('Session logout. Hapus folder sessions hanya jika ingin pairing ulang dari nol.');
    }
  },
  async onMessage(sock, event) {
    await router.handleUpsert(sock, event);
  }
});

logger.info('Bot siap. Gunakan /menu dari WhatsApp untuk mulai.');
