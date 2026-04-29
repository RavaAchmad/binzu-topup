// Service menu interaktif: tampilan utama dan eksekusi item menu dinamis.
import { sendDecoratedMenu, sendSingleSelect } from '../core/buttons.js';
import { formatRupiah } from '../utils/format.js';
import { ownerMention } from '../utils/owner.js';

export class MenuService {
  constructor({ store, config }) {
    this.store = store;
    this.config = config;
  }

  async showMain(ctx) {
    const menu = this.store.getMenuConfig();
    const user = this.store.getUser(ctx.userJid);
    const active = this.store.findActiveOrderByUser(ctx.userJid);
    const displayName = ctx.pushName || ctx.jid.split('@')[0];

    const payload = {
      text: [
        `*${menu.title || this.config.bot.name}*`,
        menu.subtitle || this.config.bot.greeting,
        '',
        `Halo, ${displayName}`,
        `Saldo: ${formatRupiah(user?.balance || 0)}`,
        `Transaksi aktif: ${active ? active.status : 'Tidak ada'}`,
        '',
        menu.banner || 'Pilih layanan dari menu interaktif.'
      ].join('\n'),
      footer: menu.footer || this.config.bot.footer,
      title: 'Buka Menu',
      sections: this.buildSections(menu),
      quickReplies: menu.quickReplies || [],
      cta: this.buildCta(menu)
    };

    if (menu.style === 'decorated') {
      await sendDecoratedMenu(ctx.sock, ctx.jid, {
        ...payload,
        media: menu.media,
        experimentalAlbum: menu.experimentalAlbum
      }, { quoted: ctx.raw });
      return;
    }

    await sendSingleSelect(ctx.sock, ctx.jid, payload, { quoted: ctx.raw });
  }

  buildSections(menu) {
    return (menu.sections || []).map((section) => ({
      title: section.title,
      rows: (section.rows || []).map((row) => ({
        id: `dynamic:${row.id}`,
        title: row.title,
        description: row.description || row.action || ''
      }))
    }));
  }

  buildCta(menu) {
    const items = [];
    if (menu.cta?.ownerUrl) items.push({ type: 'url', text: 'Owner', url: menu.cta.ownerUrl });
    if (menu.cta?.ownerCall) items.push({ type: 'call', text: 'Telepon Owner', phoneNumber: menu.cta.ownerCall });
    if (menu.cta?.copyCode) items.push({ type: 'copy', text: 'Copy Kode', copyCode: menu.cta.copyCode });
    return items;
  }

  findRow(rowId) {
    const menu = this.store.getMenuConfig();
    for (const section of menu.sections || []) {
      const row = (section.rows || []).find((item) => item.id === rowId);
      if (row) return row;
    }
    return null;
  }

  async runDynamicAction(ctx, rowId) {
    const row = this.findRow(rowId);
    if (!row) {
      await ctx.sock.sendMessage(ctx.jid, { text: 'Menu tidak ditemukan. Silakan buka /menu lagi.' }, { quoted: ctx.raw });
      return;
    }

    await this.runAction(ctx, row.action, row);
  }

  async runAction(ctx, action, row = null) {
    if (!action) {
      await ctx.sock.sendMessage(ctx.jid, { text: row?.description || 'Menu belum memiliki aksi.' }, { quoted: ctx.raw });
      return;
    }

    if (action === 'menu:order') return ctx.services.order.showProducts(ctx);
    if (action === 'menu:status') return ctx.services.status.showStatus(ctx);
    if (action === 'menu:deposit') return ctx.services.deposit.showDepositOptions(ctx);
    if (action === 'menu:owner') {
      await ctx.sock.sendMessage(ctx.jid, {
        text: [
          'Bantuan owner:',
          ownerMention(ctx.config)
        ].join('\n')
      }, { quoted: ctx.raw });
      return;
    }

    if (action.startsWith('command:')) {
      const commandName = action.slice('command:'.length).replace(/^\W+/, '').trim();
      await ctx.router.dispatchCommand(ctx, commandName);
      return;
    }

    if (action.startsWith('text:')) {
      await ctx.sock.sendMessage(ctx.jid, { text: action.slice('text:'.length).trim() }, { quoted: ctx.raw });
      return;
    }

    await ctx.sock.sendMessage(ctx.jid, { text: action }, { quoted: ctx.raw });
  }
}
