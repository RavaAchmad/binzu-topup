import {
  PRODUCT_CATEGORIES,
  getCategory,
  getProduct,
  getProductsByCategory,
  getVariant,
  normalizeCatalogId
} from './commerce-catalog.js'

export const COMMERCE_NS = 'commerce'

export const PAYMENT_PROVIDER_ENV = [
  'MUSTIKAPAYMENT_API_KEY',
  'MUSTIKAPAYMENT_MERCHANT_ID',
  'MUSTIKAPAYMENT_CALLBACK_SECRET'
]

export { PRODUCT_CATEGORIES }

export const ORDER_STATUSES = {
  DRAFT: 'draft',
  PENDING_CONFIRMATION: 'pending_confirmation',
  PENDING_PAYMENT: 'pending_payment',
  CANCELLED: 'cancelled'
}

const CANCELLABLE_ORDER_STATUSES = new Set([
  ORDER_STATUSES.DRAFT,
  ORDER_STATUSES.PENDING_CONFIRMATION,
  ORDER_STATUSES.PENDING_PAYMENT
])

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
  if (!store.sessions || typeof store.sessions !== 'object') store.sessions = {}
  if (!store.settings || typeof store.settings !== 'object') {
    store.settings = {
      paymentProvider: 'manual',
      paymentGatewayConnected: false,
      createdAt: Date.now()
    }
  }

  return store
}

export function getCommerceSession(userId, db = global.db) {
  return getCommerceStore(db).sessions[userId] || null
}

export function setCommerceSession(userId, session, db = global.db) {
  const store = getCommerceStore(db)
  store.sessions[userId] = {
    ...session,
    userId,
    updatedAt: Date.now()
  }
  return store.sessions[userId]
}

export function clearCommerceSession(userId, db = global.db) {
  const store = getCommerceStore(db)
  delete store.sessions[userId]
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
  const category = getCategory(categoryId)
  if (category) return buildProductList(prefix, category.id)

  const categoryText = [
    'Pilih kategori produk untuk mulai order.',
    'Order sudah bisa dibuat dan disimpan, tetapi settlement pembayaran belum aktif.'
  ].join('\n')

  return {
    text: [
      '*BINZU COMMERCE*',
      '',
      'Commerce-first WhatsApp bot untuk top up, deposit, premium access, dan operasional komunitas.',
      '',
      categoryText,
      '',
      'Commands:',
      `- ${prefix}order / ${prefix}topup`,
      `- ${prefix}deposit`,
      `- ${prefix}cekstatus / ${prefix}statusorder`,
      `- ${prefix}cancelorder <orderId>`
    ].join('\n'),
    footer: 'Binzu-topup Commerce',
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

export function buildProductList(prefix = '.', categoryId = '') {
  const category = getCategory(categoryId)
  if (!category) return buildOrderIntro(prefix)

  const products = getProductsByCategory(category.id)
  return {
    text: [
      '*BINZU PRODUCT CATALOG*',
      '',
      `Kategori: ${category.title}`,
      category.description,
      '',
      products.length ? 'Pilih produk:' : 'Produk belum tersedia untuk kategori ini.'
    ].join('\n'),
    footer: 'Pilih produk untuk melihat paket',
    buttons: [
      ...products.slice(0, 3).map(product => quick(product.name, `${prefix}order product ${product.id}`)),
      quick('Back', `${prefix}order`),
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: 'Products',
          sections: [{
            title: category.title,
            rows: products.map(product => ({
              id: `${prefix}order product ${product.id}`,
              title: product.name,
              description: product.description
            }))
          }]
        })
      }
    ]
  }
}

export function buildVariantList(prefix = '.', productId = '') {
  const product = getProduct(productId)
  if (!product) {
    return {
      text: [
        '*PRODUCT NOT FOUND*',
        '',
        'Produk tidak ditemukan. Pilih ulang dari katalog.'
      ].join('\n'),
      footer: 'Binzu-topup Commerce',
      buttons: [quick('Order Menu', `${prefix}order`)]
    }
  }

  const category = getCategory(product.categoryId)
  return {
    text: [
      '*BINZU PACKAGE OPTIONS*',
      '',
      `Produk: ${product.name}`,
      product.description,
      '',
      `Input tujuan: ${product.requiresTargetInput ? product.inputLabel : 'Tidak diperlukan'}`,
      '',
      'Pilih paket:'
    ].join('\n'),
    footer: category?.title || 'Product package',
    buttons: [
      ...product.variants.slice(0, 3).map(variant => quick(`${variant.name} - ${formatPrice(variant.price)}`, `${prefix}order variant ${product.id} ${variant.id}`)),
      quick('Back', `${prefix}order ${product.categoryId}`),
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: 'Packages',
          sections: [{
            title: product.name,
            rows: product.variants.map(variant => ({
              id: `${prefix}order variant ${product.id} ${variant.id}`,
              title: variant.name,
              description: formatPrice(variant.price)
            }))
          }]
        })
      }
    ]
  }
}

