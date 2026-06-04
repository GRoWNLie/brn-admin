'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function StorefrontRegister() {
  const { storeId } = useParams<{ storeId: string }>()
  const base = `/storefront/${storeId}`
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', kvkk: false, marketing: false })
  const [msg, setMsg] = useState<string | null>(null)
  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.kvkk) { setMsg('KVKK onayı zorunlu'); return }
    setMsg('🔒 Kayıt Customer Account API ile bağlanacak (Faz 3).')
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
        <label className="sf-label" style={{ marginTop: 12 }}>Telefon (opsiyonel)</label>
        <input className="sf-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+90..." />
        <label className="sf-label" style={{ marginTop: 12 }}>Şifre</label>
        <input className="sf-input" type="password" required value={form.password} onChange={e => set('password', e.target.value)} />

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, fontSize: 13 }}>
          <input type="checkbox" checked={form.kvkk} onChange={e => set('kvkk', e.target.checked)} />
          <span>KVKK aydınlatma metnini ve kullanım şartlarını kabul ediyorum.</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, fontSize: 13 }}>
          <input type="checkbox" checked={form.marketing} onChange={e => set('marketing', e.target.checked)} />
          <span>Haberler ve özel tekliflerden haberdar olmak istiyorum.</span>
        </label>

        {msg && <div style={{ marginTop: 12, padding: 10, borderRadius: 'var(--sf-radius)', background: 'rgba(37,99,235,.08)', color: 'var(--sf-secondary)', fontSize: 13 }}>{msg}</div>}
        <button type="submit" className="sf-btn" style={{ width: '100%', marginTop: 16 }}>Hesap Oluştur</button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 14 }}>
        Zaten hesabın var mı? <Link href={`${base}/login`} style={{ color: 'var(--sf-secondary)', fontWeight: 600 }}>Giriş yap</Link>
      </div>
    </div>
  )
}
