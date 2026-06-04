import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'

// GET /api/messages — görünür konuşmalar (genel kanallar + DM'lerim + görevlerim)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const me = Number(user.id)

  const myParts = await prisma.conversationParticipant.findMany({ where: { userId: me } })
  const lastReadByConv = new Map(myParts.map(p => [p.conversationId, p.lastReadAt]))
  const channels = await prisma.conversation.findMany({ where: { type: 'channel' }, select: { id: true } })
  const ids = Array.from(new Set([...myParts.map(p => p.conversationId), ...channels.map(c => c.id)]))

  const convs = await prisma.conversation.findMany({
    where: { id: { in: ids } },
    include: { participants: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
  })

  const userIds = new Set<number>()
  convs.forEach(c => { c.participants.forEach(p => userIds.add(p.userId)); if (c.taskAssigneeId) userIds.add(c.taskAssigneeId); userIds.add(c.createdById) })
  const users = await prisma.user.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, name: true } })
  const nameOf = (id: number) => users.find(u => u.id === id)?.name || 'Kullanıcı'

  const conversations = []
  for (const c of convs) {
    let title = c.title
    if (c.type === 'dm') { const other = c.participants.find(p => p.userId !== me); title = other ? nameOf(other.userId) : 'DM' }
    if (c.type === 'channel' && !title) title = 'Genel Kanal'
    const lastRead = lastReadByConv.get(c.id)
    let unread = 0
    if (c.messages[0]) {
      unread = await prisma.message.count({
        where: { conversationId: c.id, senderId: { not: me }, ...(lastRead ? { createdAt: { gt: lastRead } } : {}) },
      })
    }
    conversations.push({
      id: c.id, type: c.type, title,
      lastMessage: c.messages[0]?.body?.slice(0, 70) ?? '',
      lastMessageAt: c.lastMessageAt, unread,
      taskStatus: c.taskStatus, taskAssignee: c.taskAssigneeId ? nameOf(c.taskAssigneeId) : null, taskDueAt: c.taskDueAt,
    })
  }
  return NextResponse.json({ success: true, conversations, me })
}

// POST /api/messages — yeni DM / kanal / görev
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const me = Number(user.id)
  const b = await req.json().catch(() => ({}))
  const type = ['dm', 'channel', 'task'].includes(b.type) ? b.type : 'dm'

  // DM: mevcut varsa onu döndür
  if (type === 'dm') {
    const target = Number(b.targetUserId)
    if (!target || target === me) return NextResponse.json({ success: false, message: 'Geçerli kullanıcı seç' }, { status: 400 })
    const mine = await prisma.conversationParticipant.findMany({ where: { userId: me, conversation: { type: 'dm' } }, select: { conversationId: true } })
    const existing = await prisma.conversationParticipant.findFirst({ where: { userId: target, conversationId: { in: mine.map(m => m.conversationId) } } })
    if (existing) return NextResponse.json({ success: true, id: existing.conversationId, existing: true })
    const c = await prisma.conversation.create({
      data: { type: 'dm', createdById: me, participants: { create: [{ userId: me }, { userId: target }] } },
    })
    return NextResponse.json({ success: true, id: c.id })
  }

  if (type === 'channel') {
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return NextResponse.json({ success: false, message: 'Kanal açma yetkisi yok' }, { status: 403 })
    const c = await prisma.conversation.create({ data: { type: 'channel', title: String(b.title || 'Yeni Kanal').slice(0, 80), createdById: me, participants: { create: [{ userId: me }] } } })
    await logAuditAuto('message.channel_create', { req, resource: `conversation:${c.id}`, detail: { title: c.title } })
    return NextResponse.json({ success: true, id: c.id })
  }

  // task
  const assignee = Number(b.assigneeId)
  if (!b.title || !assignee) return NextResponse.json({ success: false, message: 'Görev başlığı ve atanan kişi gerekli' }, { status: 400 })
  const parts = Array.from(new Set([me, assignee])).map(uid => ({ userId: uid }))
  const c = await prisma.conversation.create({
    data: {
      type: 'task', title: String(b.title).slice(0, 120), createdById: me,
      taskStatus: 'OPEN', taskAssigneeId: assignee, taskDueAt: b.dueAt ? new Date(b.dueAt) : null,
      lastMessageAt: new Date(),
      participants: { create: parts },
      ...(b.body ? { messages: { create: [{ senderId: me, body: String(b.body) }] } } : {}),
    },
  })
  await logAuditAuto('message.task_create', { req, resource: `conversation:${c.id}`, detail: { title: c.title, assignee } })
  return NextResponse.json({ success: true, id: c.id })
}
