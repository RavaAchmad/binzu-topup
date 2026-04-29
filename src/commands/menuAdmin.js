// Command owner-only untuk mengatur menu interaktif dari WhatsApp.
import { requireOwner } from '../utils/owner.js';
import { sanitizeText } from '../utils/format.js';

function commandBody(ctx) {
  const prefix = ctx.input.startsWith(ctx.config.bot.prefix) ? ctx.config.bot.prefix : '/';
  const withoutPrefix = ctx.input.startsWith(prefix) ? ctx.input.slice(prefix.length) : ctx.input;
  const [, ...rest] = withoutPrefix.split(/\s+/);
  return rest.join(' ').trim();
}

async function guardOwner(ctx) {
  if (requireOwner(ctx)) return true;
  await ctx.sock.sendMessage(ctx.jid, { text: 'Command ini khusus owner.' }, { quoted: ctx.raw });
  return false;
}

function splitPipe(value) {
  return value.split('|').map((item) => item.trim());
}

function helpText(ctx) {
  return [
    'Owner Menu Manager',
    '',
    `${ctx.config.bot.prefix}menulist`,
    `${ctx.config.bot.prefix}setmenu title|Judul Menu Baru`,
    `${ctx.config.bot.prefix}setmenu subtitle|Deskripsi singkat`,
    `${ctx.config.bot.prefix}setmenu banner|Kalimat pembuka`,
    `${ctx.config.bot.prefix}setmenu footer|Footer menu`,
    `${ctx.config.bot.prefix}addmenu id|Judul|Deskripsi|aksi|Section`,
    `${ctx.config.bot.prefix}delmenu id`,
    `${ctx.config.bot.prefix}setquick Order|menu:order,Status|menu:status,Deposit|menu:deposit`,
    `${ctx.config.bot.prefix}resetmenu`,
    '',
    'Aksi bawaan:',
    'menu:order, menu:status, menu:deposit, menu:owner',
    'command:order, command:deposit, text:isi pesan'
  ].join('\n');
}

export const ownerMenuCommand = {
  name: 'owner',
  aliases: ['ownermenu', 'adminmenu'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;
    await ctx.sock.sendMessage(ctx.jid, { text: helpText(ctx) }, { quoted: ctx.raw });
  }
};

export const menuListCommand = {
  name: 'menulist',
  aliases: ['listmenu'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;
    const menu = ctx.store.getMenuConfig();
    const lines = [
      `Menu: ${menu.title}`,
      `Subtitle: ${menu.subtitle || '-'}`,
      '',
      'Daftar item:'
    ];

    for (const section of menu.sections || []) {
      lines.push(`- ${section.title}`);
      for (const row of section.rows || []) {
        lines.push(`  ${row.id} | ${row.title} | ${row.action}`);
      }
    }

    await ctx.sock.sendMessage(ctx.jid, { text: lines.join('\n') }, { quoted: ctx.raw });
  }
};

export const setMenuCommand = {
  name: 'setmenu',
  aliases: ['menuset'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;

    const [field, ...valueParts] = splitPipe(commandBody(ctx));
    const value = valueParts.join('|').trim();
    const allowed = new Set(['title', 'subtitle', 'banner', 'footer']);

    if (!allowed.has(field) || !value) {
      await ctx.sock.sendMessage(ctx.jid, { text: helpText(ctx) }, { quoted: ctx.raw });
      return;
    }

    const nextMenu = await ctx.store.updateMenuConfig({
      [field]: sanitizeText(value, 220)
    });

    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        `Menu ${field} diperbarui.`,
        `Nilai baru: ${nextMenu[field]}`
      ].join('\n')
    }, { quoted: ctx.raw });
  }
};

export const addMenuCommand = {
  name: 'addmenu',
  aliases: ['menutambah'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;

    const [id, title, description, action, sectionTitle = 'Custom Menu'] = splitPipe(commandBody(ctx));
    if (!id || !title || !action) {
      await ctx.sock.sendMessage(ctx.jid, { text: helpText(ctx) }, { quoted: ctx.raw });
      return;
    }

    const row = {
      id: sanitizeText(id, 32).toLowerCase().replace(/\s+/g, '_'),
      title: sanitizeText(title, 60),
      description: sanitizeText(description || action, 90),
      action: action.trim()
    };

    await ctx.store.addMenuRow(row, sanitizeText(sectionTitle, 50));
    await ctx.sock.sendMessage(ctx.jid, {
      text: [
        'Item menu disimpan.',
        `${row.id} | ${row.title} | ${row.action}`,
        'Ketik /menu untuk melihat hasil.'
      ].join('\n')
    }, { quoted: ctx.raw });
  }
};

export const deleteMenuCommand = {
  name: 'delmenu',
  aliases: ['hapusmenu'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;

    const rowId = sanitizeText(commandBody(ctx), 32).toLowerCase();
    if (!rowId) {
      await ctx.sock.sendMessage(ctx.jid, { text: `${ctx.config.bot.prefix}delmenu id_menu` }, { quoted: ctx.raw });
      return;
    }

    const result = await ctx.store.deleteMenuRow(rowId);
    await ctx.sock.sendMessage(ctx.jid, {
      text: result.deleted ? `Item menu ${rowId} dihapus.` : `Item menu ${rowId} tidak ditemukan.`
    }, { quoted: ctx.raw });
  }
};

export const setQuickMenuCommand = {
  name: 'setquick',
  aliases: ['setbutton'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;

    const body = commandBody(ctx);
    const quickReplies = body
      .split(',')
      .map((pair) => splitPipe(pair))
      .filter(([text, action]) => text && action)
      .slice(0, 3)
      .map(([text, action]) => ({
        text: sanitizeText(text, 20),
        id: action.trim()
      }));

    if (!quickReplies.length) {
      await ctx.sock.sendMessage(ctx.jid, { text: helpText(ctx) }, { quoted: ctx.raw });
      return;
    }

    await ctx.store.updateMenuConfig({ quickReplies });
    await ctx.sock.sendMessage(ctx.jid, { text: 'Quick button menu diperbarui.' }, { quoted: ctx.raw });
  }
};

export const resetMenuCommand = {
  name: 'resetmenu',
  aliases: ['menureset'],
  async execute(ctx) {
    if (!(await guardOwner(ctx))) return;
    await ctx.store.resetMenuConfig();
    await ctx.sock.sendMessage(ctx.jid, { text: 'Menu dikembalikan ke konfigurasi default settings.js.' }, { quoted: ctx.raw });
  }
};
