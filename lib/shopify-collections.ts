import { shopifyFetch } from './shopify'

export interface CollectionListItem {
  id: string
  title: string
  handle: string
  productsCount: number
  image: string | null
  updatedAt: string
  isAutomatic: boolean
}

export interface CollectionProduct {
  id: string
  title: string
  image: string | null
  price: string
  sku: string
  status: string
  totalInventory: number
}

export interface CollectionDetail extends CollectionListItem {
  descriptionHtml: string
  products: CollectionProduct[]
  hasMoreProducts: boolean
}

const COLLECTIONS_LIST_QUERY = /* GraphQL */ `
  query CollectionsList($first: Int!, $after: String, $query: String) {
    collections(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          title
          handle
          updatedAt
          image { url }
          productsCount { count }
          ruleSet { rules { column } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const COLLECTION_DETAIL_QUERY = /* GraphQL */ `
  query CollectionDetail($id: ID!) {
    collection(id: $id) {
      id
      title
      handle
      descriptionHtml
      updatedAt
      image { url }
      productsCount { count }
      ruleSet { rules { column } }
      products(first: 50, sortKey: TITLE) {
        edges {
          node {
            id
            title
            status
            totalInventory
            featuredImage { url }
            variants(first: 1) { edges { node { price sku } } }
          }
        }
        pageInfo { hasNextPage }
      }
    }
  }
`

export async function getCollections(opts: {
  first?: number
  after?: string | null
  search?: string
} = {}): Promise<{ collections: CollectionListItem[]; pageInfo: any }> {
  const { first = 50, after = null, search } = opts
  const query = search ? `title:*${search}*` : null

  const data = await shopifyFetch<{
    collections: { edges: Array<{ node: any }>; pageInfo: any }
  }>(COLLECTIONS_LIST_QUERY, { variables: { first, after, query } })

  return {
    collections: data.collections.edges.map(e => ({
      id: e.node.id,
      title: e.node.title,
      handle: e.node.handle,
      updatedAt: e.node.updatedAt,
      image: e.node.image?.url ?? null,
      productsCount: e.node.productsCount?.count ?? 0,
      isAutomatic: !!e.node.ruleSet,
    })),
    pageInfo: data.collections.pageInfo,
  }
}

export async function getCollectionDetail(id: string): Promise<CollectionDetail | null> {
  const data = await shopifyFetch<{ collection: any | null }>(
    COLLECTION_DETAIL_QUERY, { variables: { id }, cacheSeconds: 0 }
  )
  const c = data.collection
  if (!c) return null

  return {
    id: c.id,
    title: c.title,
    handle: c.handle,
    descriptionHtml: c.descriptionHtml ?? '',
    updatedAt: c.updatedAt,
    image: c.image?.url ?? null,
    productsCount: c.productsCount?.count ?? 0,
    isAutomatic: !!c.ruleSet,
    hasMoreProducts: c.products.pageInfo.hasNextPage,
    products: c.products.edges.map((e: any) => {
      const v = e.node.variants.edges[0]?.node
      return {
        id: e.node.id,
        title: e.node.title,
        image: e.node.featuredImage?.url ?? null,
        price: v?.price ?? '0.00',
        sku: v?.sku ?? '',
        status: e.node.status,
        totalInventory: e.node.totalInventory ?? 0,
      }
    }),
  }
}

const COLLECTION_CREATE_MUTATION = /* GraphQL */ `
  mutation CollectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id title handle }
      userErrors { field message }
    }
  }
`

const COLLECTION_UPDATE_MUTATION = /* GraphQL */ `
  mutation CollectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id title handle }
      userErrors { field message }
    }
  }
`

const COLLECTION_DELETE_MUTATION = /* GraphQL */ `
  mutation CollectionDelete($input: CollectionDeleteInput!) {
    collectionDelete(input: $input) {
      deletedCollectionId
      userErrors { field message }
    }
  }
`

const COLLECTION_ADD_PRODUCTS = /* GraphQL */ `
  mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection { id }
      userErrors { field message }
    }
  }
`

const COLLECTION_REMOVE_PRODUCTS = /* GraphQL */ `
  mutation CollectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
    collectionRemoveProducts(id: $id, productIds: $productIds) {
      job { id }
      userErrors { field message }
    }
  }
`

export async function addProductsToCollection(
  collectionId: string,
  productIds: string[]
): Promise<{ success: boolean; errors: any[] }> {
  const data = await shopifyFetch<{
    collectionAddProducts: { userErrors: any[] }
  }>(COLLECTION_ADD_PRODUCTS, { variables: { id: collectionId, productIds } })
  return {
    success: data.collectionAddProducts.userErrors.length === 0,
    errors: data.collectionAddProducts.userErrors,
  }
}

export async function removeProductsFromCollection(
  collectionId: string,
  productIds: string[]
): Promise<{ success: boolean; errors: any[] }> {
  const data = await shopifyFetch<{
    collectionRemoveProducts: { userErrors: any[] }
  }>(COLLECTION_REMOVE_PRODUCTS, { variables: { id: collectionId, productIds } })
  return {
    success: data.collectionRemoveProducts.userErrors.length === 0,
    errors: data.collectionRemoveProducts.userErrors,
  }
}

export async function createCollection(input: { title: string; descriptionHtml?: string }): Promise<{
  success: boolean
  id?: string
  errors: Array<{ field: string[] | null; message: string }>
}> {
  const data = await shopifyFetch<{
    collectionCreate: { collection: { id: string } | null; userErrors: any[] }
  }>(COLLECTION_CREATE_MUTATION, { variables: { input } })
  return {
    success: data.collectionCreate.userErrors.length === 0,
    id: data.collectionCreate.collection?.id,
    errors: data.collectionCreate.userErrors,
  }
}

export async function updateCollection(id: string, input: { title?: string; descriptionHtml?: string }): Promise<{
  success: boolean
  errors: any[]
}> {
  const data = await shopifyFetch<{
    collectionUpdate: { userErrors: any[] }
  }>(COLLECTION_UPDATE_MUTATION, { variables: { input: { id, ...input } } })
  return {
    success: data.collectionUpdate.userErrors.length === 0,
    errors: data.collectionUpdate.userErrors,
  }
}

export async function deleteCollection(id: string): Promise<{ success: boolean; errors: any[] }> {
  const data = await shopifyFetch<{
    collectionDelete: { userErrors: any[] }
  }>(COLLECTION_DELETE_MUTATION, { variables: { input: { id } } })
  return {
    success: data.collectionDelete.userErrors.length === 0,
    errors: data.collectionDelete.userErrors,
  }
}
