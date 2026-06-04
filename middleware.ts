import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Sadece admin'in erişebileceği path prefix'leri.
 * Fine-grained yetki API route içinde yapılır (lib/auth requirePermission).
 */
const ADMIN_ONLY = ['/team', '/audit', '/settings', '/api/team', '/api/audit']

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    if (ADMIN_ONLY.some(p => pathname.startsWith(p)) && role !== 'ADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('forbidden', '1')
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token }) { return !!token && (token as any).active !== false },
    },
    pages: { signIn: '/login' },
  }
)

/**
 * Korunan path'ler. /login, /register, /api/auth, /api/register, statik dosyalar serbest.
 */
export const config = {
  matcher: [
    // Auth gerekmeyenler: /api/auth, /api/register, /api/webhooks, /api/public (Shopify widget),
    // /widget/* (JS dosyası), /login, /register, statik dosyalar
    '/((?!api/auth|api/register|api/webhooks|api/public|api/storefront|storefront|apps/customerdashboard|widget|login|register|_next/static|_next/image|favicon.ico|globals.css|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|js|css)$).*)',
  ],
}
