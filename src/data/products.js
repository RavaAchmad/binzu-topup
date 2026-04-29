// Katalog contoh. Ganti atau hubungkan ke API produk jika sudah tersedia.
export const products = [
  {
    id: 'ml',
    name: 'Mobile Legends',
    targetLabel: 'User ID + Server ID',
    description: 'Diamond Mobile Legends',
    variants: [
      { id: 'ml_86', name: '86 Diamonds', amount: 21000 },
      { id: 'ml_172', name: '172 Diamonds', amount: 42000 },
      { id: 'ml_257', name: '257 Diamonds', amount: 63000 }
    ]
  },
  {
    id: 'ff',
    name: 'Free Fire',
    targetLabel: 'Player ID',
    description: 'Diamond Free Fire',
    variants: [
      { id: 'ff_70', name: '70 Diamonds', amount: 10000 },
      { id: 'ff_140', name: '140 Diamonds', amount: 20000 },
      { id: 'ff_355', name: '355 Diamonds', amount: 50000 }
    ]
  },
  {
    id: 'pulsa',
    name: 'Pulsa Reguler',
    targetLabel: 'Nomor HP',
    description: 'Pulsa semua operator',
    variants: [
      { id: 'pulsa_10', name: 'Pulsa 10.000', amount: 11000 },
      { id: 'pulsa_25', name: 'Pulsa 25.000', amount: 26000 },
      { id: 'pulsa_50', name: 'Pulsa 50.000', amount: 51000 }
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
