import { prisma } from './prisma'
import { NextRequest } from 'next/server'
import { getCurrentUser } from './auth'

interface LogInput {
  userId: number | string
  userEmail: string
  action: string                  // ör: "products.bulk_delete"
  resource?: string | null        // ör: "product:gid://..."
  detail?: Record<string, unknown>
  req?: NextRequest
}

/**
 * Audit log yaz. DB hatasında sessizce sineye çek — audit hatası ana işlemi öldürmemeli.
 */
export async function logAudit(input: LogInput): Promise<void> {
  try {
    const ip = input.req
      ? (input.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
         input.req.headers.get('x-real-ip') ?? null)
      : null

    await prisma.auditLog.create({
      data: {
        userId: typeof input.userId === 'string' ? parseInt(input.userId, 10) : input.userId,
        userEmail: input.userEmail,
        action: input.action,
        resource: input.resource ?? null,
        detail: (input.detail as any) ?? undefined,
        ip,
      },
    })
  } catch (e) {
    console.error('[audit] log yazılamadı:', e)
  }
}

/**
 * Oturumdaki kullanıcıyı otomatik çözerek audit log yazar.
 * Route'larda tek satır: await logAuditAuto('stock_count.approve', { req, resource, detail })
 * Oturum yoksa sessizce atlar (panel dışı/public istekler loglanmaz).
 */
export async function logAuditAuto(
  action: string,
  opts: { req?: NextRequest; resource?: string | null; detail?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user?.id) return
    await logAudit({
      userId: user.id,
      userEmail: user.email ?? 'bilinmiyor',
      action,
      resource: opts.resource,
      detail: opts.detail,
      req: opts.req,
    })
  } catch (e) {
    console.error('[audit] auto log yazılamadı:', e)
  }
}
