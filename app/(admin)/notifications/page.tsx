'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface N {
  id: number
  userId: number | null
  title: string
  body: string
  link: string | null
  category: string
  read: boolean
  createdAt: string
}

const CATEGORIES = [
  { value: 'info', label: 'ℹ️ Bilgi', color: '#2563EB' },
  { value: 'success', label: '✅ Başarılı', color: '#059669' },
  { value: 'warning', label: '⚠️ Uyarı', color: '#F59E0B' },
  { value: 'error', label: '❌ Hata', color: '#DC2626' },
  { value: 'order', label: '🛒 Sipariş', color: '#2563EB' },
  { value: 'stock', label: '📦 Stok', color: '#F59E0B' },
  { value: 'payment', label: '💰 Ödeme', color: '#059669' },
  { value: 'system', label: '🔄 Sistem', color: '#6B7280' },
  { value: 'review', label: '⭐ Yorum', color: '#F59E0B' },
]

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<N[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [category, setCategory] = useState('info')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const url = filter === 'unread'
        ? '/api/notifications?unreadOnly=1&limit=100'
        : '/api/notifications?limit=100'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setNotifications(data.notifications || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  async function toggleRead(n: N) {
    await fetch(`/api/notifications/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: !n.read }),
    })
    await load()
  }

  async function remove(id: number) {
    if (!confirm('Bu bildirim silinecek. Emin misin?')) return
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    await load()
  }

  async function markAllRead() {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    await load()
  }

  async function createOne() {
    if (!title.trim() || !body.trim()) {
      alert('Başlık ve içerik gerekli')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, body, category,
          link: link.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTitle(''); setBody(''); setLink(''); setShowCreate(false)
        await load()
      } else alert('Hata: ' + data.message)
    } finally { setCreating(false) }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Bildirimler {unreadCount > 0 && <span style={{ color: '#DC2626' }}>({unreadCount})</span>}</h1>
        <div className="product-actions-right" style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllRead}>
              ✓ Tümünü Okundu Say
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ İptal' : '➕ Yeni Bildirim'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="settings-section-title">Manuel Bildirim Oluştur</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Başlık</label>
              <input className="form-select" style={{ width: '100%' }}
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Örn: Yeni Sipariş Geldi!" />
            </div>
            <div>
              <label className="form-label">Kategori</label>
              <select className="form-select" style={{ width: '100%' }}
                value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">İçerik</label>
              <textarea className="form-select" style={{ width: '100%', minHeight: 60, fontFamily: 'inherit' }}
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Bildirim açıklaması..." />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Link (opsiyonel)</label>
              <input className="form-select" style={{ width: '100%' }}
                value={link} onChange={e => setLink(e.target.value)}
                placeholder="örn: /orders/123" />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={createOne} disabled={creating}>
            {creating ? '⏳ Oluşturuluyor...' : '🔔 Bildirim Gönder'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => setFilter('all')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: filter === 'all' ? 700 : 500,
            color: filter === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
            borderBottom: filter === 'all' ? '2px solid #2563EB' : 'none',
          }}>Tümü ({notifications.length})</button>
        <button onClick={() => setFilter('unread')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: filter === 'unread' ? 700 : 500,
            color: filter === 'unread' ? '#DC2626' : 'var(--text-muted)',
            borderBottom: filter === 'unread' ? '2px solid #DC2626' : 'none',
          }}>Okunmamış ({unreadCount})</button>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              {filter === 'unread' ? 'Okunmamış bildirim yok' : 'Henüz bildirim yok'}
            </div>
          </div>
        ) : (
          <div>
            {notifications.map(n => {
              const cat = CATEGORIES.find(c => c.value === n.category)
              return (
                <div key={n.id} style={{
                  padding: 16, borderBottom: '1px solid var(--border-color)',
                  background: !n.read ? '#EFF6FF' : 'transparent',
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: 12, alignItems: 'center',
                }}>
                  <div style={{ cursor: n.link ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (!n.read) toggleRead(n)
                      if (n.link) router.push(n.link)
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      {cat && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: cat.color + '20', color: cat.color,
                        }}>{cat.label}</span>
                      )}
                      <strong>{n.title}</strong>
                      {!n.read && (
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', background: '#DC2626',
                        }} title="Okunmamış" />
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {formatDate(n.createdAt)}
                      {n.link && <span> · 🔗 {n.link}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => toggleRead(n)}>
                      {n.read ? '✕' : '✓'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                      onClick={() => remove(n.id)}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
