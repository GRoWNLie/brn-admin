'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ROLE_LABELS } from '@/lib/auth'

interface NotificationItem {
  id: number
  title: string
  body: string
  link: string | null
  category: string
  read: boolean
  createdAt: string
}

const CATEGORY_ICON: Record<string, string> = {
  order: '🛒', stock: '⚠️', payment: '💰', review: '⭐',
  system: '🔄', info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Dün'
  return `${days} gün önce`
}

export default function Topbar() {
  const router = useRouter()
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [cacheOpen, setCacheOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // ── Global arama ──
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ products: any[]; orders: any[]; customers: any[] }>({ products: [], orders: [], customers: [] })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PAGES: { label: string; href: string }[] = [
    { label: 'Giriş / Dashboard', href: '/dashboard' },
    { label: 'Siparişler', href: '/orders' }, { label: 'Ürünler', href: '/products' },
    { label: 'Koleksiyonlar', href: '/collections' }, { label: 'Kategoriler', href: '/categories' },
    { label: 'Envanter Lokasyonları', href: '/inventory' }, { label: 'Stok Sayımı', href: '/stock-count' },
    { label: 'Transferler', href: '/transfer' }, { label: 'Satın Alma', href: '/purchase' },
    { label: 'Fiyat Listeleri', href: '/price-list' }, { label: 'Ürün Barkod Etiketi', href: '/barcode' },
    { label: 'Tanımlamalar', href: '/definitions' }, { label: 'Müşteriler', href: '/customers' },
    { label: 'Müşteri Segmentleri', href: '/customer-segments' }, { label: 'Mesajlaşma', href: '/messages' },
    { label: 'Email & SMS', href: '/marketing/email-sms' }, { label: 'Otomasyon', href: '/marketing/automation' },
    { label: 'Popup', href: '/marketing/popup' }, { label: 'Upsell', href: '/upsell' },
    { label: 'Yorum Yönetimi', href: '/reviews' }, { label: 'Kuponlar & İndirimler', href: '/discounts' },
    { label: 'Satış Raporu', href: '/reports/sales' }, { label: 'Dönüşüm Raporu', href: '/reports/conversion' },
    { label: 'Ürün Performansı', href: '/reports/products' }, { label: 'Kampanya Kullanımı', href: '/reports/campaigns' },
    { label: 'Yapay Zeka Asistanı', href: '/reports/ai-assistant' }, { label: 'Taksit Hesaplayıcı', href: '/payments/installments' },
    { label: 'Pazaryerleri', href: '/marketplace' }, { label: 'Buybox Takip', href: '/marketplace/buybox' },
    { label: 'Repricing', href: '/marketplace/repricing' }, { label: 'Pazaryeri Siparişleri', href: '/marketplace/orders' },
    { label: 'XML Entegrasyon', href: '/xml-entegrasyon' }, { label: 'e-Fatura', href: '/einvoice' },
    { label: 'Kargo Takip', href: '/cargo' }, { label: 'Hediye Kartları', href: '/gift-cards' },
    { label: 'Terk Edilmiş Sepetler', href: '/abandoned-checkouts' }, { label: 'Taslaklar', href: '/drafts' },
    { label: 'Ekip Yönetimi', href: '/team' }, { label: 'Audit Log', href: '/audit' },
    { label: 'Ayarlar', href: '/settings' }, { label: 'API Ayarları', href: '/settings/api' },
  ]
  const matchedPages = q.length >= 1 ? PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []

  // Debounced arama
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults({ products: [], orders: [], customers: [] }); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const d = await res.json()
        if (d.success) setResults({ products: d.products, orders: d.orders, customers: d.customers })
      } finally { setSearching(false) }
    }, 300)
  }, [q])

  // Dışarı tıkla → kapat
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function goTo(href: string) {
    setSearchOpen(false); setQ('')
    router.push(href)
  }

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=10')
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {}
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    loadNotifications()

    // ⚡ Real-time: Server-Sent Events ile canlı bildirim
    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      try {
        eventSource = new EventSource('/api/sse/notifications')

        eventSource.addEventListener('notification', () => {
          // Yeni bildirim geldi — full listeyi yeniden çek
          loadNotifications()
        })

        eventSource.addEventListener('error', () => {
          // Bağlantı düştü — 5sn sonra tekrar dene
          eventSource?.close()
          eventSource = null
          reconnectTimer = setTimeout(connect, 5000)
        })
      } catch {
        // SSE desteklenmiyor — polling'e düş
        reconnectTimer = setTimeout(loadNotifications, 30000)
      }
    }
    connect()

    return () => {
      eventSource?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    await loadNotifications()
  }

  async function clickNotification(n: NotificationItem) {
    // Okundu işaretle
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
    }
    setNotifOpen(false)
    if (n.link) router.push(n.link)
    await loadNotifications()
  }

  function toggleTheme() {
    const html = document.documentElement
    if (html.getAttribute('data-theme') === 'dark') {
      html.removeAttribute('data-theme')
      localStorage.setItem('theme', 'light')
    } else {
      html.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  function executeClearCache() {
    const theme = localStorage.getItem('theme')
    localStorage.clear()
    sessionStorage.clear()
    if (theme) localStorage.setItem('theme', theme)
    setCacheOpen(false)
    window.location.reload()
  }

  function handleLogout() {
    signOut({ callbackUrl: '/login' })
  }

  const userName = session?.user?.name ?? 'Yönetici'
  const userInitial = userName.charAt(0).toUpperCase()
  const userRole = session?.user?.role
  const roleLabel = userRole ? ROLE_LABELS[userRole] : ''

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          aria-label="Menü"
          onClick={() => document.body.classList.toggle('sidebar-open')}
        >☰</button>
        <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 560 }}>
          <input type="text" className="search-input" style={{ width: '100%' }}
            placeholder="Sipariş, ürün, müşteri veya sayfa ara..."
            value={q}
            onChange={e => { setQ(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') setSearchOpen(false)
              if (e.key === 'Enter') {
                if (matchedPages[0]) goTo(matchedPages[0].href)
                else if (results.products[0]) goTo(`/products/${encodeURIComponent(results.products[0].id)}/edit`)
                else if (results.orders[0]) goTo(`/orders/${encodeURIComponent(results.orders[0].id)}`)
                else if (results.customers[0]) goTo(`/customers/${encodeURIComponent(results.customers[0].id)}`)
              }
            }} />

          {searchOpen && q.trim().length >= 1 && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 500,
              background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,.25)', maxHeight: 460, overflowY: 'auto', padding: 6,
            }}>
              {matchedPages.length === 0 && results.products.length === 0 && results.orders.length === 0 && results.customers.length === 0 && (
                <div style={{ padding: 14, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {searching ? '⏳ Aranıyor...' : (q.trim().length < 2 ? 'En az 2 harf yazın...' : 'Sonuç yok')}
                </div>
              )}

              {matchedPages.length > 0 && <SearchGroup label="Sayfalar" />}
              {matchedPages.map(p => (
                <SearchRow key={p.href} icon="📄" title={p.label} sub={p.href} onClick={() => goTo(p.href)} />
              ))}

              {results.products.length > 0 && <SearchGroup label="Ürünler" />}
              {results.products.map(p => (
                <SearchRow key={p.id} image={p.image} icon="📦" title={p.title} sub={p.sku || ''} onClick={() => goTo(`/products/${encodeURIComponent(p.id)}/edit`)} />
              ))}

              {results.orders.length > 0 && <SearchGroup label="Siparişler" />}
              {results.orders.map(o => (
                <SearchRow key={o.id} icon="🛒" title={o.name} sub={o.customerName || ''} onClick={() => goTo(`/orders/${encodeURIComponent(o.id)}`)} />
              ))}

              {results.customers.length > 0 && <SearchGroup label="Müşteriler" />}
              {results.customers.map(c => (
                <SearchRow key={c.id} icon="👤" title={c.displayName} sub={c.email || ''} onClick={() => goTo(`/customers/${encodeURIComponent(c.id)}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Ön Bellek */}
        <div className="cache-container" onClick={() => { setCacheOpen(!cacheOpen); setProfileOpen(false); setNotifOpen(false) }}>
          <button className="theme-toggle" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 21l3-3" /><path d="M16 3l-9 9c-1.5 1.5-3 2-5 1 1-2 1.5-3.5 1-5l9-9z" /><path d="M14 6l4 4" />
            </svg>
            Ön Bellek Temizle
          </button>
          {cacheOpen && (
            <div className="cache-menu show" onClick={e => e.stopPropagation()}>
              <div className="cache-header">Onay Bekleniyor</div>
              <div className="cache-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Ön bellek temizlemeyi onaylıyor musunuz?
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: 12, padding: 8 }} onClick={executeClearCache}>
                Onaylıyorum
              </button>
            </div>
          )}
        </div>

        {/* Tema Değiştir */}
        <button
          className="theme-toggle"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', padding: 0 }}
          onClick={toggleTheme}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        {/* Bildirimler */}
        <div className="notification-container" onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setCacheOpen(false) }}>
          <div className="notification-btn" style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#DC2626', color: '#fff',
                minWidth: 18, height: 18, padding: '0 5px',
                borderRadius: 9, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-panel)',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className={`notification-menu${notifOpen ? ' show' : ''}`} onClick={e => e.stopPropagation()}
            style={{ minWidth: 340 }}>
            <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Bildirimler {unreadCount > 0 && <span style={{ color: '#DC2626' }}>({unreadCount})</span>}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: '#2563EB', fontWeight: 600,
                  }}>✓ Tümünü okundu say</button>
                )}
              </div>
            </div>
            <div className="notification-list" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 13 }}>Henüz bildirim yok</div>
                </div>
              ) : (
                notifications.map(n => (
                  <a key={n.id}
                    onClick={() => clickNotification(n)}
                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                    style={{ cursor: 'pointer' }}>
                    <div className="notif-title">
                      <span style={{ marginRight: 6 }}>{CATEGORY_ICON[n.category] || 'ℹ️'}</span>
                      {n.title}
                    </div>
                    <div className="notif-desc">{n.body}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </a>
                ))
              )}
            </div>
            <Link href="/notifications" className="notification-footer"
              onClick={() => setNotifOpen(false)}>
              Tüm Bildirimleri Gör
            </Link>
          </div>
        </div>

        {/* Profil */}
        <div className="profile-container" onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setCacheOpen(false) }}>
          <div className="user-profile">
            <div className="avatar">{userInitial}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
              <span>{userName}</span>
              {roleLabel && <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>{roleLabel}</small>}
            </div>
            <span className="arrow" style={{ fontSize: 9, marginLeft: 2 }}>▼</span>
          </div>
          <div className={`profile-menu${profileOpen ? ' show' : ''}`} onClick={e => e.stopPropagation()}>
            <Link href="/account">Hesabım</Link>
            {userRole === 'ADMIN' && <Link href="/team">👥 Ekip Yönetimi</Link>}
            {userRole === 'ADMIN' && <Link href="/audit">📋 Audit Log</Link>}
            {userRole === 'ADMIN' && <Link href="/settings">Ayarlar</Link>}
            <a href="#" onClick={e => { e.preventDefault(); handleLogout() }}>Çıkış Yap</a>
          </div>
        </div>
      </div>
    </header>
  )
}

function SearchGroup({ label }: { label: string }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, padding: '8px 10px 4px' }}>{label}</div>
}

function SearchRow({ icon, image, title, sub, onClick }: { icon: string; image?: string | null; title: string; sub?: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: 'var(--hover-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
        {image ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {sub ? <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div> : null}
      </div>
    </div>
  )
}
