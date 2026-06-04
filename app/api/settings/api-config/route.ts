import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getSetting, getSettingStatus, setSetting } from '@/lib/app-settings'
import { invalidateToken } from '@/lib/shopify-auth'
import { pingShopify } from '@/lib/shopify'

interface Field { key: string; label: string; secret: boolean; group: string; placeholder?: string }

const FIELDS: Field[] = [
  { key: 'SHOPIFY_STORE_URL', label: 'Mağaza URL', secret: false, group: 'Shopify', placeholder: 'magaza.myshopify.com' },
  { key: 'SHOPIFY_API_VERSION', label: 'API Versiyonu', secret: false, group: 'Shopify', placeholder: '2024-01' },
  { key: 'SHOPIFY_ADMIN_ACCESS_TOKEN', label: 'Admin API Token', secret: true, group: 'Shopify', placeholder: 'shpat_...' },
  { key: 'SHOPIFY_API_KEY', label: 'API Key (Client ID)', secret: true, group: 'Shopify' },
  { key: 'SHOPIFY_API_SECRET', label: 'API Secret', secret: true, group: 'Shopify' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key', secret: true, group: 'E-posta (Resend)', placeholder: 're_...' },
  { key: 'EMAIL_FROM', label: 'Gönderen (From)', secret: false, group: 'E-posta (Resend)', placeholder: 'BRN <hello@site.com>' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', secret: true, group: 'Yapay Zeka (Claude)', placeholder: 'sk-ant-...' },
  { key: 'ANTHROPIC_MODEL', label: 'Model', secret: false, group: 'Yapay Zeka (Claude)', placeholder: 'claude-sonnet-4-5' },
  { key: 'CRON_SECRET', label: 'Cron Secret', secret: true, group: 'Otomasyon (Cron)', placeholder: 'uzun rastgele string' },
  { key: 'CARGO_MNG_CLIENT_ID', label: 'MNG Client ID', secret: true, group: 'Kargo Taşıyıcıları' },
  { key: 'CARGO_MNG_CLIENT_SECRET', label: 'MNG Client Secret', secret: true, group: 'Kargo Taşıyıcıları' },
  { key: 'CARGO_MNG_CUSTOMER', label: 'MNG Müşteri No', secret: false, group: 'Kargo Taşıyıcıları' },
  { key: 'CARGO_ARAS_USERNAME', label: 'Aras Kullanıcı Adı', secret: false, group: 'Kargo Taşıyıcıları' },
  { key: 'CARGO_ARAS_PASSWORD', label: 'Aras Şifre', secret: true, group: 'Kargo Taşıyıcıları' },
  { key: 'CARGO_YURTICI_USERNAME', label: 'Yurtiçi Kullanıcı Adı', secret: false, group: 'Kargo Taşıyıcıları' },
  { key: 'CARGO_YURTICI_PASSWORD', label: 'Yurtiçi Şifre', secret: true, group: 'Kargo Taşıyıcıları' },
]

const KEY_SET = new Set(FIELDS.map(f => f.key))

// GET — tüm API anahtarlarının durumu (secret'lar maskeli)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })

  const fields = await Promise.all(FIELDS.map(async f => {
    const st = await getSettingStatus(f.key)
    const value = f.secret ? null : (st.isSet ? await getSetting(f.key) : '')
    return { ...f, source: st.source, isSet: st.isSet, value }
  }))
  return NextResponse.json({ success: true, fields })
}

// POST — kaydet veya test et. Body: { action: 'save', key, value } | { action: 'test', service }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ success: false, message: 'Sadece ADMIN değiştirebilir' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const action = String(b.action || 'save')

  if (action === 'save') {
    const key = String(b.key || '')
    if (!KEY_SET.has(key)) return NextResponse.json({ success: false, message: 'Geçersiz anahtar' }, { status: 400 })
    await setSetting(key, typeof b.value === 'string' ? b.value.trim() : '')
    // Shopify anahtarı değiştiyse token cache'ini de temizle
    if (key.startsWith('SHOPIFY_')) invalidateToken()
    await logAuditAuto('settings.api_config', { req, resource: `setting:${key}`, detail: { changed: key } })
    return NextResponse.json({ success: true, message: 'Kaydedildi.' })
  }

  if (action === 'test') {
    const service = String(b.service || '')
    try {
      if (service === 'shopify') {
        const r = await pingShopify()
        return NextResponse.json({ success: r.ok, message: r.ok ? `Bağlandı: ${r.shopName}` : (r.error || 'Bağlantı başarısız') })
      }
      if (service === 'email') {
        const key = await getSetting('RESEND_API_KEY')
        if (!key) return NextResponse.json({ success: false, message: 'Resend API Key tanımlı değil.' })
        const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })
        return NextResponse.json({ success: res.ok, message: res.ok ? 'Resend bağlantısı geçerli.' : `Geçersiz key (HTTP ${res.status}).` })
      }
      if (service === 'ai') {
        const key = await getSetting('ANTHROPIC_API_KEY')
        if (!key) return NextResponse.json({ success: false, message: 'Anthropic API Key tanımlı değil.' })
        const model = (await getSetting('ANTHROPIC_MODEL')) || 'claude-sonnet-4-5'
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        })
        return NextResponse.json({ success: res.ok, message: res.ok ? 'Anthropic bağlantısı geçerli.' : `Hata (HTTP ${res.status}).` })
      }
      return NextResponse.json({ success: false, message: 'Bilinmeyen servis' }, { status: 400 })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e?.message || 'Test başarısız' })
    }
  }

  return NextResponse.json({ success: false, message: 'Geçersiz action' }, { status: 400 })
}
