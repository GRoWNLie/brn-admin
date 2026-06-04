import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/einvoice/[id]/pdf
 * Yazdırılabilir HTML fatura — kullanıcı tarayıcıdan Ctrl+P ile PDF olarak kaydeder.
 * UBL-TR şablonuna uygun, Türk faturası formatında.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await prisma.eInvoice.findUnique({
      where: { id: Number(params.id) },
    })

    if (!invoice) {
      return new NextResponse('Fatura bulunamadı', { status: 404 })
    }

    const total = parseFloat(String(invoice.totalAmount))
    const tax = parseFloat(String(invoice.taxAmount))
    const base = total - tax
    const taxRate = base > 0 ? (tax / base) * 100 : 0

    const issueDate = new Date(invoice.createdAt)
    const issueDateStr = issueDate.toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const isEFatura = invoice.invoiceType === 'EFATURA'
    const typeLabel = isEFatura ? 'e-Fatura' : 'e-Arşiv Faturası'
    const taxIdLabel = isEFatura ? 'VKN' : 'TCKN'

    const fmt = (n: number) =>
      n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${typeLabel} - ${invoice.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      color: #1a1a1a;
      font-size: 12px;
      line-height: 1.5;
      background: #f3f4f6;
      padding: 20px;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      padding: 30px 35px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      min-height: 270mm;
    }
    .print-btn {
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      background: #2563EB; color: #fff; padding: 12px 24px;
      border-radius: 8px; font-weight: 700; cursor: pointer; border: none;
      font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,.3);
    }
    .print-btn:hover { background: #1D4ED8; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; max-width: 100%; padding: 0; min-height: auto; }
      .print-btn { display: none; }
    }

    /* HEADER */
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 18px; border-bottom: 3px solid #0F172A; margin-bottom: 18px;
    }
    .brand {
      font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #0F172A;
    }
    .brand-sub { font-size: 11px; color: #6B7280; margin-top: 2px; }
    .invoice-meta {
      text-align: right; font-size: 11px;
    }
    .invoice-type {
      display: inline-block;
      background: ${isEFatura ? '#7C3AED' : '#2563EB'};
      color: #fff; padding: 6px 14px; border-radius: 6px;
      font-weight: 700; font-size: 12px; letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .invoice-no {
      font-size: 16px; font-weight: 700; color: #0F172A; margin: 6px 0;
    }

    /* PARTIES (Issuer / Customer) */
    .parties {
      display: grid; grid-template-columns: 1fr 1fr; gap: 30px;
      margin-bottom: 20px;
    }
    .party {
      background: #F8FAFC; border: 1px solid #E2E8F0;
      border-radius: 8px; padding: 14px;
    }
    .party-title {
      font-size: 10px; font-weight: 700; color: #64748B;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
      padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;
    }
    .party-name { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
    .party-line { font-size: 11px; color: #475569; margin-bottom: 3px; }
    .party-line strong { color: #1E293B; }

    /* INVOICE INFO BOX */
    .invoice-info {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
      background: #E2E8F0; border: 1px solid #E2E8F0; border-radius: 8px;
      overflow: hidden; margin-bottom: 22px;
    }
    .info-cell { background: #fff; padding: 10px 12px; }
    .info-label {
      font-size: 9px; color: #94A3B8; text-transform: uppercase;
      letter-spacing: 0.5px; font-weight: 700; margin-bottom: 3px;
    }
    .info-value { font-size: 13px; font-weight: 700; color: #0F172A; }

    /* ITEMS TABLE */
    table.items {
      width: 100%; border-collapse: collapse; margin-bottom: 18px;
    }
    table.items thead th {
      background: #0F172A; color: #fff;
      padding: 10px 12px; text-align: left;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.items thead th.r { text-align: right; }
    table.items thead th.c { text-align: center; }
    table.items tbody td {
      padding: 12px; border-bottom: 1px solid #E2E8F0;
      font-size: 12px;
    }
    table.items tbody td.r { text-align: right; font-weight: 600; }
    table.items tbody td.c { text-align: center; }
    table.items tbody tr:last-child td { border-bottom: none; }

    /* TOTALS */
    .totals {
      display: grid; grid-template-columns: 1fr 280px; gap: 20px;
      margin-bottom: 20px;
    }
    .totals-notes {
      background: #FFFBEB; border: 1px solid #FDE68A;
      border-radius: 8px; padding: 12px;
      font-size: 11px; color: #92400E; line-height: 1.6;
    }
    .totals-box {
      background: #F8FAFC; border: 2px solid #0F172A;
      border-radius: 8px; padding: 14px;
    }
    .total-line {
      display: flex; justify-content: space-between;
      padding: 6px 0; font-size: 12px;
    }
    .total-line.grand {
      border-top: 2px solid #0F172A; margin-top: 6px; padding-top: 10px;
      font-size: 16px; font-weight: 900; color: #0F172A;
    }
    .total-line span:first-child { color: #475569; }
    .total-line.grand span:first-child { color: #0F172A; }

    /* FOOTER */
    .footer {
      margin-top: 30px; padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      font-size: 10px; color: #94A3B8; text-align: center;
    }
    .footer strong { color: #475569; }
    .draft-stamp {
      position: absolute;
      top: 40%; left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 110px; font-weight: 900; color: rgba(220, 38, 38, .12);
      letter-spacing: 8px; pointer-events: none;
      z-index: 10;
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>

  <div class="page" style="position: relative;">
    ${invoice.status === 'DRAFT' ? '<div class="draft-stamp">TASLAK</div>' : ''}

    <div class="header">
      <div>
        <div class="brand">BRN ADMIN</div>
        <div class="brand-sub">Mağaza Yönetim Sistemi</div>
      </div>
      <div class="invoice-meta">
        <span class="invoice-type">${typeLabel.toUpperCase()}</span>
        <div class="invoice-no">${invoice.invoiceNumber}</div>
        <div style="color: #64748B;">${issueDateStr}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Satıcı</div>
        <div class="party-name">SekerCo Mağazası</div>
        <div class="party-line"><strong>VKN:</strong> 1234567890</div>
        <div class="party-line"><strong>Adres:</strong> Türkiye</div>
        <div class="party-line"><strong>E-posta:</strong> info@sekerco.com</div>
      </div>
      <div class="party">
        <div class="party-title">Alıcı</div>
        <div class="party-name">${escape(invoice.customerName)}</div>
        ${invoice.taxId ? `<div class="party-line"><strong>${taxIdLabel}:</strong> ${invoice.taxId}</div>` : ''}
        ${invoice.taxOffice ? `<div class="party-line"><strong>Vergi Dairesi:</strong> ${escape(invoice.taxOffice)}</div>` : ''}
        <div class="party-line"><strong>Adres:</strong> ${escape(invoice.customerAddress)}</div>
      </div>
    </div>

    <div class="invoice-info">
      <div class="info-cell">
        <div class="info-label">Sipariş No</div>
        <div class="info-value">${invoice.orderName}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Düzenleme Tarihi</div>
        <div class="info-value">${issueDateStr}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Fatura Tipi</div>
        <div class="info-value">${typeLabel}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Para Birimi</div>
        <div class="info-value">${invoice.currency}</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>#</th>
          <th>Açıklama</th>
          <th class="c">Adet</th>
          <th class="r">Birim Fiyat</th>
          <th class="r">KDV %</th>
          <th class="r">Tutar</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>${invoice.orderName} - Sipariş Kalemleri</strong><br>
            <span style="color: #6B7280; font-size: 11px;">
              Detaylar için Shopify Admin paneline bakınız.
            </span>
          </td>
          <td class="c">1</td>
          <td class="r">${fmt(base)}</td>
          <td class="r">%${taxRate.toFixed(0)}</td>
          <td class="r">${fmt(base)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-notes">
        <strong>💡 Bilgi:</strong> Bu belge BRN Admin sistemi tarafından üretilen
        <strong>${invoice.status === 'DRAFT' ? 'TASLAK' : ''}</strong> bir
        ${typeLabel.toLowerCase()}'dır.
        ${invoice.status === 'DRAFT' ? 'Gerçek faturalandırma için Foriba, EDM veya Logo gibi entegratör servisi ve mali mühür gereklidir.' : ''}
      </div>
      <div class="totals-box">
        <div class="total-line">
          <span>Mal/Hizmet Toplamı</span>
          <span>${fmt(base)}</span>
        </div>
        <div class="total-line">
          <span>KDV (%${taxRate.toFixed(0)})</span>
          <span>${fmt(tax)}</span>
        </div>
        <div class="total-line grand">
          <span>ÖDENECEK TUTAR</span>
          <span>${fmt(total)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <strong>BRN ADMIN — ${typeLabel}</strong><br>
      Belge No: ${invoice.invoiceNumber}
      ${invoice.gibUuid ? ` · GİB UUID: ${invoice.gibUuid}` : ''}
      <br>
      Bu belge elektronik ortamda oluşturulmuştur ve yasal olarak geçerlidir.
    </div>
  </div>

  <script>
    // Otomatik yazdırma diyalogu açma seçeneği (URL'de ?autoprint=1)
    if (new URLSearchParams(location.search).get('autoprint') === '1') {
      setTimeout(() => window.print(), 600);
    }
  </script>
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

function escape(s: string | null | undefined): string {
  if (!s) return '—'
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/\n/g, '<br>')
}
