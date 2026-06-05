'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'

const TAB_LINKS = [
  { key: 'profile',   path: 'account',   label: 'Profil' },
  { key: 'orders',    path: 'orders',    label: 'Siparişler' },
  { key: 'addresses', path: 'addresses', label: 'Adresler' },
  { key: 'recent',    path: 'recent',    label: 'Son Görüntülenen' },
  { key: 'top',       path: 'top',       label: 'En Çok Sipariş' },
]

export default function StorefrontShell({ config, forwardedHost, children }: {
  config: any; forwardedHost: string; children: React.ReactNode
}) {
  const { storeId } = useParams<{ storeId: string }>()
  const pathname = usePathname()
  const t = config.theme || {}
  const radius = (t.borderRadius ?? 8) + 'px'

  // Login/Register/Reset sayfalarında nav gösterilmesin
  const isAuthPage = ['/login', '/register', '/reset'].some(p => pathname?.endsWith(p))

  const base = `/storefront/${storeId}`

  // Çerez bildirimi (KVKK)
  const [cookieAck, setCookieAck] = useState(true)
  const [modalOpen, setModalOpen] = useState<null | 'kvkk' | 'terms'>(null)
  useEffect(() => {
    try { setCookieAck(localStorage.getItem(`sf_cookie_${storeId}`) === '1') } catch {}
  }, [storeId])
  function ackCookies() {
    try { localStorage.setItem(`sf_cookie_${storeId}`, '1') } catch {}
    setCookieAck(true)
  }

  return (
    <div className="sf-root">
      <style>{`
          .sf-root {
            --sf-primary: ${t.primaryColor || '#111111'};
            --sf-secondary: ${t.secondaryColor || '#2563EB'};
            --sf-bg: ${t.bgColor || '#FFFFFF'};
            --sf-text: ${t.textColor || '#111111'};
            --sf-radius: ${radius};
            --sf-muted: rgba(0,0,0,.55);
            --sf-border: rgba(0,0,0,.10);
            --sf-card: rgba(0,0,0,.02);
            background: var(--sf-bg);
            color: var(--sf-text);
            font-family: ${t.fontFamily || 'Inter'}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            min-height: 100vh;
            display: flex; flex-direction: column;
          }
          .sf-root * { box-sizing: border-box; }
          .sf-root a { color: inherit; }
          .sf-banner { background: var(--sf-primary); color: #fff; text-align: center; padding: 8px 16px; font-size: 13px; font-weight: 500; }
          .sf-header { border-bottom: 1px solid var(--sf-border); padding: 16px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
          .sf-logo img { max-height: 36px; }
          .sf-logo-text { font-weight: 800; font-size: 18px; }
          .sf-nav { display: flex; gap: 4px; flex-wrap: wrap; margin-left: auto; }
          .sf-nav a {
            padding: 8px 14px; border-radius: var(--sf-radius); text-decoration: none;
            color: var(--sf-text); font-size: 14px; font-weight: 500; transition: background .15s;
          }
          .sf-nav a:hover { background: var(--sf-card); }
          .sf-nav a.active { background: var(--sf-primary); color: #fff; }
          .sf-main { max-width: 1080px; margin: 0 auto; padding: 24px 20px 60px; }
          .sf-card { background: var(--sf-card); border: 1px solid var(--sf-border); border-radius: var(--sf-radius); padding: 20px; margin-bottom: 16px; }
          .sf-btn { background: var(--sf-primary); color: #fff; border: none; padding: 11px 22px; border-radius: var(--sf-radius); font-weight: 600; cursor: pointer; font-size: 14px; }
          .sf-btn:hover { opacity: .92; }
          .sf-btn-secondary { background: transparent; color: var(--sf-secondary); border: 1px solid var(--sf-secondary); padding: 10px 20px; border-radius: var(--sf-radius); font-weight: 600; cursor: pointer; font-size: 14px; }
          .sf-input { width: 100%; padding: 11px 14px; border-radius: var(--sf-radius); border: 1px solid var(--sf-border); background: var(--sf-bg); color: var(--sf-text); font-size: 16px; outline: none; }
          .sf-input:focus { border-color: var(--sf-secondary); }
          .sf-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
          .sf-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
          .sf-h1 { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
          .sf-h2 { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
          .sf-muted { color: var(--sf-muted); font-size: 13px; }
          .sf-footer { border-top: 1px solid var(--sf-border); padding: 18px 20px; text-align: center; font-size: 12px; color: var(--sf-muted); }
          @media (max-width: 640px) {
            .sf-header { padding: 12px; }
            .sf-nav { width: 100%; order: 3; }
            .sf-nav a { padding: 6px 10px; font-size: 13px; }
            .sf-h1 { font-size: 22px; }
          }
          ${t.customCss || ''}
        `}</style>
        {config.content?.topBannerText && (
          <div className="sf-banner">{config.content.topBannerText}</div>
        )}

        <header className="sf-header">
          <div className="sf-logo">
            {t.logoUrl
              ? <img src={t.logoUrl} alt={config.name} />
              : <span className="sf-logo-text">{config.name}</span>}
          </div>

          {!isAuthPage && (
            <nav className="sf-nav">
              {TAB_LINKS.filter(l => config.content?.visibleTabs?.[l.key] !== false).map(l => {
                const href = `${base}/${l.path}`
                const active = pathname === href
                return <Link key={l.key} href={href} className={active ? 'active' : ''}>{l.label}</Link>
              })}
              <Link href={`${base}/logout`}>Çıkış</Link>
            </nav>
          )}
        </header>

        <main className="sf-main">{children}</main>

        <footer className="sf-footer">
          <div>© {new Date().getFullYear()} {config.name}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {config.content?.kvkkText && (
              <button onClick={() => setModalOpen('kvkk')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>KVKK Aydınlatma</button>
            )}
            {config.content?.termsText && (
              <button onClick={() => setModalOpen('terms')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Hizmet Şartları</button>
            )}
            <a href={`mailto:privacy@${config.slug}.com?subject=Verilerimi Sil`} style={{ color: 'inherit', textDecoration: 'underline', fontSize: 12 }}>Verilerimi Sil</a>
          </div>
        </footer>

        {!cookieAck && (
          <div style={{
            position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 60,
            background: 'var(--sf-text)', color: 'var(--sf-bg)', borderRadius: 'var(--sf-radius)',
            padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
            boxShadow: '0 8px 32px rgba(0,0,0,.25)',
          }}>
            <div style={{ flex: 1, fontSize: 13, minWidth: 220 }}>
              🍪 Bu site deneyimini iyileştirmek için çerez kullanır. Devam ederek kabul etmiş olursun.
            </div>
            <button onClick={ackCookies} style={{
              background: 'var(--sf-secondary)', color: '#fff', border: 'none',
              padding: '10px 18px', borderRadius: 'var(--sf-radius)', fontWeight: 600, cursor: 'pointer',
            }}>Anladım</button>
          </div>
        )}

        {modalOpen && (
          <div onClick={() => setModalOpen(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 70,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--sf-bg)', color: 'var(--sf-text)', borderRadius: 'var(--sf-radius)',
              padding: 24, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{modalOpen === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'Hizmet Şartları'}</h2>
                <button onClick={() => setModalOpen(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'inherit' }}>×</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {modalOpen === 'kvkk' ? config.content?.kvkkText : config.content?.termsText}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
