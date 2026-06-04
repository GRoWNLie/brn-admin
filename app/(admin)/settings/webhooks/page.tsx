'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface WebhookHook {
  id: string
  topic: string
  callbackUrl: string
  createdAt: string
}

interface WebhookLog {
  id: number
  topic: string
  shopDomain: string
  hmacValid: boolean
  processed: boolean
  errorMsg: string | null
  createdAt: string
}

export default function WebhooksPage() {
  const router = useRouter()
  const [hooks, setHooks] = useState<WebhookHook[]>([])
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [required, setRequired] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/webhooks')
      const data = await res.json()
      if (data.success) {
        setHooks(data.shopifyHooks || [])
        setLogs(data.recentLogs || [])
        setRequired(data.requiredTopics || [])
      } else setMsg({ kind: 'error', text: data.message || 'Liste alınamadı' })
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function registerAll() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/shopify/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_all' }),
      })
      const data = await res.json()
      if (data.success) {
        const created = data.results.filter((r: any) => r.status === 'created').length
        const existed = data.results.filter((r: any) => r.status === 'already_exists').length
        const failed = data.results.filter((r: any) => r.status === 'failed')
        let txt = `✅ ${created} yeni kaydedildi, ${existed} zaten vardı.`
        if (failed.length > 0) txt += `\n❌ ${failed.length} başarısız:\n` + failed.map((f: any) => `${f.topic}: ${f.error}`).join('\n')
        setMsg({ kind: created > 0 || failed.length === 0 ? 'success' : 'error', text: txt })
        await load()
      } else setMsg({ kind: 'error', text: data.message })
    } finally { setBusy(false) }
  }

  async function removeHook(id: string) {
    if (!confirm('Bu webhook silinecek. Emin misin?')) return
    await fetch(`/api/shopify/webhooks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button
            onClick={() => router.push('/settings')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}
          >← Ayarlar</button>
          <h1 className="page-title">Webhooks</h1>
        </div>
        <button className="btn-primary" onClick={registerAll} disabled={busy}>
          {busy ? '⏳ Kayıt ediliyor...' : '🔄 Gerekli Tümünü Kaydet'}
        </button>
      </div>

      {/* Lokal geliştirme uyarısı */}
      <div className="panel-card" style={{
        background: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 24 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
              Webhook'lar yalnızca PUBLIC URL'ler ile çalışır
            </div>
            <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
              Şu an <code>localhost:3000</code> üzerinde çalışıyorsun. Shopify localhost'a HTTP isteği gönderemez,
              bu yüzden webhook'lar TETİKLENMEYECEK.
              <br /><br />
              <strong>Bu sayfa ne işe yarar?</strong> Webhook olmadan da projenin <strong>%95'i çalışır</strong>.
              Sayfa açıldığında Shopify'dan canlı veri zaten geliyor. Webhook sadece
              "Shopify'da sipariş geldiği anda anlık bildirim" gibi gerçek-zamanlı senaryolar için.
              <br /><br />
              <strong>Üretime aldığında</strong> (Vercel/Railway deploy) veya <strong>ngrok</strong> kullanmaya
              karar verirsen, o zaman bu sayfadan webhook'ları kaydedersin.
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="panel-card" style={{ borderLeft: `4px solid ${msg.kind === 'success' ? '#10B981' : '#DC2626'}`, whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{msg.text}</div>
        </div>
      )}

      <div className="panel-card">
        <div className="settings-section-title">Aktif Webhook Abonelikleri</div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
        ) : hooks.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            Henüz webhook kayıtlı değil. <strong>&quot;Gerekli Tümünü Kaydet&quot;</strong> butonuna bas.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Callback URL</th>
                <th>Oluşturuldu</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {hooks.map(h => (
                <tr key={h.id}>
                  <td><code style={{ background: 'var(--hover-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{h.topic}</code></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.callbackUrl}</td>
                  <td><small>{new Date(h.createdAt).toLocaleString('tr-TR')}</small></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => removeHook(h.id)}>🗑 Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel-card">
        <div className="settings-section-title">Son Gelen Webhook Çağrıları (50)</div>
        {logs.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            Henüz Shopify'dan webhook gelmedi.
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Domain</th>
                  <th>HMAC</th>
                  <th>İşlendi</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td><code style={{ fontSize: 11 }}>{l.topic}</code></td>
                    <td><small>{l.shopDomain}</small></td>
                    <td>{l.hmacValid ? '✅' : '❌'}</td>
                    <td>{l.processed ? '✅' : (l.errorMsg ? `❌ ${l.errorMsg.slice(0, 40)}` : '⏳')}</td>
                    <td><small>{new Date(l.createdAt).toLocaleString('tr-TR')}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
