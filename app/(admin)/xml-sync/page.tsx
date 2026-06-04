'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Feed {
  id: number
  title: string | null
  url: string | null
  productCount: number
  status: string
  syncStatus: string
  lastSync: string | null
  nextSync: string | null
}

export default function XmlSyncPage() {
  const router = useRouter()
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<number | null>(null)

  async function loadFeeds() {
    setLoading(true)
    try {
      const res = await fetch('/api/xml/feeds')
      const data = await res.json()
      if (data.success) setFeeds(data.feeds || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFeeds() }, [])

  async function handleSync(feedId: number) {
    setSyncing(feedId)
    try {
      const res = await fetch(`/api/xml/feeds/${feedId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      alert(data.success
        ? `🚀 ${data.message}`
        : `❌ ${data.message || 'Hata'}`)
      await loadFeeds()
    } catch {
      alert('❌ Sunucu hatası')
    } finally {
      setSyncing(null)
    }
  }

  async function handleToggle(feedId: number) {
    await fetch(`/api/xml/feeds/${feedId}/toggle`, { method: 'POST' })
    await loadFeeds()
  }

  async function handleDelete(feedId: number) {
    if (!confirm('Bu feed kalıcı olarak silinecek. Emin misin?')) return
    await fetch(`/api/xml/feeds/${feedId}`, { method: 'DELETE' })
    await loadFeeds()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button
            onClick={() => router.push('/xml-entegrasyon')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}
          >← XML Entegrasyon</button>
          <h1 className="page-title">📥 İçe Aktarma (Import)</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => router.push('/xml-sync/new')}
        >
          ➕ Yeni Entegrasyon
        </button>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            Feed listesi yükleniyor...
          </div>
        ) : feeds.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Henüz XML feed eklenmemiş
            </div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>
              Tedarikçi XML linkini ekleyip Shopify mağazana ürün aktarmaya başla.
            </div>
            <button className="btn-primary" onClick={() => router.push('/xml-sync/new')}>
              İlk Entegrasyonu Oluştur →
            </button>
          </div>
        ) : (
          <table className="wz-feed-table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>URL</th>
                <th>Ürün</th>
                <th>Durum</th>
                <th>Son Senk.</th>
                <th>Sonraki Senk.</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map(f => (
                <tr key={f.id}>
                  <td><strong>{f.title || '-'}</strong></td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <small style={{ color: 'var(--text-muted)' }}>{f.url}</small>
                  </td>
                  <td>{f.productCount}</td>
                  <td>
                    <span className={`wz-status-pill ${f.status === 'Aktif' ? 'wz-status-active' : 'wz-status-paused'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td><small>{f.lastSync || '-'}</small></td>
                  <td><small>{f.nextSync || '-'}</small></td>
                  <td>
                    <div className="wz-row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="wz-icon-btn"
                        onClick={() => handleSync(f.id)}
                        disabled={syncing === f.id}
                        title="Senkronize Et"
                      >
                        {syncing === f.id ? '⏳' : '🔄'}
                      </button>
                      <button
                        className="wz-icon-btn"
                        onClick={() => handleToggle(f.id)}
                        title={f.status === 'Aktif' ? 'Duraklat' : 'Aktifleştir'}
                      >
                        {f.status === 'Aktif' ? '⏸' : '▶'}
                      </button>
                      <button
                        className="wz-icon-btn danger"
                        onClick={() => handleDelete(f.id)}
                        title="Sil"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
