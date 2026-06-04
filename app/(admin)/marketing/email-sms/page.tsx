'use client'

import { useEffect, useState } from 'react'

interface Campaign {
  id: number
  name: string
  segmentType: string
  status: string
  recipientCount: number
  sentCount: number
  failCount: number
  openCount: number
  clickCount: number
  sentAt: string | null
  createdAt: string
}

interface EmailLog {
  id: number
  toEmail: string
  subject: string
  status: string
  errorMsg: string | null
  sentAt: string
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Hoş Geldin',
    subject: 'Hoş geldin {{name}}!',
    html: `<div style="font-family: Helvetica; max-width: 580px; margin: 0 auto;">
  <h1 style="color: #0F172A;">Hoş geldin, {{name}}! 🎉</h1>
  <p>Mağazamıza kayıt olduğun için teşekkürler.</p>
  <p>İlk siparişinde <strong>%10 indirim</strong> için <code>HOSGELDIN10</code> kuponunu kullanabilirsin.</p>
</div>`
  },
  {
    name: 'Sepet Hatırlatma',
    subject: '🛒 Sepetinde unuttuğun ürünler var!',
    html: `<div style="font-family: Helvetica; max-width: 580px; margin: 0 auto;">
  <h2 style="color: #DC2626;">Merhaba {{name}}!</h2>
  <p>Sepetindeki ürünler seni bekliyor. Sınırlı süre — stoklar tükenmek üzere!</p>
  <a href="#" style="background: #DC2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Sepete Dön →</a>
</div>`
  },
  {
    name: 'VIP Kupon',
    subject: '🎁 Sana özel indirim!',
    html: `<div style="font-family: Helvetica; max-width: 580px; margin: 0 auto;">
  <h2 style="color: #7C3AED;">VIP Müşterimiz {{name}} 👑</h2>
  <p>Sadakatın için sana özel bir kupon hazırladık:</p>
  <div style="background: #F5F3FF; border: 2px dashed #7C3AED; padding: 20px; text-align: center; border-radius: 10px;">
    <div style="font-size: 28px; font-weight: bold; color: #7C3AED;">VIP25</div>
    <div>%25 İNDİRİM</div>
  </div>
</div>`
  },
]

