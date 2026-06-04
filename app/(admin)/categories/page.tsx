'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CategoriesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/collections') }, [router])
  return (
    <div className="page-content">
      <div className="panel-card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Kategoriler → Koleksiyonlar'a yönlendiriliyor...
        </div>
      </div>
    </div>
  )
}
