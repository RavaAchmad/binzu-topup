// Command /menu: pintu utama flow interactive.
export const menuCommand = {
  name: 'menu',
  aliases: ['start', 'help'],
  async execute(ctx) {
    await ctx.services.menu.showMain(ctx);
  }
};
