// Helper format pesan agar UX ringkas dan seragam.
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value));
}

export function sanitizeText(input, max = 80) {
  return String(input || '')
    .replace(/[^\w\s+.\-#:@]/g, '')
    .trim()
    .slice(0, max);
}

export function normalizeStatus(status) {
  const upper = String(status || '').toUpperCase();
  if (['PAID', 'SUCCESS', 'SETTLED', 'COMPLETED'].includes(upper)) return 'PAID';
  if (['EXPIRED', 'TIMEOUT'].includes(upper)) return 'EXPIRED';
  if (['FAILED', 'CANCELLED', 'CANCELED', 'ERROR'].includes(upper)) return 'FAILED';
  if (['PROCESSING'].includes(upper)) return 'PROCESSING';
  return 'PENDING';
}
