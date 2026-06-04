'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function StorefrontReset() {
  const { storeId } = useParams<{ storeId: string }>()
  const base = `/storefront/${storeId}`
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }
  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1 className="sf-h1">Şifre Sıfırlama</h1>
      <p className="sf-muted">E-posta adresini gir, sana sıfırlama linki gönderelim.</p>
      <form className="sf-card" onSubmit={submit} style={{ marginTop: 20 }}>
        <label className="sf-label">E-posta</label>
        <input className="sf-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        {sent && <div style={{ marginTop: 12, padding: 10, borderRadius: 'var(--sf-radius)', background: 'rgba(5,150,105,.1)', color: '#059669', fontSize: 13 }}>✓ Sıfırlama linki gönderildi (Faz 3'te Shopify Customer Account API ile bağlanacak).</div>}
        <button type="submit" className="sf-btn" style={{ width: '100%', marginTop: 16 }}>Linki Gönder</button>
      </form>
      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 14 }}>
        <Link href={`${base}/login`} style={{ color: 'var(--sf-secondary)', fontWeight: 600 }}>← Girişe dön</Link>
      </div>
    </div>
  )
}
