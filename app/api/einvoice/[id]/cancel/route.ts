import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { cancelInvoice } from '@/lib/efatura/service'

// POST /api/einvoice/[id]/cancel — Body: { reason? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('orders.modify')
  if (error) return error
  const id = Number(params.id)
  const b = await req.json().catch(() => ({}))
  const r = await cancelInvoice(id, b.reason ? String(b.reason).slice(0, 200) : undefined)
  await logAuditAuto('einvoice.cancel', { req, resource: `einvoice:${id}`, detail: { ok: r.ok, reason: b.reason } })
  return NextResponse.json({ success: r.ok, message: r.message })
}
