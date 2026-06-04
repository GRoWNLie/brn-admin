import AdminShell from '@/components/AdminShell'

// Admin paneli oturum/istek bağlamı gerektirir — statik prerender edilmez.
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
