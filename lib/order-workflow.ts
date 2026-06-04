/**
 * Sipariş hazırlık/kargo iş akışı.
 * NEW → (fatura kesilince) PREPARED → (kargo barkodu oluşunca) SHIPPED
 */
import { prisma } from './prisma'

export async function markPrepared(orderId: string, orderName?: string | null) {
  const ex = await prisma.orderWorkflow.findUnique({ where: { orderId } })
  // SHIPPED'i geri düşürme
  const status = ex?.status === 'SHIPPED' ? 'SHIPPED' : 'PREPARED'
  await prisma.orderWorkflow.upsert({
    where: { orderId },
    create: { orderId, orderName: orderName ?? null, status: 'PREPARED', invoiced: true, invoicedAt: new Date(), preparedAt: new Date() },
    update: { orderName: orderName ?? ex?.orderName, invoiced: true, invoicedAt: ex?.invoicedAt ?? new Date(), preparedAt: ex?.preparedAt ?? new Date(), status },
  }).catch(() => {})
}

export async function markShipped(orderId: string, opts: { orderName?: string | null; carrier?: string | null; trackingNumber?: string | null }) {
  await prisma.orderWorkflow.upsert({
    where: { orderId },
    create: { orderId, orderName: opts.orderName ?? null, status: 'SHIPPED', shippedAt: new Date(), preparedAt: new Date(), carrier: opts.carrier ?? null, trackingNumber: opts.trackingNumber ?? null },
    update: { orderName: opts.orderName ?? undefined, status: 'SHIPPED', shippedAt: new Date(), carrier: opts.carrier ?? undefined, trackingNumber: opts.trackingNumber ?? undefined },
  })
}

export async function getWorkflow(orderId: string) {
  return prisma.orderWorkflow.findUnique({ where: { orderId } })
}

export async function getWorkflowMap(orderIds: string[]): Promise<Record<string, { status: string; trackingNumber: string | null; carrier: string | null }>> {
  if (orderIds.length === 0) return {}
  const rows = await prisma.orderWorkflow.findMany({ where: { orderId: { in: orderIds } } })
  const map: Record<string, { status: string; trackingNumber: string | null; carrier: string | null }> = {}
  for (const r of rows) map[r.orderId] = { status: r.status, trackingNumber: r.trackingNumber, carrier: r.carrier }
  return map
}

export const WORKFLOW_LABEL: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'Yeni', cls: 'pending' },
  PREPARED: { label: '📦 Hazırlandı', cls: 'pending' },
  SHIPPED: { label: '🚚 Kargoya Verildi', cls: 'delivered' },
}
