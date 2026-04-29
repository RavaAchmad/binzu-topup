// Router event messages.upsert menuju command dan service flow.
import { menuCommand } from '../commands/menu.js';
import { orderCommand } from '../commands/order.js';
import { statusCommand } from '../commands/status.js';
import { depositCommand } from '../commands/deposit.js';
import {
  addMenuCommand,
  deleteMenuCommand,
  menuListCommand,
  ownerMenuCommand,
  resetMenuCommand,
  setMenuCommand,
  setQuickMenuCommand
} from '../commands/menuAdmin.js';
import { pricingCommand, resetPricingCommand, setPricingCommand } from '../commands/pricingAdmin.js';
import { parseIncomingMessage } from './parser.js';
import { MemoryLocks } from '../utils/locks.js';

const commandList = [
  menuCommand,
  orderCommand,
  statusCommand,
  depositCommand,
  ownerMenuCommand,
  menuListCommand,
  setMenuCommand,
  addMenuCommand,
  deleteMenuCommand,
  setQuickMenuCommand,
  resetMenuCommand,
  pricingCommand,
  setPricingCommand,
  resetPricingCommand
];

export class CommandRouter {
  constructor({ store, services, config, logger }) {
    this.store = store;
    this.services = services;
    this.config = config;
    this.logger = logger;
    this.locks = new MemoryLocks();
    this.commands = new Map();

    for (const command of commandList) {
      this.commands.set(command.name, command);
      for (const alias of command.aliases || []) this.commands.set(alias, command);
    }
  }

  async handleUpsert(sock, event) {
    if (event.type && event.type !== 'notify') return;

    for (const message of event.messages || []) {
      await this.handleMessage(sock, message);
    }
  }

  async handleMessage(sock, message) {
    const parsed = parseIncomingMessage(message, this.config);
    if (!parsed.jid || parsed.fromMe) return;
    if (this.config.socket.ignoreStatusBroadcast && parsed.jid === 'status@broadcast') return;

    const identity = await this.services.jid.resolveMessage(message);
    parsed.jid = identity.chatJid || parsed.jid;
    parsed.userJid = identity.userJid || parsed.jid;
    parsed.sender = identity.senderJid || parsed.sender;
    parsed.senderAlt = identity.participantAlt || identity.remoteJidAlt || parsed.senderAlt;
    parsed.remoteJidAlt = identity.remoteJidAlt;
    parsed.participant = identity.participant;
    parsed.participantAlt = identity.participantAlt;

    await this.store.rememberMessage(message, 'incoming');

    const isFresh = await this.store.markMessageProcessed(parsed.messageId);
    if (!isFresh) return;

    await this.store.upsertUser(parsed.userJid, {
      jid: parsed.userJid,
      lastChatJid: parsed.jid
    });

    const ctx = {
      ...parsed,
      sock,
      config: this.config,
      store: this.store,
      services: this.services,
      router: this
    };

    try {
      if (parsed.buttonId) {
        const lockKey = `${parsed.userJid}:${parsed.buttonId}`;
        if (!this.locks.acquire(lockKey, 3000)) return;
        await this.handleAction(ctx, parsed.buttonId);
        return;
      }

      if (parsed.isCommand) {
        await this.dispatchCommand(ctx, parsed.command);
        return;
      }

      if (await this.services.order.handleTargetInput(ctx, parsed.text)) return;
      if (await this.services.deposit.handleAmountInput(ctx, parsed.text)) return;

      await menuCommand.execute(ctx);
    } catch (error) {
      this.logger.error('Handler pesan gagal', error);
      await sock.sendMessage(parsed.jid, {
        text: 'Maaf, sistem sedang bermasalah. Coba lagi beberapa saat.'
      }, { quoted: parsed.raw });
    }
  }

  async dispatchCommand(ctx, commandName) {
    const command = this.commands.get(commandName) || menuCommand;
    await command.execute(ctx);
  }

  async handleAction(ctx, action) {
    if (action.startsWith('dynamic:')) return this.services.menu.runDynamicAction(ctx, action.slice('dynamic:'.length));
    if (action === 'menu:order') return this.services.order.showProducts(ctx);
    if (action === 'menu:status') return this.services.status.showStatus(ctx);
    if (action === 'menu:deposit') return this.services.deposit.showDepositOptions(ctx);
    if (action === 'menu:owner') return this.services.menu.runAction(ctx, action);
    if (action === 'flow:cancel') {
      await this.store.upsertUser(ctx.userJid, { flow: null });
      await ctx.sock.sendMessage(ctx.jid, { text: 'Flow dibatalkan. Ketik /menu untuk mulai lagi.' }, { quoted: ctx.raw });
      return;
    }

    const [scope, type, ...rest] = action.split(':');
    if (scope === 'order' && type === 'product') {
      return this.services.order.selectProduct(ctx, rest[0]);
    }

    if (scope === 'order' && type === 'package') {
      return this.services.order.selectPackage(ctx, rest[0], rest[1]);
    }

    if (scope === 'deposit' && type === 'amount') {
      return this.services.deposit.selectAmount(ctx, Number(rest[0]));
    }

    await menuCommand.execute(ctx);
  }
}
