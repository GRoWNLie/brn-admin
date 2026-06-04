'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Provider {
  id: number; name: string; type: string; enabled: boolean; mode: string
  invoiceTypes: string; isDefault: boolean
  configFields: { username: boolean; hasPassword: boolean; hasCert: boolean; apiUrl: string | null }
}

const emptyForm = {
  id: 0, name: '', type: 'GIB', mode: 'sandbox', enabled: true, isDefault: false,
  invoiceTypes: 'EFATURA,EARSIV',
  username: '', password: '', certPemBase64: '', certPassword: '', apiUrl: '',
}

export default function EfaturaSettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/einvoice/providers')
    const d = await res.json()
    if (d.success) setProviders(d.providers)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.name) { alert('Ad gerekli'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/einvoice/providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await res.json()
      if (d.success) { setShowForm(false); setForm({ ...emptyForm }); await load() }
      else alert('❌ ' + d.message)
    } finally { setBusy(false) }
  }

  async function remove(id: number) {
    if (!confirm('Sağlayıcı silinsin mi?')) return
    await fetch(`/api/einvoice/providers?id=${id}`, { method: 'DELETE' })
    await load()
  }

  function edit(p: Provider) {
    setForm({ ...emptyForm, id: p.id, name: p.name, type: p.type, mode: p.mode, enabled: p.enabled, isDefault: p.isDefault, invoiceTypes: p.invoiceTypes, apiUrl: p.configFields.apiUrl || '' })
    setShowForm(true)
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">⚙️ e-Fatura Servisleri</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/einvoice" className="btn-secondary" style={{ textDecoration: 'none' }}>← Faturalar</Link>
          <button className="btn-primary" onClick={() => { setForm({ ...emptyForm }); setShowForm(!showForm) }}>
            {showForm ? '✕ İptal' : '➕ Servis Ekle'}
          </button>
        </div>
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Birden fazla e-fatura servisi tanımlayabilirsin (örn. GİB doğrudan + ileride özel entegratör).
        Bir fatura kesilirken <strong>tipine uygun</strong> ve <strong>etkin</strong> servis seçilir; yoksa varsayılan kullanılır.
        Kimlik bilgileri <strong>AES ile şifrelenerek</strong> saklanır, ekrana geri gönderilmez.
        <strong> Sandbox</strong> = test (GİB'e gitmez), <strong>Canlı</strong> = mali mühür ile gerçek gönderim.
      </div>

      {showForm && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">{form.id ? 'Servisi Düzenle' : 'Yeni e-Fatura Servisi'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Servis Adı</label>
              <input className="form-select" style={{ width: '100%' }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="GİB Doğrudan" />
            </div>
            <div>
              <label className="form-label">Tip</label>
              <select className="form-select" style={{ width: '100%' }} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="GIB">GİB Doğrudan</option>
              </select>
            </div>
            <div>
              <label className="form-label">Mod</label>
              <select className="form-select" style={{ width: '100%' }} value={form.mode} onChange={e => set('mode', e.target.value)}>
                <option value="sandbox">Sandbox (test)</option>
                <option value="live">Canlı (mali mühür gerekli)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Kapsadığı Tipler</label>
              <select className="form-select" style={{ width: '100%' }} value={form.invoiceTypes} onChange={e => set('invoiceTypes', e.target.value)}>
                <option value="EFATURA,EARSIV">e-Fatura + e-Arşiv</option>
                <option value="EFATURA">Sadece e-Fatura</option>
                <option value="EARSIV">Sadece e-Arşiv</option>
              </select>
            </div>
            <div>
              <label className="form-label">GİB Kullanıcı Adı 🔒</label>
              <input className="form-select" style={{ width: '100%' }} value={form.username} onChange={e => set('username', e.target.value)} placeholder={form.id ? '••••• (değiştirmek için yaz)' : ''} />
            </div>
            <div>
              <label className="form-label">GİB Şifre 🔒</label>
              <input type="password" className="form-select" style={{ width: '100%' }} value={form.password} onChange={e => set('password', e.target.value)} placeholder="•••••" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Mali Mühür (PEM, base64) 🔒 — canlı mod için</label>
              <textarea className="form-select" style={{ width: '100%', minHeight: 50, fontSize: 11 }} value={form.certPemBase64} onChange={e => set('certPemBase64', e.target.value)} placeholder="-----BEGIN CERTIFICATE----- ... (base64)" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} /> Etkin
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} /> Varsayılan
            </label>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={save} disabled={busy}>💾 Kaydet</button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : providers.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚙️</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Servis tanımlı değil</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Tanımlamazsan faturalar varsayılan <strong>Sandbox GİB</strong> ile kesilir (test).</div>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Ad</th><th>Tip</th><th>Mod</th><th>Tipler</th><th>Kimlik</th><th>Durum</th><th></th></tr></thead>
              <tbody>
                {providers.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong>{p.isDefault && <span style={{ marginLeft: 6, fontSize: 9, background: '#EDE9FE', color: '#6D28D9', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>VARSAYILAN</span>}</td>
                    <td>{p.type}</td>
                    <td><span className={`status-badge ${p.mode === 'live' ? 'delivered' : 'pending'}`}>{p.mode === 'live' ? 'Canlı' : 'Sandbox'}</span></td>
                    <td><small>{p.invoiceTypes}</small></td>
                    <td><small>{p.configFields.username ? '👤' : ''}{p.configFields.hasPassword ? '🔑' : ''}{p.configFields.hasCert ? '📜' : (p.configFields.username ? '' : '—')}</small></td>
                    <td><span className={`status-badge ${p.enabled ? 'delivered' : 'cancelled'}`}>{p.enabled ? 'Etkin' : 'Pasif'}</span></td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => edit(p)}>✏️</button>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626' }} onClick={() => remove(p.id)}>🗑</button>
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
