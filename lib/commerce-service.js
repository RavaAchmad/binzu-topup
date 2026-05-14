export const COMMERCE_NS = 'commerce'

export const PAYMENT_PROVIDER_ENV = [
  'MUSTIKAPAYMENT_API_KEY',
  'MUSTIKAPAYMENT_MERCHANT_ID',
  'MUSTIKAPAYMENT_CALLBACK_SECRET'
]

export const PRODUCT_CATEGORIES = [
  {
    id: 'game',
    title: 'Game Top Up',
    description: 'Diamond, coins, voucher, and other game balance products.'
  },
  {
    id: 'digital',
    title: 'Digital Services',
    description: 'Pulsa, data package, digital voucher, and online services.'
  },
  {
    id: 'premium',
    title: 'Premium Bot Access',
    description: 'Premium user access, rental bot, group access, and limit packs.'
  }
]

export function getCommerceStore(db = global.db) {
  if (!db) db = { data: {} }
  if (!db.data || typeof db.data !== 'object') db.data = {}
  if (!db.data[COMMERCE_NS] || typeof db.data[COMMERCE_NS] !== 'object') {
    db.data[COMMERCE_NS] = {}
  }

  const store = db.data[COMMERCE_NS]
  if (!store.orders || typeof store.orders !== 'object') store.orders = {}
  if (!store.deposits || typeof store.deposits !== 'object') store.deposits = {}
  if (!store.customers || typeof store.customers !== 'object') store.customers = {}
  if (!store.settings || typeof store.settings !== 'object') {
    store.settings = {
      paymentProvider: 'manual',
      paymentGatewayConnected: false,
      createdAt: Date.now()
    }
  }

  return store
}

export function getCommerceStatus(userId, db = global.db) {
  const store = getCommerceStore(db)
  const orders = Object.values(store.orders).filter(order => order?.userId === userId)
  const deposits = Object.values(store.deposits).filter(deposit => deposit?.userId === userId)
  return {
    orders,
    deposits,
    gatewayConnected: Boolean(store.settings.paymentGatewayConnected),
    paymentProvider: store.settings.paymentProvider || 'manual'
  }
}

export function buildOrderIntro(prefix = '.', categoryId = '') {
  const category = PRODUCT_CATEGORIES.find(item => item.id === normalizeId(categoryId))
  const categoryText = category
    ? [
        `Selected category: ${category.title}`,
        category.description,
        '',
        'Current phase: catalog and invoice foundation.',
        'Next integration: product SKU, price validation, invoice creation, and payment callback.'
      ].join('\n')
    : [
        'Choose a product category to start the order flow.',
        'This foundation release prepares the flow without creating fake transactions.'
      ].join('\n')

  return {
    text: [
      '*BINZU COMMERCE*',
      '',
      'All-in-one WhatsApp commerce assistant for digital products, deposit balance, premium access, and community automation.',
      '',
      categoryText,
      '',
      'Available foundation commands:',
      `- ${prefix}order / ${prefix}topup`,
      `- ${prefix}deposit`,
      `- ${prefix}cekstatus / ${prefix}statusorder`
    ].join('\n'),
    footer: 'BinzuV3 Commerce',
    buttons: [
      quick('Game Top Up', `${prefix}order game`),
      quick('Digital Services', `${prefix}order digital`),
      quick('Premium Access', `${prefix}order premium`),
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: 'Product Categories',
          sections: [{
            title: 'Commerce Catalog',
            rows: PRODUCT_CATEGORIES.map(item => ({
              id: `${prefix}order ${item.id}`,
              title: item.title,
              description: item.description
            }))
          }]
        })
      }
    ]
  }
}

export function buildDepositIntro(prefix = '.') {
  return {
    text: [
      '*BINZU DEPOSIT*',
      '',
      'Deposit flow is prepared as the balance entry point for future orders.',
      '',
      'Current phase:',
      '- Shows the official deposit entry point.',
      '- Does not mark any payment as successful.',
      '- Waits for manual/payment-gateway confirmation before balance changes.',
      '',
      'Future payment gateway hook:',
      '- Create invoice request.',
      '- Receive payment callback.',
      '- Verify callback signature.',
      '- Credit balance only after verified settlement.',
      '',
      `Check order/payment status with ${prefix}cekstatus.`
    ].join('\n'),
    footer: 'Payment integration ready',
    buttons: [
      quick('Order Menu', `${prefix}order`),
      quick('Check Status', `${prefix}cekstatus`),
      quick('Premium Access', `${prefix}order premium`)
    ]
  }
}

export function buildStatusMessage(userId, prefix = '.', db = global.db) {
  const status = getCommerceStatus(userId, db)

  if (!status.orders.length && !status.deposits.length) {
    return {
      text: [
        '*BINZU ORDER STATUS*',
        '',
        'No commerce order or deposit record is stored for your account yet.',
        '',
        'The status system foundation is ready, but live payment integration is not connected yet.',
        'No transaction data is invented here.',
        '',
        `Start from ${prefix}order or ${prefix}deposit.`
      ].join('\n'),
      footer: `Provider: ${status.paymentProvider} | Gateway: ${status.gatewayConnected ? 'connected' : 'not connected'}`,
      buttons: [
        quick('Order Menu', `${prefix}order`),
        quick('Deposit', `${prefix}deposit`)
      ]
    }
  }

  const orderLines = status.orders.slice(-5).map(order => `- ${order.id}: ${order.status || 'pending'}`)
  const depositLines = status.deposits.slice(-5).map(deposit => `- ${deposit.id}: ${deposit.status || 'pending'}`)

  return {
    text: [
      '*BINZU ORDER STATUS*',
      '',
      orderLines.length ? 'Orders:' : 'Orders: none',
      ...orderLines,
      '',
      depositLines.length ? 'Deposits:' : 'Deposits: none',
      ...depositLines
    ].join('\n'),
    footer: `Provider: ${status.paymentProvider} | Gateway: ${status.gatewayConnected ? 'connected' : 'not connected'}`,
    buttons: [
      quick('Order Menu', `${prefix}order`),
      quick('Deposit', `${prefix}deposit`)
    ]
  }
}

export function getPaymentIntegrationNote() {
  return [
    'Future MustikaPayment integration point:',
    '- Add provider client beside this commerce service.',
    '- Read credentials from environment/config, never from hardcoded source.',
    `- Suggested env names: ${PAYMENT_PROVIDER_ENV.join(', ')}.`,
    '- Persist invoice/order status in global.db.data.commerce.orders/deposits.',
    '- Update balance only after callback verification succeeds.'
  ].join('\n')
}

function quick(displayText, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      id
    })
  }
}

function normalizeId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}
