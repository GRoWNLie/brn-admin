'use client'

import Link from 'next/link'

interface SettingItem { name: string; desc: string; href: string; icon: React.ReactNode }

const I = {
  staff: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  location: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  sms: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  importIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
}

const storeSettings: SettingItem[] = [
  { name: 'Personel', desc: 'Ekibinize kullanıcı ekleyin, rol ve erişim izinlerini yönetin.', href: '/team', icon: I.staff },
  { name: 'Stok Lokasyonları', desc: 'Depolar ve fiziksel mağazalar gibi stok lokasyonlarını görüntüleyin.', href: '/inventory', icon: I.location },
]

const connectionSettings: SettingItem[] = [
  { name: 'E-Posta Domain Ayarları', desc: 'E-posta gönderimi için Resend API anahtarınızı ve gönderen adresini yönetin.', href: '/settings/api', icon: I.mail },
  { name: 'SMS Ayarları', desc: 'Kampanya ve bildirim SMS gönderimini Email & SMS modülünden yönetin.', href: '/marketing/email-sms', icon: I.sms },
  { name: 'Mağaza Aktarım / XML', desc: 'XML feed ile ürün içe/dışa aktarım ve senkronizasyon ayarları.', href: '/xml-entegrasyon', icon: I.importIcon },
]

const activitySettings: SettingItem[] = [
  { name: 'Mağaza Etkinlik Geçmişi', desc: 'Panelde yapılan tüm işlemleri (audit log) tek sayfada görüntüleyin.', href: '/audit', icon: I.activity },
]

function SettingsSection({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <>
      <div className="settings-section-title">{title}</div>
      <div className="settings-grid">
        {items.map(item => (
          <Link key={item.name} href={item.href} className="settings-card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <div className="settings-card-icon">{item.icon}</div>
            <div className="settings-card-info">
              <div className="settings-card-name">{item.name}</div>
              <div className="settings-card-desc">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

export default function SettingsPage() {
  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Ayarlar</h1>
      </div>

      <Link href="/settings/api" style={{ textDecoration: 'none' }}>
        <div className="panel-card" style={{
          display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
          borderLeft: '4px solid #2563EB',
        }}>
          <div style={{ fontSize: 30 }}>🔑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>API & Entegrasyon Ayarları</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Shopify, Resend (e-posta), Anthropic (AI) anahtarlarını panelden gir/değiştir, bağlantıyı test et.
            </div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</div>
        </div>
      </Link>

      <SettingsSection title="Mağaza Yönetimi" items={storeSettings} />
      <SettingsSection title="Bağlantı & İletişim" items={connectionSettings} />
      <SettingsSection title="Mağaza Etkinliği" items={activitySettings} />
    </div>
  )
}
