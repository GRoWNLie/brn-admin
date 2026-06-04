import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { prisma } from '@/lib/prisma'
import { findProductList } from './analyzer'
import { createShopifyProduct, DEFAULT_SHOP } from './shopify'

export interface TestSettings {
  importMode?: 'selected' | 'limit' | 'all'
  selectedProductIds?: string[]
  testLimit?: number
}

export interface SyncResult {
  success: boolean
  syncedCount: number
  totalCount: number
  message: string
  errorDetail?: string
}

export async function runSync(feedId: number, testSettings?: TestSettings): Promise<SyncResult> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } })
  if (!feed) {
    return { success: false, syncedCount: 0, totalCount: 0, message: 'Feed bulunamadı' }
  }
  if (!feed.url) {
    return { success: false, syncedCount: 0, totalCount: 0, message: 'Feed URL boş' }
  }

  const shop = feed.shop || DEFAULT_SHOP

  const mappingRow = await prisma.mapping.findFirst({ where: { feedId } })
  const mappingData = (mappingRow?.mappingData as Record<string, any>) || null

  const rules = await prisma.rule.findMany({ where: { feedId } })
  const settings = await prisma.setting.findFirst({ where: { feedId } })

  const normalizedFeedUrl = /^https?:\/\//i.test(feed.url) ? feed.url : `https://${feed.url}`
  console.log(`📥 Canlı Senkronizasyon Başlatılıyor Feed #${feedId} (${shop})... XML İndiriliyor: ${normalizedFeedUrl}`)

  const response = await axios.get(normalizedFeedUrl, { timeout: 120000, maxContentLength: 100 * 1024 * 1024 })
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  const parsedData = parser.parse(response.data)

  let urunlerListesi = findProductList(parsedData)
  if (!urunlerListesi || urunlerListesi.length === 0) {
    return { success: false, syncedCount: 0, totalCount: 0, message: 'XML içinde ürün bulunamadı!' }
  }

  // 🧪 TEST AKTARIMI VE ÜRÜN SEÇİMİ FİLTRESİ
  if (
    testSettings?.importMode === 'selected' &&
    testSettings.selectedProductIds &&
    testSettings.selectedProductIds.length > 0
  ) {
    console.log(`🧪 Özel Seçim Modu: Sadece seçilen ${testSettings.selectedProductIds.length} ürün aktarılacak.`)
    urunlerListesi = urunlerListesi.filter(item => {
      const pId = String(item.Product_id || item.id || item.Product_code || item.sku || '')
      return testSettings.selectedProductIds!.includes(pId)
    })
  } else if (testSettings?.importMode === 'limit' && testSettings.testLimit) {
    console.log(`🧪 Hızlı Test Modu: İlk ${testSettings.testLimit} ürün aktarılacak.`)
    urunlerListesi = urunlerListesi.slice(0, testSettings.testLimit)
  }

  console.log(`📦 Toplam ${urunlerListesi.length} ürün işleniyor. Shopify REST API'ye gönderiliyor...`)

  await prisma.product.deleteMany({ where: { feedId } })

  // 'all' modunda da güvenli olsun diye max 250 ürün ile sınırla (Shopify API rate-limit)
  const maxBatch = testSettings?.importMode === 'all' ? Math.min(urunlerListesi.length, 250) : urunlerListesi.length
  const firstBatch = urunlerListesi.slice(0, maxBatch)
  let syncedCount = 0
  let lastShopifyError: string | null = null

  for (const rawItem of firstBatch) {
    const item: any = rawItem
    const pId =
      (mappingData?.primary && item[mappingData.primary]) ||
      item.Product_id ||
      item.id ||
      Math.random().toString()

    const title =
      (mappingData?.title && item[mappingData.title]) ||
      item.Name ||
      item.title ||
      'İsimsiz Ürün'

    const desc =
      (mappingData?.desc && item[mappingData.desc]) ||
      item.Description ||
      item.description ||
      ''

    let price = mappingData?.price
      ? parseFloat(item[mappingData.price]) || 0
      : parseFloat(item.Price || item.price) || 0

    let comparePrice = mappingData?.comparePrice
      ? parseFloat(item[mappingData.comparePrice]) || 0
      : parseFloat(item.Price1 || item.old_price) || 0

    let stock = mappingData?.stock
      ? parseInt(item[mappingData.stock]) || 0
      : parseInt(item.Stock || item.stock || item.quantity) || 0

    const category =
      (mappingData?.category && item[mappingData.category]) ||
      item.Category ||
      item.category ||
      'Genel'

    const brand =
      (mappingData?.brand && item[mappingData.brand]) ||
      item.Brand ||
      item.vendor ||
      item.marka ||
      'Tedarikçi'

    // Fiyat kuralları — wizard'dan gelen mathSteps'i uygula
    rules.forEach(r => {
      const target = r.targetField
      if (target !== 'price' && target !== 'Price' && target !== 'comparePrice') return

      const steps = (r.mathSteps as Array<{ op: string; val: number }>) || []
      let val = target === 'comparePrice' ? comparePrice : price

      for (const s of steps) {
        if (s.op === 'multiply') val *= s.val
        else if (s.op === 'add') val += s.val
        else if (s.op === 'subtract') val -= s.val
        else if (s.op === 'divide' && s.val !== 0) val /= s.val
      }

      // Fallback: eski label tabanlı yöntem
      if (steps.length === 0 && r.calcMethod === 'Yüzde Ekle (% Artır)') val *= 1.20

      if (target === 'comparePrice') comparePrice = val
      else price = val
    })

    // Kritik stok eşiği
    if (settings?.criticalStockEnabled) {
      if (stock <= (settings.criticalStockThreshold || 3)) stock = 0
    }

    // Görseller
    const images: Array<{ src: string }> = []
    if (mappingData?.images && Array.isArray(mappingData.images)) {
      mappingData.images.forEach((imgTag: string) => {
        if (item[imgTag]) images.push({ src: String(item[imgTag]) })
      })
    } else if (item.Image1 || item.image) {
      images.push({ src: String(item.Image1 || item.image) })
    }
    if (images.length === 0) images.push({ src: 'https://picsum.photos/600' })

    // Shopify'a gönder
    const result = await createShopifyProduct(
      {
        title: String(title),
        body_html: String(desc),
        vendor: String(brand),
        product_type: String(category),
        tags: 'FeedFix_SaaS, XML_Import',
        status: 'active',
        variants: [{
          price: price > 0 ? price : 10.00,
          compare_at_price: comparePrice > price ? comparePrice : null,
          sku: String(pId),
          inventory_management: 'shopify',
          inventory_quantity: stock,
        }],
        images,
      },
      shop
    )

    let shopifyProdId = 'sim_' + Math.floor(Math.random() * 1000000)
    if (result.id) {
      shopifyProdId = String(result.id)
      syncedCount++
    } else if (result.error) {
      lastShopifyError = result.error
      console.error(`Shopify Ürün Basma Hatası (${title}):`, result.error)
    } else {
      syncedCount++ // simülasyon
    }

    await prisma.product.create({
      data: {
        feedId,
        productId: String(pId),
        title: String(title),
        description: String(desc),
        price,
        compareAtPrice: comparePrice,
        stock,
        category: String(category),
        brand: String(brand),
        images: images as any,
        status: 'Active',
        shopifyProductId: shopifyProdId,
      },
    })
  }

  if (syncedCount === 0 && lastShopifyError) {
    let errorMsg = 'Shopify API Hatası: Ürünler mağazanıza eklenemedi.'
    if (
      lastShopifyError.includes('403') ||
      lastShopifyError.includes('Forbidden') ||
      lastShopifyError.includes('scope')
    ) {
      errorMsg = `⚠️ Shopify Yetki Hatası (403 Forbidden): Mağazanız (${shop}) Access Token'ı kabul ediyor ancak ürün ekleme yetkisi verilmemiş.\n\nÇÖZÜM: Lütfen Shopify Admin Paneli > Ayarlar > Uygulamalar > Uygulama Geliştirme bölümünde 'write_products' ve 'read_products' izinlerini aktif ettiğinizden emin olun!`
    } else {
      errorMsg = `⚠️ Shopify API Hatası: ${lastShopifyError}\n\nLütfen .env dosyasındaki SHOP_ACCESS_TOKEN ve mağaza adresinizin doğru olduğundan emin olun.`
    }
    return {
      success: false,
      syncedCount: 0,
      totalCount: urunlerListesi.length,
      message: errorMsg,
      errorDetail: lastShopifyError,
    }
  }

  // Feed güncelle
  const now = new Date()
  const lastSyncStr = now.toISOString().replace('T', ' ').substring(0, 16)
  const nextSyncStr = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').substring(0, 16)

  await prisma.feed.update({
    where: { id: feedId },
    data: {
      syncStatus: 'Güncellendi',
      productCount: urunlerListesi.length,
      lastSync: lastSyncStr,
      nextSync: nextSyncStr,
    },
  })

  return {
    success: true,
    syncedCount,
    totalCount: urunlerListesi.length,
    message: `🚀 Canlı Senkronizasyon Başarılı! Belirtilen test moduna göre (${syncedCount} ürün) anında Shopify mağazanıza aktarıldı.`,
  }
}
