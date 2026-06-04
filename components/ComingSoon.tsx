'use client'

import { useRouter } from 'next/navigation'

interface Props {
  title: string
  description?: string
  icon?: string
  /** Eğer mevcut bir sayfaya yönlendirilecekse */
  redirectTo?: { label: string; href: string }
}

export default function ComingSoon({ title, description, icon = '🚧', redirectTo }: Props) {
  const router = useRouter()
  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="panel-card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
        <h3 style={{ fontSize: 20, marginBottom: 10 }}>Yakında Aktif Olacak</h3>
        {description && (
          <p style={{
            color: 'var(--text-muted)', fontSize: 14,
            maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.6,
          }}>
            {description}
          </p>
        )}
        {redirectTo && (
          <button className="btn-primary" onClick={() => router.push(redirectTo.href)}>
            {redirectTo.label} →
          </button>
        )}
      </div>
    </div>
  )
}
