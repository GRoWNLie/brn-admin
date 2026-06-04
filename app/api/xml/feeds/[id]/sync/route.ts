import { NextRequest, NextResponse } from 'next/server'
import { runSync, TestSettings } from '@/lib/xml-engine/sync'

// POST /api/xml/feeds/:id/sync
// Body: { testSettings?: { importMode, selectedProductIds, testLimit } }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const feedId = Number(params.id)
  const body = await req.json().catch(() => ({}))
  const testSettings: TestSettings | undefined = body.testSettings

  try {
    const result = await runSync(feedId, testSettings)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json({ ...result, mode: 'postgres' })
  } catch (e: any) {
    console.error('Canlı Senkronizasyon Hatası:', e)
    return NextResponse.json(
      { success: false, message: e.message },
      { status: 500 }
    )
  }
}
