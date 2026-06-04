/**
 * Shopify Admin GraphQL mutation'ları.
 * Server actions ve API route'lar buradan import eder.
 */

import { shopifyFetch } from './shopify'

// =========================================================
//             ÜRÜN DETAY (DÜZENLEME ÖNCESİ)
// =========================================================

export interface ProductEditDetail {
  id: string
  title: string
  handle: string
  vendor: string
  productType: string
  status: string
  bodyHtml: string
  tags: string[]
  totalInventory: number
  featuredImage: string | null
  images: Array<{ id: string; url: string; altText: string | null }>
  variants: Array<{
    id: string
    title: string
    sku: string | null
    barcode: string | null
    price: string
    compareAtPrice: string | null
    inventoryQuantity: number | null
    inventoryItemId: string
    locationId: string | null
  }>
}

const PRODUCT_DETAIL_QUERY = /* GraphQL */ `
  query ProductDetail($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      vendor
      productType
      status
      descriptionHtml
      tags
      totalInventory
      featuredImage { url }
      images(first: 20) {
        edges { node { id url altText } }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            sku
            barcode
            price
            compareAtPrice
            inventoryQuantity
            inventoryItem {
              id
              inventoryLevels(first: 1) {
                edges { node { location { id } } }
              }
            }
          }
        }
      }
    }
  }
`

export async function getProductDetail(id: string): Promise<ProductEditDetail | null> {
  const data = await shopifyFetch<{ product: any }>(PRODUCT_DETAIL_QUERY, {
    variables: { id },
  })
  const p = data.product
  if (!p) return null

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    vendor: p.vendor || '',
    productType: p.productType || '',
    status: p.status,
    bodyHtml: p.descriptionHtml || '',
    tags: p.tags || [],
    totalInventory: p.totalInventory ?? 0,
    featuredImage: p.featuredImage?.url ?? null,
    images: p.images.edges.map((e: any) => ({
      id: e.node.id,
      url: e.node.url,
      altText: e.node.altText,
    })),
    variants: p.variants.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      sku: e.node.sku,
      barcode: e.node.barcode,
      price: e.node.price,
      compareAtPrice: e.node.compareAtPrice,
      inventoryQuantity: e.node.inventoryQuantity,
      inventoryItemId: e.node.inventoryItem?.id ?? '',
      locationId: e.node.inventoryItem?.inventoryLevels?.edges?.[0]?.node?.location?.id ?? null,
    })),
  }
}

// =========================================================
//                 PRODUCT UPDATE (mutation)
// =========================================================

const PRODUCT_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProductUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id title status }
      userErrors { field message }
    }
  }
`

// Yeni API: productVariantsBulkUpdate (2024-04+ tek doğru yöntem)
// Response'da sku ve barcode artık inventoryItem altından okunur.
const VARIANTS_BULK_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product { id }
      productVariants {
        id
        price
        compareAtPrice
        inventoryItem { id sku }
      }
      userErrors { field message }
    }
  }
`

export interface UpdateProductPayload {
  id: string
  title?: string
  vendor?: string
  productType?: string
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  descriptionHtml?: string
  tags?: string[]
}

export interface UpdateVariantPayload {
  id: string
  price?: string
  compareAtPrice?: string | null
  sku?: string
  barcode?: string
}

export async function updateProduct(payload: UpdateProductPayload): Promise<{
  success: boolean
  errors: Array<{ field: string[] | null; message: string }>
}> {
  const data = await shopifyFetch<{
    productUpdate: { product: any; userErrors: Array<{ field: string[] | null; message: string }> }
  }>(PRODUCT_UPDATE_MUTATION, {
    variables: { input: payload },
  })

  const errs = data.productUpdate.userErrors
  return {
    success: errs.length === 0,
    errors: errs,
  }
}

/**
 * Aynı üründeki birden fazla varyantı toplu olarak günceller.
 *
 * Shopify GraphQL Admin API 2024-04+ ile birlikte:
 *   - price, compareAtPrice → ProductVariantsBulkInput içinde (variant seviyesi)
 *   - sku, barcode → ProductVariantsBulkInput.inventoryItem içinde (inventory item seviyesi)
 *
 * Bu fonksiyon her iki seviyeyi de doğru şekilde sarmalar.
 */
export async function bulkUpdateVariants(
  productId: string,
  variants: UpdateVariantPayload[]
): Promise<{
  success: boolean
  errors: Array<{ field: string[] | null; message: string }>
}> {
  if (variants.length === 0) return { success: true, errors: [] }

  // ProductVariantsBulkInput şeması:
  //   - VARIANT seviyesi: id, price, compareAtPrice, barcode
  //   - InventoryItemInput içinde: sku (SADECE SKU, barcode burada YOK)
  const cleanVariants = variants.map(v => {
    const out: Record<string, unknown> = { id: v.id }

    // VARIANT root seviyesi
    if (v.price !== undefined && v.price !== null && v.price !== '') {
      out.price = String(v.price)
    }
    if (v.compareAtPrice !== undefined && v.compareAtPrice !== null && v.compareAtPrice !== '') {
      out.compareAtPrice = String(v.compareAtPrice)
    }
    if (v.barcode !== undefined) {
      out.barcode = v.barcode || ''
    }

    // INVENTORY_ITEM seviyesi (sadece SKU)
    if (v.sku !== undefined) {
      out.inventoryItem = { sku: v.sku || '' }
    }

    return out
  })

  const data = await shopifyFetch<{
    productVariantsBulkUpdate: {
      productVariants: any[]
      userErrors: Array<{ field: string[] | null; message: string }>
    }
  }>(VARIANTS_BULK_UPDATE_MUTATION, {
    variables: { productId, variants: cleanVariants },
  })

  const errs = data.productVariantsBulkUpdate.userErrors
  return {
    success: errs.length === 0,
    errors: errs,
  }
}

