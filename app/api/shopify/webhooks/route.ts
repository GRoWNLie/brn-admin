import { NextRequest, NextResponse } from 'next/server'
import { listWebhooks, createWebhook, deleteWebhook, REQUIRED_WEBHOOK_TOPICS, topicEnumToPath } from '@/lib/shopify-webhooks'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [shopifyHooks, recentLogs] = await Promise.all([
      listWebhooks().catch(() => []),
      prisma.webhookLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])
    return NextResponse.json({
      success: true,
      shopifyHooks,
      recentLogs,
      requiredTopics: REQUIRED_WEBHOOK_TOPICS,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}

// POST /api/shopify/webhooks
// Body: { action: "register_all" | "create", topic?: string, callbackBase?: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, topic, callbackBase } = body
  const base = callbackBase || process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    if (action === 'register_all') {
      const existing = await listWebhooks().catch(() => [])
      const results: any[] = []
      for (const t of REQUIRED_WEBHOOK_TOPICS) {
        const url = `${base}/api/webhooks/shopify/${topicEnumToPath(t)}`
        const already = existing.find(h => h.topic === t && h.callbackUrl === url)
        if (already) {
          results.push({ topic: t, status: 'already_exists', id: already.id })
          continue
        }
        const r = await createWebhook(t, url)
        results.push({ topic: t, status: r.success ? 'created' : 'failed', error: r.error })
      }
      return NextResponse.json({ success: true, results })
    }

    if (action === 'create' && topic) {
      const url = `${base}/api/webhooks/shopify/${topicEnumToPath(topic)}`
      const r = await createWebhook(topic, url)
      return NextResponse.json(r)
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}

// DELETE /api/shopify/webhooks?id=gid://shopify/WebhookSubscription/123
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, message: 'id gerekli' }, { status: 400 })
  const r = await deleteWebhook(id)
  return NextResponse.json(r)
}
