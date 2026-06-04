import { getServerSession } from 'next-auth'
import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'
import { authOptions } from './nextauth'

export type Permission =
  | 'products.view'
  | 'products.edit'
  | 'products.delete'
  | 'products.bulk'
  | 'orders.view'
  | 'orders.modify'
  | 'customers.view'
  | 'collections.view'
  | 'collections.edit'
  | 'xml.view'
  | 'xml.manage'
  | 'team.manage'
  | 'settings.manage'
  | 'audit.view'

/** Rol → izinler matrisi. ADMIN her şeyi yapabilir; alt roller alt küme alır. */
const PERMS: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    'products.view', 'products.edit', 'products.delete', 'products.bulk',
    'orders.view', 'orders.modify',
    'customers.view',
    'collections.view', 'collections.edit',
    'xml.view', 'xml.manage',
    'team.manage', 'settings.manage', 'audit.view',
  ]),
  MANAGER: new Set<Permission>([
    'products.view', 'products.edit', 'products.delete', 'products.bulk',
    'orders.view', 'orders.modify',
    'customers.view',
    'collections.view', 'collections.edit',
    'xml.view', 'xml.manage',
  ]),
  EDITOR: new Set<Permission>([
    'products.view', 'products.edit',
    'orders.view',
    'customers.view',
    'collections.view', 'collections.edit',
    'xml.view',
  ]),
  VIEWER: new Set<Permission>([
    'products.view', 'orders.view', 'customers.view', 'collections.view', 'xml.view',
  ]),
}

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false
  return PERMS[role]?.has(perm) ?? false
}

/** Server-side: aktif session'ı (yoksa null) döner */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user
}

/** API route'larda: yetki yoksa 401/403 NextResponse döner; varsa kullanıcı verir */
export async function requirePermission(perm: Permission) {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 }) }
  }
  if (!user.active) {
    return { user: null, error: NextResponse.json({ success: false, message: 'Kullanıcı pasif' }, { status: 403 }) }
  }
  if (!can(user.role, perm)) {
    return { user: null, error: NextResponse.json({ success: false, message: 'Yetkisiz işlem' }, { status: 403 }) }
  }
  return { user, error: null as null }
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Yönetici',
  EDITOR: 'Editör',
  VIEWER: 'Görüntüleyici',
}
