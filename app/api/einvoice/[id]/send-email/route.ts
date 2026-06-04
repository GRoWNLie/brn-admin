import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { sendEmail } from '@/lib/email'
import { formatCurrency } from '@/lib/shopify-data'
import { logInvoice } from '@/lib/efatura/service'

// POST /api/einvoice/[id]/send-email — Body: { email }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('orders.modify')
  if (error) return error
  const id = Number(params.id)
  const b = await req.json().catch(() => ({}))
  const to = typeof b.email === 'string' ? b.email.trim() : ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ success: false, message: 'Geçerli e-posta gerekli' }, { status: 400 })
  }

  const inv = await prisma.eInvoice.findUnique({ where: { id } })
  if (!inv) return NextResponse.json({ success: false, message: 'Fatura bulunamadı' }, { status: 404 })

  const total = formatCurrency(Number(inv.totalAmount), inv.currency)
  const origin = req.nextUrl.origin
  const html = `
    <div style="font-family:sans-serif;max-width:520px">
      <h2>${inv.invoiceType === 'EFATURA' ? 'e-Fatura' : 'e-Arşiv Fatura'}</h2>
      <p>Sayın ${inv.customerName},</p>
      <p><strong>${inv.orderName}</strong> numaralı siparişinize ait faturanız hazır.</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td>Fatura No</td><td><strong>${inv.invoiceNumber || '—'}</strong></td></tr>
        <tr><td>Toplam</td><td><strong>${total}</strong></td></tr>
        <tr><td>Tarih</td><td>${new Date(inv.createdAt).toLocaleDateString('tr-TR')}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${origin}/api/einvoice/${inv.id}/pdf" style="background:#2563EB;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Faturayı Görüntüle / PDF</a></p>
    </div>`

  const r = await sendEmail({ to, toName: inv.customerName, subject: `Faturanız — ${inv.invoiceNumber || inv.orderName}`, html })
  if (r.success) {
    await prisma.eInvoice.update({ where: { id }, data: { emailSentAt: new Date() } })
    await logInvoice('info', 'email', `Fatura e-postası gönderildi: ${to}${r.mocked ? ' (MOCK)' : ''}`, { invoiceId: id, orderId: inv.orderId })
  }
  await logAuditAuto('einvoice.email', { req, resource: `einvoice:${id}`, detail: { to, ok: r.success } })
  return NextResponse.json({ success: r.success, message: r.success ? `Gönderildi: ${to}${r.mocked ? ' (MOCK mod)' : ''}` : (r.error || 'Gönderilemedi') })
}
