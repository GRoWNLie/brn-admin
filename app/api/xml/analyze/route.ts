import { NextRequest, NextResponse } from 'next/server'
import { analyzeXml } from '@/lib/xml-engine/analyzer'

// Çalışan projedeki: POST /api/xml-analiz
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const xmlUrl = body.xmlUrl || body.url
  if (!xmlUrl) {
    return NextResponse.json({ success: false, message: 'Link eksik!' }, { status: 400 })
  }
  const result = await analyzeXml(xmlUrl)
  if (!result.success) {
    return NextResponse.json(result, { status: 500 })
  }
  return NextResponse.json(result)
}
