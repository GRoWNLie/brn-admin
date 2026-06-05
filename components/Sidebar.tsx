'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

type MenuLeaf = {
  href: string
  label: string
  adminOnly?: boolean
  comingSoon?: boolean  // "Yakında" badge
}
type MenuGroup = { label: string; adminOnly?: boolean; children: MenuLeaf[] }
type MenuItem = MenuLeaf | MenuGroup

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Giriş' },

  // — Günlük operasyon —
  {
    label: 'Siparişler',
    children: [
      { href: '/orders', label: 'Siparişler' },
      { href: '/drafts', label: 'Taslaklar' },
      { href: '/abandoned-checkouts', label: 'Terk Edilmiş Sepetler' },
      { href: '/cargo', label: '🚚 Kargo Takip' },
      { href: '/einvoice', label: '📄 e-Fatura / e-Arşiv' },
      { href: '/gift-cards', label: 'Hediye Kartları' },
    ],
  },

  {
    label: 'Ürünler',
    children: [
      { href: '/products', label: 'Ürünler' },
      { href: '/collections', label: 'Koleksiyonlar' },
      { href: '/categories', label: 'Kategoriler' },
      { href: '/inventory', label: 'Envanter Lokasyonları' },
      { href: '/stock-count', label: '📊 Stok Sayımı' },
      { href: '/transfer', label: '🚚 Transferler' },
      { href: '/purchase', label: '📦 Satın Alma' },
      { href: '/price-list', label: '🏷 Fiyat Listeleri' },
      { href: '/barcode', label: 'Ürün Barkod Etiketi' },
      { href: '/definitions', label: 'Tanımlamalar' },
    ],
  },

  {
    label: 'Müşteriler',
    children: [
      { href: '/customers', label: 'Müşteriler' },
      { href: '/customer-segments', label: 'Müşteri Segmentleri' },
      { href: '/inbox', label: '✉️ Gelen Kutusu' },
    ],
  },

  // — Büyüme & pazarlama —
  {
    label: 'Pazarlama',
    children: [
      { href: '/marketing/email-sms', label: 'Email & SMS' },
      { href: '/marketing/automation', label: '🤖 Otomasyon' },
      { href: '/marketing/popup', label: '💬 Popup' },
      { href: '/upsell', label: '🎯 Upsell & Cross-sell' },
      { href: '/reviews', label: '⭐ Yorum Yönetimi' },
      { href: '/loyalty', label: '🎁 Sadakat Puanları' },
    ],
  },

  {
    label: 'İndirimler',
    children: [
      { href: '/discounts', label: 'Kuponlar & İndirimler' },
    ],
  },

  {
    label: 'Raporlar',
    children: [
      { href: '/reports/sales', label: 'Satış Raporu' },
      { href: '/reports/conversion', label: 'Dönüşüm Raporu' },
      { href: '/reports/products', label: 'Ürün Performansı' },
      { href: '/reports/campaigns', label: '🎟 Kampanya Kullanımı' },
      { href: '/reports/ai-assistant', label: 'Yapay Zeka Asistanı' },
    ],
  },

  {
    label: 'Ödemeler',
    children: [
      { href: '/payments/installments', label: '💳 Taksit Hesaplayıcı' },
    ],
  },

  // — Entegrasyon & yönetim —
  {
    label: 'Pazaryerleri',
    children: [
      { href: '/marketplace', label: '🛍 Genel Bakış' },
      { href: '/marketplace/buybox', label: '📊 Buybox Takip' },
      { href: '/marketplace/repricing', label: '⚖️ Repricing' },
      { href: '/marketplace/orders', label: '📦 Pazaryeri Siparişleri' },
    ],
  },

  { href: '/messages', label: '💬 Mesajlaşma' },

  {
    label: 'Customer Dashboard',
    adminOnly: true,
    children: [
      { href: '/customer-dashboard', label: '🛍 Mağazalar' },
      { href: '/customer-dashboard/stores/1/analytics', label: '📊 Analitik (#1)' },
    ],
  },

  { href: '/xml-entegrasyon', label: 'XML Entegrasyon' },

  {
    label: 'Yönetim',
    adminOnly: true,
    children: [
      { href: '/team', label: '👥 Ekip Yönetimi' },
      { href: '/audit', label: '📋 Audit Log' },
      { href: '/settings', label: 'Ayarlar' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin)

  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const openGroups: string[] = []
    visibleItems.forEach(item => {
      if ('children' in item && item.children) {
        const isChildActive = item.children.some(c => c.href === pathname)
        if (isChildActive) openGroups.push(item.label)
      }
    })
    return openGroups
  })

  function toggleMenu(label: string) {
    setOpenMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">BRN ADMIN</div>
      <div className="sidebar-menu-container">
        <ul className="sidebar-menu">
          {visibleItems.map(item => {
            if ('children' in item && item.children) {
              const isOpen = openMenus.includes(item.label)
              return (
                <li key={item.label} className={`dropdown${isOpen ? ' open' : ''}`}>
                  <a
                    className="dropdown-toggle"
                    onClick={() => toggleMenu(item.label)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="menu-left"><span>{item.label}</span></div>
                    <span className="arrow">▼</span>
                  </a>
                  <ul className="dropdown-menu">
                    {item.children.map(child => (
                      <li key={child.href + child.label}>
                        {child.comingSoon ? (
                          <a
                            style={{
                              cursor: 'not-allowed', opacity: 0.55,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}
                            title="Bu modül yakında aktif olacak"
                            onClick={e => e.preventDefault()}
                          >
                            <span>{child.label}</span>
                            <span style={{
                              fontSize: 9, background: '#FEF3C7', color: '#92400E',
                              padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                            }}>YAKINDA</span>
                          </a>
                        ) : (
                          <Link
                            href={child.href}
                            className={pathname === child.href ? 'active' : ''}
                          >
                            {child.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            }
            const leaf = item as MenuLeaf
            return (
              <li key={leaf.href}>
                <Link
                  href={leaf.href}
                  className={pathname === leaf.href ? 'active' : ''}
                >
                  {leaf.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="sidebar-bottom">
          <div className="earnings-box">
            <div className="earnings-title">Hak Edişler</div>
            <div className="earnings-amount">₺0,00</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
