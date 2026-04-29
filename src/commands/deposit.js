// Command /deposit: membuat invoice deposit saldo.
export const depositCommand = {
  name: 'deposit',
  aliases: ['saldo'],
  async execute(ctx) {
    await ctx.services.deposit.showDepositOptions(ctx);
  }
};
