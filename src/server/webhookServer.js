// HTTP endpoint untuk callback MustikaPayment dan simulasi mock.
import express from 'express';

export function startWebhookServer({ config, paymentService, gateway, logger }) {
  const app = express();

  app.use(express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: config.bot.name });
  });

  app.post('/webhooks/mustika', async (req, res) => {
    try {
      const result = await paymentService.handleWebhook({
        payload: req.body,
        rawBody: req.rawBody,
        headers: req.headers
      });
      res.json({ ok: true, result });
    } catch (error) {
      logger.warn('Webhook MustikaPayment ditolak', error.message);
      res.status(error.statusCode || 500).json({
        ok: false,
        message: error.message
      });
    }
  });

  app.post('/mock/mustika/:invoiceId/pay', async (req, res) => {
    if (!config.payment.mock) return res.status(404).json({ ok: false });
    const event = gateway.setMockStatus(req.params.invoiceId, 'PAID');
    const result = await paymentService.applyPaymentStatus({
      invoiceId: event.invoiceId,
      status: event.status,
      paidAt: event.paidAt,
      raw: event.raw,
      source: 'mock'
    });
    res.json({ ok: true, result });
  });

  app.post('/mock/mustika/:invoiceId/expire', async (req, res) => {
    if (!config.payment.mock) return res.status(404).json({ ok: false });
    const event = gateway.setMockStatus(req.params.invoiceId, 'EXPIRED');
    const result = await paymentService.applyPaymentStatus({
      invoiceId: event.invoiceId,
      status: event.status,
      raw: event.raw,
      source: 'mock'
    });
    res.json({ ok: true, result });
  });

  const server = app.listen(config.server.port, () => {
    logger.info(`Webhook server aktif di port ${config.server.port}`);
  });

  return server;
}
