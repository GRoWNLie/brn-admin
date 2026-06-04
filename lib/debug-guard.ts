import { NextResponse } from 'next/server'

/**
 * Debug/bootstrap endpoint'lerini production'da kapatır.
 * Handler'ın en başında: const b = blockInProduction(); if (b) return b
 */
export function blockInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 })
  }
  return null
}
