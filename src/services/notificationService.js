// Queue notifikasi agar callback payment tetap aman saat WA reconnect.
import { createId, nowIso } from '../utils/id.js';

export class NotificationService {
  constructor({ store, logger }) {
    this.store = store;
    this.logger = logger;
    this.sock = null;
    this.connected = false;
  }

  setSocket(sock) {
    this.sock = sock;
  }

  setConnected(connected) {
    this.connected = connected;
  }

  async sendText(jid, text) {
    if (this.sock && this.connected) {
      try {
        await this.sock.sendMessage(jid, { text });
        return;
      } catch (error) {
        this.logger.warn('Kirim notifikasi langsung gagal, masuk queue', error.message);
      }
    }

    await this.store.addNotification({
      id: createId('NTF'),
      jid,
      type: 'text',
      payload: { text },
      status: 'QUEUED',
      createdAt: nowIso()
    });
  }

  async flushQueued() {
    if (!this.sock || !this.connected) return;

    const queued = this.store.listQueuedNotifications();
    for (const item of queued) {
      try {
        if (item.type === 'text') {
          await this.sock.sendMessage(item.jid, { text: item.payload.text });
        }
        await this.store.markNotificationSent(item.id);
      } catch (error) {
        this.logger.warn('Gagal flush notification', item.id, error.message);
        break;
      }
    }
  }
}