// =========================================================
//                 PRODUCT CREATE / DELETE
// =========================================================

const PRODUCT_CREATE_MUTATION = /* GraphQL */ `
  mutation ProductCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
    productCreate(input: $input, media: $media) {
      product {
        id
        title
        handle
        variants(first: 1) { edges { node { id sku price } } }
      }
      userErrors { field message }
    }
  }
`

const PRODUCT_DELETE_MUTATION = /* GraphQL */ `
  mutation ProductDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`

export interface CreateProductInput {
  title: string
  descriptionHtml?: string
  vendor?: string
  productType?: string
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  tags?: string[]
  imageUrls?: string[]      // Görsel URL'leri (Shopify download eder)
  // Default variant
  price?: string
  sku?: string
  inventoryQuantity?: number
}

export async function createProduct(input: CreateProductInput): Promise<{
  success: boolean
  productId?: string
  variantId?: string
  errors: Array<{ field: string[] | null; message: string }>
}> {
  const productInput: Record<string, unknown> = {
    title: input.title,
    descriptionHtml: input.descriptionHtml || '',
    vendor: input.vendor,
    productType: input.productType,
    status: input.status || 'DRAFT',
    tags: input.tags || [],
  }

  const media = (input.imageUrls || [])
    .filter(u => !!u)
    .map(originalSource => ({
      originalSource,
      mediaContentType: 'IMAGE',
    }))

  const data = await shopifyFetch<{
    productCreate: {
      product: { id: string; variants: { edges: Array<{ node: { id: string } }> } } | null
      userErrors: Array<{ field: string[] | null; message: string }>
    }
  }>(PRODUCT_CREATE_MUTATION, {
    variables: { input: productInput, media: media.length > 0 ? media : null },
  })

  const errs = data.productCreate.userErrors
  if (errs.length > 0) {
    return { success: false, errors: errs }
  }
  const product = data.productCreate.product
  const variantId = product?.variants.edges[0]?.node.id

  // Default variant'ın fiyat/sku/stock'unu ayrıca güncelle
  if (product && variantId && (input.price || input.sku)) {
    try {
      await bulkUpdateVariants(product.id, [{
        id: variantId,
        price: input.price,
        sku: input.sku,
      }])
    } catch (e) {
      console.error('Default variant update hatası:', e)
    }
  }

  return {
    success: true,
    productId: product?.id,
    variantId,
    errors: [],
  }
}

export async function deleteProduct(productId: string): Promise<{
  success: boolean
  errors: Array<{ field: string[] | null; message: string }>
}> {
  const data = await shopifyFetch<{
    productDelete: {
      deletedProductId: string | null
      userErrors: Array<{ field: string[] | null; message: string }>
    }
  }>(PRODUCT_DELETE_MUTATION, {
    variables: { input: { id: productId } },
  })
  const errs = data.productDelete.userErrors
  return { success: errs.length === 0, errors: errs }
}

// =========================================================
//         TOPLU İŞLEMLER İÇİN YARDIMCI: ÜRÜN ÖZETİ
// =========================================================

const PRODUCT_BULK_INFO_QUERY = /* GraphQL */ `
  query ProductBulkInfo($id: ID!) {
    product(id: $id) {
      id
      tags
      variants(first: 100) {
        edges {
          node {
            id
            price
            inventoryItem {
              id
              inventoryLevels(first: 1) {
                edges { node { location { id } } }
              }
            }
          }
        }
      }
    }
  }
`

export interface ProductBulkInfo {
  id: string
  tags: string[]
  variants: Array<{
    id: string
    price: string
    inventoryItemId: string
    locationId: string | null
  }>
}

/** Tek ürünün toplu işlemler için ihtiyaç duyduğu özet bilgilerini getirir */
export async function getProductBulkInfo(productId: string): Promise<ProductBulkInfo | null> {
  const data = await shopifyFetch<{ product: any | null }>(
    PRODUCT_BULK_INFO_QUERY, { variables: { id: productId }, cacheSeconds: 0 }
  )
  const p = data.product
  if (!p) return null
  return {
    id: p.id,
    tags: p.tags ?? [],
    variants: p.variants.edges.map((e: any) => ({
      id: e.node.id,
      price: e.node.price,
      inventoryItemId: e.node.inventoryItem?.id ?? '',
      locationId: e.node.inventoryItem?.inventoryLevels?.edges?.[0]?.node?.location?.id ?? null,
    })),
  }
}

// =========================================================
//                 INVENTORY (stok güncelleme)
// =========================================================

// 2023-10+ desteklenir, en uyumlu mutation
const INVENTORY_SET_MUTATION = /* GraphQL */ `
  mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { id }
      userErrors { field message }
    }
  }
`

export async function setInventoryQuantity(
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  if (!inventoryItemId || !locationId) {
    return { success: false, error: 'inventoryItemId veya locationId eksik' }
  }

  try {
    const data = await shopifyFetch<{
      inventorySetQuantities: { userErrors: Array<{ field: string[] | null; message: string }> }
    }>(INVENTORY_SET_MUTATION, {
      variables: {
        input: {
          name: 'available',
          reason: 'correction',
          ignoreCompareQuantity: true,
          quantities: [{ inventoryItemId, locationId, quantity }],
        },
      },
    })

    const errs = data.inventorySetQuantities.userErrors
    if (errs.length > 0) {
      return { success: false, error: errs.map(e => e.message).join('; ') }
    }
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Stok güncellenemedi',
    }
  }
}
