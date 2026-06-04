'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const TIER: Record<string, { label: string; emoji: string; color: string }> = {
  BRONZE: { label: 'Bronz', emoji: '🥉', color: '#B45309' },
  SILVER: { label: 'Gümüş', emoji: '🥈', color: '#6B7280' },
  GOLD: { label: 'Altın', emoji: '🥇', color: '#D97706' },
}

export default function LoyaltyPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/loyalty')
    const d = await res.json()
    if (d.success) { setData(d); setForm(d.settings) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })) }

  async function saveSettings() {
    const res = await fetch('/api/loyalty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await res.json()
    if (d.success) { setSavedMsg('✓ Ayarlar kaydedildi'); setTimeout(() => setSavedMsg(null), 2500); await load() }
    else alert('❌ ' + d.message)
  }

  if (loading || !data) return <div className="page-content"><div className="panel-card" style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div></div>

  const s = data.stats
  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🎁 Sadakat Puanları</h1>
      </div>

      <div className="dashboard-grid-2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="panel-card" style={{ borderTop: '3px solid #2563EB' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>👥 Üye</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#2563EB' }}>{s.members}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #7C3AED' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>⭐ Dağıtılan (bakiye)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#7C3AED' }}>{s.outstanding.toLocaleString('tr-TR')}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #059669' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🎟 Kullanılan</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>{s.redeemed.toLocaleString('tr-TR')}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #D97706' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🏅 Seviyeler</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
            🥉 {s.tiers.BRONZE || 0} · 🥈 {s.tiers.SILVER || 0} · 🥇 {s.tiers.GOLD || 0}
          </div>
        </div>
      </div>

      {/* Ayarlar */}
      <div className="panel-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="settings-section-title" style={{ marginBottom: 0 }}>⚙️ Puan Kuralları</div>
          {savedMsg && <span style={{ fontSize: 13, color: '#059669' }}>{savedMsg}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          <Field label="Sistem Aktif">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" disabled={!isAdmin} checked={!!form.enabled} onChange={e => set('enabled', e.target.checked)} /> {form.enabled ? 'Açık' : 'Kapalı'}
            </label>
          </Field>
          <Field label="Kazanım (puan / 1₺)">
            <input className="form-select" type="number" step="0.1" disabled={!isAdmin} value={form.pointsPerCurrency} onChange={e => set('pointsPerCurrency', e.target.value)} />
          </Field>
          <Field label="1 puan = kaç ₺ indirim">
            <input className="form-select" type="number" step="0.01" disabled={!isAdmin} value={form.redeemValue} onChange={e => set('redeemValue', e.target.value)} />
          </Field>
          <Field label="Min. kullanım (puan)">
            <input className="form-select" type="number" disabled={!isAdmin} value={form.minRedeem} onChange={e => set('minRedeem', e.target.value)} />
          </Field>
          <Field label="Kayıt bonusu (puan)">
            <input className="form-select" type="number" disabled={!isAdmin} value={form.signupBonus} onChange={e => set('signupBonus', e.target.value)} />
          </Field>
          <Field label="">
            <span />
          </Field>
          <Field label="🥈 Gümüş eşiği (toplam puan)">
            <input className="form-select" type="number" disabled={!isAdmin} value={form.silverThreshold} onChange={e => set('silverThreshold', e.target.value)} />
          </Field>
          <Field label="🥇 Altın eşiği (toplam puan)">
            <input className="form-select" type="number" disabled={!isAdmin} value={form.goldThreshold} onChange={e => set('goldThreshold', e.target.value)} />
          </Field>
        </div>
        {isAdmin && <button className="btn-primary" style={{ marginTop: 14 }} onClick={saveSettings}>💾 Kaydet</button>}
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Örnek: kazanım 1 puan/₺, 1 puan=0,10₺ → 1000₺ alışveriş = 1000 puan = 100₺ indirim. Puanlar sipariş ödenince (webhook) otomatik yüklenir.
        </div>
      </div>

      {/* Lider tablosu */}
      <div className="panel-card" style={{ padding: 0 }}>
        <div className="settings-section-title" style={{ padding: '14px 16px 0' }}>🏆 En Çok Puanlı Müşteriler</div>
        {data.accounts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz puanlı müşteri yok. Sipariş ödenince otomatik birikir.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>#</th><th>Müşteri</th><th>Seviye</th><th>Bakiye</th><th>Toplam Kazanılan</th><th>Kullanılan</th></tr></thead>
            <tbody>
              {data.accounts.map((a: any, i: number) => {
                const t = TIER[a.tier] || TIER.BRONZE
                return (
                  <tr key={a.id} style={{ cursor: a.shopifyCustomerId ? 'pointer' : 'default' }}
                    onClick={() => router.push(`/customers/${encodeURIComponent('gid://shopify/Customer/' + a.shopifyCustomerId)}`)}>
                    <td>{i + 1}</td>
                    <td><strong>{a.customerName || a.email || a.shopifyCustomerId}</strong>{a.email && a.customerName && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.email}</div>}</td>
                    <td><span className="status-badge" style={{ background: t.color + '22', color: t.color }}>{t.emoji} {t.label}</span></td>
                    <td><strong style={{ color: '#7C3AED' }}>{a.balance.toLocaleString('tr-TR')}</strong></td>
                    <td>{a.totalEarned.toLocaleString('tr-TR')}</td>
                    <td>{a.totalRedeemed.toLocaleString('tr-TR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label ? <label className="form-label">{label}</label> : <label className="form-label">&nbsp;</label>}
      {children}
    </div>
  )
}
