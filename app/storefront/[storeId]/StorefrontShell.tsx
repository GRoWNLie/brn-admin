'use client'

import Link from 'next/link'
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
          .sf-input { width: 100%; padding: 11px 14px; border-radius: var(--sf-radius); border: 1px solid var(--sf-border); background: var(--sf-bg); color: var(--sf-text); font-size: 14px; outline: none; }
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
          © {new Date().getFullYear()} {config.name} · Customer Dashboard{forwardedHost ? ` · ${forwardedHost}` : ''}
        </footer>
    </div>
  )
}
