# BRN Admin — Proje Özeti

> Next.js 14 + TypeScript + Prisma/PostgreSQL ile geliştirilen, çoklu mağaza desteği olan Shopify yönetim paneli. **Tek mağaza yönetimi + çok kanal (pazaryeri) satış + storefront customer dashboard** sağlar.

## 📊 Ölçek
- **69 sayfa** (admin + storefront)
- **129 API endpoint**
- **57 Prisma model** · **24 migration**
- **55 lib dosyası**
- **0 TypeScript hatası** · production build geçer

---

## 🧱 Teknik Mimari

| Katman | Teknoloji |
|---|---|
| Framework | **Next.js 14.2** (App Router, route groups) |
| Dil | **TypeScript** strict |
| DB | **PostgreSQL** (Docker `brn_postgres`, port 5432) |
| ORM | **Prisma 5.22** |
| Auth | **NextAuth** (credentials + bcrypt, JWT) |
| Shopify | Admin GraphQL (Custom App), Customer Account API (multi-tenant) |
| E-posta | **Resend** (mock fallback) |
| AI | **Anthropic Claude** (mock fallback) |
| Real-time | **SSE** (Server-Sent Events) bildirim |
| UI | El yazımı `globals.css` (~3000 satır), dark/light, mobil uyumlu |

**Önemli:** Bu proje `app/apps/` veya monorepo değil — düz **`app/(admin)/` + `app/storefront/`** yapısı kullanır.

---

## 📁 Klasör Yapısı

```
brn-admin/
├── app/
│   ├── (admin)/                # Yönetim paneli (NextAuth korumalı)
│   │   ├── dashboard/, orders/, products/, customers/, …
│   │   ├── marketplace/        # Trendyol/HB/Amazon/Etsy
│   │   ├── customer-dashboard/ # Storefront yönetimi (multi-store)
│   │   ├── loyalty/            # Sadakat puan
│   │   └── …
│   ├── (auth)/                 # /login, /register
│   ├── storefront/[storeId]/   # Müşteri yüzü (multi-tenant, public)
│   ├── apps/customerdashboard/ # Shopify App Proxy router (public)
│   └── api/                    # 129 endpoint
├── lib/                        # 55 dosya (Shopify, marketplace, vb.)
├── components/                 # Sidebar, Topbar, BarcodeScanner, …
├── prisma/                     # schema.prisma + 24 migration
├── public/widget/              # Storefront script'leri (reviews, popup, tracker, cart-tracker)
├── middleware.ts               # NextAuth + public route'lar
└── vercel.json                 # Cron tanımları
```

---

## 🎯 Modüller (Tam Liste)

### 1. Çekirdek E-ticaret (Shopify canlı)
- **Ürünler** (CRUD, toplu işlem, export, barkod yönetimi)
- **Siparişler** (detay, fulfillment, iade, kargo etiketi, **iş akışı**: Hazırlandı/Kargoya Verildi)
- **Müşteriler** (+ segmentler, **sadakat puan paneli**, **terk + canlı sepet** görüntüleme)
- **Koleksiyonlar, İndirimler, Taslaklar, Hediye Kartları, Envanter, Terk Edilmiş Sepetler**
- **Raporlar**: Satış, Dönüşüm, Ürün Performansı, **Kampanya Kullanımı** (kupon adedi+ciro), AI Asistan

