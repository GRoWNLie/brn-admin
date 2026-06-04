/**
 * Anthropic Claude API entegrasyonu — AI Asistan
 *
 * .env'ye eklenmesi gereken:
 *   ANTHROPIC_API_KEY=sk-ant-xxxxx
 *
 * Tool use ile Shopify verisine erişebilir:
 *  - get_sales_summary
 *  - get_top_products
 *  - get_customer_segments
 *  - get_low_stock_products
 */

import { getDashboardSummary, getOrders, getCustomers, getProducts } from './shopify-data'
import { getSalesReport } from './shopify-commerce'
import { getSetting } from './app-settings'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolName?: string
  toolInput?: any
  toolResult?: any
}

// =========================================================
//                     TOOLS (Function calling)
// =========================================================

const TOOLS = [
  {
    name: 'get_sales_summary',
    description: 'Belirli bir tarih aralığındaki satış özeti, toplam gelir, sipariş sayısı, en çok satanlar. rangeDays: 1, 7, 30 veya 90 olabilir.',
    input_schema: {
      type: 'object',
      properties: {
        rangeDays: { type: 'number', description: 'Kaç gün geriye bak (1, 7, 30, 90)' },
      },
      required: ['rangeDays'],
    },
  },
  {
    name: 'get_sales_report',
    description: 'Günlük detaylı satış raporu — her gün için sipariş sayısı ve net satış.',
    input_schema: {
      type: 'object',
      properties: {
        rangeDays: { type: 'number', description: 'Kaç gün geriye bak' },
      },
      required: ['rangeDays'],
    },
  },
  {
    name: 'get_recent_orders',
    description: 'Son N siparişi listele',
    input_schema: {
      type: 'object',
      properties: {
        first: { type: 'number', description: 'Kaç sipariş (varsayılan 10, max 25)' },
      },
    },
  },
  {
    name: 'get_top_customers',
    description: 'En çok harcayan müşterileri listele',
    input_schema: {
      type: 'object',
      properties: {
        first: { type: 'number', description: 'Kaç müşteri (varsayılan 10, max 50)' },
      },
    },
  },
  {
    name: 'get_low_stock_products',
    description: 'Stoğu kritik seviyede olan ürünleri bul',
    input_schema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Stok limiti (varsayılan 5)' },
      },
    },
  },
]

async function runTool(name: string, input: any): Promise<any> {
  try {
    switch (name) {
      case 'get_sales_summary': {
        const data = await getDashboardSummary(input.rangeDays ?? 7)
        return {
          totalSales: data.totalSales.toFixed(2),
          orderCount: data.orderCount,
          averageOrderValue: data.averageOrderValue.toFixed(2),
          sessions: data.sessions,
          conversionRate: data.conversionRate !== null ? data.conversionRate.toFixed(2) : null,
          topProducts: data.topProducts,
          currency: data.currency,
        }
      }

      case 'get_sales_report': {
        const data = await getSalesReport(input.rangeDays ?? 30)
        return {
          totalOrders: data.totalOrders,
          totalSales: data.totalSales,
          averageOrderValue: data.averageOrderValue,
          rows: data.rows,
        }
      }

      case 'get_recent_orders': {
        const first = Math.min(input.first ?? 10, 25)
        const data = await getOrders({ first })
        return data.orders.map(o => ({
          name: o.name,
          date: o.createdAt,
          customer: o.customerName,
          total: o.total,
          financialStatus: o.financialStatus,
          fulfillmentStatus: o.fulfillmentStatus,
        }))
      }

      case 'get_top_customers': {
        const first = Math.min(input.first ?? 10, 50)
        const data = await getCustomers({ first: 100 })
        return data.customers
          .sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
          .slice(0, first)
          .map(c => ({
            name: c.displayName,
            email: c.email,
            orders: c.ordersCount,
            totalSpent: c.totalSpent,
          }))
      }

      case 'get_low_stock_products': {
        const threshold = input.threshold ?? 5
        const data = await getProducts({ first: 100 })
        return data.products
          .filter(p => p.totalInventory <= threshold && p.totalInventory >= 0)
          .map(p => ({
            title: p.title,
            sku: p.sku,
            stock: p.totalInventory,
            price: p.price,
          }))
      }

      default:
        return { error: `Bilinmeyen tool: ${name}` }
    }
  } catch (e: any) {
    return { error: e?.message ?? 'Tool çalıştırma hatası' }
  }
}

// =========================================================
//                     CLAUDE CALL
// =========================================================

const SYSTEM_PROMPT = `Sen BRN Admin'in AI Asistan'ısın. Bir Türk e-ticaret mağazasını yöneten kullanıcılara yardım edersin.

Yetenekler:
- Satış raporları analizi
- Müşteri segmentasyonu
- Stok yönetimi önerileri
- Operasyonel kararlar
- Trendoloji ve içgörü

Davranış:
- Türkçe konuş, kısa ve net cevap ver
- Sayıları her zaman ₺ ile formatla
- Veriye ihtiyaç duyduğunda tool çağır (sadece gerekli olanı)
- Önerilerini madde madde sun (✓ veya - kullan)
- Emoji kullan (👀 📊 💰 ⚠️ ✅)
- Spekülasyon yapma — sadece tool'lardan gelen veriye dayan
- Veri yoksa "Bilgi yok" de`

export async function chatWithAi(
  messages: ChatMessage[]
): Promise<{
  success: boolean
  response?: string
  toolCalls?: Array<{ name: string; input: any; result: any }>
  error?: string
  mocked?: boolean
}> {
  const ANTHROPIC_API_KEY = await getSetting('ANTHROPIC_API_KEY')
  const MODEL = (await getSetting('ANTHROPIC_MODEL')) || 'claude-sonnet-4-5'
  if (!ANTHROPIC_API_KEY) {
    // MOCK mod — basit hardcoded cevaplar
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content ?? ''
    return {
      success: true,
      mocked: true,
      response: `🤖 [Mock cevap — ANTHROPIC_API_KEY tanımlanmamış]

Sorduğun: "${lastUserMsg.slice(0, 100)}..."

Gerçek AI asistanı kullanmak için:
1. https://console.anthropic.com adresinden API key al
2. .env dosyasına ekle: \`ANTHROPIC_API_KEY=sk-ant-xxx\`
3. Dev server'ı yeniden başlat

Bu kurulduğunda satışlar, müşteriler, stok hakkında derin analiz yapabileceğim.`,
    }
  }

  // API çağrısı — multi-turn tool use loop
  const claudeMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  const toolCalls: Array<{ name: string; input: any; result: any }> = []
  let finalResponse = ''

  try {
    // Max 5 tool-call iterasyonu
    for (let i = 0; i < 5; i++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: claudeMessages,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        return { success: false, error: `Claude API ${res.status}: ${errText.slice(0, 200)}` }
      }

      const data = await res.json()

      // Tool use varsa çalıştır
      const toolUses = (data.content as any[]).filter(c => c.type === 'tool_use')
      const textBlocks = (data.content as any[]).filter(c => c.type === 'text')

      if (textBlocks.length > 0) {
        finalResponse = textBlocks.map(t => t.text).join('\n')
      }

      if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
        // Bitti
        break
      }

      // Tool sonuçlarını ekle
      claudeMessages.push({ role: 'assistant', content: data.content })

      const toolResults: any[] = []
      for (const tu of toolUses) {
        const result = await runTool(tu.name, tu.input)
        toolCalls.push({ name: tu.name, input: tu.input, result })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        })
      }
      claudeMessages.push({ role: 'user', content: toolResults } as any)
    }

    return { success: true, response: finalResponse, toolCalls }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}
