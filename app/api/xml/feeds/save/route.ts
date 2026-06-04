import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SHOP } from '@/lib/xml-engine/shopify'

// POST /api/xml/feeds/save
// Body: { shop, title, url, productCount, rules, filters, settings }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { shop, title, url, productCount, rules, filters, settings } = body
  const targetShop = shop || DEFAULT_SHOP

  try {
    const now = new Date()
    const lastSyncStr = now.toISOString().replace('T', ' ').substring(0, 16)
    const nextSyncStr = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').substring(0, 16)

    const feed = await prisma.feed.create({
      data: {
        shop: targetShop,
        title,
        url,
        productCount: productCount || 0,
        status: 'Aktif',
        syncStatus: 'Güncel',
        lastSync: lastSyncStr,
        nextSync: nextSyncStr,
      },
    })

    if (Array.isArray(rules)) {
      for (const r of rules) {
        await prisma.rule.create({
          data: {
            feedId: feed.id,
            ruleType: r.ruleType,
            targetField: r.targetField,
            calcMethod: r.calcMethod,
            mathSteps: r.mathSteps || [],
            roundingType: r.roundingType,
            roundingDecimals: r.roundingDecimals || 2,
            fixedDecimalValue: r.fixedDecimalValue || 99,
          },
        })
      }
    }

    if (filters?.import && Array.isArray(filters.import)) {
      for (const f of filters.import) {
        await prisma.filter.create({
          data: {
            feedId: feed.id,
            filterType: 'import',
            fieldName: f.field,
            operator: f.operator,
            filterValue: f.value,
          },
        })
      }
    }
    if (filters?.update && Array.isArray(filters.update)) {
      for (const f of filters.update) {
        await prisma.filter.create({
          data: {
            feedId: feed.id,
            filterType: 'update',
            fieldName: f.field,
            operator: f.operator,
            filterValue: f.value,
          },
        })
      }
    }

    if (settings) {
      await prisma.setting.create({
        data: {
          feedId: feed.id,
          publishChannel: settings.publishChannel,
          targetCollection: settings.targetCollection,
          allowUpdate: settings.allowUpdate !== false,
          allowNew: settings.allowNew !== false,
          criticalStockEnabled: settings.criticalStockEnabled !== false,
          criticalStockThreshold: settings.criticalStockThreshold || 3,
        },
      })
    }

    return NextResponse.json({
      success: true,
      mode: 'postgres',
      feedId: feed.id,
      message: 'Entegrasyon başarıyla veritabanına kaydedildi!',
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, mode: 'error', message: e.message },
      { status: 500 }
    )
  }
}
