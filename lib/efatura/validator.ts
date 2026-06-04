/**
 * TCKN / VKN doğrulama (checksum algoritmaları ile).
 * 11 hane → TCKN (bireysel) → e-Arşiv
 * 10 hane → VKN (kurumsal)  → e-Fatura
 */

/** TCKN checksum doğrulaması (gerçek algoritma). */
export function isValidTckn(value: string): boolean {
  const v = (value || '').replace(/\D/g, '')
  if (v.length !== 11) return false
  if (v[0] === '0') return false
  const d = v.split('').map(Number)
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8]
  const evenSum = d[1] + d[3] + d[5] + d[7]
  const d10 = ((oddSum * 7) - evenSum) % 10
  if (((d10 % 10) + 10) % 10 !== d[9]) return false
  const sumFirst10 = d.slice(0, 10).reduce((a, b) => a + b, 0)
  if (sumFirst10 % 10 !== d[10]) return false
  return true
}

/** VKN checksum doğrulaması (gerçek algoritma). */
export function isValidVkn(value: string): boolean {
  const v = (value || '').replace(/\D/g, '')
  if (v.length !== 10) return false
  const digits = v.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10
    sum += tmp === 9 ? 9 : (tmp * (2 ** (9 - i))) % 9
  }
  const last = (10 - (sum % 10)) % 10
  return last === digits[9]
}

export type TaxIdKind = 'TCKN' | 'VKN' | 'INVALID'

/** Hangi tür ve geçerli mi? */
export function classifyTaxId(value: string | null | undefined): { kind: TaxIdKind; invoiceType: 'EFATURA' | 'EARSIV' | null; valid: boolean } {
  const v = (value || '').replace(/\D/g, '')
  if (v.length === 11) {
    const valid = isValidTckn(v)
    return { kind: 'TCKN', invoiceType: 'EARSIV', valid }
  }
  if (v.length === 10) {
    const valid = isValidVkn(v)
    return { kind: 'VKN', invoiceType: 'EFATURA', valid }
  }
  return { kind: 'INVALID', invoiceType: null, valid: false }
}
