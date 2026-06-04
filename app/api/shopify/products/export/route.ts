import { NextRequest, NextResponse } from 'next/server'
import { shopifyFetch } from '@/lib/shopify'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const EXPORT_QUERY = /* GraphQL */ `
  query ExportProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          status
          totalInventory
          variants(first: 1) {
            edges { node { sku price } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

interface ExportRow {
  shopifyId: string
  title: string
  handle: string
  sku: string
  price: string
  stock: number
  vendor: string
  productType: string
  status: string
}

/** Tüm ürünleri Shopify'dan sayfalayarak çeker (max 12 500 ürün = 50 sayfa × 250) */
async function fetchAllForExport(): Promise<ExportRow[]> {
  const rows: ExportRow[] = []
  let cursor: string | null = null

  type PageResult = {
    products: {
      edges: Array<{ node: Record<string, any> }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }

  for (let page = 0; page < 50; page++) {
    const result: PageResult = await shopifyFetch<PageResult>(
      EXPORT_QUERY,
      { variables: { first: 250, after: cursor }, cacheSeconds: 0 }
    )

    for (const { node } of result.products.edges) {
      const variant = node.variants.edges[0]?.node
      rows.push({
        shopifyId: (node.id as string).replace('gid://shopify/Product/', ''),
        title: node.title,
        handle: node.handle,
        sku: variant?.sku ?? '',
        price: variant?.price ?? '0.00',
        stock: node.totalInventory ?? 0,
        vendor: node.vendor ?? '',
        productType: node.productType ?? '',
        status: node.status,
      })
    }

    if (!result.products.pageInfo.hasNextPage) break
    cursor = result.products.pageInfo.endCursor
  }

  return rows
}

function escapeCSV(v: string | number): string {
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function toCSV(rows: ExportRow[]): string {
  const headers = ['Shopify ID', 'Başlık', 'Handle', 'SKU', 'Fiyat', 'Stok', 'Tedarikçi', 'Ürün Tipi', 'Durum']
  const lines = rows.map(r => [
    r.shopifyId, r.title, r.handle, r.sku, r.price,
    r.stock, r.vendor, r.productType, r.status,
  ].map(escapeCSV).join(','))
  return '﻿' + [headers.join(','), ...lines].join('\r\n')
}

/**
 * GET /api/shopify/products/export?format=csv|json
 * Tüm Shopify ürünlerini dosya olarak indirir.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requirePermission('products.view')
  if (error) return error

  const format = req.nextUrl.searchParams.get('format') === 'json' ? 'json' : 'csv'
  const dateStr = new Date().toISOString().slice(0, 10)

  try {
    const rows = await fetchAllForExport()
    await logAudit({
      userId: user.id, userEmail: user.email!,
      action: 'products.export', detail: { format, count: rows.length }, req,
    })

    if (format === 'json') {
      return new NextResponse(JSON.stringify(rows, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="urunler-${dateStr}.json"`,
        },
      })
    }

    return new NextResponse(toCSV(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="urunler-${dateStr}.csv"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