export function buildTargetPrompt(prefix = '.', productId = '', variantId = '') {
  const product = getProduct(productId)
  const variant = getVariant(productId, variantId)
  if (!product || !variant) return buildOrderIntro(prefix)

  return {
    text: [
      '*ORDER TARGET*',
      '',
      `Produk: ${product.name}`,
      `Paket: ${variant.name}`,
      `Harga: ${formatPrice(variant.price)}`,
      '',
      `Kirim ${product.inputLabel} sebagai pesan berikutnya.`,
      '',
      `Untuk batal: ${prefix}order cancel`
    ].join('\n'),
    footer: 'Menunggu input tujuan',
    buttons: [
      quick('Cancel', `${prefix}order cancel`),
      quick('Back', `${prefix}order product ${product.id}`)
    ]
  }
}

export function buildOrderConfirmation(prefix = '.', draft = {}) {
  const product = getProduct(draft.productId)
  const variant = getVariant(draft.productId, draft.variantId)
  if (!product || !variant) return buildOrderIntro(prefix)

  const target = String(draft.target || '').trim() || 'Akun sendiri'
  return {
    text: [
      '*ORDER CONFIRMATION*',
      '',
      `Produk: ${product.name}`,
      `Paket: ${variant.name}`,
      `Tujuan: ${target}`,
      `Total: ${formatPrice(variant.price)}`,
      'Status: draft / waiting confirmation',
      '',
      'Konfirmasi untuk menyimpan order. Payment settlement belum aktif.'
    ].join('\n'),
    footer: 'Order belum paid',
    buttons: [
      quick('Confirm Order', `${prefix}order confirm`),
      quick('Cancel', `${prefix}order cancel`),
      quick('Change Package', `${prefix}order product ${product.id}`)
    ]
  }
}

export function createOrderFromSession(userId, db = global.db) {
  const session = getCommerceSession(userId, db)
  if (!session || session.state !== ORDER_STATUSES.PENDING_CONFIRMATION) {
    return { error: 'Tidak ada draft order yang menunggu konfirmasi.' }
  }

  const product = getProduct(session.productId)
  const variant = getVariant(session.productId, session.variantId)
  if (!product || !variant) return { error: 'Produk atau paket tidak valid. Silakan mulai ulang order.' }

  const now = Date.now()
  const order = {
    id: generateOrderId(),
    userId,
    categoryId: product.categoryId,
    productId: product.id,
    productName: product.name,
    variantId: variant.id,
    variantName: variant.name,
    target: String(session.target || '').trim() || userId,
    price: variant.price,
    status: ORDER_STATUSES.PENDING_PAYMENT,
    createdAt: now,
    updatedAt: now
  }

  const store = getCommerceStore(db)
  store.orders[order.id] = order
  clearCommerceSession(userId, db)
  return { order }
}

export function cancelOrder(userId, orderId = '', db = global.db) {
  const store = getCommerceStore(db)
  const id = normalizeOrderId(orderId)
  const order = store.orders[id]

  if (!order) return { error: 'Order tidak ditemukan.' }
  if (order.userId !== userId) return { error: 'Kamu hanya bisa membatalkan order milikmu sendiri.' }
  if (!CANCELLABLE_ORDER_STATUSES.has(order.status)) {
    return { error: `Order dengan status ${order.status || 'unknown'} tidak bisa dibatalkan.` }
  }

  order.status = ORDER_STATUSES.CANCELLED
  order.updatedAt = Date.now()
  return { order }
}

export function buildOrderCreatedMessage(order, prefix = '.') {
  return {
    text: [
      '*ORDER SAVED*',
      '',
      `Order ID: ${order.id}`,
      `Produk: ${order.productName}`,
      `Paket: ${order.variantName}`,
      `Tujuan: ${order.target}`,
      `Total: ${formatPrice(order.price)}`,
      `Status: ${order.status}`,
      '',
      'Payment gateway belum aktif. Order ini tersimpan untuk tracking dan milestone payment berikutnya.'
    ].join('\n'),
    footer: 'Binzu-topup Commerce',
    buttons: [
      quick('Check Status', `${prefix}cekstatus`),
      quick('New Order', `${prefix}order`),
      quick('Cancel Order', `${prefix}cancelorder ${order.id}`)
    ]
  }
}

