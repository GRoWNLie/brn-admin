/**
 * Türkiye Banka Taksit Yöneticisi
 *
 * Her bankanın kendi taksit oranları farklı. Şu an seed data ile başlıyoruz,
 * /payments/installments sayfasından düzenlenebiliyor.
 *
 * Komisyon oranları (faiz) yüzde olarak. Gerçek iyzico/PayTR
 * entegrasyonunda bu değerler API'den otomatik gelir.
 */

export interface BankConfig {
  code: string
  name: string
  cardFamily: string
  logoEmoji: string
  brandColor: string
  /** Hangi taksitler aktif */
  installments: Record<number, boolean>
  /** Komisyon yüzdesi (alıcıya yansır) */
  commissionRates: Record<number, number>
}

export const DEFAULT_BANKS: BankConfig[] = [
  {
    code: 'garanti',  name: 'Garanti BBVA', cardFamily: 'Bonus',
    logoEmoji: '🟢', brandColor: '#16A34A',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: true },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5, 9: 5.0, 12: 6.5 },
  },
  {
    code: 'isbank',  name: 'İş Bankası', cardFamily: 'Maximum',
    logoEmoji: '🔵', brandColor: '#1E40AF',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: true },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5, 9: 5.0, 12: 6.5 },
  },
  {
    code: 'akbank',  name: 'Akbank', cardFamily: 'Axess',
    logoEmoji: '🔴', brandColor: '#DC2626',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: true },
    commissionRates: { 2: 0, 3: 1.4, 6: 3.2, 9: 4.8, 12: 6.0 },
  },
  {
    code: 'yapikredi',  name: 'Yapı Kredi', cardFamily: 'World',
    logoEmoji: '🟦', brandColor: '#1E3A8A',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: true },
    commissionRates: { 2: 0, 3: 1.6, 6: 3.6, 9: 5.2, 12: 6.8 },
  },
  {
    code: 'ziraat',  name: 'Ziraat Bankası', cardFamily: 'BankKart',
    logoEmoji: '🟢', brandColor: '#15803D',
    installments: { 2: true, 3: true, 6: true, 9: false, 12: false },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5 },
  },
  {
    code: 'finansbank',  name: 'QNB Finansbank', cardFamily: 'CardFinans',
    logoEmoji: '🟣', brandColor: '#7C3AED',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: true },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.4, 9: 5.0, 12: 6.5 },
  },
  {
    code: 'denizbank',  name: 'DenizBank', cardFamily: 'Bonus',
    logoEmoji: '🔷', brandColor: '#0EA5E9',
    installments: { 2: true, 3: true, 6: true, 9: false, 12: false },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5 },
  },
  {
    code: 'halkbank',  name: 'Halkbank', cardFamily: 'Paraf',
    logoEmoji: '🟡', brandColor: '#CA8A04',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: false },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5, 9: 5.0 },
  },
  {
    code: 'vakifbank',  name: 'VakıfBank', cardFamily: 'World',
    logoEmoji: '🟨', brandColor: '#EAB308',
    installments: { 2: true, 3: true, 6: true, 9: true, 12: true },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5, 9: 5.0, 12: 6.5 },
  },
  {
    code: 'teb',  name: 'TEB', cardFamily: 'World',
    logoEmoji: '🟠', brandColor: '#EA580C',
    installments: { 2: true, 3: true, 6: true, 9: false, 12: false },
    commissionRates: { 2: 0, 3: 1.5, 6: 3.5 },
  },
]

export interface InstallmentOption {
  count: number
  monthlyAmount: number
  totalAmount: number
  totalInterest: number
  commissionPercent: number
}

/**
 * Bir banka + sepet tutarı için tüm taksit seçeneklerini hesapla.
 */
export function calculateInstallments(bank: BankConfig, baseAmount: number): InstallmentOption[] {
  const opts: InstallmentOption[] = [
    { count: 1, monthlyAmount: baseAmount, totalAmount: baseAmount, totalInterest: 0, commissionPercent: 0 },
  ]

  for (const [count, enabled] of Object.entries(bank.installments)) {
    const n = parseInt(count, 10)
    if (!enabled) continue
    const commission = bank.commissionRates[n] ?? 0
    const total = baseAmount * (1 + commission / 100)
    opts.push({
      count: n,
      monthlyAmount: total / n,
      totalAmount: total,
      totalInterest: total - baseAmount,
      commissionPercent: commission,
    })
  }
  return opts.sort((a, b) => a.count - b.count)
}
