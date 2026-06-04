'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function StorefrontLogin() {
  const { storeId } = useParams<{ storeId: string }>()
  const base = `/storefront/${storeId}`
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // Faz 3: Shopify Customer Account API ile doğrulama.
    setMsg('🔒 Doğrulama Shopify Customer Account API ile bağlanacak (Faz 3).')
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1 className="sf-h1">Giriş Yap</h1>
      <p className="sf-muted">Hesabınıza erişmek için e-posta ve şifrenizi girin.</p>

      <form className="sf-card" onSubmit={submit} style={{ marginTop: 20 }}>
        <label className="sf-label">E-posta</label>
        <input className="sf-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@email.com" />

        <label className="sf-label" style={{ marginTop: 14 }}>Şifre</label>
        <input className="sf-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

        <div className="sf-row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <label className="sf-row" style={{ gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Beni hatırla
          </label>
          <Link href={`${base}/reset`} style={{ fontSize: 13, color: 'var(--sf-secondary)', textDecoration: 'none' }}>Şifremi unuttum</Link>
        </div>

        {msg && <div style={{ marginTop: 12, padding: 10, borderRadius: 'var(--sf-radius)', background: 'rgba(37,99,235,.08)', color: 'var(--sf-secondary)', fontSize: 13 }}>{msg}</div>}

        <button type="submit" className="sf-btn" style={{ width: '100%', marginTop: 16 }}>Giriş Yap</button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 14 }}>
        Hesabın yok mu? <Link href={`${base}/register`} style={{ color: 'var(--sf-secondary)', fontWeight: 600 }}>Kayıt ol</Link>
      </div>
    </div>
  )
}
