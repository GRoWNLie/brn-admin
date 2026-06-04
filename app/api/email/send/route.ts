import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, EmailTemplates } from '@/lib/email'

// POST /api/email/send
// Body: { to, subject, html } VEYA { to, template: "welcome", vars: {...} }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (!body.to) {
    return NextResponse.json({ success: false, message: 'to gerekli' }, { status: 400 })
  }

  let subject = body.subject
  let html = body.html

  // Template kullanımı
  if (body.template) {
    const tpl = (EmailTemplates as any)[body.template]
    if (!tpl) {
      return NextResponse.json({ success: false, message: `Şablon yok: ${body.template}` }, { status: 400 })
    }
    const args = Object.values(body.vars || {})
    const result = tpl(...args)
    subject = result.subject
    html = result.html
  }

  if (!subject || !html) {
    return NextResponse.json({ success: false, message: 'subject + html veya template gerekli' }, { status: 400 })
  }

  const result = await sendEmail({
    to: body.to, toName: body.toName, subject, html,
    campaignId: body.campaignId,
  })
  return NextResponse.json(result)
}
