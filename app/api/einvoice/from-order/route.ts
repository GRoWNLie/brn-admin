import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getOrderDetail } from '@/lib/shopify-orders'
import { nextInvoiceSequence, formatInvoiceNumber } from '@/lib/einvoice'
import { classifyTaxId } from '@/lib/efatura/validator'
import { issueInvoice } from '@/lib/efatura/service'

/**
 * POST /api/einvoice/from-order
 * Body: { orderId, taxId?, taxOffice?, issue?: boolean }
 * Shopify siparişinden e-Fatura taslağı oluşturur; issue=true ise hemen keser.
 */
export async function POST(req: NextRequest) {
  const { error } = await requirePermission('orders.modify')
  if (error) return error
  const b = await req.json().catch(() => ({}))
  const orderId = String(b.orderId || '')
  if (!orderId) return NextResponse.json({ success: false, message: 'orderId gerekli' }, { status: 400 })

  // Zaten fatura var mı?
  const existing = await prisma.eInvoice.findFirst({ where: { orderId } })
  if (existing && !b.force) {
    return NextResponse.json({ success: false, message: `Bu sipariş için zaten fatura var (${existing.status}).`, invoiceId: existing.id, existing: true })
  }

  const order = await getOrderDetail(orderId)
  if (!order) return NextResponse.json({ success: false, message: 'Sipariş bulunamadı' }, { status: 404 })

  // TCKN/VKN: body'den ya da sipariş notundan (10/11 haneli) yakala
  let taxId: string | null = b.taxId ? String(b.taxId).replace(/\D/g, '') : null
  if (!taxId && order.note) {
    const m = order.note.match(/\b(\d{11}|\d{10})\b/)
    if (m) taxId = m[1]
  }
  const cls = classifyTaxId(taxId)
  if (taxId && !cls.valid) {
    return NextResponse.json({ success: false, message: `Geçersiz TCKN/VKN: ${taxId}. Doğru numarayı manuel girin.` }, { status: 400 })
  }
  const invoiceType = cls.invoiceType || 'EARSIV'

  const addr = order.shippingAddress
  const address = addr
    ? [addr.address1, addr.address2, addr.city, addr.province, addr.country].filter(Boolean).join(', ')
    : '—'
  const customerName = order.customer?.displayName || addr?.name || 'Müşteri'

  const year = new Date().getFullYear()
  const seq = await nextInvoiceSequence(year)
  const invoiceNumber = formatInvoiceNumber(year, seq)

  const inv = await prisma.eInvoice.create({
    data: {
      orderId: order.id, orderName: order.name, invoiceType,
      taxId, taxOffice: b.taxOffice || null,
      customerName, customerAddress: address,
      totalAmount: Number(order.totalPrice) || 0,
      taxAmount: Number(order.totalTax) || 0,
      currency: order.currency || 'TRY',
      invoiceNumber, status: 'DRAFT',
    },
  })

  await logAuditAuto('einvoice.from_order', { req, resource: `einvoice:${inv.id}`, detail: { orderName: order.name, invoiceType, issue: !!b.issue } })

  // Hemen kes?
  if (b.issue) {
    const r = await issueInvoice(inv.id)
    return NextResponse.json({ success: r.ok, invoiceId: inv.id, invoiceType, message: r.ok ? `Fatura kesildi: ${invoiceNumber}` : r.message })
  }
  return NextResponse.json({ success: true, invoiceId: inv.id, invoiceType, message: `Taslak oluşturuldu: ${invoiceNumber}` })
}
