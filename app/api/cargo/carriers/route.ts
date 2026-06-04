import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getCarrier, isCarrierCode, CarrierCode } from '@/lib/cargo-carriers'

// POST /api/cargo/carriers — Body: { carrier, action: 'test'|'createShipment'|'track', ... }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const carrier = String(b.carrier || '').toUpperCase()
  if (!isCarrierCode(carrier)) return NextResponse.json({ success: false, message: 'Geçersiz taşıyıcı' }, { status: 400 })
  const adapter = getCarrier(carrier as CarrierCode)
  const action = String(b.action || '')

  try {
    if (action === 'test') {
      const r = await adapter.testConnection()
      return NextResponse.json({ success: r.ok, message: r.message })
    }
    if (action === 'createShipment') {
      const r = await adapter.createShipment(b.shipment || {})
      if (r.ok) await logAuditAuto('cargo.create_shipment', { req, resource: `cargo:${carrier}`, detail: { order: b.shipment?.orderNumber, tracking: r.trackingNumber } })
      return NextResponse.json({ success: r.ok, trackingNumber: r.trackingNumber, message: r.message })
    }
    if (action === 'track') {
      const r = await adapter.getTracking(String(b.trackingNumber || ''))
      return NextResponse.json({ success: r.ok, status: r.status, statusText: r.statusText, message: r.message })
    }
    return NextResponse.json({ success: false, message: 'Geçersiz action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
