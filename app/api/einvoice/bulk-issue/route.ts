import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { enqueueInvoiceJob } from '@/lib/efatura/queue'

// POST /api/einvoice/bulk-issue — Body: { ids: number[] }
// Faturaları kuyruğa atar; cron (/api/cron/invoices) arka planda keser.
export async function POST(req: NextRequest) {
  const { error } = await requirePermission('orders.modify')
  if (error) return error
  const b = await req.json().catch(() => ({}))
  const ids: number[] = Array.isArray(b.ids) ? b.ids.map((x: any) => Number(x)).filter(Boolean) : []
  if (ids.length === 0) return NextResponse.json({ success: false, message: 'ids gerekli' }, { status: 400 })

  for (const id of ids) await enqueueInvoiceJob('create', { invoiceId: id })
  await logAuditAuto('einvoice.bulk_issue', { req, detail: { count: ids.length } })
  return NextResponse.json({ success: true, message: `${ids.length} fatura kuyruğa alındı. Cron/işleyici arka planda kesecek.`, queued: ids.length })
}
