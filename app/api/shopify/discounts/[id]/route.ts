import { NextRequest, NextResponse } from 'next/server'
import { deleteDiscount } from '@/lib/shopify-commerce'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await deleteDiscount(decodeURIComponent(params.id))
  if (!r.success) {
    return NextResponse.json(
      { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
      { status: 400 }
    )
  }
  return NextResponse.json({ success: true })
}
