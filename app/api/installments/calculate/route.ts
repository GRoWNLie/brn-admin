import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BANKS, calculateInstallments } from '@/lib/installments'

// GET /api/installments/calculate?amount=1500
export async function GET(req: NextRequest) {
  const amount = parseFloat(req.nextUrl.searchParams.get('amount') || '0')
  if (!amount || amount <= 0) {
    return NextResponse.json({ success: false, message: 'amount > 0 gerekli' }, { status: 400 })
  }

  const banks = DEFAULT_BANKS.map(b => ({
    code: b.code,
    name: b.name,
    cardFamily: b.cardFamily,
    logoEmoji: b.logoEmoji,
    brandColor: b.brandColor,
    options: calculateInstallments(b, amount),
  }))

  return NextResponse.json({ success: true, baseAmount: amount, banks })
}
