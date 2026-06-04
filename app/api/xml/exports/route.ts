import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/xml/exports
export async function GET() {
  try {
    const exports = await prisma.export.findMany({ orderBy: { id: 'desc' } })
    return NextResponse.json({ success: true, exports })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
