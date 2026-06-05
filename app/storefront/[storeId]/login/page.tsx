'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function StorefrontLogin() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const base = `/storefront/${storeId}`
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/storefront/${storeId}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const d = await res.json()
      setMsg({ ok: !!d.success, text: d.message || (d.success ? 'Giriş başarılı' : 'Giriş başarısız') })
      if (d.success) setTimeout(() => router.push(`${base}/account`), 600)
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Bağlantı hatası' })
    } finally { setBusy(false) }
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

        {msg && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 'var(--sf-radius)', fontSize: 13,
            background: msg.ok ? 'rgba(5,150,105,.1)' : 'rgba(220,38,38,.1)',
            color: msg.ok ? '#059669' : '#DC2626',
          }}>{msg.ok ? '✓ ' : '✕ '}{msg.text}</div>
        )}

        <button type="submit" className="sf-btn" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
          {busy ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 14 }}>
        Hesabın yok mu? <Link href={`${base}/register`} style={{ color: 'var(--sf-secondary)', fontWeight: 600 }}>Kayıt ol</Link>
      </div>
    </div>
  )
}
