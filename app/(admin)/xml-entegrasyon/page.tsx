'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  imports: number
  exports: number
  totalProductsIn: number
  totalProductsOut: number
  loading: boolean
}

export default function XmlHubPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    imports: 0, exports: 0, totalProductsIn: 0, totalProductsOut: 0, loading: true,
  })

  async function loadStats() {
    try {
      const [feedsRes, exportsRes] = await Promise.all([
        fetch('/api/xml/feeds').then(r => r.json()).catch(() => ({ feeds: [] })),
        fetch('/api/xml/exports').then(r => r.json()).catch(() => ({ exports: [] })),
      ])
      const feeds = feedsRes.feeds || []
      const exports = exportsRes.exports || []
      setStats({
        imports: feeds.length,
        exports: exports.length,
        totalProductsIn: feeds.reduce((s: number, f: any) => s + (f.productCount || 0), 0),
        totalProductsOut: exports.reduce((s: number, e: any) => s + (e.productCount || 0), 0),
        loading: false,
      })
    } catch {
      setStats(s => ({ ...s, loading: false }))
    }
  }

  useEffect(() => { loadStats() }, [])

  async function handleDemoToggle() {
    await fetch('/api/xml/feeds/demo-toggle', { method: 'POST' })
    await loadStats()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">XML Entegrasyon</h1>
      </div>

      {/* Hero Banner */}
      <div className="xml-hub-banner">
        <div className="xml-hub-banner-title">
          ✨ Ürün feed&apos;lerinizi zahmetsizce yönetin.
        </div>
        <div className="xml-hub-banner-desc">
          Harici katalogları içe aktarın veya iş akışınıza uygun mapping, kurallar ve doğrulamalarla
          tamamen özelleştirilmiş bir feed dışa aktarın.
        </div>
      </div>

      {/* İki büyük kart */}
      <div className="xml-hub-cards">
        {/* İçe Aktarma */}
        <div className="xml-hub-card">
          <div className="xml-hub-card-header">
            <div className="xml-hub-card-title">✨ Feed İçe Aktarma</div>
            <span className="xml-hub-badge">Önerilen</span>
          </div>
          <div className="xml-hub-card-desc">
            XML feed&apos;lerinden ürünleri içeri alın ve mağazanızla tam senkronize edin
          </div>
          <div className="xml-hub-checklist">
            <div className="xml-hub-check-item">
              <span className="xml-hub-check">✓</span>
              Görsel alan eşleme ve akıllı tanıma
            </div>
            <div className="xml-hub-check-item">
              <span className="xml-hub-check">✓</span>
              Akıllı özelleştirmeler ve fiyat kuralları
            </div>
            <div className="xml-hub-check-item">
              <span className="xml-hub-check">✓</span>
              Filtre mantığı ve stok doğrulamaları
            </div>
          </div>
          <button className="xml-hub-cta" onClick={() => router.push('/xml-sync')}>
            Feed İçe Aktarma&apos;ya git →
          </button>
        </div>

        {/* Dışa Aktarma */}
        <div className="xml-hub-card">
          <div className="xml-hub-card-header">
            <div className="xml-hub-card-title">✨ Feed Dışa Aktarma</div>
            <span className="xml-hub-badge">Önerilen</span>
          </div>
          <div className="xml-hub-card-desc">
            Pazaryerleri ve harici kanallar için temiz, kurallı feed&apos;ler üretin
          </div>
          <div className="xml-hub-checklist">
            <div className="xml-hub-check-item">
              <span className="xml-hub-check">✓</span>
              Esnek şablonlar ve kategori ağaçları
            </div>
            <div className="xml-hub-check-item">
              <span className="xml-hub-check">✓</span>
              Kanal uyumlu XML/JSON/CSV yapıları
            </div>
            <div className="xml-hub-check-item">
              <span className="xml-hub-check">✓</span>
              Zamanlayın ve güvenle paylaşın
            </div>
          </div>
          <button className="xml-hub-cta" onClick={() => router.push('/xml-export')}>
            Feed Dışa Aktarma&apos;ya git →
          </button>
        </div>
      </div>

      {/* Uygulama Durumu */}
      <div className="panel-card">
        <div className="xml-hub-status-header">
          <div className="xml-hub-status-title">✓ Uygulama Durumu</div>
          <div className="xml-hub-status-actions">
            <button className="xml-hub-mini-btn" onClick={handleDemoToggle}>
              ⚡ Demo Feed Durumunu Değiştir
            </button>
            <span className="xml-hub-mini-badge">Aktif Plan: Import - Advanced</span>
          </div>
        </div>

        <div className="xml-hub-stats">
          {/* Toplam Export */}
          <div className="xml-hub-stat-card">
            <div className="xml-hub-stat-label">Toplam Export Feed</div>
            <div className="xml-hub-stat-value">
              {stats.loading ? '—' : stats.exports}
            </div>
            <div className="xml-hub-stat-footer">
              <span className="xml-hub-stat-note">
                {stats.exports === 0 ? 'Henüz feed yok' : `${stats.totalProductsOut} ürün yayınlanıyor`}
              </span>
              <button className="xml-hub-stat-link" onClick={() => router.push('/xml-export')}>
                Feedleri Gör →
              </button>
            </div>
          </div>

          {/* Toplam Import */}
          <div className="xml-hub-stat-card">
            <div className="xml-hub-stat-label">Toplam Import Feed</div>
            <div className="xml-hub-stat-value">
              {stats.loading ? '—' : stats.imports}
            </div>
            <div className="xml-hub-stat-footer">
              <span className="xml-hub-stat-note">
                {stats.imports === 0 ? 'Henüz feed yok' : `${stats.totalProductsIn} ürün senkronize`}
              </span>
              <button className="xml-hub-stat-link" onClick={() => router.push('/xml-sync')}>
                Feedleri Gör →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
