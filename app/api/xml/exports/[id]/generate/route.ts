import { NextRequest, NextResponse } from 'next/server'
import { generateExport } from '@/lib/xml-engine/exporter'

// POST /api/xml/exports/:id/generate — XML'i yeniden üret ve cache'le
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await generateExport(Number(params.id))
    return NextResponse.json({
      success: true,
      productCount: result.productCount,
      message: `${result.productCount} ürün için XML üretildi`,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
