'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Store {
  id: number; slug: string; name: string; shopifyDomain: string; customDomain: string | null
  status: string; createdAt: string
  configFields: { hasAdminToken: boolean; hasProxySecret: boolean; hasCustomerAccount: boolean; apiVersion: string | null }
}

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'delivered' },
  paused: { label: 'Duraklatıldı', cls: 'cancelled' },
  setup:  { label: 'Kurulum', cls: 'pending' },
}

export default function CustomerDashboardHomePage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ slug: '', name: '', shopifyDomain: '', customDomain: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/customer-dashboard/stores')
    const d = await res.json()
    if (d.success) setStores(d.stores)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!form.slug || !form.name || !form.shopifyDomain) { alert('slug, ad ve shopify domain gerekli'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/customer-dashboard/stores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await res.json()
      if (d.success) { setShowForm(false); setForm({ slug: '', name: '', shopifyDomain: '', customDomain: '' }); await load() }
      else alert('❌ ' + d.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🛍 Customer Dashboard — Mağazalar</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ İptal' : '➕ Yeni Mağaza'}
        </button>
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        ℹ️ Her mağaza için <strong>tema, içerik ve sayfa</strong> ayarlarını ayrı ayrı yönetebilirsin. Storefront (müşteri yüzü)
        Shopify <strong>App Proxy</strong> üzerinden mağazanın kendi domain'inde gösterilir.
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-panel)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12 }}>
          Shopify Partner App → App Proxy ayarı:<br />
          • Alt yol ön eki: <strong>apps</strong><br />
          • Alt yol: <strong>customerdashboard</strong><br />
          • Ara sunucu URL: <strong>https://senin-admin-domain.com/apps/customerdashboard</strong>
        </div>
        <div style={{ marginTop: 8 }}>
          Router otomatik olarak <code>?shop=…</code> parametresinden mağazayı bulup doğru storefront sayfasına yönlendirir. Kimlik bilgileri AES ile şifrelenir.
        </div>
      </div>

      {showForm && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">Yeni Mağaza</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Slug (storefront URL'si için)</label>
              <input className="form-select" style={{ width: '100%' }} value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="sekerco" />
            </div>
            <div>
              <label className="form-label">Mağaza Adı</label>
              <input className="form-select" style={{ width: '100%' }} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} placeholder="SekerCo" />
            </div>
            <div>
              <label className="form-label">Shopify Domain</label>
              <input className="form-select" style={{ width: '100%' }} value={form.shopifyDomain}
                onChange={e => setForm({ ...form, shopifyDomain: e.target.value })} placeholder="sekerco.myshopify.com" />
            </div>
            <div>
              <label className="form-label">Custom Domain (opsiyonel)</label>
              <input className="form-select" style={{ width: '100%' }} value={form.customDomain}
                onChange={e => setForm({ ...form, customDomain: e.target.value })} placeholder="www.sekerco.com" />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={create} disabled={busy}>
            {busy ? '⏳ Oluşturuluyor...' : '💾 Oluştur'}
          </button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : stores.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🛍</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz mağaza yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>"➕ Yeni Mağaza" ile ilk mağazanı ekle.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Mağaza</th><th>Shopify Domain</th><th>Custom Domain</th><th>Durum</th><th>Kimlik</th><th></th></tr>
              </thead>
              <tbody>
                {stores.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{s.slug}</div>
                    </td>
                    <td><code>{s.shopifyDomain}</code></td>
                    <td>{s.customDomain ? <code>{s.customDomain}</code> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td><span className={`status-badge ${STATUS[s.status]?.cls || 'pending'}`}>{STATUS[s.status]?.label || s.status}</span></td>
                    <td>
                      <small style={{ color: 'var(--text-muted)' }}>
                        {s.configFields.hasAdminToken ? '🔑' : '○'}
                        {s.configFields.hasProxySecret ? ' 🛡' : ' ○'}
                        {s.configFields.hasCustomerAccount ? ' 👤' : ' ○'}
                      </small>
                    </td>
                    <td>
                      <Link href={`/customer-dashboard/stores/${s.id}`} className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none' }}>
                        ⚙️ Yönet
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
