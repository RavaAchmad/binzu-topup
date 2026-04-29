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
    publicWebhookUrl: 'https://domain-anda.com/webhooks/mustika'
  },
  payment: {
    mock: true,
    baseUrl: 'https://api.mustikapayment.example',
    apiKey: 'ISI_API_KEY_MUSTIKA',
    apiSecret: 'ISI_API_SECRET_MUSTIKA',
    createPath: '/transactions',
    statusPath: '/transactions/{invoiceId}',
    signatureHeader: 'x-mustika-signature',
    webhookSecret: 'ISI_WEBHOOK_SECRET_MUSTIKA',
    pollingEnabled: true,
    pollIntervalMs: 30000,
    invoiceTtlMinutes: 15,
    mockAutoPaySeconds: 0
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
