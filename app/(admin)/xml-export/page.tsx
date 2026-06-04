'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ExportItem {
  id: number
  title: string
  slug: string
  rootTag: string
  itemTag: string
  productCount: number
  status: string
  lastGeneratedAt: string | null
  autoRefreshMin: number
}

export default function XmlExportPage() {
  const router = useRouter()
  const [exports, setExports] = useState<ExportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    loadExports()
  }, [])

  async function loadExports() {
    setLoading(true)
    try {
      const res = await fetch('/api/xml/exports')
      const data = await res.json()
      if (data.success) setExports(data.exports || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleGenerate(id: number) {
    setBusy(id)
    try {
      const res = await fetch(`/api/xml/exports/${id}/generate`, { method: 'POST' })
      const data = await res.json()
      alert(data.success ? `✅ ${data.message}` : `❌ ${data.message}`)
      await loadExports()
    } finally { setBusy(null) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bu dışa aktarma kalıcı olarak silinecek. Emin misiniz?')) return
    await fetch(`/api/xml/exports/${id}`, { method: 'DELETE' })
    await loadExports()
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Public URL kopyalandı!'))
      .catch(() => alert('Kopyalama başarısız'))
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button
            onClick={() => router.push('/xml-entegrasyon')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}
          >← XML Entegrasyon</button>
          <h1 className="page-title">📤 Dışa Aktarma (Export)</h1>
        </div>
        <button className="btn-primary" onClick={() => router.push('/xml-export/new')}>
          ➕ Yeni Dışa Aktarma
        </button>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            Yükleniyor...
          </div>
        ) : exports.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Henüz dışa aktarma yok
            </div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>
              Shopify ürünlerini XML formatında tedarikçilerle paylaşmak için bir dışa aktarma oluşturun.
            </div>
            <button className="btn-primary" onClick={() => router.push('/xml-export/new')}>
              İlk Dışa Aktarmayı Oluştur →
            </button>
          </div>
        ) : (
          <table className="wz-feed-table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Public URL (Paylaşılabilir)</th>
                <th>Ürün</th>
                <th>Durum</th>
                <th>Son Üretim</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {exports.map(ex => {
                const publicUrl = `${origin}/api/xml/feed/${ex.slug}`
                return (
                  <tr key={ex.id}>
                    <td>
                      <strong>{ex.title}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        &lt;{ex.rootTag}&gt; / &lt;{ex.itemTag}&gt; — yenileme: {ex.autoRefreshMin}dk
                      </div>
                    </td>
                    <td>
                      <code style={{
                        fontSize: 11,
                        background: 'var(--hover-bg)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        wordBreak: 'break-all',
                        display: 'inline-block',
                        maxWidth: 320,
                      }}>{publicUrl}</code>
                    </td>
                    <td>{ex.productCount}</td>
                    <td>
                      <span className={`wz-status-pill ${ex.status === 'Aktif' ? 'wz-status-active' : 'wz-status-paused'}`}>
                        {ex.status}
                      </span>
                    </td>
                    <td>
                      <small>
                        {ex.lastGeneratedAt
                          ? new Date(ex.lastGeneratedAt).toLocaleString('tr-TR')
                          : '—'}
                      </small>
                    </td>
                    <td>
                      <div className="wz-row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="wz-icon-btn" onClick={() => copyToClipboard(publicUrl)} title="URL'yi Kopyala">📋</button>
                        <button className="wz-icon-btn" onClick={() => window.open(publicUrl, '_blank')} title="XML'i Önizle">👁</button>
                        <button className="wz-icon-btn" onClick={() => handleGenerate(ex.id)} disabled={busy === ex.id} title="Yeniden Üret">
                          {busy === ex.id ? '⏳' : '🔄'}
                        </button>
                        <button className="wz-icon-btn danger" onClick={() => handleDelete(ex.id)} title="Sil">🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
