/**
 * Dira — shared utilities
 */

/**
 * Format cents to KES display string.
 * All prices are stored in cents in the database.
 * KES 450 → stored as 45000 → displayed as "KES 450.00"
 */
export function formatKES(cents: number): string {
  return `KES ${(cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Convert KES input string to cents integer for storage.
 * "450" → 45000
 * "450.50" → 45050
 */
export function kesToCents(kes: string | number): number {
  return Math.round(parseFloat(String(kes)) * 100)
}

/**
 * Convert cents to KES number for form inputs.
 * 45000 → 450
 */
export function centsToKes(cents: number): number {
  return cents / 100
}

/**
 * Generate a server-side order reference.
 * DRA- followed by 6 random alphanumeric characters.
 */
export function generateOrderRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = 'DRA-'
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)]
  }
  return ref
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
