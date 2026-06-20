import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { getSetting } from '@/lib/app-settings'
import { getShopifyAccessToken } from '@/lib/shopify-auth'

function numericId(gid: string) {
  return gid.split('/').pop() ?? ''
}

async function shopifyRestFetch(path: string, method: string, body?: unknown) {
  const rawUrl = (await getSetting('SHOPIFY_STORE_URL')) || ''
  const storeUrl = rawUrl.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\/$/, '')
  const version = (await getSetting('SHOPIFY_API_VERSION')) || '2024-01'
  const token = await getShopifyAccessToken()

  const res = await fetch(`https://${storeUrl}/admin/api/${version}${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false }, { status: 401 })

  const productGid = decodeURIComponent(params.id)
  const productNumId = numericId(productGid)

  const { base64, filename } = await req.json().catch(() => ({}))
  if (!base64) return NextResponse.json({ success: false, message: 'base64 gerekli' }, { status: 400 })

  const res = await shopifyRestFetch(`/products/${productNumId}/images.json`, 'POST', {
    image: { attachment: base64.replace(/^data:[^;]+;base64,/, ''), filename: filename || 'image.jpg' },
  })
  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ success: false, message: JSON.stringify(data.errors) }, { status: res.status })
  }

  const img = data.image
  return NextResponse.json({
    success: true,
    image: {
      id: `gid://shopify/ProductImage/${img.id}`,
      url: img.src,
      altText: img.alt ?? null,
    },
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false }, { status: 401 })

  const productGid = decodeURIComponent(params.id)
  const productNumId = numericId(productGid)
  const { imageId } = await req.json().catch(() => ({}))
  if (!imageId) return NextResponse.json({ success: false, message: 'imageId gerekli' }, { status: 400 })

  const imageNumId = numericId(imageId)
  const res = await shopifyRestFetch(`/products/${productNumId}/images/${imageNumId}.json`, 'DELETE')

  if (!res.ok && res.status !== 404) {
    return NextResponse.json({ success: false, message: 'Silme başarısız' }, { status: res.status })
  }
  return NextResponse.json({ success: true })
}
