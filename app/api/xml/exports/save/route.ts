import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug, DEFAULT_MAPPING } from '@/lib/xml-engine/exporter'

// POST /api/xml/exports/save
// Body: { title, rootTag, itemTag, encoding, mapping, filters, includeImages, includeVariants, autoRefreshMin }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const {
    title,
    rootTag = 'products',
    itemTag = 'product',
    encoding = 'UTF-8',
    mapping = DEFAULT_MAPPING,
    filters = [],
    includeImages = true,
    includeVariants = true,
    autoRefreshMin = 60,
    shop,
  } = body

  if (!title) {
    return NextResponse.json({ success: false, message: 'Başlık zorunludur' }, { status: 400 })
  }

  try {
    let slug = generateSlug(title)
    // Slug benzersiz olsun
    let i = 1
    while (await prisma.export.findUnique({ where: { slug } })) {
      slug = `${generateSlug(title)}-${i++}`
    }

    const created = await prisma.export.create({
      data: {
        title,
        slug,
        shop: shop || 'xyc2un-pk.myshopify.com',
        rootTag,
        itemTag,
        encoding,
        mappingData: mapping,
        filtersData: filters,
        includeImages,
        includeVariants,
        autoRefreshMin,
      },
    })

    return NextResponse.json({
      success: true,
      exportId: created.id,
      slug: created.slug,
      message: 'Dışa aktarma kaydedildi!',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
