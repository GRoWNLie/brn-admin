import { NextRequest, NextResponse } from 'next/server'
import { getOrderDetail } from '@/lib/shopify-orders'
import { findProviderByShopifyName } from '@/lib/cargo'

/**
 * GET /api/shopify/orders/[id]/shipping-label
 * Sipariş için yazdırılabilir HTML kargo etiketi üretir (CODE128 barkod dahil).
 * Tarayıcıdan açılıp Ctrl+P ile yazdırılabilir.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const orderId = decodeURIComponent(params.id)

  try {
    const order = await getOrderDetail(orderId)
    if (!order) {
      return new NextResponse('Sipariş bulunamadı', { status: 404 })
    }

    const ful = order.fulfillments[0]
    const tracking = ful?.trackingInfo?.[0]
    const trackingNumber = tracking?.number || `BRN${order.name.replace(/\D/g, '')}`
    const provider = findProviderByShopifyName(tracking?.company ?? null)

    const ship = order.shippingAddress
    const customerName = ship?.name || order.customer?.displayName || order.email || '—'

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Kargo Etiketi - ${order.name}</title>
<style>
  @page { size: A6; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', sans-serif; margin: 0; padding: 12px; color: #000; font-size: 11px; }
  .label { border: 2px solid #000; padding: 10px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
  .order-no { font-size: 13px; font-weight: 700; }
  .row { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px dashed #ccc; }
  .label-key { font-weight: 700; min-width: 70px; color: #555; }
  .label-val { flex: 1; }
  .barcode-area { margin: 14px 0; text-align: center; padding: 10px 0; border: 1px dashed #000; }
  .barcode { font-family: 'Libre Barcode 128', 'Courier New', monospace; font-size: 56px; letter-spacing: 0; line-height: 1; }
  .barcode-num { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-top: 4px; }
  .footer { margin-top: 12px; text-align: center; font-size: 9px; color: #666; padding-top: 8px; border-top: 1px solid #000; }
  .print-btn { position: fixed; top: 10px; right: 10px; background: #2563EB; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; }
  @media print { .print-btn { display: none; } }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap">
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Yazdır</button>
  <div class="label">
    <div class="header">
      <div class="brand">BRN ADMIN</div>
      <div class="order-no">${order.name}</div>
    </div>

    <div class="row">
      <div class="label-key">Alıcı:</div>
      <div class="label-val"><strong>${customerName}</strong></div>
    </div>
    <div class="row">
      <div class="label-key">Telefon:</div>
      <div class="label-val">${ship?.phone || order.phone || '—'}</div>
    </div>
    <div class="row">
      <div class="label-key">Adres:</div>
      <div class="label-val">
        ${ship?.address1 ?? ''}${ship?.address2 ? ', ' + ship.address2 : ''}<br>
        ${[ship?.zip, ship?.city, ship?.province].filter(Boolean).join(' ')}<br>
        ${ship?.country ?? ''}
      </div>
    </div>
    <div class="row">
      <div class="label-key">Kargo:</div>
      <div class="label-val">
        ${provider ? provider.logoEmoji + ' ' + provider.displayName : (tracking?.company || '—')}
      </div>
    </div>

    <div class="barcode-area">
      <div class="barcode">*${trackingNumber}*</div>
      <div class="barcode-num">${trackingNumber}</div>
    </div>

    <div class="footer">
      Sipariş Tarihi: ${new Date(order.createdAt).toLocaleString('tr-TR')}<br>
      ${order.lineItems.length} ürün · Toplam: ₺${parseFloat(order.totalPrice).toLocaleString('tr-TR')}
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: any) {
    return new NextResponse('Hata: ' + e?.message, { status: 500 })
  }
}
