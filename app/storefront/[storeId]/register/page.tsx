'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function StorefrontRegister() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const base = `/storefront/${storeId}`
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', kvkk: false, marketing: false })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.kvkk) { setMsg({ ok: false, text: 'KVKK onayı zorunludur' }); return }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/storefront/${storeId}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (d.success) {
        setMsg({ ok: true, text: '✓ Hesap oluşturuldu — yönlendiriliyorsun...' })
        setTimeout(() => router.push(`${base}/account`), 700)
      } else {
        setMsg({ ok: false, text: d.message || 'Kayıt başarısız' })
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Bağlantı hatası' })
    } finally { setBusy(false) }
  }
  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <h1 className="sf-h1">Kayıt Ol</h1>
      <p className="sf-muted">Hesap oluştur, sipariş geçmişini ve teklifleri takip et.</p>

      <form className="sf-card" onSubmit={submit} style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="sf-label">Ad</label><input className="sf-input" required value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
          <div><label className="sf-label">Soyad</label><input className="sf-input" required value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
        </div>
        <label className="sf-label" style={{ marginTop: 12 }}>E-posta</label>
        <input className="sf-input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
        <label className="sf-label" style={{ marginTop: 12 }}>Telefon (SMS için)</label>
        <input className="sf-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+90 5XX XXX XX XX" inputMode="tel" />
        <label className="sf-label" style={{ marginTop: 12 }}>Şifre (en az 6 karakter)</label>
        <input className="sf-input" type="password" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} />

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, fontSize: 13 }}>
          <input type="checkbox" checked={form.kvkk} onChange={e => set('kvkk', e.target.checked)} />
          <span>KVKK aydınlatma metnini ve kullanım şartlarını kabul ediyorum.</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, fontSize: 13 }}>
          <input type="checkbox" checked={form.marketing} onChange={e => set('marketing', e.target.checked)} />
          <span>E-posta ve SMS ile kampanya/teklif almak istiyorum.</span>
        </label>

        {msg && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 'var(--sf-radius)', fontSize: 13,
            background: msg.ok ? 'rgba(5,150,105,.1)' : 'rgba(220,38,38,.1)',
            color: msg.ok ? '#059669' : '#DC2626',
          }}>{msg.ok ? '✓ ' : '✕ '}{msg.text}</div>
        )}

        <button type="submit" className="sf-btn" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
          {busy ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 14 }}>
        Zaten hesabın var mı? <Link href={`${base}/login`} style={{ color: 'var(--sf-secondary)', fontWeight: 600 }}>Giriş yap</Link>
      </div>
    </div>
  )
}
