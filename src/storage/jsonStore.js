// Lightweight JSON DB dengan write queue agar update async tidak saling tabrak.
import fs from 'node:fs/promises';
import path from 'node:path';
import { nowIso } from '../utils/id.js';

const DEFAULT_DATA = {
  users: {},
  orders: {},
  payments: {},
  contacts: {},
  jidAliases: {},
  recentMessages: {},
  menu: null,
  notifications: [],
  dedup: {
    messages: {}
  }
};

function findActiveOrderInData(data, jid) {
  const blockingStatuses = new Set(['PENDING_PAYMENT', 'PAID', 'PROCESSING']);
  const now = Date.now();
  const canonical = resolveAliasInData(data, jid);
  return Object.values(data.orders).find((order) => {
    const orderUser = resolveAliasInData(data, order.userJid || order.jid);
    if (orderUser !== canonical) return false;
    if (!blockingStatuses.has(order.status)) return false;
    if (order.status === 'PENDING_PAYMENT' && order.expiresAt && new Date(order.expiresAt).getTime() <= now) {
      return false;
    }
    return true;
  }) || null;
}

function resolveAliasInData(data, jid) {
  if (!jid) return jid;
  return data.jidAliases?.[jid] || jid;
}

function messageKeyParts(key = {}) {
  return [
    key.id,
    key.remoteJid && key.id ? `${key.remoteJid}:${key.id}` : '',
    key.participant && key.id ? `${key.participant}:${key.id}` : '',
    key.remoteJidAlt && key.id ? `${key.remoteJidAlt}:${key.id}` : '',
    key.participantAlt && key.id ? `${key.participantAlt}:${key.id}` : ''
  ].filter(Boolean);
}

function jsonSafeClone(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === 'bigint') return item.toString();
    if (Buffer.isBuffer(item)) return item.toString('base64');
    return item;
  }));
}

function mergeUserIntoCanonical(data, canonicalJid, aliases = []) {
  for (const alias of aliases) {
    const existingCanonical = data.jidAliases?.[alias];
    const existingUser = data.users[alias] || (existingCanonical ? data.users[existingCanonical] : null);
    if (!existingUser || alias === canonicalJid || existingCanonical === canonicalJid) continue;

    const current = data.users[canonicalJid] || {
      jid: canonicalJid,
      balance: 0,
      flow: null,
      createdAt: existingUser.createdAt || nowIso()
    };
    data.users[canonicalJid] = {
      ...existingUser,
      ...current,
      jid: canonicalJid,
      balance: Math.max(Number(current.balance || 0), Number(existingUser.balance || 0)),
      flow: current.flow || existingUser.flow || null,
      updatedAt: nowIso()
    };
  }
}

function mergeMenu(defaultMenu, storedMenu) {
  if (!defaultMenu) return storedMenu || null;
  if (!storedMenu) return structuredClone(defaultMenu);
  return {
    ...structuredClone(defaultMenu),
    ...storedMenu,
    media: {
      ...(defaultMenu.media || {}),
      ...(storedMenu.media || {})
    },
    cta: {
      ...(defaultMenu.cta || {}),
      ...(storedMenu.cta || {})
    },
    sections: storedMenu.sections || defaultMenu.sections || [],
    quickReplies: storedMenu.quickReplies || defaultMenu.quickReplies || []
  };
}

export class JsonStore {
  constructor(file, defaults = {}) {
    this.file = file;
    this.defaultMenu = defaults.menu || null;
    this.data = {
      ...structuredClone(DEFAULT_DATA),
      menu: this.defaultMenu ? structuredClone(this.defaultMenu) : null
    };
    this.writeQueue = Promise.resolve();
  }

