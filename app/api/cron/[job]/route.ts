import { NextRequest, NextResponse } from 'next/server'
import { verifyCron } from '@/lib/cron-auth'
import { runDueFlows } from '@/lib/automation'
import { runRepricing } from '@/lib/repricing'
import { syncStockPriceToMarketplaces, pullAllMarketplaceOrders } from '@/lib/marketplace-sync'
import { processInvoiceQueue } from '@/lib/efatura/queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/[job]
 *   job: automation | repricing | orders | sync | all
 * Vercel Cron veya harici scheduler tarafından çağrılır (CRON_SECRET ile korunur).
 */
async function handle(req: NextRequest, job: string) {
  const bad = await verifyCron(req)
  if (bad) return bad

  const out: Record<string, unknown> = { job, at: new Date().toISOString() }
  try {
    if (job === 'automation' || job === 'all') out.automation = await runDueFlows()
    if (job === 'repricing' || job === 'all') out.repricing = await runRepricing()
    if (job === 'orders' || job === 'all') out.orders = await pullAllMarketplaceOrders()
    if (job === 'sync' || job === 'all') out.sync = await syncStockPriceToMarketplaces()
    if (job === 'invoices' || job === 'all') out.invoices = await processInvoiceQueue()
    if (!['automation', 'repricing', 'orders', 'sync', 'invoices', 'all'].includes(job)) {
      return NextResponse.json({ success: false, message: 'Geçersiz cron job' }, { status: 400 })
    }
    return NextResponse.json({ success: true, ...out })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message, ...out }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { job: string } }) {
  return handle(req, params.job)
}
// Manuel tetikleme için POST de kabul
export async function POST(req: NextRequest, { params }: { params: { job: string } }) {
  return handle(req, params.job)
}
