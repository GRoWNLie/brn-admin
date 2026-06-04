import { shopifyFetch } from './shopify'

export interface Location {
  id: string
  name: string
  address: { city: string | null; country: string | null }
  isActive: boolean
}

export interface InventoryLevelByLocation {
  locationId: string
  locationName: string
  available: number
}

const LOCATIONS_QUERY = /* GraphQL */ `
  query Locations { locations(first: 20) {
    edges { node { id name isActive address { city country } } }
  } }
`

const VARIANT_INVENTORY_QUERY = /* GraphQL */ `
  query VariantInv($id: ID!) {
    productVariant(id: $id) {
      id
      sku
      title
      inventoryItem {
        id
        inventoryLevels(first: 20) {
          edges {
            node {
              quantities(names: ["available"]) { name quantity }
              location { id name }
            }
          }
        }
      }
    }
  }
`

export async function getAllLocations(): Promise<Location[]> {
  const data = await shopifyFetch<{
    locations: { edges: Array<{ node: any }> }
  }>(LOCATIONS_QUERY)
  return data.locations.edges.map(e => ({
    id: e.node.id,
    name: e.node.name,
    address: e.node.address || { city: null, country: null },
    isActive: e.node.isActive,
  }))
}

// --- Barkod / SKU ile varyant arama (stok sayımı için) ---
export interface VariantMatch {
  variantId: string
  inventoryItemId: string | null
  productTitle: string
  variantTitle: string
  sku: string | null
  barcode: string | null
  image: string | null
  available: number
  price: string | null
}

const VARIANT_LOOKUP_QUERY = /* GraphQL */ `
  query VariantLookup($q: String!) {
    productVariants(first: 5, query: $q) {
      edges {
        node {
          id
          sku
          barcode
          title
          price
          inventoryQuantity
          inventoryItem { id }
          image { url }
          product { title featuredImage { url } }
        }
      }
    }
  }
`

/**
 * Barkod VEYA SKU ile varyant(ları) bulur. Stok sayımında okutulan kodu
 * gerçek ürüne (görsel + SKU + mevcut stok) çevirmek için kullanılır.
 */
export async function findVariantsByCode(code: string): Promise<VariantMatch[]> {
  const safe = code.replace(/["\\]/g, '').trim()
  if (!safe) return []
  const q = `barcode:${safe} OR sku:${safe}`
  const data = await shopifyFetch<{
    productVariants: { edges: Array<{ node: any }> }
  }>(VARIANT_LOOKUP_QUERY, { variables: { q } })

  return data.productVariants.edges.map(e => {
    const n = e.node
    return {
      variantId: n.id,
      inventoryItemId: n.inventoryItem?.id ?? null,
      productTitle: n.product?.title ?? '—',
      variantTitle: n.title && n.title !== 'Default Title' ? n.title : '',
      sku: n.sku ?? null,
      barcode: n.barcode ?? null,
      image: n.image?.url ?? n.product?.featuredImage?.url ?? null,
      available: typeof n.inventoryQuantity === 'number' ? n.inventoryQuantity : 0,
      price: n.price ?? null,
    }
  })
}

export async function getVariantInventoryByLocation(variantId: string): Promise<{
  inventoryItemId: string
  levels: InventoryLevelByLocation[]
}> {
  const data = await shopifyFetch<{
    productVariant: any
  }>(VARIANT_INVENTORY_QUERY, { variables: { id: variantId } })

  const v = data.productVariant
  const levels: InventoryLevelByLocation[] = v.inventoryItem.inventoryLevels.edges.map((e: any) => {
    const availQty = e.node.quantities.find((q: any) => q.name === 'available')
    return {
      locationId: e.node.location.id,
      locationName: e.node.location.name,
      available: availQty?.quantity ?? 0,
    }
  })

  return {
    inventoryItemId: v.inventoryItem.id,
    levels,
  }
}
