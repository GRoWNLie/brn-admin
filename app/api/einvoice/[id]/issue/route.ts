import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { issueInvoice } from '@/lib/efatura/service'

// POST /api/einvoice/[id]/issue — faturayı sağlayıcıya gönderip kes
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('orders.modify')
  if (error) return error
  const id = Number(params.id)
  const r = await issueInvoice(id)
  await logAuditAuto('einvoice.issue', { req, resource: `einvoice:${id}`, detail: { ok: r.ok } })
  return NextResponse.json({ success: r.ok, message: r.message })
}
