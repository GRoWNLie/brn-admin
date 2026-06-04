import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/sse/notifications
 * Server-Sent Events stream — yeni bildirimleri canlı yayınlar.
 * Topbar bunu EventSource ile dinler ve yeni gelenleri ekler.
 *
 * Connection açık kalır, her 2 saniyede bir DB'yi yoklayıp
 * en son ID'den büyük yeni kayıtları client'a push eder.
 */
export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions)
  const userId = session?.user?.id ? Number(session.user.id) : null

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  let lastId = parseInt(req.nextUrl.searchParams.get('lastId') || '0', 10)
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // İlk olay: bağlantı kuruldu
      controller.enqueue(encoder.encode(
        `event: connected\ndata: ${JSON.stringify({ time: Date.now(), userId })}\n\n`
      ))

      // Polling loop — 2 saniyede bir DB kontrolü
      const checkInterval = async () => {
        if (closed) return
        try {
          const news = await prisma.notification.findMany({
            where: {
              id: { gt: lastId },
              OR: [{ userId: null }, { userId }],
            },
            orderBy: { id: 'asc' },
            take: 20,
          })
          for (const n of news) {
            if (closed) return
            controller.enqueue(encoder.encode(
              `event: notification\ndata: ${JSON.stringify(n)}\n\n`
            ))
            lastId = n.id
          }
          // Keep-alive ping
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch (e) {
          // Silent fail
        }
      }

      const id = setInterval(checkInterval, 2000)

      // Connection close olayını dinle
      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(id)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
