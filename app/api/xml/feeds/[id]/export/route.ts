import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/xml/feeds/:id/export
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const feedId = Number(params.id)
  try {
    const rows = await prisma.product.findMany({ where: { feedId } })
    let xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n'
    rows.forEach(p => {
      xmlStr += `  <product>\n    <id>${p.productId}</id>\n    <title><![CDATA[${p.title}]]></title>\n    <price>${p.price}</price>\n    <stock>${p.stock}</stock>\n    <category><![CDATA[${p.category}]]></category>\n  </product>\n`
    })
    xmlStr += '</products>'
    return NextResponse.json({ success: true, mode: 'postgres', exportData: xmlStr })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
