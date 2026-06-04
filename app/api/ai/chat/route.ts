import { NextRequest, NextResponse } from 'next/server'
import { chatWithAi, ChatMessage } from '@/lib/ai'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { logAuditAuto } from '@/lib/audit'

// POST /api/ai/chat
// Body: { conversationId?, message: string }
export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions)
  const userId = session?.user?.id ? Number(session.user.id) : null

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Giriş yapılmalı' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  if (!body.message?.trim()) {
    return NextResponse.json({ success: false, message: 'message gerekli' }, { status: 400 })
  }

  try {
    // Conversation bulup ya da oluştur
    let conv
    if (body.conversationId) {
      conv = await prisma.aiConversation.findFirst({
        where: { id: Number(body.conversationId), userId },
      })
    }
    if (!conv) {
      conv = await prisma.aiConversation.create({
        data: { userId, title: body.message.slice(0, 40) + (body.message.length > 40 ? '...' : '') },
      })
    }

    // Önceki mesajları yükle
    const history = await prisma.aiMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const messages: ChatMessage[] = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    messages.push({ role: 'user', content: body.message })

    // Kullanıcı mesajını kaydet
    await prisma.aiMessage.create({
      data: { conversationId: conv.id, role: 'user', content: body.message },
    })

    // Claude'a sor
    const result = await chatWithAi(messages)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 })
    }

    // Asistan cevabını kaydet
    await prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: result.response || '',
      },
    })

    await logAuditAuto('ai.chat', {
      req, resource: `ai_conversation:${conv.id}`,
      detail: { message: body.message.slice(0, 120), mocked: result.mocked },
    })

    return NextResponse.json({
      success: true,
      conversationId: conv.id,
      response: result.response,
      toolCalls: result.toolCalls,
      mocked: result.mocked,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// GET /api/ai/chat?conversationId=X
export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions)
  const userId = session?.user?.id ? Number(session.user.id) : null
  if (!userId) return NextResponse.json({ success: false }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const conversationId = sp.get('conversationId')

  try {
    if (conversationId) {
      const messages = await prisma.aiMessage.findMany({
        where: { conversationId: Number(conversationId) },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json({ success: true, messages })
    }
    // Tüm conversation'lar
    const conversations = await prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({ success: true, conversations })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