### 2. Operasyon (kendi DB)
- **Satın Alma, Tedarikçi, Transfer, Stok Sayımı** (barkod okutma + **kamera barkod** + onay akışı + Shopify'a yazma)
- **Raf/Bin Lokasyon Sistemi** (SKU bazlı, ürünler listesi + sipariş detayında görünür)
- **Fiyat Listeleri, Yorum Yönetimi, Upsell, e-Fatura** (sandbox GİB), **Kargo Takip + Adapter'lar** (MNG REST + Aras/Yurtiçi SOAP iskelet)
- **Taksit Hesaplayıcı, Ekip/RBAC, Audit Log** (her işlem loglu)

### 3. Pazaryeri (Multi-marketplace)
- **Trendyol** (gerçek adapter), **Hepsiburada / Amazon SP-API / Etsy** (gerçek adapter, OAuth dahil)
- Birleşik siparişler sayfası (kaynak filtreli), **Buybox Takip**, **Repricing/Buybox Otomasyonu** (match_buybox/beat_by/fixed + min/max sınır)
- **Otomatik stok/fiyat senkronu** (Shopify webhook → pazaryerleri)

### 4. Pazarlama
- **Email/SMS** (Resend + sağlayıcı stub), **Otomasyon** (terk sepet/hoşgeldin/winback flow'ları), **Popup** (admin CRUD + storefront widget)
- **Sadakat Puan Sistemi**: sipariş ödenince otomatik puan, → Shopify kupon, seviyeler (Bronz/Gümüş/Altın), kayıt bonusu

### 5. **Customer Dashboard** (Multi-tenant Storefront — 4 faz)
- **Faz 1**: Multi-tenant şema (Store/StoreTheme/StoreContent/StorePage) + admin yönetim (4-tab: Genel/Tema/İçerik/Sayfalar)
- **Faz 2**: Storefront layout (CSS değişkenlerine tema enjekte) + 8 sayfa iskeleti + **App Proxy doğrulama** (HMAC)
- **Faz 2.5**: Tek public router `/apps/customerdashboard/[[...path]]` (shop param → Store lookup → rewrite)
- **Faz 3**: Cookie session + Customer Account API stub (anahtar yokken mock) + tüm müşteri sayfaları canlı veriyle
- **Faz 4**: Analitik (session/kayıt/dönüşüm + günlük trend), KVKK/çerez bildirimi, store-cache (60sn), rate limit (8/dk login)
- **Register** → Shopify Admin API `customerCreate` (gerçek müşteri + e-posta/SMS marketing consent + sadakat bonusu + hoşgeldin maili)

### 6. Sistem
- **Bildirimler** (`Notification` + **SSE** real-time bell)
- **Mesajlaşma** (DM + Genel kanal + **Görev atama** + dosya, kendi DB)
- **Otomatik Senkron Altyapısı**: 5 cron job (automation/repricing/orders/sync/invoices), `CRON_SECRET` ile korumalı
- **Global Arama** (üstte canlı: ürün/sipariş/müşteri/sayfa — debounced)
- **Canlı Ziyaretçi Takibi** (kendi beacon `tracker.js`)

---

## 🗄️ Veritabanı — 57 Model (Kategoriler)

| Kategori | Modeller |
|---|---|
| **Kimlik/Yetki** | `User`, `AuditLog` |
| **XML Engine** | `Feed`, `Rule`, `Filter`, `Setting`, `Mapping`, `Export`, `Product`, `WebhookLog`, `WebhookSubscription` |
| **Tedarik/Stok** | `Supplier`, `PurchaseOrder(+Item)`, `StockTransfer(+Item)`, `StockCount(+Item)`, `PriceList(+Item)`, `BinLocation`, `OrderWorkflow` |
| **Pazarlama** | `EmailTemplate`, `EmailCampaign`, `EmailLog`, `UpsellRule`, `ProductReview`, `AutomationFlow`, `Popup(+Lead)`, `LoyaltySetting`, `LoyaltyAccount`, `LoyaltyTransaction` |
| **AI** | `AiConversation`, `AiMessage` |
| **e-Fatura** | `EInvoice`, `EfaturaProvider`, `InvoiceLog`, `InvoiceJob` |
| **Pazaryeri** | `MarketplaceIntegration`, `MarketplaceListing`, `MarketplaceOrder`, `RepricingRule` |
| **Sistem** | `Notification`, `InstallmentSetting`, `AppSetting`, `VisitorSession`, `CartSession`, `Conversation`, `ConversationParticipant`, `Message` |
| **Customer Dashboard** | `Store`, `StoreTheme`, `StoreContent`, `StorePage`, `StorefrontSession`, `CustomerActivity` |

**Enum:** `Role` (ADMIN / MANAGER / EDITOR / VIEWER)

---

## 🔐 Güvenlik

- **RBAC** 4 seviye (`lib/auth.ts` — `requirePermission()` per route)
- **Audit log** her yazma işleminde (`lib/audit.ts` — `logAuditAuto()`)
- **AES-256-GCM** şifreli credential'lar (`lib/efatura/crypto.ts` — e-fatura sağlayıcı + Customer Dashboard store config)
- **App Proxy HMAC** (`lib/app-proxy.ts` — timing-safe, prod zorunlu)
- **Rate limit** (`lib/rate-limit.ts` — login/register endpoint'lerinde IP başına)
- **Multi-tenant izolasyon**: Store config (admin token/api secret/proxy secret) AES şifreli, her sorgu `storeId` ile filtreli, cookie adı `sf_sid_{storeId}`
- **Debug endpoint'leri** production'da kapalı (`lib/debug-guard.ts`)
- **Webhook HMAC** Shopify webhook'larında zorunlu (`lib/shopify-webhooks.ts`)

---

## 🌐 Önemli `lib/` Dosyaları

| Dosya | Görev |
|---|---|
| `shopify.ts` + `shopify-auth.ts` | Tek-tenant Admin GraphQL client (global `.env`) |
| `shopify-store-client.ts` | **Multi-tenant** Admin GraphQL (Store config'ten) |
| `shopify-customer-account.ts` | Customer Account API (mock fallback) |
| `shopify-data.ts`, `shopify-orders.ts`, `shopify-commerce.ts`, … | Modül-özel sorgu kütüphaneleri |
| `app-settings.ts` | Runtime ayar deposu (DB → `.env` fallback, 10sn cache) |
| `marketplace/` | Trendyol/HB/Amazon/Etsy adapter'ları + ortak interface |
| `marketplace-sync.ts`, `repricing.ts` | Otomatik senkron + repricing motoru |
| `cargo-carriers.ts` | MNG (REST), Aras/Yurtiçi (SOAP stub) |
| `efatura/` | GİB sandbox + adapter pattern + AES crypto + DB-kuyruk |
| `loyalty.ts` | Puan kazan/harca/seviye + Shopify kupon |
| `customer-dashboard.ts` | Store CRUD + şifreli config + sayfa anahtarları |
| `app-proxy.ts` | Shopify App Proxy HMAC doğrulama |
| `storefront-session.ts` | Cookie session (multi-tenant) + recently viewed |
| `store-cache.ts` | Storefront config cache (60sn) |
| `rate-limit.ts` | Basit in-memory rate limit |
| `barcode.ts` | Code128 SVG üreteci (dependency-free) |
| `audit.ts`, `auth.ts` | RBAC + audit |
| `cron-auth.ts`, `debug-guard.ts` | Cron secret + prod debug guard |

---

## ⏰ Cron Jobs (`vercel.json`)

| Path | Sıklık | İş |
|---|---|---|
| `/api/cron/automation` | Saatlik | Etkin akışları (terk sepet vb.) çalıştır |
| `/api/cron/repricing` | 2 saatte bir | Buybox bazlı fiyat ayarlama |
| `/api/cron/orders` | 30 dk'da bir | Pazaryeri siparişi çek |
| `/api/cron/invoices` | 10 dk'da bir | e-Fatura kuyruğu işle |
| `/api/cron/sync` | (manuel/all) | Stok/fiyat pazaryerlerine it |

`CRON_SECRET` ile korumalı (`Authorization: Bearer` veya `?secret=` query).

---

## 🔑 Ortam Değişkenleri (`.env.example`)

Anahtar olanlar (panelden de girilebilir — `AppSetting` runtime ezer):
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `SHOPIFY_STORE_URL`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_API_KEY/SECRET`, `SHOPIFY_API_VERSION`, `SHOPIFY_SCOPES`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `CRON_SECRET`, `ENCRYPTION_KEY` (AES için, yoksa NEXTAUTH_SECRET'tan türetilir)
- `WIDGET_ALLOWED_ORIGINS` (CORS — production'da daralt!)
- Kargo: `CARGO_MNG_*`, `CARGO_ARAS_*`, `CARGO_YURTICI_*`

---

## 🎨 UI Konvansiyonları

- **`globals.css`** tek dosya (~3000 satır), CSS değişkenleri (light/dark)
- Sınıflar: `panel-card`, `data-table`, `btn-primary/secondary`, `status-badge`, `settings-section-title`, `form-select`, `form-label`, `dashboard-grid-2`
- **Mobil**: 768px altı sidebar drawer (hamburger), tablolar yatay scroll, modaller full-screen, **input font 16px** (iOS zoom prevent)
- Storefront ayrı CSS: `.sf-*` prefix'li (`.sf-card`, `.sf-btn`, `.sf-input` vb.), her mağazanın **tema değişkenleri** (`--sf-primary`, `--sf-bg`, vb.) layout'tan enjekte
- **Dil**: Türkçe (kullanıcı yüzeyi)

---

## 🚀 Deploy Notları

### Lokal geliştirme
```bash
docker start brn_postgres            # Postgres
npm install                          # ilk kurulum
npx prisma migrate dev               # şema güncel mi
npm run dev                          # localhost:3000
```

### Production
```bash
npm run build                        # tipkontrol + build
npm start                            # production server
# veya: Vercel deploy (vercel.json cron'ları otomatik kurar)
```

### Customer Dashboard mağazaya bağlama (Shopify App Proxy)
1. **Shopify Partners** → Public App oluştur
2. App Setup → App Proxy:
   - Subpath prefix: `apps`
   - Subpath: `customerdashboard`
   - Proxy URL: `https://senin-domain.com/apps/customerdashboard`
3. API credentials → **Shared Secret** kopyala
4. BRN Admin → Customer Dashboard → Mağaza Detay → Genel → **App Proxy Shared Secret**'a yapıştır
5. App'i mağazaya kur → `magaza.com/apps/customerdashboard/login` çalışır
6. (Opsiyonel) **Customer Account API Client ID/Secret** girilince mock'tan gerçek müşteri verisine geçer

---

## 🧩 Önemli Geliştirme Kuralları

1. **`app/apps/` KULLANMA** — proje düz `app/(admin)/` yapısında
2. **Yeni model ekleyince**: `prisma migrate dev --name <isim>` + `prisma generate`
3. **Yeni API route**: yetki kontrolü (`requirePermission`) + audit log (`logAuditAuto`) + try/catch
4. **Multi-tenant kod**: her yerde `storeId` filtresi, asla cross-tenant veri sızdırma
5. **Şifreli alanlar**: store config / e-fatura provider config → `encryptJson/decryptJson`, asla raw döndürme
6. **Storefront tarafı**: `app/storefront/` ve `app/apps/customerdashboard/` middleware'in public listesinde
7. **Migration sırasında** dev sunucusu çalışıyorsa Prisma DLL kilitlenir → `tasklist node.exe` + `taskkill` ile dur, sonra `migrate`
8. **Stil**: yeni sayfa yazarken `globals.css`'teki mevcut sınıfları kullan (panel-card, data-table, btn-primary vb.)
9. **TypeScript strict** — `tsc --noEmit` her zaman 0 hata olmalı

---

## 📦 Storefront Widget'ları (`public/widget/`)

Mağaza tema'sına ekleme:
```html
<script src="https://domain.com/widget/{name}.js" async></script>
```
- `reviews.js` — ürün yorumları widget'ı
- `popup.js` — promosyon popup'ı
- `tracker.js` — canlı ziyaretçi beacon'ı
- `cart-tracker.js` — üye müşteri sepetini panele yansıt

---

## ⚠️ Bilinen Sınırlar (Mock/Stub)

- **e-Fatura GİB live**: XAdES imzalama TODO (mali mühür gelince)
- **Customer Account API**: anahtar girilene kadar mock veri (lib içinde `TODO(prod)` işaretli)
- **Aras/Yurtiçi kargo**: SOAP entegrasyonu iskelet
- **Amazon/Etsy listProduct**: minimum gövde (kategori/öznitelik eşleme UI yok)
- **SMS sağlayıcı**: kod hazır, gerçek bağlantı yok (Netgsm/Twilio bekliyor)
- **Resend/Anthropic**: anahtar yoksa mock mod (gönderim sahte, log'a yazılır)

---

## 🆘 Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|---|---|
| `Can't reach DB server at localhost:5432` | Docker Desktop kapalı → `docker start brn_postgres` |
| `EPERM: query_engine-windows.dll.node` | Dev sunucusu çalışırken `prisma generate` denenmiş → node sürecini durdur |
| Storefront görünmüyor / 404 | Mağaza eklenmemiş veya `status:paused` → admin → ekle/aktive et |
| Shopify "Access denied for X field" | Custom App'te scope eksik → Shopify Admin → App Configuration → scope ekle → token yenile |
| `tracker.js` / widget veri göndermiyor | Panel localhost'ta → tunnel/deploy gerekir; CORS `WIDGET_ALLOWED_ORIGINS`'i kontrol et |

---

_Son güncelleme: Customer Dashboard Faz 1-4 + Register entegrasyonu tamamlandı (Haziran 2026)._
