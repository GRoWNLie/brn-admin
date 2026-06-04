'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ROLE_LABELS } from '@/lib/auth'

type Role = 'ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER'

interface TeamUser {
  id: number
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

const ROLE_DESC: Record<Role, string> = {
  ADMIN: 'Tüm modüller + ekip + ayarlar',
  MANAGER: 'Ürün/sipariş/müşteri + toplu işlemler (ayarlar hariç)',
  EDITOR: 'Ürün ekle/düzenle, sipariş görüntüle (silme yok)',
  VIEWER: 'Sadece okuma',
}

const ROLE_COLOR: Record<Role, { bg: string; color: string; border: string }> = {
  ADMIN:   { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  MANAGER: { bg: '#EDE9FE', color: '#6D28D9', border: '#C4B5FD' },
  EDITOR:  { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  VIEWER:  { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
}

export default function TeamPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ? parseInt(session.user.id, 10) : null

  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  // Yeni kullanıcı formu
  const [nName, setNName] = useState('')
  const [nEmail, setNEmail] = useState('')
  const [nPassword, setNPassword] = useState('')
  const [nRole, setNRole] = useState<Role>('EDITOR')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Şifre değiştirme modal'ı
  const [pwUser, setPwUser] = useState<TeamUser | null>(null)
  const [pwValue, setPwValue] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function createUser() {
    setCreateError('')
    if (!nName.trim() || !nEmail.trim() || nPassword.length < 6) {
      setCreateError('Tüm alanlar zorunlu, şifre en az 6 karakter.'); return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nName, email: nEmail, password: nPassword, role: nRole }),
      })
      const data = await res.json()
      if (!data.success) { setCreateError(data.message); return }
      setNName(''); setNEmail(''); setNPassword(''); setNRole('EDITOR'); setShowNew(false)
      await load()
    } finally { setCreating(false) }
  }

  async function changeRole(u: TeamUser, role: Role) {
    if (u.role === role) return
    const res = await fetch(`/api/team/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (!data.success) { alert(data.message); return }
    await load()
  }

  async function toggleActive(u: TeamUser) {
    const verb = u.active ? 'pasif' : 'aktif'
    if (!confirm(`${u.name} ${verb} hale getirilecek. Devam?`)) return
    const res = await fetch(`/api/team/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    const data = await res.json()
    if (!data.success) { alert(data.message); return }
    await load()
  }

  async function deleteUser(u: TeamUser) {
    if (!confirm(`${u.name} (${u.email}) KALICI silinecek. Emin misin?`)) return
    const res = await fetch(`/api/team/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) { alert(data.message); return }
    await load()
  }

  async function submitPassword() {
    if (!pwUser || pwValue.length < 6) { alert('Şifre en az 6 karakter olmalı'); return }
    setPwBusy(true)
    try {
      const res = await fetch(`/api/team/${pwUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwValue }),
      })
      const data = await res.json()
      if (!data.success) { alert(data.message); return }
      setPwUser(null); setPwValue('')
    } finally { setPwBusy(false) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">👥 Ekip Yönetimi</h1>
        <button className="btn-primary" onClick={() => setShowNew(v => !v)}>
          {showNew ? '✕ İptal' : '➕ Yeni Kullanıcı'}
        </button>
      </div>

      {/* Roller açıklaması */}
      <div className="panel-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Roller</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
            <div key={r} style={{ padding: 10, border: `1px solid ${ROLE_COLOR[r].border}`, borderRadius: 8, background: ROLE_COLOR[r].bg }}>
              <div style={{ fontWeight: 700, color: ROLE_COLOR[r].color, fontSize: 13 }}>{ROLE_LABELS[r]}</div>
              <div style={{ fontSize: 11, color: ROLE_COLOR[r].color, marginTop: 4, opacity: .85 }}>{ROLE_DESC[r]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Yeni kullanıcı formu */}
      {showNew && (
        <div className="panel-card" style={{ marginBottom: 16, border: '1px solid #93C5FD' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Yeni Kullanıcı Ekle</div>
          {createError && (
            <div className="auth-message auth-error show" style={{ marginBottom: 10 }}>{createError}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <input className="form-select" placeholder="Ad Soyad" value={nName} onChange={e => setNName(e.target.value)} />
            <input className="form-select" placeholder="E-posta" type="email" value={nEmail} onChange={e => setNEmail(e.target.value)} />
            <input className="form-select" placeholder="Şifre (min 6)" type="password" value={nPassword} onChange={e => setNPassword(e.target.value)} />
            <select className="form-select" value={nRole} onChange={e => setNRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={createUser} disabled={creating}>
              {creating ? '⏳ Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>İptal</button>
          </div>
        </div>
      )}

      {/* Kullanıcı tablosu */}
      <div className="panel-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz kullanıcı yok.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Eklendi</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = currentUserId === u.id
                const color = ROLE_COLOR[u.role]
                return (
                  <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: color.bg, color: color.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14, border: `1px solid ${color.border}`,
                        }}>{u.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {u.name} {isSelf && <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(siz)</small>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><small>{u.email}</small></td>
                    <td>
                      <select
                        className="form-select"
                        value={u.role}
                        onChange={e => changeRole(u, e.target.value as Role)}
                        disabled={isSelf}
                        style={{
                          minWidth: 130, padding: '4px 8px', fontSize: 12,
                          background: color.bg, color: color.color, borderColor: color.border,
                          fontWeight: 600,
                        }}
                      >
                        {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{
                          fontSize: 11, padding: '4px 10px',
                          color: u.active ? '#065F46' : '#991B1B',
                          background: u.active ? '#ECFDF5' : '#FEE2E2',
                          borderColor: u.active ? '#A7F3D0' : '#FCA5A5',
                        }}
                        onClick={() => toggleActive(u)}
                        disabled={isSelf}
                      >
                        {u.active ? '● Aktif' : '○ Pasif'}
                      </button>
                    </td>
                    <td><small>{new Date(u.createdAt).toLocaleDateString('tr-TR')}</small></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => { setPwUser(u); setPwValue('') }}
                        >🔑 Şifre</button>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626', borderColor: '#FCA5A5' }}
                          onClick={() => deleteUser(u)}
                          disabled={isSelf}
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Şifre değiştirme modal'ı */}
      {pwUser && (
        <div
          onClick={() => !pwBusy && setPwUser(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 24, minWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🔑 Şifre Değiştir</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {pwUser.name} ({pwUser.email})
            </div>
            <input
              className="form-select"
              type="password"
              placeholder="Yeni şifre (min 6 karakter)"
              value={pwValue}
              onChange={e => setPwValue(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={submitPassword} disabled={pwBusy || pwValue.length < 6}>
                {pwBusy ? '⏳ Kaydediliyor...' : 'Kaydet'}
              </button>
              <button className="btn-secondary" onClick={() => setPwUser(null)} disabled={pwBusy}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
