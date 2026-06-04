'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [allowRegister, setAllowRegister] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard')
  }, [status, router])

  // İlk kullanıcı yoksa kayıt linkini göster
  useEffect(() => {
    fetch('/api/register/status')
      .then(r => r.json())
      .then(d => setAllowRegister(!!d.allowRegister))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    setLoading(false)

    if (res?.error) {
      setError('E-posta adresi veya şifre hatalı (veya hesap pasif).')
      return
    }
    if (res?.ok) {
      const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl') || '/dashboard'
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="login-body">
      <div className="login-container">
        <div className="login-logo">BRN ADMIN</div>
        <div className="login-desc">Yönetim paneline hoş geldiniz. Lütfen giriş yapın.</div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-message auth-error show">{error}</div>}

          <div className="login-form-group">
            <label htmlFor="email">E-posta Adresi</label>
            <input
              type="email"
              id="email"
              placeholder="ornek@sirket.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" /> Beni Hatırla
            </label>
            <a href="#">Şifremi Unuttum?</a>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        {allowRegister && (
          <div className="auth-switch">
            İlk admin hesabı yok mu? <Link href="/register">İlk Admin Olarak Kayıt Ol</Link>
          </div>
        )}
      </div>
    </div>
  )
}
