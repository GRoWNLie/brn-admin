import { NextRequest, NextResponse } from 'next/server'
import { getCustomerDetail } from '@/lib/shopify-commerce'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customer = await getCustomerDetail(decodeURIComponent(params.id))
    if (!customer) return NextResponse.json({ success: false, message: 'Bulunamadı' }, { status: 404 })
    return NextResponse.json({ success: true, customer })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
