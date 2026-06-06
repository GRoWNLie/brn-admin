'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function StorefrontLogout() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  useEffect(() => {
    fetch(`/api/storefront/${storeId}/logout`, { method: 'POST' }).finally(() => {
      if (typeof window !== 'undefined' && window.location.pathname.includes('/apps/customerdashboard')) {
        window.location.replace('/apps/customerdashboard/login')
      } else {
        router.replace(`/storefront/${storeId}/login`)
      }
    })
  }, [storeId, router])
  return <div className="sf-card"><div className="sf-muted">Çıkış yapılıyor...</div></div>
}
