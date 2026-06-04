import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getExportXml } from '@/lib/xml-engine/exporter'

// GET /api/xml/feed/:slug — Public XML feed endpoint
// Tedarikçiler bu URL'yi otomatik tüketebilir
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const ex = await prisma.export.findUnique({ where: { slug: params.slug } })
    if (!ex) {
      return new NextResponse('Feed bulunamadı', { status: 404 })
    }
    if (ex.status !== 'Aktif') {
      return new NextResponse('Bu feed devre dışı', { status: 403 })
    }
    const xml = await getExportXml(ex.id)
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${ex.autoRefreshMin * 60}`,
      },
    })
  } catch (e: any) {
    return new NextResponse(`Hata: ${e.message}`, { status: 500 })
  }
}
