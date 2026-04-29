// Katalog contoh. Ganti atau hubungkan ke API produk jika sudah tersedia.
export const products = [
  {
    id: 'ml',
    name: 'Mobile Legends',
    targetLabel: 'User ID + Server ID',
    description: 'Diamond Mobile Legends',
    variants: [
      {
        id: 'ml_86',
        name: '86 Diamonds',
        amount: 21000,
        sources: [
          { provider: 'digiflazz', sku: 'ML86', cost: 20000 },
          { provider: 'moogold', productId: 'mobile-legends', variationId: 'ml_86', cost: 20300 }
        ]
      },
      {
        id: 'ml_172',
        name: '172 Diamonds',
        amount: 42000,
        sources: [
          { provider: 'digiflazz', sku: 'ML172', cost: 40000 },
          { provider: 'moogold', productId: 'mobile-legends', variationId: 'ml_172', cost: 40500 }
        ]
      },
      {
        id: 'ml_257',
        name: '257 Diamonds',
        amount: 63000,
        sources: [
          { provider: 'digiflazz', sku: 'ML257', cost: 60000 },
          { provider: 'moogold', productId: 'mobile-legends', variationId: 'ml_257', cost: 61200 }
        ]
      }
    ]
  },
  {
    id: 'ff',
    name: 'Free Fire',
    targetLabel: 'Player ID',
    description: 'Diamond Free Fire',
    variants: [
      {
        id: 'ff_70',
        name: '70 Diamonds',
        amount: 10000,
        sources: [
          { provider: 'digiflazz', sku: 'FF70', cost: 9200 },
          { provider: 'moogold', productId: 'free-fire', variationId: 'ff_70', cost: 9500 }
        ]
      },
      {
        id: 'ff_140',
        name: '140 Diamonds',
        amount: 20000,
        sources: [
          { provider: 'digiflazz', sku: 'FF140', cost: 18400 },
          { provider: 'moogold', productId: 'free-fire', variationId: 'ff_140', cost: 19000 }
        ]
      },
      {
        id: 'ff_355',
        name: '355 Diamonds',
        amount: 50000,
        sources: [
          { provider: 'digiflazz', sku: 'FF355', cost: 46200 },
          { provider: 'moogold', productId: 'free-fire', variationId: 'ff_355', cost: 47000 }
        ]
      }
    ]
  },
  {
    id: 'pulsa',
    name: 'Pulsa Reguler',
    targetLabel: 'Nomor HP',
    description: 'Pulsa semua operator',
    variants: [
      {
        id: 'pulsa_10',
        name: 'Pulsa 10.000',
        amount: 11000,
        sources: [
          { provider: 'digiflazz', sku: 'PULSA10', cost: 10200 }
        ]
      },
      {
        id: 'pulsa_25',
        name: 'Pulsa 25.000',
        amount: 26000,
        sources: [
          { provider: 'digiflazz', sku: 'PULSA25', cost: 25200 }
        ]
      },
      {
        id: 'pulsa_50',
        name: 'Pulsa 50.000',
        amount: 51000,
        sources: [
          { provider: 'digiflazz', sku: 'PULSA50', cost: 50200 }
        ]
      }
    ]
  }
];

export function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

export function findVariant(productId, variantId) {
  const product = findProduct(productId);
  return product?.variants.find((variant) => variant.id === variantId);
}