  async load() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });

    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = {
        ...structuredClone(DEFAULT_DATA),
        ...parsed,
        contacts: parsed.contacts || {},
        jidAliases: parsed.jidAliases || {},
        recentMessages: parsed.recentMessages || {},
        menu: mergeMenu(this.defaultMenu, parsed.menu),
        dedup: {
          ...DEFAULT_DATA.dedup,
          ...(parsed.dedup || {})
        }
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.save();
    }
  }

  async save() {
    const tmpFile = `${this.file}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(this.data, null, 2));
    await fs.rename(tmpFile, this.file);
  }

  async write(mutator) {
    const run = this.writeQueue.catch(() => undefined).then(async () => {
      const result = await mutator(this.data);
      await this.save();
      return result;
    });

    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  snapshot() {
    return structuredClone(this.data);
  }

  getUser(jid) {
    return this.data.users[this.resolveJid(jid)] || null;
  }

  async upsertUser(jid, patch = {}) {
    const canonicalJid = this.resolveJid(jid);
    return this.write((data) => {
      const current = data.users[canonicalJid] || {
        jid: canonicalJid,
        balance: 0,
        flow: null,
        createdAt: nowIso()
      };
      data.users[canonicalJid] = {
        ...current,
        ...patch,
        jid: canonicalJid,
        updatedAt: nowIso()
      };
      return data.users[canonicalJid];
    });
  }

  getOrder(orderId) {
    return this.data.orders[orderId] || null;
  }

  getOrderByInvoice(invoiceId) {
    return Object.values(this.data.orders).find((order) => order.invoiceId === invoiceId) || null;
  }

  getPayment(invoiceId) {
    return this.data.payments[invoiceId] || null;
  }

  findActiveOrderByUser(jid) {
    return findActiveOrderInData(this.data, jid);
  }

  resolveJid(jid) {
    return resolveAliasInData(this.data, jid);
  }

  async upsertJidAlias({ canonicalJid, aliases = [], phoneNumber = '', lid = '', pn = '', pushName = '' }) {
    if (!canonicalJid) return null;
    const cleanAliases = [...new Set([canonicalJid, lid, pn, ...aliases].filter(Boolean))];

    return this.write((data) => {
      data.contacts[canonicalJid] = {
        ...(data.contacts[canonicalJid] || {}),
        id: canonicalJid,
        aliases: cleanAliases,
        phoneNumber: phoneNumber || data.contacts[canonicalJid]?.phoneNumber || '',
        lid: lid || data.contacts[canonicalJid]?.lid || '',
        pn: pn || data.contacts[canonicalJid]?.pn || '',
        pushName: pushName || data.contacts[canonicalJid]?.pushName || '',
        updatedAt: nowIso()
      };

      for (const alias of cleanAliases) {
        data.jidAliases[alias] = canonicalJid;
      }

      mergeUserIntoCanonical(data, canonicalJid, cleanAliases);

      if (!data.users[canonicalJid]) {
        data.users[canonicalJid] = {
          jid: canonicalJid,
          balance: 0,
          flow: null,
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
      }

      return data.contacts[canonicalJid];
    });
  }

  async upsertJidMappings(pairs = []) {
    if (!pairs.length) return [];

    return this.write((data) => {
      const saved = [];
      for (const pair of pairs) {
        const lid = pair.lid;
        const pn = pair.pn;
        const canonicalJid = lid || pn;
        if (!canonicalJid) continue;
        const aliases = [...new Set([lid, pn].filter(Boolean))];
        data.contacts[canonicalJid] = {
          ...(data.contacts[canonicalJid] || {}),
          id: canonicalJid,
          aliases,
          lid,
          pn,
          phoneNumber: pn ? pn.split('@')[0].split(':')[0].replace(/\D/g, '') : data.contacts[canonicalJid]?.phoneNumber || '',
          updatedAt: nowIso()
        };
        for (const alias of aliases) data.jidAliases[alias] = canonicalJid;
        mergeUserIntoCanonical(data, canonicalJid, aliases);
        saved.push(data.contacts[canonicalJid]);
      }
      return saved;
    });
  }

  async upsertContact(contact = {}) {
    const id = contact.id || contact.jid || contact.lid || contact.phoneNumber;
    if (!id) return null;
    return this.upsertJidAlias({
      canonicalJid: contact.lid || contact.id || contact.jid,
      aliases: [contact.id, contact.jid, contact.lid, contact.phoneNumber && `${contact.phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`].filter(Boolean),
      phoneNumber: contact.phoneNumber || '',
      lid: contact.lid || '',
      pn: contact.phoneNumber ? `${contact.phoneNumber.replace(/\D/g, '')}@s.whatsapp.net` : '',
      pushName: contact.name || contact.notify || contact.pushName || ''
    });
  }

  getMessageForRetry(key = {}) {
    for (const part of messageKeyParts(key)) {
      const record = this.data.recentMessages[part];
      if (record?.message) return record.message;
    }
    return undefined;
  }

  async rememberMessage(waMessage, source = 'unknown') {
    if (!waMessage?.key?.id || !waMessage.message) return null;

    return this.write((data) => {
      const timestamp = Date.now();
      const record = {
        key: jsonSafeClone(waMessage.key),
        message: jsonSafeClone(waMessage.message),
        source,
        timestamp
      };

      for (const part of messageKeyParts(waMessage.key)) {
        data.recentMessages[part] = record;
      }

      const entries = Object.entries(data.recentMessages)
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
      data.recentMessages = Object.fromEntries(entries.slice(0, 1000));
      return record;
    });
  }

  listPendingPayments() {
    return Object.values(this.data.payments).filter((payment) => payment.status === 'PENDING');
  }

  getMenuConfig() {
    return mergeMenu(this.defaultMenu, this.data.menu) || DEFAULT_DATA.menu;
  }

  async resetMenuConfig() {
    return this.write((data) => {
      data.menu = this.defaultMenu ? structuredClone(this.defaultMenu) : null;
      return data.menu;
    });
  }

  async updateMenuConfig(patch) {
    return this.write((data) => {
      data.menu = {
        ...(data.menu || this.defaultMenu || {}),
        ...patch,
        updatedAt: nowIso()
      };
      return data.menu;
    });
  }

  async addMenuRow(row, sectionTitle = 'Custom Menu') {
    return this.write((data) => {
      const menu = data.menu || structuredClone(this.defaultMenu) || { sections: [] };
      menu.sections ||= [];
      let section = menu.sections.find((item) => item.title.toLowerCase() === sectionTitle.toLowerCase());
      if (!section) {
        section = { title: sectionTitle, rows: [] };
        menu.sections.push(section);
      }

      const existingIndex = section.rows.findIndex((item) => item.id === row.id);
      if (existingIndex >= 0) section.rows[existingIndex] = row;
      else section.rows.push(row);

      data.menu = {
        ...menu,
        updatedAt: nowIso()
      };
      return data.menu;
    });
  }

  async deleteMenuRow(rowId) {
    return this.write((data) => {
      const menu = data.menu || structuredClone(this.defaultMenu) || { sections: [] };
      menu.sections ||= [];
      let deleted = false;
      menu.sections = menu.sections
        .map((section) => {
          const rows = section.rows.filter((row) => row.id !== rowId);
          if (rows.length !== section.rows.length) deleted = true;
          return { ...section, rows };
        })
        .filter((section) => section.rows.length > 0);

      data.menu = {
        ...menu,
        updatedAt: nowIso()
      };
      return { menu: data.menu, deleted };
    });
  }

  async createOrder(order) {
    return this.write((data) => {
      data.orders[order.id] = order;
      return order;
    });
  }

  async createOrderIfNoActive(order) {
    return this.write((data) => {
      const active = findActiveOrderInData(data, order.userJid || order.jid);
      if (active) {
        return {
          created: false,
          active
        };
      }

      data.orders[order.id] = order;
      return {
        created: true,
        order
      };
    });
  }

  async updateOrder(orderId, patch) {
    return this.write((data) => {
      if (!data.orders[orderId]) return null;
      data.orders[orderId] = {
        ...data.orders[orderId],
        ...patch,
        updatedAt: nowIso()
      };
      return data.orders[orderId];
    });
  }

  async createPayment(payment) {
    return this.write((data) => {
      data.payments[payment.invoiceId] = payment;
      return payment;
    });
  }

  async updatePayment(invoiceId, patch) {
    return this.write((data) => {
      if (!data.payments[invoiceId]) return null;
      data.payments[invoiceId] = {
        ...data.payments[invoiceId],
        ...patch,
        updatedAt: nowIso()
      };
      return data.payments[invoiceId];
    });
  }

  async markMessageProcessed(messageId, ttlMs = 24 * 60 * 60 * 1000) {
    if (!messageId) return true;
    const now = Date.now();

    return this.write((data) => {
      const messages = data.dedup.messages || {};
      for (const [id, timestamp] of Object.entries(messages)) {
        if (now - timestamp > ttlMs) delete messages[id];
      }

      if (messages[messageId]) return false;
      messages[messageId] = now;
      data.dedup.messages = messages;
      return true;
    });
  }

  async addNotification(notification) {
    return this.write((data) => {
      data.notifications.push(notification);
      return notification;
    });
  }

  async markNotificationSent(notificationId) {
    return this.write((data) => {
      const item = data.notifications.find((notification) => notification.id === notificationId);
      if (item) {
        item.status = 'SENT';
        item.sentAt = nowIso();
      }
      return item || null;
    });
  }

  listQueuedNotifications() {
    return this.data.notifications.filter((notification) => notification.status === 'QUEUED');
  }
}
