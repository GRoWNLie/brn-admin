import { NextRequest, NextResponse } from 'next/server'
import { getExportXml } from '@/lib/xml-engine/exporter'

// GET /api/xml/exports/:id/preview?refresh=1 — cached XML'i text/xml olarak döner
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1'
    const xml = await getExportXml(Number(params.id), forceRefresh)
    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
