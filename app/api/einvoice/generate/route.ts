import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectInvoiceType, isValidTaxId, formatInvoiceNumber, nextInvoiceSequence, buildInvoiceXml } from '@/lib/einvoice'

/**
 * POST /api/einvoice/generate
 * Body: { orderId, orderName, customerName, taxId?, taxOffice?, address, totalAmount, taxAmount? }
 *
 * NOT: Bu sadece DRAFT bir fatura oluşturur ve XML hazırlar.
 * Gerçek GİB'e gönderim için Foriba/EDM/Logo entegrasyonu sonradan eklenir.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const required = ['orderId', 'orderName', 'customerName', 'address', 'totalAmount']
  for (const k of required) {
    if (!body[k]) {
      return NextResponse.json({ success: false, message: `${k} gerekli` }, { status: 400 })
    }
  }

  if (body.taxId && !isValidTaxId(body.taxId)) {
    return NextResponse.json({ success: false, message: 'Geçersiz VKN/TCKN (10 veya 11 hane olmalı)' }, { status: 400 })
  }

  // 1 sipariş = 1 fatura kuralı
  const existing = await prisma.eInvoice.findFirst({
    where: { orderId: body.orderId },
  })
  if (existing) {
    return NextResponse.json({
      success: false,
      code: 'ALREADY_EXISTS',
      existingInvoice: {
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        invoiceType: existing.invoiceType,
        status: existing.status,
      },
      message: `Bu sipariş için zaten fatura mevcut: ${existing.invoiceNumber}`,
    }, { status: 409 })
  }

  try {
    const invoiceType = detectInvoiceType(body.taxId)
    const year = new Date().getFullYear()
    const seq = await nextInvoiceSequence(year)
    const invoiceNumber = formatInvoiceNumber(year, seq)

    const totalAmount = parseFloat(body.totalAmount)
    const taxAmount = body.taxAmount !== undefined
      ? parseFloat(body.taxAmount)
      : totalAmount * 0.20 / 1.20  // KDV %20 dahil varsay

    const xml = buildInvoiceXml({
      invoiceNumber, invoiceType,
      date: new Date(),
      customerName: body.customerName,
      taxId: body.taxId ?? null,
      taxOffice: body.taxOffice ?? null,
      address: body.address,
      totalAmount, taxAmount,
    })

    const invoice = await prisma.eInvoice.create({
      data: {
        orderId: body.orderId,
        orderName: body.orderName,
        invoiceType,
        taxId: body.taxId,
        taxOffice: body.taxOffice,
        customerName: body.customerName,
        customerAddress: body.address,
        totalAmount,
        taxAmount,
        invoiceNumber,
        status: 'DRAFT',
        xmlContent: xml,
      },
    })

    return NextResponse.json({
      success: true,
      invoice,
      message: `${invoiceType === 'EFATURA' ? 'e-Fatura' : 'e-Arşiv'} taslağı oluşturuldu: ${invoiceNumber}`,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
