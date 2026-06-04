import { NextResponse } from 'next/server'
import { blockInProduction } from '@/lib/debug-guard'
import { shopifyFetch, pingShopify, ShopifyClientError } from '@/lib/shopify'

/**
 * GET /api/test-shopify
 * Shopify bağlantısını test eder ve ilk 5 ürünü döner.
 *
 * Test:
 *   curl http://localhost:3000/api/test-shopify
 */

interface ShopifyProductNode {
  id: string
  title: string
  handle: string
  vendor: string
  productType: string
  status: string
  totalInventory: number
  featuredImage: { url: string } | null
  variants: {
    edges: Array<{
      node: {
        id: string
        sku: string | null
        price: string
        inventoryQuantity: number | null
      }
    }>
  }
}

interface ProductsResponse {
  products: {
    edges: Array<{ node: ShopifyProductNode }>
  }
}

const PRODUCTS_QUERY = /* GraphQL */ `
  query First5Products {
    products(first: 5, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          status
          totalInventory
          featuredImage { url }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                price
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`

export async function GET() {
  const blocked = blockInProduction(); if (blocked) return blocked
  // Önce bağlantıyı pingle
  const ping = await pingShopify()
  if (!ping.ok) {
    return NextResponse.json(
      {
        success: false,
        step: 'ping',
        message: ping.error,
        hint: '.env içindeki SHOPIFY_STORE_URL ve SHOPIFY_ADMIN_ACCESS_TOKEN değerlerini kontrol edin.',
      },
      { status: 500 }
    )
  }

  // Ürünleri çek
  try {
    const data = await shopifyFetch<ProductsResponse>(PRODUCTS_QUERY)
    const products = data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      vendor: node.vendor,
      productType: node.productType,
      status: node.status,
      totalInventory: node.totalInventory,
      image: node.featuredImage?.url ?? null,
      variant: node.variants.edges[0]?.node ?? null,
    }))

    return NextResponse.json({
      success: true,
      shop: ping.shopName,
      apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
      productCount: products.length,
      products,
    })
  } catch (e) {
    if (e instanceof ShopifyClientError) {
      return NextResponse.json(
        { success: false, step: 'fetch_products', message: e.message, details: e.details },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
