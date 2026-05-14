export const PRODUCT_CATEGORIES = [
  {
    id: 'game',
    title: 'Game Top Up',
    description: 'Diamond, UC, coins, and other game balance products.'
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

export const PRODUCTS = [
  {
    id: 'ml-diamond',
    categoryId: 'game',
    name: 'Mobile Legends Diamond',
    description: 'Diamond Mobile Legends sample catalog.',
    inputLabel: 'User ID + server ID',
    requiresTargetInput: true,
    variants: [
      { id: 'ml-86', name: '86 Diamonds', price: 22000 },
      { id: 'ml-172', name: '172 Diamonds', price: 43000 },
      { id: 'ml-257', name: '257 Diamonds', price: 64000 }
    ]
  },
  {
    id: 'ff-diamond',
    categoryId: 'game',
    name: 'Free Fire Diamond',
    description: 'Diamond Free Fire sample catalog.',
    inputLabel: 'Free Fire player ID',
    requiresTargetInput: true,
    variants: [
      { id: 'ff-70', name: '70 Diamonds', price: 10000 },
      { id: 'ff-140', name: '140 Diamonds', price: 20000 },
      { id: 'ff-355', name: '355 Diamonds', price: 50000 }
    ]
  },
  {
    id: 'pubg-uc',
    categoryId: 'game',
    name: 'PUBG UC',
    description: 'PUBG Mobile UC sample catalog.',
    inputLabel: 'PUBG player ID',
    requiresTargetInput: true,
    variants: [
      { id: 'pubg-60', name: '60 UC', price: 15000 },
      { id: 'pubg-325', name: '325 UC', price: 75000 },
      { id: 'pubg-660', name: '660 UC', price: 145000 }
    ]
  },
  {
    id: 'pulsa',
    categoryId: 'digital',
    name: 'Pulsa',
    description: 'Pulsa operator sample catalog.',
    inputLabel: 'Nomor HP tujuan',
    requiresTargetInput: true,
    variants: [
      { id: 'pulsa-10', name: 'Pulsa 10.000', price: 12000 },
      { id: 'pulsa-25', name: 'Pulsa 25.000', price: 27000 },
      { id: 'pulsa-50', name: 'Pulsa 50.000', price: 52000 }
    ]
  },
  {
    id: 'data-package',
    categoryId: 'digital',
    name: 'Paket Data',
    description: 'Paket data internet sample catalog.',
    inputLabel: 'Nomor HP tujuan',
    requiresTargetInput: true,
    variants: [
      { id: 'data-3gb', name: '3GB / 7 Hari', price: 18000 },
      { id: 'data-8gb', name: '8GB / 30 Hari', price: 45000 },
      { id: 'data-15gb', name: '15GB / 30 Hari', price: 72000 }
    ]
  },
  {
    id: 'digital-voucher',
    categoryId: 'digital',
    name: 'Voucher Digital',
    description: 'Voucher digital sample catalog.',
    inputLabel: 'Nomor HP/email penerima',
    requiresTargetInput: true,
    variants: [
      { id: 'voucher-25', name: 'Voucher 25.000', price: 26000 },
      { id: 'voucher-50', name: 'Voucher 50.000', price: 51000 },
      { id: 'voucher-100', name: 'Voucher 100.000', price: 101000 }
    ]
  },
  {
    id: 'premium-7d',
    categoryId: 'premium',
    name: 'Premium 7 Days',
    description: 'Premium user access for 7 days.',
    inputLabel: 'WhatsApp user target',
    requiresTargetInput: false,
    variants: [
      { id: 'premium-7d-self', name: 'Premium 7 Hari', price: 10000 }
    ]
  },
  {
    id: 'premium-30d',
    categoryId: 'premium',
    name: 'Premium 30 Days',
    description: 'Premium user access for 30 days.',
    inputLabel: 'WhatsApp user target',
    requiresTargetInput: false,
    variants: [
      { id: 'premium-30d-self', name: 'Premium 30 Hari', price: 20000 }
    ]
  },
  {
    id: 'rental-bot',
    categoryId: 'premium',
    name: 'Rental Bot Access',
    description: 'Group bot rental access sample catalog.',
    inputLabel: 'Group invite/link or group ID',
    requiresTargetInput: true,
    variants: [
      { id: 'rental-7d', name: 'Rental 7 Hari', price: 7000 },
      { id: 'rental-30d', name: 'Rental 30 Hari', price: 15000 }
    ]
  }
]

export function normalizeCatalogId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

export function getCategory(categoryId = '') {
  const id = normalizeCatalogId(categoryId)
  return PRODUCT_CATEGORIES.find(category => category.id === id) || null
}

export function getProductsByCategory(categoryId = '') {
  const id = normalizeCatalogId(categoryId)
  return PRODUCTS.filter(product => product.categoryId === id)
}

export function getProduct(productId = '') {
  const id = normalizeCatalogId(productId)
  return PRODUCTS.find(product => product.id === id) || null
}

export function getVariant(productId = '', variantId = '') {
  const product = getProduct(productId)
  if (!product) return null
  const id = normalizeCatalogId(variantId)
  return product.variants.find(variant => variant.id === id) || null
}
