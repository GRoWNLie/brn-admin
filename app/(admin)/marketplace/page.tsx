'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const MARKETPLACES = [
  { code: 'TRENDYOL', name: 'Trendyol', emoji: '🟠', color: '#F27A1A', live: true },
  { code: 'HEPSIBURADA', name: 'Hepsiburada', emoji: '🛒', color: '#FF6000', live: true },
  { code: 'AMAZON', name: 'Amazon', emoji: '📦', color: '#FF9900', live: true },
  { code: 'ETSY', name: 'Etsy', emoji: '🎨', color: '#F1641E', live: true },
]

// Pazaryeri-özel yapılandırma alanları
type CfgField = { name: string; label: string; secret?: boolean; placeholder?: string; extra?: boolean }
const CONFIG_FIELDS: Record<string, CfgField[]> = {
  TRENDYOL: [
    { name: 'apiKey', label: 'API Key', secret: true },
    { name: 'apiSecret', label: 'API Secret', secret: true },
    { name: 'sellerId', label: 'Satıcı ID (Supplier ID)', placeholder: '123456' },
  ],
  HEPSIBURADA: [
    { name: 'apiKey', label: 'Kullanıcı Adı', placeholder: 'entegrasyon kullanıcı adı' },
    { name: 'apiSecret', label: 'Şifre', secret: true },
    { name: 'sellerId', label: 'Merchant ID' },
  ],
  AMAZON: [
    { name: 'apiKey', label: 'LWA Client ID', secret: true },
    { name: 'apiSecret', label: 'LWA Client Secret', secret: true },
    { name: 'sellerId', label: 'Seller ID' },
    { name: 'refreshToken', label: 'LWA Refresh Token', secret: true, extra: true },
    { name: 'marketplaceId', label: 'Marketplace ID', placeholder: 'A1PA6795UKMFR9', extra: true },
    { name: 'region', label: 'Bölge (eu / na / fe)', placeholder: 'eu', extra: true },
  ],
  ETSY: [
    { name: 'apiKey', label: 'Keystring (API Key)', secret: true },
    { name: 'sellerId', label: 'Shop ID' },
    { name: 'accessToken', label: 'OAuth Access Token', secret: true, extra: true },
    { name: 'refreshToken', label: 'OAuth Refresh Token', secret: true, extra: true },
  ],
}

interface Integration {
  marketplace: string; enabled: boolean; sellerId: string | null
  hasApiKey: boolean; hasApiSecret: boolean; autoStock: boolean; autoPrice: boolean
  status: string; statusMessage: string | null; lastSyncAt: string | null
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  CONNECTED:    { label: '✓ Bağlı', bg: '#D1FAE5', color: '#065F46' },
  DISCONNECTED: { label: '○ Bağlı değil', bg: '#F3F4F6', color: '#6B7280' },
  ERROR:        { label: '✕ Hata', bg: '#FEE2E2', color: '#991B1B' },
}

