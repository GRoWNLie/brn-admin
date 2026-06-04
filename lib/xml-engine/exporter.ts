import { prisma } from '@/lib/prisma'
import { getAllShopifyProducts, ShopifyProduct, DEFAULT_SHOP } from './shopify'

export interface ExportMapping {
  // XML tag name → Shopify field path
  [xmlTag: string]: string
}

export interface ExportFilter {
  field: string      // status / vendor / product_type / tag / price / stock
  operator: string   // = != > < contains
  value: string
}

export const DEFAULT_MAPPING: ExportMapping = {
  id: 'id',
  Name: 'title',
  Description: 'body_html',
  Brand: 'vendor',
  Category: 'product_type',
  Handle: 'handle',
  Tags: 'tags',
  Price: 'variants[0].price',
  ComparePrice: 'variants[0].compare_at_price',
  SKU: 'variants[0].sku',
  Barcode: 'variants[0].barcode',
  Stock: 'variants[0].inventory_quantity',
  Image1: 'images[0].src',
  Image2: 'images[1].src',
  Image3: 'images[2].src',
}

export const AVAILABLE_FIELDS = [
  'id', 'title', 'handle', 'vendor', 'product_type', 'tags', 'status',
  'body_html', 'created_at', 'updated_at',
  'variants[0].price', 'variants[0].compare_at_price', 'variants[0].sku',
  'variants[0].barcode', 'variants[0].inventory_quantity',
  'variants[0].weight', 'variants[0].weight_unit',
  'images[0].src', 'images[1].src', 'images[2].src', 'images[3].src', 'images[4].src',
  'options[0].name', 'options[1].name',
]

function getFieldValue(product: ShopifyProduct, path: string): string {
  // "variants[0].price" → product.variants[0].price
  const parts = path.split('.')
  let val: any = product
  for (const part of parts) {
    const arrMatch = part.match(/^([\w_]+)\[(\d+)\]$/)
    if (arrMatch) {
      val = val?.[arrMatch[1]]?.[Number(arrMatch[2])]
    } else {
      val = val?.[part]
    }
    if (val === undefined || val === null) return ''
  }
  return String(val ?? '')
}

function applyFilters(products: ShopifyProduct[], filters: ExportFilter[]): ShopifyProduct[] {
  if (!filters || filters.length === 0) return products
  return products.filter(p => {
    return filters.every(f => {
      const raw = getFieldValue(p, f.field === 'tag' ? 'tags' : f.field)
      const target = f.value
      switch (f.operator) {
        case '=': return raw == target
        case '!=': return raw != target
        case '>': return parseFloat(raw) > parseFloat(target)
        case '<': return parseFloat(raw) < parseFloat(target)
        case 'contains': return raw.toLowerCase().includes(target.toLowerCase())
        default: return true
      }
    })
  })
}

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapCdata(str: string): string {
  // CDATA içine konulabilen alanlar için
  return `<![CDATA[${String(str ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

interface BuildOptions {
  rootTag: string
  itemTag: string
  encoding: string
  mapping: ExportMapping
  includeImages: boolean
  includeVariants: boolean
}

export function buildXml(products: ShopifyProduct[], opts: BuildOptions): string {
  const { rootTag, itemTag, encoding, mapping, includeImages, includeVariants } = opts
  const lines: string[] = []
  lines.push(`<?xml version="1.0" encoding="${encoding}"?>`)
  lines.push(`<${rootTag}>`)

  for (const p of products) {
    lines.push(`  <${itemTag}>`)

    // Mapping alanları
    for (const [tag, fieldPath] of Object.entries(mapping)) {
      if (!fieldPath) continue
      // Görselleri/varyantları opsiyonel olarak atla
      if (!includeImages && /^images?\[/i.test(fieldPath)) continue
      if (!includeVariants && /^variants?\[/i.test(fieldPath)) continue

      const val = getFieldValue(p, fieldPath)
      if (val === '') {
        lines.push(`    <${tag}/>`)
      } else if (/description|body|name|title|aciklama/i.test(tag)) {
        lines.push(`    <${tag}>${wrapCdata(val)}</${tag}>`)
      } else {
        lines.push(`    <${tag}>${escapeXml(val)}</${tag}>`)
      }
    }

    // Tüm görseller (ekstra)
    if (includeImages && p.images && p.images.length > 0) {
      lines.push(`    <Images>`)
      p.images.forEach((img, i) => {
        lines.push(`      <Image position="${img.position ?? i + 1}">${escapeXml(img.src)}</Image>`)
      })
      lines.push(`    </Images>`)
    }

    // Tüm varyantlar (ekstra)
    if (includeVariants && p.variants && p.variants.length > 1) {
      lines.push(`    <Variants>`)
      p.variants.forEach(v => {
        lines.push(`      <Variant>`)
        if (v.sku) lines.push(`        <SKU>${escapeXml(v.sku)}</SKU>`)
        if (v.price) lines.push(`        <Price>${escapeXml(v.price)}</Price>`)
        if (v.compare_at_price) lines.push(`        <ComparePrice>${escapeXml(v.compare_at_price)}</ComparePrice>`)
        if (v.barcode) lines.push(`        <Barcode>${escapeXml(v.barcode)}</Barcode>`)
        if (typeof v.inventory_quantity === 'number')
          lines.push(`        <Stock>${v.inventory_quantity}</Stock>`)
        lines.push(`      </Variant>`)
      })
      lines.push(`    </Variants>`)
    }

    lines.push(`  </${itemTag}>`)
  }

  lines.push(`</${rootTag}>`)
  return lines.join('\n')
}

/**
 * Bir export config'i için XML üretir, DB'ye cache'ler ve döner.
 */
export async function generateExport(exportId: number): Promise<{
  xml: string
  productCount: number
}> {
  const ex = await prisma.export.findUnique({ where: { id: exportId } })
  if (!ex) throw new Error('Export bulunamadı')

  const mapping = (ex.mappingData as ExportMapping) || DEFAULT_MAPPING
  const filters = ((ex.filtersData as unknown as ExportFilter[]) || [])

  const allProducts = await getAllShopifyProducts(ex.shop || DEFAULT_SHOP)
  const filtered = applyFilters(allProducts, filters)

  const xml = buildXml(filtered, {
    rootTag: ex.rootTag,
    itemTag: ex.itemTag,
    encoding: ex.encoding,
    mapping,
    includeImages: ex.includeImages,
    includeVariants: ex.includeVariants,
  })

  await prisma.export.update({
    where: { id: exportId },
    data: {
      cachedXml: xml,
      productCount: filtered.length,
      lastGeneratedAt: new Date(),
    },
  })

  return { xml, productCount: filtered.length }
}

/**
 * Cache geçerli mi kontrol et, değilse yeniden üret.
 */
export async function getExportXml(exportId: number, forceRefresh = false): Promise<string> {
  const ex = await prisma.export.findUnique({ where: { id: exportId } })
  if (!ex) throw new Error('Export bulunamadı')

  if (!forceRefresh && ex.cachedXml && ex.lastGeneratedAt) {
    const ageMin = (Date.now() - ex.lastGeneratedAt.getTime()) / 60000
    if (ageMin < ex.autoRefreshMin) return ex.cachedXml
  }

  const { xml } = await generateExport(exportId)
  return xml
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[ğüşıöç]/g, c => ({ ğ: 'g', ü: 'u', ş: 's', ı: 'i', ö: 'o', ç: 'c' }[c]!))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || `export-${Date.now()}`
}
