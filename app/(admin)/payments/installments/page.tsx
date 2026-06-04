'use client'

import { useEffect, useState } from 'react'

interface Option {
  count: number
  monthlyAmount: number
  totalAmount: number
  totalInterest: number
  commissionPercent: number
}

interface Bank {
  code: string
  name: string
  cardFamily: string
  logoEmoji: string
  brandColor: string
  options: Option[]
}

function fmt(v: number) {
  return '₺ ' + v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InstallmentsPage() {
  const [amount, setAmount] = useState('1500')
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)

  async function calc() {
    const a = parseFloat(amount)
    if (!a) return
    setLoading(true)
    try {
      const res = await fetch(`/api/installments/calculate?amount=${a}`)
      const data = await res.json()
      if (data.success) setBanks(data.banks)
    } finally { setLoading(false) }
  }
  useEffect(() => { calc() }, []) // ilk yükleme

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Taksit Hesaplayıcı</h1>
      </div>

      <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Sepet Tutarı (₺)</label>
            <input type="number" min="1" step="0.01" className="form-select" style={{ width: '100%', fontSize: 18, fontWeight: 700 }}
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') calc() }} />
          </div>
          <button className="btn-primary" style={{ padding: '12px 24px' }} disabled={loading} onClick={calc}>
            {loading ? '⏳' : '🧮 Hesapla'}
          </button>
        </div>
        <small style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          💡 Bu tablo BRN Admin'in dahili hesaplayıcısıdır. Gerçek iyzico/PayTR entegrasyonunda komisyon oranları her bankadan otomatik gelir.
        </small>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14,
      }}>
        {banks.map(b => (
          <div key={b.code} className="panel-card" style={{
            borderLeft: `5px solid ${b.brandColor}`,
            padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {b.logoEmoji} {b.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {b.cardFamily}
                </div>
              </div>
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Taksit</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>Aylık</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>Toplam</th>
                </tr>
              </thead>
              <tbody>
                {b.options.map(o => (
                  <tr key={o.count} style={{ borderBottom: '1px solid var(--hover-bg)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 700 }}>
                      {o.count === 1 ? 'Peşin' : `${o.count} Taksit`}
                      {o.commissionPercent > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#DC2626' }}>+%{o.commissionPercent.toFixed(1)}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{fmt(o.monthlyAmount)}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt(o.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
