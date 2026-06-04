'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [allowed, setAllowed] = useState<boolean | null>(null)

  // Kayıt açık mı kontrol et
  useEffect(() => {
    fetch('/api/register/status')
      .then(r => r.json())
      .then(d => setAllowed(!!d.allowRegister))
      .catch(() => setAllowed(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor!')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Kayıt sırasında bir hata oluştu.')
        return
      }

      setSuccess('İlk admin oluşturuldu! Giriş yapılıyor...')
      // Otomatik giriş
      const signRes = await signIn('credentials', { redirect: false, email, password })
      if (signRes?.ok) {
        setTimeout(() => router.push('/dashboard'), 1000)
      } else {
        setTimeout(() => router.push('/login'), 1500)
      }
    } catch {
      setError('Sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
    }
  }

  if (allowed === false) {
    return (
      <div className="login-body">
        <div className="login-container">
          <div className="login-logo">BRN ADMIN</div>
          <div className="auth-message auth-error show">
            Kayıt kapalı. Yeni kullanıcılar yalnızca admin tarafından eklenebilir.
          </div>
          <div className="auth-switch">
            <Link href="/login">Giriş sayfasına dön</Link>
          </div>
        </div>
      </div>
    )
  }

  if (allowed === null) {
    return (
      <div className="login-body">
        <div className="login-container">
          <div className="login-logo">BRN ADMIN</div>
          <div style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>⏳ Kontrol ediliyor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-body">
      <div className="login-container">
        <div className="login-logo">BRN ADMIN</div>
        <div className="login-desc">İlk admin hesabını oluşturun.</div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-message auth-error show">{error}</div>}
          {success && <div className="auth-message auth-success show">{success}</div>}

          <div className="login-form-group">
            <label htmlFor="regName">Ad Soyad</label>
            <input type="text" id="regName" placeholder="Adınız Soyadınız" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="login-form-group">
            <label htmlFor="regEmail">E-posta Adresi</label>
            <input type="email" id="regEmail" placeholder="ornek@sirket.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div className="login-form-group">
            <label htmlFor="regPassword">Şifre</label>
            <input type="password" id="regPassword" placeholder="••••••••" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          <div className="login-form-group">
            <label htmlFor="regPasswordConfirm">Şifre Tekrar</label>
            <input type="password" id="regPasswordConfirm" placeholder="••••••••" minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Kayıt Yapılıyor...' : 'Admin Hesabı Oluştur'}
          </button>
        </form>

        <div className="auth-switch">
          Zaten bir hesabınız var mı? <Link href="/login">Giriş Yap</Link>
        </div>
      </div>
    </div>
  )
}
