'use client'

import { useState } from 'react'

type Tab = 'profile' | 'security' | 'guide' | 'locale'

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Hesap</h1>
      </div>

      <div className="account-layout">
        <div className="account-sidebar">
          <nav className="account-nav">
            <button
              className={`account-nav-item${activeTab === 'profile' ? ' active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Hesabım
            </button>
            <button
              className={`account-nav-item${activeTab === 'security' ? ' active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Gizlilik &amp; Güvenlik
            </button>
            <button
              className={`account-nav-item${activeTab === 'guide' ? ' active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
              Başlangıç Rehberi
            </button>
            <button
              className={`account-nav-item${activeTab === 'locale' ? ' active' : ''}`}
              onClick={() => setActiveTab('locale')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Dil ve Bölge Ayarları
            </button>
          </nav>
        </div>

        <div className="account-content">
          {activeTab === 'profile' && (
            <div className="panel-card">
              <div className="settings-section-title">Hesap Bilgileri</div>
              <div className="account-info-list">
                <div className="account-info-row">
                  <div className="account-info-label">Ad Soyad</div>
                  <div className="account-info-value">Baran KABÇAK</div>
                  <button className="account-edit-link">Düzenle</button>
                </div>
                <div className="account-info-row">
                  <div className="account-info-label">E-posta</div>
                  <div className="account-info-value">baran@sekerco.com</div>
                  <button className="account-edit-link">Düzenle</button>
                </div>
                <div className="account-info-row">
                  <div className="account-info-label">Telefon</div>
                  <div className="account-info-value">—</div>
                  <button className="account-edit-link">Ekle</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="panel-card">
              <div className="settings-section-title">Gizlilik &amp; Güvenlik</div>
              <div className="account-info-list">
                <div className="account-info-row">
                  <div className="account-info-label">Şifre</div>
                  <div className="account-info-value">••••••••</div>
                  <button className="account-edit-link">Şifre Değiştir</button>
                </div>
                <div className="account-info-row">
                  <div className="account-info-label">İki Aşamalı Doğrulama</div>
                  <div className="account-info-value">Devre dışı</div>
                  <button className="account-edit-link">Etkinleştir</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="panel-card">
              <div className="settings-section-title">Başlangıç Rehberi</div>
              <div className="guide-steps">
                {[
                  { num: 1, title: 'Mağazanızı Kurun', desc: 'Mağaza adı, logosu ve temel bilgilerini tamamlayın.' },
                  { num: 2, title: 'Ürünlerinizi Ekleyin', desc: 'İlk ürününüzü oluşturun ve stok bilgilerini girin.' },
                  { num: 3, title: 'Ödeme Yöntemlerini Ayarlayın', desc: 'Müşterilerinizin ödeme yapabileceği yöntemleri tanımlayın.' },
                  { num: 4, title: 'Kargo Seçeneklerini Yapılandırın', desc: 'Teslimat bölgeleri ve kargo ücretlerini belirleyin.' },
                  { num: 5, title: 'Mağazanızı Yayına Alın', desc: 'Her şey hazır olduğunda mağazanızı canlıya geçirin.' },
                ].map(step => (
                  <div key={step.num} className="guide-step">
                    <div className="guide-step-num">{step.num}</div>
                    <div className="guide-step-body">
                      <div className="guide-step-title">{step.title}</div>
                      <div className="guide-step-desc">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'locale' && (
            <div className="panel-card">
              <div className="settings-section-title">Dil ve Bölge Ayarları</div>
              <div className="settings-card-list">
                <div className="settings-card">
                  <div className="settings-card-info">
                    <div className="settings-card-name">Dil</div>
                    <div className="settings-card-desc">Panel arayüz dilini seçin</div>
                  </div>
                  <select className="form-select" style={{ width: 'auto', minWidth: 160 }}>
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="settings-card">
                  <div className="settings-card-info">
                    <div className="settings-card-name">Zaman Dilimi</div>
                    <div className="settings-card-desc">Raporlar ve siparişler için zaman dilimini belirleyin</div>
                  </div>
                  <select className="form-select" style={{ width: 'auto', minWidth: 200 }}>
                    <option value="Europe/Istanbul">(UTC+03:00) İstanbul</option>
                    <option value="UTC">(UTC+00:00) UTC</option>
                  </select>
                </div>
                <div className="settings-card">
                  <div className="settings-card-info">
                    <div className="settings-card-name">Para Birimi</div>
                    <div className="settings-card-desc">Varsayılan para birimini seçin</div>
                  </div>
                  <select className="form-select" style={{ width: 'auto', minWidth: 160 }}>
                    <option value="TRY">TRY — Türk Lirası</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
