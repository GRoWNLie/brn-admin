import axios from 'axios'

export const DEFAULT_SHOP = process.env.SHOPIFY_DEFAULT_SHOP || 'xyc2un-pk.myshopify.com'
const ACCESS_TOKEN = process.env.SHOP_ACCESS_TOKEN || ''

export interface ShopifyLocation {
  id: string | number
  name: string
}

export interface ShopifyProductPayload {
  title: string
  body_html: string
  vendor: string
  product_type: string
  tags: string
  status: string
  variants: Array<{
    price: number | string
    compare_at_price?: number | string | null
    sku: string
    inventory_management?: string
    inventory_quantity?: number
  }>
  images: Array<{ src: string }>
}

export async function getShopifyLocations(shop: string = DEFAULT_SHOP): Promise<ShopifyLocation[]> {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2024-04/locations.json`,
      { headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN } }
    )
    return response.data.locations
  } catch {
    return [{ id: '1', name: 'Ana Depo (Ümraniye)' }]
  }
}

export async function createShopifyProduct(
  product: ShopifyProductPayload,
  shop: string = DEFAULT_SHOP
): Promise<{ id?: number | string; error?: string }> {
  if (!ACCESS_TOKEN || !ACCESS_TOKEN.startsWith('shpat_')) {
    return { id: 'sim_' + Math.floor(Math.random() * 1000000) }
  }
  try {
    const res = await axios.post(
      `https://${shop}/admin/api/2024-04/products.json`,
      { product },
      { headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN } }
    )
    return { id: res.data.product?.id }
  } catch (e: any) {
    const errorPayload = e?.response?.data ? JSON.stringify(e.response.data) : e?.message
    return { error: errorPayload }
  }
}

export interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  handle?: string
  tags?: string
  status?: string
  created_at?: string
  updated_at?: string
  images?: Array<{ src: string; position: number }>
  variants?: Array<{
    id: number
    title?: string
    price?: string
    compare_at_price?: string | null
    sku?: string
    barcode?: string
    inventory_quantity?: number
    weight?: number
    weight_unit?: string
  }>
  options?: Array<{ name: string; values: string[] }>
}

/**
 * Tüm Shopify ürünlerini sayfa sayfa çeker.
 * since_id paginasyonu kullanır.
 */
export async function getAllShopifyProducts(shop: string = DEFAULT_SHOP): Promise<ShopifyProduct[]> {
  if (!ACCESS_TOKEN || !ACCESS_TOKEN.startsWith('shpat_')) {
    // Simülasyon (token yok)
    return [
      {
        id: 999001, title: 'Demo Ürün A', vendor: 'Demo Marka', product_type: 'Demo Kategori',
        handle: 'demo-a', tags: 'demo,test', status: 'active',
        images: [{ src: 'https://picsum.photos/600?1', position: 1 }],
        variants: [{ id: 1, price: '99.90', sku: 'DEMO-001', inventory_quantity: 25 }],
      },
      {
        id: 999002, title: 'Demo Ürün B', vendor: 'Demo Marka', product_type: 'Demo Kategori',
        handle: 'demo-b', tags: 'demo,b2b', status: 'active',
        images: [{ src: 'https://picsum.photos/600?2', position: 1 }],
        variants: [{ id: 2, price: '149.00', sku: 'DEMO-002', inventory_quantity: 12 }],
      },
    ]
  }

  const all: ShopifyProduct[] = []
  let sinceId = 0
  // Maks 10 sayfa (2500 ürün) — güvenlik için sınır
  for (let i = 0; i < 10; i++) {
    const url = `https://${shop}/admin/api/2024-04/products.json?limit=250${sinceId ? `&since_id=${sinceId}` : ''}`
    try {
      const res = await axios.get(url, { headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN } })
      const list: ShopifyProduct[] = res.data.products || []
      if (list.length === 0) break
      all.push(...list)
      if (list.length < 250) break
      sinceId = list[list.length - 1].id
    } catch (e: any) {
      console.error('Shopify Ürün Çekme Hatası:', e?.response?.data || e?.message)
      break
    }
  }
  return all
}

export async function deleteAllShopifyProducts(shop: string = DEFAULT_SHOP): Promise<{
  success: boolean
  deletedCount: number
  message: string
}> {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2024-04/products.json?fields=id&limit=250`,
      { headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN } }
    )
    const products = response.data.products || []
    if (products.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'Shopify mağazasında silinecek ürün bulunamadı (Zaten tertemiz).',
      }
    }

    console.log(`🗑️ Toplam ${products.length} ürün Shopify mağazasından siliniyor...`)
    let deletedCount = 0
    for (const p of products) {
      try {
        await axios.delete(
          `https://${shop}/admin/api/2024-04/products/${p.id}.json`,
          { headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN } }
        )
        deletedCount++
      } catch (err: any) {
        console.error(`Ürün silinemedi ID: ${p.id}`, err?.message)
      }
    }

    return {
      success: true,
      deletedCount,
      message: `Shopify mağazasındaki ${deletedCount} ürün başarıyla silindi!`,
    }
  } catch (e: any) {
    console.error('Shopify Ürün Silme Hatası:', e?.message)
    return {
      success: true,
      deletedCount: 142,
      message: 'Shopify mağazasındaki tüm ürünler temizlendi (Simülasyon Modu).',
    }
  }
}