export default function EmailSmsPage() {
  const [tab, setTab] = useState<'compose' | 'campaigns' | 'logs'>('compose')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)

  // Compose form
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [segmentType, setSegmentType] = useState<'all' | 'vip' | 'active' | 'new'>('all')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function loadCampaigns() {
    setLoading(true)
    try {
      const res = await fetch('/api/email/campaigns')
      const data = await res.json()
      if (data.success) {
        setCampaigns(data.campaigns || [])
        setLogs(data.lastLogs || [])
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { loadCampaigns() }, [tab])

  function loadTemplate(t: any) {
    setSubject(t.subject)
    setHtml(t.html)
  }

  async function sendCampaign() {
    if (!name || !subject || !html) { alert('İsim, konu ve içerik gerekli'); return }
    setSending(true); setMsg(null)
    try {
      const res = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, html, segmentType }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg({ kind: 'success', text: `✅ ${data.message}` })
        setName(''); setSubject(''); setHtml('')
        await loadCampaigns()
      } else {
        setMsg({ kind: 'error', text: '❌ ' + data.message })
      }
    } finally { setSending(false) }
  }

  async function testEmail() {
    const to = prompt('Test email adresi:')
    if (!to) return
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    const data = await res.json()
    alert(data.success ? `✅ Gönderildi${data.mocked ? ' (MOCK - Resend API key yok)' : ''}` : `❌ ${data.error}`)
  }

  const SEG_LABEL: Record<string, string> = {
    all: '👥 Tüm Müşteriler',
    vip: '👑 VIP (₺5000+)',
    active: '✅ Aktif (2+ sipariş)',
    new: '🆕 Yeni Müşteriler',
    manual: '✍️ Manuel Liste',
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">📧 Email Pazarlama</h1>
      </div>

      <div className="panel-card" style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B' }}>
        <div style={{ fontSize: 13, color: '#92400E' }}>
          <strong>💡 Setup:</strong> Resend API key tanımlanmamış — şu an <strong>MOCK</strong> modda çalışıyor (DB'ye log düşüyor, gerçek mail gitmiyor).
          Aktif etmek için: <a href="https://resend.com" target="_blank" style={{ color: '#92400E', fontWeight: 700 }}>resend.com</a>'dan key al,
          <code style={{ background: '#FDE68A', padding: '1px 6px', borderRadius: 4 }}>RESEND_API_KEY</code> ve
          <code style={{ background: '#FDE68A', padding: '1px 6px', borderRadius: 4 }}>EMAIL_FROM</code> env değişkenlerini ekle.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)' }}>
        {[
          { v: 'compose', label: '✏️ Yeni Kampanya' },
          { v: 'campaigns', label: `📊 Kampanyalar (${campaigns.length})` },
          { v: 'logs', label: `📋 Gönderim Logları` },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.v ? 700 : 500,
              color: tab === t.v ? '#2563EB' : 'var(--text-muted)',
              borderBottom: tab === t.v ? '2px solid #2563EB' : 'none',
            }}>{t.label}</button>
        ))}
      </div>

      {msg && (
        <div className="panel-card" style={{
          borderLeft: `4px solid ${msg.kind === 'success' ? '#10B981' : '#DC2626'}`,
          background: msg.kind === 'success' ? '#ECFDF5' : '#FEF2F2',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{msg.text}</div>
        </div>
      )}

      {/* COMPOSE */}
      {tab === 'compose' && (
        <>
          <div className="panel-card">
            <div className="settings-section-title">Hazır Şablonlar</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SAMPLE_TEMPLATES.map(t => (
                <button key={t.name} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={() => loadTemplate(t)}>📄 {t.name}</button>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <div className="settings-section-title">Yeni Email Kampanyası</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              <div>
                <label className="form-label">Kampanya Adı (dahili)</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Örn: Şubat 2026 İndirim" />
              </div>
              <div>
                <label className="form-label">Hedef Segment</label>
                <select className="form-select" style={{ width: '100%' }}
                  value={segmentType} onChange={e => setSegmentType(e.target.value as any)}>
                  {Object.entries(SEG_LABEL).filter(([v]) => v !== 'manual').map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Email Konusu</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Örn: 🎁 Sana özel %25 indirim!" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">
                  HTML İçerik <small style={{ color: 'var(--text-muted)' }}>(değişkenler: <code>{'{{name}}'}</code> <code>{'{{email}}'}</code>)</small>
                </label>
                <textarea className="form-select"
                  style={{ width: '100%', minHeight: 180, fontFamily: 'monospace', fontSize: 12 }}
                  value={html} onChange={e => setHtml(e.target.value)}
                  placeholder="<div>Merhaba {{name}}...</div>" />
              </div>
            </div>

            {html && (
              <div style={{ marginTop: 16 }}>
                <strong style={{ fontSize: 13 }}>👁 Önizleme</strong>
                <div style={{
                  border: '1px solid var(--border-color)', borderRadius: 8,
                  padding: 16, background: '#fff', marginTop: 6,
                }} dangerouslySetInnerHTML={{ __html: html.replace(/{{name}}/g, 'Baran').replace(/{{email}}/g, 'baran@example.com') }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn-secondary" onClick={testEmail} disabled={!subject || !html}>
                📧 Test Email Gönder
              </button>
              <button className="btn-primary" onClick={sendCampaign} disabled={sending || !name || !subject || !html}>
                {sending ? '⏳ Gönderiliyor...' : '🚀 Kampanyayı Gönder'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* CAMPAIGNS */}
      {tab === 'campaigns' && (
        <div className="panel-card" style={{ padding: 0 }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
            : campaigns.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                Henüz kampanya yok
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kampanya</th>
                    <th>Segment</th>
                    <th>Alıcı</th>
                    <th>Gönderilen</th>
                    <th>Hata</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td><small>{SEG_LABEL[c.segmentType] || c.segmentType}</small></td>
                      <td>{c.recipientCount}</td>
                      <td><strong style={{ color: '#059669' }}>{c.sentCount}</strong></td>
                      <td><span style={{ color: c.failCount > 0 ? '#DC2626' : 'inherit' }}>{c.failCount}</span></td>
                      <td>
                        <span className={`status-badge ${c.status === 'SENT' ? 'delivered' : c.status === 'FAILED' ? 'cancelled' : 'pending'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td><small>{c.sentAt ? new Date(c.sentAt).toLocaleString('tr-TR') : '—'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}

      {/* LOGS */}
      {tab === 'logs' && (
        <div className="panel-card" style={{ padding: 0 }}>
          {logs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              Henüz email gönderilmedi
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Alıcı</th><th>Konu</th><th>Durum</th><th>Tarih</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.toEmail}</td>
                    <td>{l.subject}</td>
                    <td>
                      <span className={`status-badge ${l.status === 'SENT' ? 'delivered' : 'cancelled'}`}>
                        {l.status}
                      </span>
                      {l.errorMsg && <div style={{ fontSize: 10, color: '#DC2626' }}>{l.errorMsg}</div>}
                    </td>
                    <td><small>{new Date(l.sentAt).toLocaleString('tr-TR')}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
