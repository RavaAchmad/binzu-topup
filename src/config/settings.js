// Konfigurasi utama bot. Edit file ini untuk setup cepat tanpa .env.
export const SETTINGS = {
  bot: {
    name: 'Binzu Topup',
    prefix: '.',
    logLevel: 'info',
    footer: 'Binzu Topup - fast, aman, otomatis',
    greeting: 'Selamat datang di layanan top up otomatis.'
  },
  owner: {
    name: 'Owner Binzu',
    numbers: [
      '6281234567890'
    ],
    lids: []
  },
  whatsapp: {
    sessionDir: './sessions/baileys',
    pairingPhone: ''
  },
  storage: {
    file: './data/db.json'
  },
  socket: {
    ignoreStatusBroadcast: true,
    enableEventSniff: false,
    eventSniffMaxChars: 600,
    emitOwnEvents: true,
    enableAutoSessionRecreation: true,
    enableRecentMessageCache: true,
    maxMsgRetryCount: 5,
    retryRequestDelayMs: 250,
    connectTimeoutMs: 20000,
    keepAliveIntervalMs: 30000,
    defaultQueryTimeoutMs: 60000,
    generateHighQualityLinkPreview: true,
    messageCacheTtlMs: 60 * 60 * 1000,
    messageCacheMax: 500
  },
  server: {
    port: 3000,
    publicWebhookUrl: 'https://domain-anda.com/webhooks/tripay'
  },
  pricing: {
    paymentStrategy: 'cheapest',
    fulfillmentStrategy: 'cheapest',
    manualPaymentChannel: 'QRIS2',
    manualFulfillmentProvider: 'digiflazz',
    passPaymentFeeToCustomer: true,
    providerTax: {
      digiflazz: { flat: 0, percent: 0 },
      moogold: { flat: 0, percent: 0 }
    }
  },
  payment: {
    gateway: 'tripay',
    mock: true,
    mode: 'sandbox',
    sandboxBaseUrl: 'https://tripay.co.id/api-sandbox',
    productionBaseUrl: 'https://tripay.co.id/api',
    merchantCode: 'T0001',
    apiKey: 'ISI_API_KEY_TRIPAY',
    privateKey: 'ISI_PRIVATE_KEY_TRIPAY',
    createPath: '/transaction/create',
    detailPath: '/transaction/detail',
    channelPath: '/merchant/payment-channel',
    instructionPath: '/payment/instruction',
    signatureHeader: 'x-callback-signature',
    callbackEventHeader: 'x-callback-event',
    allowedChannels: ['QRIS2', 'QRISC', 'QRIS', 'BRIVA', 'BNIVA', 'MANDIRIVA', 'PERMATAVA', 'INDOMARET'],
    fallbackChannel: 'QRIS2',
    feeCacheTtlMs: 10 * 60 * 1000,
    pollingEnabled: true,
    pollIntervalMs: 30000,
    invoiceTtlMinutes: 15,
    mockAutoPaySeconds: 0
  },
  providers: {
    digiflazz: {
      enabled: true,
      mock: true,
      username: 'ISI_USERNAME_DIGIFLAZZ',
      apiKey: 'ISI_API_KEY_DIGIFLAZZ',
      baseUrl: 'https://api.digiflazz.com/v1',
      transactionPath: '/transaction',
      priceListPath: '/price-list',
      testing: true,
      callbackUrl: ''
    },
    moogold: {
      enabled: true,
      mock: true,
      partnerId: 'ISI_PARTNER_ID_MOOGOLD',
      secret: 'ISI_SECRET_MOOGOLD',
      baseUrl: 'https://moogold.com/wp-json/v1/api',
      orderPath: '/order/create_order',
      productPath: '/product/list_product',
      orderStatusPath: '/order/order_detail',
      currency: 'IDR'
    }
  },
  order: {
    cooldownMs: 15000
  },
  autoOrder: {
    mode: 'mock',
    baseUrl: 'https://provider-topup.example',
    apiKey: 'ISI_API_KEY_PROVIDER',
    path: '/orders',
    simulatedDelayMs: 1500
  },
  deposit: {
    amounts: [10000, 25000, 50000, 100000]
  },
  menu: {
    style: 'decorated',
    title: 'BINZU TOPUP',
    subtitle: 'Top up game, pulsa, dan deposit saldo otomatis.',
    banner: 'Pilih menu dari tombol/list di bawah.',
    footer: 'Transaksi pending akan dicek otomatis.',
    experimentalAlbum: false,
    media: {
      enabled: true,
      type: 'image',
      url: '',
      path: '',
      caption: 'BINZU TOPUP - layanan digital otomatis',
      album: []
    },
    cta: {
      ownerCall: '+6281234567890',
      ownerUrl: 'https://wa.me/6281234567890',
      copyCode: 'BINZU'
    },
    sections: [
      {
        title: 'Layanan Utama',
        rows: [
          {
            id: 'topup',
            title: 'Top Up / Order',
            description: 'Beli produk digital dan bayar otomatis.',
            action: 'menu:order'
          },
          {
            id: 'status',
            title: 'Cek Status',
            description: 'Pantau invoice dan proses order.',
            action: 'menu:status'
          },
          {
            id: 'deposit',
            title: 'Deposit Saldo',
            description: 'Isi saldo akun via invoice payment.',
            action: 'menu:deposit'
          }
        ]
      },
      {
        title: 'Bantuan',
        rows: [
          {
            id: 'owner',
            title: 'Hubungi Owner',
            description: 'Butuh bantuan manual atau komplain transaksi.',
            action: 'menu:owner'
          }
        ]
      }
    ],
    quickReplies: [
      { id: 'menu:order', text: 'Order' },
      { id: 'menu:status', text: 'Status' },
      { id: 'menu:deposit', text: 'Deposit' }
    ]
  }
};
