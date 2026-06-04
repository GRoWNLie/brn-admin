import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

async function canAccess(conversationId: number, me: number) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { participants: true } })
  if (!conv) return null
  if (conv.type === 'channel') return conv
  return conv.participants.some(p => p.userId === me) ? conv : null
}

// GET /api/messages/[id] — mesajlar + okundu işaretle
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const me = Number(user.id)
  const id = Number(params.id)
  const conv = await canAccess(id, me)
  if (!conv) return NextResponse.json({ success: false, message: 'Erişim yok' }, { status: 403 })

  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' }, take: 300 })
  const senderIds = Array.from(new Set([...messages.map(m => m.senderId), ...conv.participants.map(p => p.userId), conv.createdById, ...(conv.taskAssigneeId ? [conv.taskAssigneeId] : [])]))
  const users = await prisma.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, name: true } })
  const nameOf = (uid: number) => users.find(u => u.id === uid)?.name || 'Kullanıcı'

  // Okundu işaretle (kanal için katılımcı satırı yoksa oluştur)
  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: id, userId: me } },
    create: { conversationId: id, userId: me, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  }).catch(() => {})

  let title = conv.title
  if (conv.type === 'dm') { const other = conv.participants.find(p => p.userId !== me); title = other ? nameOf(other.userId) : 'DM' }
  if (conv.type === 'channel' && !title) title = 'Genel Kanal'

  return NextResponse.json({
    success: true, me,
    conversation: {
      id: conv.id, type: conv.type, title,
      taskStatus: conv.taskStatus, taskAssignee: conv.taskAssigneeId ? nameOf(conv.taskAssigneeId) : null,
      taskAssigneeId: conv.taskAssigneeId, taskDueAt: conv.taskDueAt, createdById: conv.createdById,
    },
    messages: messages.map(m => ({ id: m.id, senderId: m.senderId, senderName: nameOf(m.senderId), body: m.body, fileData: m.fileData, fileName: m.fileName, createdAt: m.createdAt, mine: m.senderId === me })),
  })
}

// POST /api/messages/[id] — mesaj gönder { body, fileData?, fileName? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const me = Number(user.id)
  const id = Number(params.id)
  const conv = await canAccess(id, me)
  if (!conv) return NextResponse.json({ success: false, message: 'Erişim yok' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const body = typeof b.body === 'string' ? b.body.trim() : ''
  const fileData = typeof b.fileData === 'string' && b.fileData.length < 4_000_000 ? b.fileData : null
  if (!body && !fileData) return NextResponse.json({ success: false, message: 'Boş mesaj' }, { status: 400 })

  const msg = await prisma.message.create({
    data: { conversationId: id, senderId: me, body: body || (fileData ? '📎 Dosya' : ''), fileData, fileName: b.fileName ? String(b.fileName).slice(0, 160) : null },
  })
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } })
  return NextResponse.json({ success: true, id: msg.id })
}

// PATCH /api/messages/[id] — görev durumu / başlık
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const me = Number(user.id)
  const id = Number(params.id)
  const conv = await canAccess(id, me)
  if (!conv) return NextResponse.json({ success: false, message: 'Erişim yok' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const data: any = {}
  if (b.taskStatus && ['OPEN', 'IN_PROGRESS', 'DONE'].includes(b.taskStatus)) data.taskStatus = b.taskStatus
  if (b.title) data.title = String(b.title).slice(0, 120)
  const updated = await prisma.conversation.update({ where: { id }, data })
  return NextResponse.json({ success: true, taskStatus: updated.taskStatus })
}
