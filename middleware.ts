import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Sadece admin'in erişebileceği path prefix'leri.
 * Fine-grained yetki API route içinde yapılır (lib/auth requirePermission).
 */
const ADMIN_ONLY = ['/team', '/audit', '/settings', '/api/team', '/api/audit']

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // NextAuth token'ını manuel çek
  const token = await getToken({ req })
  const isAuth = !!token && (token as any).active !== false

  // Kullanıcı giriş yapmamışsa
  if (!isAuth) {
    const loginUrl = new URL('/login', req.url)
    
    // Shopify parametrelerini (shop, host vb.) kaybolmaması için yeni URL'ye taşı
    searchParams.forEach((value, key) => {
      loginUrl.searchParams.set(key, value)
    })
    
    // Yönlendirme sonrası doğru yere dönebilmesi için callbackUrl ekle
    loginUrl.searchParams.set('callbackUrl', req.url)

    return NextResponse.redirect(loginUrl)
  }

  // Kullanıcı giriş yapmış ama yetkisi olmayan bir admin sayfasına girmeye çalışıyorsa
  const role = token?.role as string | undefined
  if (ADMIN_ONLY.some(p => pathname.startsWith(p)) && role !== 'ADMIN') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('forbidden', '1')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

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