export function buildCancelResultMessage(result, prefix = '.') {
  if (result.error) {
    return {
      text: `*CANCEL ORDER*\n\n${result.error}`,
      footer: 'Binzu-topup Commerce',
      buttons: [quick('Check Status', `${prefix}cekstatus`)]
    }
  }

  const order = result.order
  return {
    text: [
      '*ORDER CANCELLED*',
      '',
      `Order ID: ${order.id}`,
      `Produk: ${order.productName}`,
      `Status: ${order.status}`
    ].join('\n'),
    footer: 'Binzu-topup Commerce',
    buttons: [
      quick('Check Status', `${prefix}cekstatus`),
      quick('New Order', `${prefix}order`)
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
  const latestOrder = status.orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]

  if (!status.orders.length && !status.deposits.length) {
    return {
      text: [
        '*BINZU ORDER STATUS*',
        '',
        'Belum ada order/deposit commerce yang tersimpan untuk akunmu.',
        '',
        'Order draft sudah bisa dibuat, tetapi payment settlement belum aktif.',
        '',
        `Mulai dari ${prefix}order atau ${prefix}deposit.`
      ].join('\n'),
      footer: `Provider: ${status.paymentProvider} | Gateway: ${status.gatewayConnected ? 'connected' : 'not connected'}`,
      buttons: [
        quick('Order Menu', `${prefix}order`),
        quick('Deposit', `${prefix}deposit`)
      ]
    }
  }

  const orderLines = status.orders
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5)
    .map(formatOrderLine)
  const depositLines = status.deposits.slice(-5).map(deposit => `- ${deposit.id}: ${deposit.status || 'pending'}`)

  return {
    text: [
      '*BINZU ORDER STATUS*',
      '',
      orderLines.length ? 'Latest orders:' : 'Orders: none',
      ...orderLines,
      '',
      depositLines.length ? 'Deposits:' : 'Deposits: none',
      ...depositLines
    ].join('\n'),
    footer: `Provider: ${status.paymentProvider} | Gateway: ${status.gatewayConnected ? 'connected' : 'not connected'}`,
    buttons: [
      quick('Order Menu', `${prefix}order`),
      quick('Deposit', `${prefix}deposit`),
      ...(latestOrder ? [quick('Latest Order', `${prefix}statusorder latest`)] : [])
    ]
  }
}

export function buildOrderDetailMessage(userId, orderId = '', prefix = '.', db = global.db) {
  const store = getCommerceStore(db)
  const orders = Object.values(store.orders).filter(order => order?.userId === userId)
  const order = normalizeCatalogId(orderId) === 'latest'
    ? orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]
    : store.orders[normalizeOrderId(orderId)]

  if (!order || order.userId !== userId) {
    return {
      text: '*ORDER DETAIL*\n\nOrder tidak ditemukan untuk akunmu.',
      footer: 'Binzu-topup Commerce',
      buttons: [
        quick('Check Status', `${prefix}cekstatus`),
        quick('New Order', `${prefix}order`)
      ]
    }
  }

  return {
    text: [
      '*ORDER DETAIL*',
      '',
      `Order ID: ${order.id}`,
      `Produk: ${order.productName}`,
      `Paket: ${order.variantName}`,
      `Tujuan: ${order.target}`,
      `Total: ${formatPrice(order.price)}`,
      `Status: ${order.status}`,
      `Dibuat: ${formatDate(order.createdAt)}`,
      `Update: ${formatDate(order.updatedAt)}`,
      '',
      'Payment settlement belum aktif.'
    ].join('\n'),
    footer: 'Binzu-topup Commerce',
    buttons: [
      quick('New Order', `${prefix}order`),
      ...(CANCELLABLE_ORDER_STATUSES.has(order.status) ? [quick('Cancel Order', `${prefix}cancelorder ${order.id}`)] : [])
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

export function formatPrice(value = 0) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

export function normalizeOrderId(value = '') {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

function generateOrderId() {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${stamp}-${random}`
}

function formatOrderLine(order) {
  return [
    `- ${order.id}`,
    `  ${order.productName || '-'} / ${order.variantName || '-'}`,
    `  Target: ${order.target || '-'}`,
    `  Total: ${formatPrice(order.price)} | Status: ${order.status || 'pending'}`,
    `  Created: ${formatDate(order.createdAt)}`
  ].join('\n')
}

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}
