'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

// useSearchParams kullandığı için Suspense ile sarmalanır (statik render bail'ini önler)
function ForbiddenWatcher() {
  const sp = useSearchParams()
  useEffect(() => {
    if (sp.get('forbidden') === '1') {
      alert('Bu sayfaya erişim için yetkiniz yok.')
      const url = new URL(window.location.href)
      url.searchParams.delete('forbidden')
      window.history.replaceState({}, '', url.toString())
    }
  }, [sp])
  return null
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Sayfa değişince mobil çekmeceyi kapat
  useEffect(() => { document.body.classList.remove('sidebar-open') }, [pathname])

  if (status === 'loading' || !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#6B7280', fontSize: 14 }}>⏳ Yükleniyor...</div>
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={null}><ForbiddenWatcher /></Suspense>
      <div className="sidebar-overlay" onClick={() => document.body.classList.remove('sidebar-open')} />
      <Sidebar />
      <main className="main-content">
        <Topbar />
        {children}
      </main>
    </>
  )
}
