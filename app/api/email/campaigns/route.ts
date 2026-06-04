import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { getCustomers } from '@/lib/shopify-data'

// GET /api/email/campaigns — kampanya listesi + email log özetleri
export async function GET() {
  try {
    const [campaigns, totalLogs, lastLogs] = await Promise.all([
      prisma.emailCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: { template: true },
        take: 30,
      }),
      prisma.emailLog.count(),
      prisma.emailLog.findMany({
        orderBy: { sentAt: 'desc' },
        take: 20,
      }),
    ])
    return NextResponse.json({ success: true, campaigns, totalLogs, lastLogs })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/email/campaigns
// Body: { name, subject, html, segmentType: "all"|"vip"|"active"|"manual", recipients?: string[] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.name || !body.subject || !body.html) {
    return NextResponse.json({ success: false, message: 'name, subject, html gerekli' }, { status: 400 })
  }

  try {
    // 1) Alıcıları hesapla
    let recipients: Array<{ email: string; name?: string }> = []

    if (body.segmentType === 'manual' && Array.isArray(body.recipients)) {
      recipients = body.recipients
        .filter((r: any) => r.email)
        .map((r: any) => ({ email: r.email, name: r.name }))
    } else {
      // Shopify müşterilerini çek + filtre
      const data = await getCustomers({ first: 250 })
      const allCustomers = data.customers
        .filter(c => c.email)
        .map(c => ({
          email: c.email!,
          name: c.displayName,
          spent: parseFloat(c.totalSpent),
          orders: c.ordersCount,
        }))

      if (body.segmentType === 'all') {
        recipients = allCustomers
      } else if (body.segmentType === 'vip') {
        recipients = allCustomers.filter(c => c.spent >= 5000)
      } else if (body.segmentType === 'active') {
        recipients = allCustomers.filter(c => c.orders >= 2)
      } else if (body.segmentType === 'new') {
        recipients = allCustomers.filter(c => c.orders === 1)
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, message: 'Bu segmentte alıcı yok' }, { status: 400 })
    }

    // 2) Campaign kayıt et
    const campaign = await prisma.emailCampaign.create({
      data: {
        name: body.name,
        segmentType: body.segmentType,
        segmentValue: body.segmentValue ?? null,
        status: 'SENDING',
        recipientCount: recipients.length,
        sentAt: new Date(),
      },
    })

    // 3) Background'da gönder (response'u bekletmeden)
    sendBulkEmail(recipients, body.subject, body.html, campaign.id)
      .then(async ({ sent, failed }) => {
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            sentCount: sent, failCount: failed,
            status: failed === 0 ? 'SENT' : 'FAILED',
          },
        })
      })

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      recipientCount: recipients.length,
      message: `${recipients.length} alıcıya gönderim arka planda başlatıldı`,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
