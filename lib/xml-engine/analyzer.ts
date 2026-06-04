import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

export interface XmlAnalysisResult {
  success: boolean
  totalProducts: number
  tags: string[]
  products: Record<string, unknown>[]
  message?: string
}

/**
 * Çalışan XML projesinden birebir taşınan recursive ürün bulucu.
 * Herhangi bir XML yapısında en kapsamlı array'i ürün listesi olarak kabul eder.
 */
export function findProductList(parsedData: unknown): Record<string, unknown>[] | null {
  let urunlerListesi: Record<string, unknown>[] | null = null

  function findProducts(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj) && obj.length > 0) {
      urunlerListesi = obj as Record<string, unknown>[]
      return
    }
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as Record<string, unknown>)[key]
        if (Array.isArray(val)) {
          urunlerListesi = val as Record<string, unknown>[]
          return
        }
        if (typeof val === 'object') findProducts(val)
      }
    }
  }

  findProducts(parsedData)

  if (!urunlerListesi) {
    const p = parsedData as Record<string, any>
    urunlerListesi =
      p?.Product ||
      p?.Urunler?.Urun ||
      p?.root?.item ||
      null
  }

  if (urunlerListesi && !Array.isArray(urunlerListesi)) {
    urunlerListesi = [urunlerListesi]
  }

  return urunlerListesi
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // Protokol yoksa otomatik https:// ekle
  return `https://${trimmed}`
}

export async function analyzeXml(xmlUrl: string): Promise<XmlAnalysisResult> {
  if (!xmlUrl) {
    return { success: false, totalProducts: 0, tags: [], products: [], message: 'Link eksik!' }
  }

  const normalizedUrl = normalizeUrl(xmlUrl)

  try {
    console.log(`⏳ XML İndiriliyor: ${normalizedUrl}`)
    const response = await axios.get(normalizedUrl, { timeout: 60000, maxContentLength: 100 * 1024 * 1024 })
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
    const parsedData = parser.parse(response.data)

    const urunlerListesi = findProductList(parsedData)

    return {
      success: true,
      totalProducts: urunlerListesi ? urunlerListesi.length : 0,
      tags: urunlerListesi && urunlerListesi.length > 0 ? Object.keys(urunlerListesi[0]) : [],
      products: urunlerListesi ? urunlerListesi.slice(0, 20) : [],
    }
  } catch (e: any) {
    let msg = 'XML okuma hatası!'
    if (e?.code === 'ENOTFOUND') msg = `Sunucuya ulaşılamıyor: ${normalizedUrl}`
    else if (e?.code === 'ETIMEDOUT' || e?.code === 'ECONNABORTED') msg = 'XML sunucusu zaman aşımına uğradı (60sn). URL\'yi kontrol edin.'
    else if (e?.response?.status) msg = `HTTP ${e.response.status} — ${normalizedUrl}`
    else if (e?.message) msg = `${e.message} — (${normalizedUrl})`
    return { success: false, totalProducts: 0, tags: [], products: [], message: msg }
  }
}