export default function MarketplacePage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ mp: string; text: string; ok: boolean } | null>(null)

  // Config modal
  const [editMp, setEditMp] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const res = await fetch('/api/marketplace/integrations')
    const data = await res.json()
    if (data.success) setIntegrations(data.integrations)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const get = (code: string) => integrations.find(i => i.marketplace === code)

  function openConfig(code: string) {
    const cur = get(code)
    setForm({ sellerId: cur?.sellerId || '' })
    setEditMp(code)
  }

  async function saveConfig() {
    if (!editMp) return
    setBusy('save')
    try {
      const fields = CONFIG_FIELDS[editMp] || []
      const body: any = { marketplace: editMp, enabled: true }
      const extra: Record<string, string> = {}
      for (const f of fields) {
        const v = (form[f.name] ?? '').trim()
        if (!v) continue
        if (f.extra) extra[f.name] = v
        else body[f.name] = v
      }
      if (Object.keys(extra).length) body.extra = extra
      const res = await fetch('/api/marketplace/integrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) { setEditMp(null); await load() }
      else setMsg({ mp: editMp, text: data.message || 'Kaydedilemedi', ok: false })
    } finally { setBusy(null) }
  }

  async function action(code: string, act: string, label: string) {
    setBusy(code + act); setMsg(null)
    try {
      const res = await fetch(`/api/marketplace/${code}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act }),
      })
      const data = await res.json()
      setMsg({ mp: code, text: `${label}: ${data.message}`, ok: !!data.success })
      await load()
    } catch (e: any) {
      setMsg({ mp: code, text: e?.message || 'Hata', ok: false })
    } finally { setBusy(null) }
  }

  async function toggleEnabled(code: string, enabled: boolean) {
    await fetch('/api/marketplace/integrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketplace: code, enabled }),
    })
    await load()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🛍 Pazaryerleri</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/marketplace/buybox" className="btn-secondary" style={{ textDecoration: 'none' }}>📊 Buybox</Link>
          <Link href="/marketplace/orders" className="btn-secondary" style={{ textDecoration: 'none' }}>📦 Siparişler</Link>
        </div>
      </div>

      {loading ? (
        <div className="panel-card" style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
      ) : (
        <div className="dashboard-grid-2">
          {MARKETPLACES.map(m => {
            const it = get(m.code)
            const st = STATUS_BADGE[it?.status || 'DISCONNECTED']
            const configured = it?.hasApiKey && it?.hasApiSecret
            return (
              <div key={m.code} className="panel-card" style={{ borderTop: `3px solid ${m.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 26 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}
                      {!m.live && <span style={{ fontSize: 9, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontWeight: 700, marginLeft: 8 }}>İSKELET</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" disabled={!isAdmin || !configured}
                      checked={!!it?.enabled} onChange={e => toggleEnabled(m.code, e.target.checked)} />
                    Aktif
                  </label>
                </div>

                {it?.statusMessage && (
                  <div style={{ fontSize: 11, color: it.status === 'ERROR' ? '#B91C1C' : 'var(--text-muted)', marginBottom: 8 }}>
                    {it.statusMessage}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Satıcı ID: <strong>{it?.sellerId || '—'}</strong> · API: {configured ? '✓ tanımlı' : '○ yok'}
                  {it?.lastSyncAt && <> · Son senkron: {new Date(it.lastSyncAt).toLocaleString('tr-TR')}</>}
                </div>

                {msg && msg.mp === m.code && (
                  <div style={{ fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 10, background: msg.ok ? '#ECFDF5' : '#FEF2F2', color: msg.ok ? '#065F46' : '#B91C1C' }}>
                    {msg.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!isAdmin} onClick={() => openConfig(m.code)}>⚙️ Yapılandır</button>
                  <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!configured || busy === m.code + 'test'} onClick={() => action(m.code, 'test', 'Test')}>
                    {busy === m.code + 'test' ? '⏳' : '🔌 Test'}
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!configured || busy === m.code + 'sync'} onClick={() => action(m.code, 'sync', 'Stok/Fiyat')}>
                    {busy === m.code + 'sync' ? '⏳' : '🔄 Stok/Fiyat'}
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!configured || busy === m.code + 'orders'} onClick={() => action(m.code, 'orders', 'Sipariş')}>
                    {busy === m.code + 'orders' ? '⏳' : '📥 Sipariş Çek'}
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!configured || busy === m.code + 'buybox'} onClick={() => action(m.code, 'buybox', 'Buybox')}>
                    {busy === m.code + 'buybox' ? '⏳' : '📊 Buybox Çek'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          💡 <strong>Dört pazaryeri de canlı adaptördür.</strong> Her birinin "Yapılandır" ekranı kendi kimlik alanlarını ister:
          Trendyol (API Key/Secret + Satıcı ID), Hepsiburada (Kullanıcı/Şifre + Merchant ID),
          Amazon (LWA Client ID/Secret + Refresh Token + Marketplace ID + Bölge), Etsy (Keystring + Shop ID + Access/Refresh Token).
          Bilgileri gir, <strong>Test</strong> et, sonra Stok/Fiyat · Sipariş · Buybox çek. Kimlik bilgileri sunucuda saklanır, ekrana geri gönderilmez.
        </div>
      </div>

      {/* Yapılandırma modalı */}
      {editMp && (
        <div onClick={() => !busy && setEditMp(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 24, minWidth: 400, maxWidth: 460 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{MARKETPLACES.find(x => x.code === editMp)?.name} Yapılandırması</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Kimlik bilgileri güvenli saklanır. Boş bırakılan alanlar mevcut değeri korur.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(CONFIG_FIELDS[editMp] || []).map(f => (
                <div key={f.name}>
                  <label className="form-label">{f.label}{f.secret && ' 🔒'}</label>
                  <input className="form-select" style={{ width: '100%' }}
                    type={f.secret ? 'password' : 'text'}
                    value={form[f.name] ?? ''}
                    onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                    placeholder={f.secret ? '••••• (değiştirmek için yaz)' : (f.placeholder || '')} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-primary" onClick={saveConfig} disabled={busy === 'save'}>
                {busy === 'save' ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
              </button>
              <button className="btn-secondary" onClick={() => setEditMp(null)} disabled={busy === 'save'}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
