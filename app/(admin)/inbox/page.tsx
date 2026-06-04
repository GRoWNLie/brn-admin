'use client'

import { useState } from 'react'

interface Channel {
  id: string
  name: string
  icon: string
  brandColor: string
  setupSteps: string[]
}

const CHANNELS: Channel[] = [
  {
    id: 'instagram',
    name: 'Instagram DM',
    icon: '📷',
    brandColor: '#E1306C',
    setupSteps: [
      'Meta Business Suite hesabını oluştur',
      'Instagram işletme hesabına geç',
      'Meta for Developers → App oluştur',
      'Instagram Graph API + Messenger Platform izinleri',
      'App Review başvurusu (yaklaşık 1-3 hafta)',
      'Onay sonrası access token .env\'ye yapıştır',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: '💚',
    brandColor: '#25D366',
    setupSteps: [
      'Meta Business Manager → WhatsApp Business hesabı',
      'Telefon numarası doğrulama (Türk numarası)',
      'WhatsApp Cloud API setup',
      'Mesaj template\'lerini Meta onayına gönder',
      'Webhook URL kayıt (ngrok veya production)',
      'Pricing: Meta servis ücreti (kategori bazlı)',
    ],
  },
  {
    id: 'email',
    name: 'Email Inbox',
    icon: '📧',
    brandColor: '#2563EB',
    setupSteps: [
      'IMAP / Gmail / Outlook hesabı seç',
      'OAuth bağlantısı (Gmail için Google Workspace API)',
      'Gelen kutusu polling (her 5 dk)',
      'Yanıt için SMTP konfigürasyonu',
    ],
  },
  {
    id: 'tawk',
    name: 'Canlı Destek',
    icon: '💬',
    brandColor: '#7C3AED',
    setupSteps: [
      'Tawk.to / Crisp / LiveChat hesabı aç (ücretsiz tier var)',
      'Widget kodu Shopify temasına ekle',
      'API ile mesajları BRN Admin\'e çek',
    ],
  },
]

export default function InboxPage() {
  const [selected, setSelected] = useState<Channel | null>(null)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Mesaj Merkezi</h1>
      </div>

      <div className="panel-card" style={{
        background: 'linear-gradient(135deg, #EEF2FF, #E0F2FE)',
        border: '1px solid #C7D2FE',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A8A', marginBottom: 4 }}>
              Tek Panelden Tüm Mesajlar
            </div>
            <div style={{ fontSize: 14, color: '#1E40AF' }}>
              Instagram DM, WhatsApp, Email ve Canlı Destek mesajlarını tek gelen kutusunda topla.
              Bu özellik 3. taraf API onayları gerektirdiği için <strong>kanal bağlama sihirbazı</strong> ile kuruluyor.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {CHANNELS.map(ch => (
          <div key={ch.id} className="panel-card" style={{
            cursor: 'pointer', borderLeft: `4px solid ${ch.brandColor}`,
          }}
            onClick={() => setSelected(ch)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 32 }}>{ch.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{ch.name}</div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                  background: '#F3F4F6', color: '#6B7280',
                }}>● Bağlı Değil</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Kurulum: {ch.setupSteps.length} adım
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>
              📋 Kurulum Adımlarını Gör
            </button>
          </div>
        ))}
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)' }}>
          <strong>Gelen Mesajlar</strong>
        </div>
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
            Henüz bağlı kanal yok
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Yukarıdaki kartlardan birini seçip kurulum adımlarını uygula.
          </div>
        </div>
      </div>

      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: 'var(--bg-panel)', borderRadius: 14, padding: 26,
            maxWidth: 600, width: '100%', borderTop: `5px solid ${selected.brandColor}`,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 32 }}>{selected.icon}</div>
                <h2 style={{ marginTop: 8 }}>{selected.name} Kurulumu</h2>
              </div>
              <button className="btn-secondary" onClick={() => setSelected(null)}>✕</button>
            </div>
            <ol style={{ marginLeft: 18, lineHeight: 2 }}>
              {selected.setupSteps.map((step, i) => (
                <li key={i} style={{ fontSize: 14 }}>{step}</li>
              ))}
            </ol>
            <div style={{
              marginTop: 16, padding: 12, background: '#FEF3C7',
              border: '1px solid #FDE68A', borderRadius: 8,
              fontSize: 12, color: '#92400E',
            }}>
              ⚠️ <strong>Önemli:</strong> Bu adımlar genelde 1-3 hafta sürer (Meta App Review).
              Onay aldıktan sonra .env'ye gerekli token'ı ekleyip Mesaj Merkezi'ni aktifleştireceğiz.
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 14 }}
              onClick={() => alert('Bu kanal için kurulum sihirbazı yakında aktif olacak. Şu an manuel olarak yukarıdaki adımları izlemen gerek.')}>
              🚀 Kurulum Sihirbazını Başlat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
