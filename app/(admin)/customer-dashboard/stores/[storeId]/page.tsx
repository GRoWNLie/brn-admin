'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const PAGE_LABELS: Record<string, string> = {
  login: 'Giriş', register: 'Kayıt', reset: 'Şifre Sıfırlama',
  account: 'Profil / Hesabım', orders: 'Siparişlerim', addresses: 'Adreslerim',
  recent: 'Son Görüntülenenler', top: 'En Çok Sipariş Edilenler',
}

type Tab = 'general' | 'theme' | 'content' | 'pages'

export default function StoreDetailPage() {
  const router = useRouter()
  const { storeId } = useParams<{ storeId: string }>()
  const [tab, setTab] = useState<Tab>('general')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/customer-dashboard/stores/${storeId}`)
    const d = await res.json()
    if (d.success) setData(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [storeId])

  function flash(msg: string) { setSavedMsg(msg); setTimeout(() => setSavedMsg(null), 2500) }

  async function patchStore(body: any) {
    const res = await fetch(`/api/customer-dashboard/stores/${storeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json()
    if (d.success) { flash('✓ Kaydedildi'); await load() }
    else alert('❌ ' + d.message)
  }

  async function patchTheme(theme: any) {
    const res = await fetch(`/api/customer-dashboard/stores/${storeId}/theme`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(theme),
    })
    const d = await res.json()
    if (d.success) { flash('✓ Tema kaydedildi'); await load() }
  }

  async function patchContent(content: any) {
    const res = await fetch(`/api/customer-dashboard/stores/${storeId}/content`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content),
    })
    const d = await res.json()
    if (d.success) { flash('✓ İçerik kaydedildi'); await load() }
  }

  async function patchPages(updates: any[]) {
    const res = await fetch(`/api/customer-dashboard/stores/${storeId}/pages`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }),
    })
    const d = await res.json()
    if (d.success) { flash('✓ Sayfa ayarları kaydedildi'); await load() }
  }

  async function deleteStore() {
    if (!confirm(`"${data.store.name}" mağazası kalıcı silinecek. Emin misin?`)) return
    const res = await fetch(`/api/customer-dashboard/stores/${storeId}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.success) router.push('/customer-dashboard')
  }

  if (loading || !data) return <div className="page-content"><div className="panel-card" style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div></div>

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <Link href="/customer-dashboard" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>← Mağazalar</Link>
          <h1 className="page-title">🛍 {data.store.name}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            /{data.store.slug} · <code>{data.store.shopifyDomain}</code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {savedMsg && <span style={{ fontSize: 13, color: '#059669' }}>{savedMsg}</span>}
          <a href={`/storefront/${storeId}/login`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none' }}>🔗 Storefront Önizle</a>
          <Link href={`/customer-dashboard/stores/${storeId}/analytics`} className="btn-secondary" style={{ textDecoration: 'none' }}>📊 Analitik</Link>
          <button className="btn-secondary" style={{ color: '#DC2626' }} onClick={deleteStore}>🗑 Sil</button>
        </div>
      </div>

      <div className="panel-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { k: 'general' as Tab, label: '⚙️ Genel' },
          { k: 'theme' as Tab, label: '🎨 Tema' },
          { k: 'content' as Tab, label: '📝 İçerik' },
          { k: 'pages' as Tab, label: '📄 Sayfalar' },
        ].map(t => (
          <button key={t.k} className="btn-secondary" onClick={() => setTab(t.k)}
            style={tab === t.k ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD', fontWeight: 600 } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab store={data.store} onSave={patchStore} />}
      {tab === 'theme' && <ThemeTab theme={data.theme} onSave={patchTheme} />}
      {tab === 'content' && <ContentTab content={data.content} onSave={patchContent} />}
      {tab === 'pages' && <PagesTab pages={data.pages} onSave={patchPages} />}
    </div>
  )
}

function GeneralTab({ store, onSave }: { store: any; onSave: (b: any) => void }) {
  const [form, setForm] = useState({
    name: store.name, shopifyDomain: store.shopifyDomain, customDomain: store.customDomain || '',
    status: store.status,
    adminToken: '', apiKey: '', apiSecret: '', proxySecret: '',
    customerAccountClientId: '', customerAccountClientSecret: '',
  })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }
  function save() {
    const config: any = {}
    for (const k of ['adminToken', 'apiKey', 'apiSecret', 'proxySecret', 'customerAccountClientId', 'customerAccountClientSecret']) {
      if ((form as any)[k]) config[k] = (form as any)[k]
    }
    onSave({
      name: form.name, shopifyDomain: form.shopifyDomain,
      customDomain: form.customDomain || null, status: form.status,
      ...(Object.keys(config).length ? { config } : {}),
    })
  }
  return (
    <div className="panel-card">
      <div className="settings-section-title">⚙️ Genel Ayarlar</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        <div><label className="form-label">Ad</label><input className="form-select" style={{ width: '100%' }} value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div>
          <label className="form-label">Durum</label>
          <select className="form-select" style={{ width: '100%' }} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Aktif</option><option value="paused">Duraklatıldı</option><option value="setup">Kurulum</option>
          </select>
        </div>
        <div><label className="form-label">Shopify Domain</label><input className="form-select" style={{ width: '100%' }} value={form.shopifyDomain} onChange={e => set('shopifyDomain', e.target.value)} /></div>
        <div><label className="form-label">Custom Domain</label><input className="form-select" style={{ width: '100%' }} value={form.customDomain} onChange={e => set('customDomain', e.target.value)} placeholder="www.magaza.com" /></div>
      </div>

      <div className="settings-section-title" style={{ marginTop: 20 }}>🔑 Kimlik Bilgileri (Şifreli)</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        Boş bırakılan alanlar mevcut değerleri korur. {store.configFields.hasAdminToken && '✓ Admin Token tanımlı '}
        {store.configFields.hasProxySecret && '✓ Proxy Secret tanımlı '}
        {store.configFields.hasCustomerAccount && '✓ Customer Account tanımlı'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        <Secret label="Shopify Admin Token" value={form.adminToken} onChange={v => set('adminToken', v)} placeholder="shpat_..." />
        <Secret label="API Key" value={form.apiKey} onChange={v => set('apiKey', v)} />
        <Secret label="API Secret" value={form.apiSecret} onChange={v => set('apiSecret', v)} />
        <Secret label="App Proxy Shared Secret" value={form.proxySecret} onChange={v => set('proxySecret', v)} />
        <Secret label="Customer Account Client ID" value={form.customerAccountClientId} onChange={v => set('customerAccountClientId', v)} />
        <Secret label="Customer Account Client Secret" value={form.customerAccountClientSecret} onChange={v => set('customerAccountClientSecret', v)} />
      </div>
      <button className="btn-primary" style={{ marginTop: 14 }} onClick={save}>💾 Kaydet</button>
    </div>
  )
}

function Secret({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="form-label">{label} 🔒</label>
      <input className="form-select" type="password" style={{ width: '100%' }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '••••• (değiştirmek için yaz)'} />
    </div>
  )
}

function ThemeTab({ theme, onSave }: { theme: any; onSave: (b: any) => void }) {
  const [form, setForm] = useState({
    logoUrl: theme?.logoUrl || '', primaryColor: theme?.primaryColor || '#111111',
    secondaryColor: theme?.secondaryColor || '#2563EB', bgColor: theme?.bgColor || '#FFFFFF',
    textColor: theme?.textColor || '#111111', fontFamily: theme?.fontFamily || 'Inter',
    borderRadius: theme?.borderRadius ?? 8, customCss: theme?.customCss || '',
  })
  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }
  return (
    <>
      <div className="panel-card">
        <div className="settings-section-title">🎨 Tema</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          <div><label className="form-label">Logo URL</label><input className="form-select" style={{ width: '100%' }} value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://..." /></div>
          <div><label className="form-label">Font</label>
            <select className="form-select" style={{ width: '100%' }} value={form.fontFamily} onChange={e => set('fontFamily', e.target.value)}>
              <option>Inter</option><option>Manrope</option><option>Poppins</option><option>Roboto</option><option>Montserrat</option><option>Plus Jakarta Sans</option>
            </select>
          </div>
          <ColorRow label="Ana Renk" value={form.primaryColor} onChange={v => set('primaryColor', v)} />
          <ColorRow label="İkinci Renk" value={form.secondaryColor} onChange={v => set('secondaryColor', v)} />
          <ColorRow label="Arkaplan" value={form.bgColor} onChange={v => set('bgColor', v)} />
          <ColorRow label="Metin" value={form.textColor} onChange={v => set('textColor', v)} />
          <div><label className="form-label">Köşe Yuvarlaklığı (px)</label><input className="form-select" type="number" min={0} max={32} style={{ width: '100%' }} value={form.borderRadius} onChange={e => set('borderRadius', parseInt(e.target.value, 10) || 0)} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Özel CSS (opsiyonel)</label><textarea className="form-select" style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 12 }} value={form.customCss} onChange={e => set('customCss', e.target.value)} /></div>
        </div>
        <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => onSave(form)}>💾 Kaydet</button>
      </div>

      {/* Önizleme */}
      <div className="panel-card">
        <div className="settings-section-title">Önizleme</div>
        <div style={{
          background: form.bgColor, color: form.textColor, fontFamily: form.fontFamily,
          padding: 24, borderRadius: form.borderRadius, border: '1px solid var(--border-color)',
        }}>
          {form.logoUrl && <img src={form.logoUrl} alt="" style={{ maxHeight: 40, marginBottom: 14 }} />}
          <div style={{ fontSize: 20, fontWeight: 700 }}>Hoş geldin, Müşterimiz!</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>Bu, storefront'un nasıl görüneceğinin önizlemesidir.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={{ background: form.primaryColor, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: form.borderRadius, fontWeight: 600, cursor: 'pointer' }}>Ana Buton</button>
            <button style={{ background: 'transparent', color: form.secondaryColor, border: `1px solid ${form.secondaryColor}`, padding: '10px 18px', borderRadius: form.borderRadius, fontWeight: 600, cursor: 'pointer' }}>İkinci</button>
          </div>
        </div>
      </div>
    </>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 44, height: 38, border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
        <input className="form-select" style={{ flex: 1, fontFamily: 'monospace' }} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}

function ContentTab({ content, onSave }: { content: any; onSave: (b: any) => void }) {
  let visibleTabs: any = { profile: true, orders: true, addresses: true, recent: true, top: true }
  try { if (content?.visibleTabs) visibleTabs = { ...visibleTabs, ...JSON.parse(content.visibleTabs) } } catch {}
  const [form, setForm] = useState({
    topBannerText: content?.topBannerText || '',
    welcomeTemplate: content?.welcomeTemplate || 'Welcome, {name}!',
    kvkkText: content?.kvkkText || '', termsText: content?.termsText || '',
    visibleTabs,
  })
  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }
  function toggle(t: string) { setForm(p => ({ ...p, visibleTabs: { ...p.visibleTabs, [t]: !p.visibleTabs[t] } })) }
  return (
    <div className="panel-card">
      <div className="settings-section-title">📝 İçerik & Metinler</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label className="form-label">Üst Banner</label><input className="form-select" style={{ width: '100%' }} value={form.topBannerText} onChange={e => set('topBannerText', e.target.value)} placeholder="300₺ Üzeri Siparişlerde Ücretsiz Kargo" /></div>
        <div><label className="form-label">Karşılama Şablonu — <code>{'{name}'}</code> kullanıcı adıyla değişir</label><input className="form-select" style={{ width: '100%' }} value={form.welcomeTemplate} onChange={e => set('welcomeTemplate', e.target.value)} /></div>
        <div>
          <label className="form-label">Görünür Tablar (Profil sayfasında)</label>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
            {Object.entries({ profile: 'Profil', orders: 'Siparişler', addresses: 'Adresler', recent: 'Son Görüntülenen', top: 'En Çok Sipariş' }).map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={!!form.visibleTabs[k]} onChange={() => toggle(k)} /> {label}
              </label>
            ))}
          </div>
        </div>
        <div><label className="form-label">KVKK Metni</label><textarea className="form-select" style={{ width: '100%', minHeight: 100 }} value={form.kvkkText} onChange={e => set('kvkkText', e.target.value)} /></div>
        <div><label className="form-label">Hizmet Şartları</label><textarea className="form-select" style={{ width: '100%', minHeight: 100 }} value={form.termsText} onChange={e => set('termsText', e.target.value)} /></div>
      </div>
      <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => onSave(form)}>💾 Kaydet</button>
    </div>
  )
}

function PagesTab({ pages, onSave }: { pages: any[]; onSave: (u: any[]) => void }) {
  const [rows, setRows] = useState<any[]>(pages)
  function update(i: number, patch: any) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  return (
    <div className="panel-card" style={{ padding: 0 }}>
      <div className="settings-section-title" style={{ padding: '14px 16px 0' }}>📄 Sayfalar — aktif/pasif & başlık/açıklama</div>
      <table className="data-table">
        <thead><tr><th>Sayfa</th><th>Aktif</th><th>Başlık</th><th>Açıklama</th></tr></thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.pageKey}>
              <td><strong>{PAGE_LABELS[p.pageKey] || p.pageKey}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{p.pageKey}</div></td>
              <td><input type="checkbox" checked={!!p.enabled} onChange={e => update(i, { enabled: e.target.checked })} /></td>
              <td><input className="form-select" style={{ width: '100%' }} value={p.title || ''} onChange={e => update(i, { title: e.target.value })} /></td>
              <td><input className="form-select" style={{ width: '100%' }} value={p.description || ''} onChange={e => update(i, { description: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 14 }}>
        <button className="btn-primary" onClick={() => onSave(rows.map(r => ({ pageKey: r.pageKey, enabled: r.enabled, title: r.title, description: r.description })))}>💾 Tümünü Kaydet</button>
      </div>
    </div>
  )
}
