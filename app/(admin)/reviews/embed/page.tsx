'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const LIQUID_SNIPPET = `{% comment %}
  BRN Reviews Widget — Müşteri yorumlarını ürün sayfasında göster
  Tema: Online Store 2.0 uyumlu
  Konumlandır: Product page → "Müşteri Yorumları" bölümü olarak
{% endcomment %}

<div id="brn-reviews"
     data-product-id="{{ product.id }}"
     data-product-title="{{ product.title | escape }}"
     data-locale="tr"
     data-theme="light"
     data-show-form="1"></div>

<script src="{{API_BASE}}/widget/reviews.js" async></script>

{% comment %} SEO için JSON-LD schema (Rich Snippets) {% endcomment %}
<script type="application/ld+json"
  data-brn-schema="{{ product.id }}"
  data-product-url="{{ shop.url }}{{ product.url }}"></script>
<script>
  (function() {
    var el = document.querySelector('[data-brn-schema="{{ product.id }}"]');
    if (!el) return;
    fetch('{{API_BASE}}/api/public/reviews/schema?productId={{ product.id }}'
      + '&productName=' + encodeURIComponent({{ product.title | json }})
      + '&productUrl=' + encodeURIComponent('{{ shop.url }}{{ product.url }}'))
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d.success && d.schema) el.textContent = JSON.stringify(d.schema); });
  })();
</script>`

const SCRIPT_TAG = `<!-- BRN Reviews — herhangi bir sayfaya ekle -->
<div id="brn-reviews" data-product-id="ÜRÜN_ID_BURAYA"></div>
<script src="{{API_BASE}}/widget/reviews.js" async></script>`

const SECTION_LIQUID = `{% comment %}
  Tema editöründen "Add section" ile eklenebilir bölüm
  Dosya yolu: sections/brn-reviews.liquid
{% endcomment %}

{% if product %}
  <div class="brn-reviews-section" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto;">
    <div id="brn-reviews"
         data-product-id="{{ product.id }}"
         data-product-title="{{ product.title | escape }}"
         data-locale="{{ section.settings.locale | default: 'tr' }}"
         data-theme="{{ section.settings.theme | default: 'light' }}"
         data-show-form="{{ section.settings.show_form | default: 1 }}"></div>
    <script src="{{API_BASE}}/widget/reviews.js" async></script>
  </div>
{% endif %}

{% schema %}
{
  "name": "BRN Müşteri Yorumları",
  "tag": "section",
  "class": "brn-reviews-section",
  "settings": [
    { "type": "header", "content": "Görünüm" },
    {
      "type": "select", "id": "theme", "label": "Tema",
      "default": "light",
      "options": [
        { "value": "light", "label": "Açık" },
        { "value": "dark", "label": "Koyu" }
      ]
    },
    {
      "type": "select", "id": "locale", "label": "Dil",
      "default": "tr",
      "options": [
        { "value": "tr", "label": "Türkçe" },
        { "value": "en", "label": "English" }
      ]
    },
    {
      "type": "checkbox", "id": "show_form", "label": "Yorum yazma formu göster",
      "default": true
    }
  ],
  "presets": [
    { "name": "BRN Yorumları", "category": "Ürün" }
  ]
}
{% endschema %}`

export default function EmbedPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [tab, setTab] = useState<'guide' | 'snippet' | 'section' | 'script' | 'preview'>('guide')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [])

  const replaceBase = (code: string) => code.replace(/\{\{API_BASE\}\}/g, origin)

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button onClick={() => router.push('/reviews')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>
            ← Yorum Yönetimi
          </button>
          <h1 className="page-title">📦 Shopify Temasına Yerleştir</h1>
        </div>
      </div>

      <div className="panel-card" style={{ background: '#EFF6FF', borderLeft: '4px solid #2563EB' }}>
        <div style={{ fontSize: 13, color: '#1E40AF' }}>
          <strong>🎯 Nasıl çalışır:</strong>
          <ol style={{ marginLeft: 18, marginTop: 6, lineHeight: 1.8 }}>
            <li>Aşağıdaki kodu kopyala</li>
            <li>Shopify Admin → Online Store → Themes → "..." → <strong>Edit code</strong></li>
            <li>Sections veya Snippets'a yapıştır</li>
            <li>Tema editöründen ürün sayfasına ekle (Section yöntemi) veya `product-template.liquid`'e snippet olarak çağır</li>
            <li>Müşteri ürün sayfasını açtığında yorumlar otomatik yüklenir</li>
          </ol>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        {[
          { v: 'guide', label: '🎯 Adım Adım Kurulum' },
          { v: 'section', label: '🎨 Theme Section' },
          { v: 'snippet', label: '📄 Snippet' },
          { v: 'script', label: '⚡ Script Tag' },
          { v: 'preview', label: '👁 Canlı Önizleme' },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.v ? 700 : 500,
              color: tab === t.v ? '#2563EB' : 'var(--text-muted)',
              borderBottom: tab === t.v ? '2px solid #2563EB' : 'none',
            }}>{t.label}</button>
        ))}
      </div>

      {/* GUIDE — Görsel adım adım kurulum */}
      {tab === 'guide' && (
        <>
          <div className="panel-card">
            <div className="settings-section-title">🎯 5 Adımda Shopify Temana Yerleştir</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Tema kodunu hiç düzenlemeden, sadece Shopify Admin'inden adım adım ekleyeceğiz.
            </p>

            {[
              {
                step: 1,
                title: 'Shopify Admin\'i Aç',
                desc: 'Yeni sekmede mağazanın Shopify Admin\'ini aç.',
                action: { label: '🔗 Shopify Admin\'i Aç', href: 'https://admin.shopify.com', external: true },
                bg: '#EFF6FF', border: '#2563EB',
              },
              {
                step: 2,
                title: 'Tema Kod Düzenleyiciye Git',
                desc: 'Sol menüden Online Store → Themes → aktif temanın yanındaki "..." menüsünü aç → "Edit code" tıkla.',
                hint: '⚠️ İlk önce temanın YEDEĞİNİ al (Duplicate butonu)',
                bg: '#FFFBEB', border: '#F59E0B',
              },
              {
                step: 3,
                title: 'Yeni Section Dosyası Oluştur',
                desc: 'Sol menüde "Sections" klasörünü aç → "Add a new section" → adı "brn-reviews" yaz.',
                bg: '#F5F3FF', border: '#7C3AED',
              },
              {
                step: 4,
                title: 'Kodu Kopyala ve Yapıştır',
                desc: 'Yan sekmedeki "🎨 Theme Section" sekmesinden tüm kodu kopyala. Az önce oluşturduğun dosyanın içindeki tüm varsayılan kodu sil, yapıştır, Save.',
                action: { label: '🎨 Theme Section Sekmesine Git', onClick: () => setTab('section') },
                bg: '#ECFDF5', border: '#059669',
              },
              {
                step: 5,
                title: 'Tema Editöründe Ürün Sayfasına Ekle',
                desc: 'Themes → Customize → URL\'den bir Product sayfasına git → "Add section" → "BRN Müşteri Yorumları" → yerini ayarla → Save.',
                hint: '✨ Tebrikler! Müşterilerin artık yorum yazabilir ve onayladıkların ürün sayfasında görünür.',
                bg: '#FEF3C7', border: '#F59E0B',
              },
            ].map(s => (
              <div key={s.step} style={{
                display: 'flex', gap: 16, padding: 18, marginBottom: 10,
                background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: s.border, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, flexShrink: 0,
                }}>{s.step}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, margin: '2px 0 6px', color: '#1F2937' }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 8 }}>{s.desc}</p>
                  {s.hint && (
                    <div style={{ fontSize: 12, color: s.border, fontWeight: 600, marginBottom: 8 }}>{s.hint}</div>
                  )}
                  {s.action && (
                    s.action.href ? (
                      <a href={s.action.href} target="_blank" rel="noopener" className="btn-primary"
                        style={{ textDecoration: 'none', fontSize: 12, padding: '6px 14px', display: 'inline-block' }}>
                        {s.action.label}
                      </a>
                    ) : (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}
                        onClick={s.action.onClick}>{s.action.label}</button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="panel-card" style={{ background: '#F0FDF4', borderLeft: '4px solid #10B981' }}>
            <div className="settings-section-title">💡 Yardımcı Bilgiler</div>
            <ul style={{ marginLeft: 18, lineHeight: 2, fontSize: 13 }}>
              <li><strong>Snippet vs Section:</strong> Section daha modern (Shopify 2.0). Tema editörden drag-and-drop ile ekleyebilirsin. Snippet ise kod içinden çağrılır.</li>
              <li><strong>Localhost test:</strong> Şu an widget <code style={{background:'#fff',padding:'1px 6px',borderRadius:4}}>{origin}</code> üzerinden çağırıyor. Üretime alındığında otomatik production URL'i alır.</li>
              <li><strong>Yorum onay akışı:</strong> Müşteri form gönderir → BRN Admin'in "Onay Bekliyor" sekmesinde görürsün → ✅ Onayla → widget'ta canlı görünür</li>
              <li><strong>SEO:</strong> JSON-LD otomatik üretilir, Google ürün arama sonuçlarında yıldız + yorum sayısı çıkar (1-2 hafta sonra)</li>
              <li><strong>Tasarım:</strong> Tema editörden açık/koyu tema + Türkçe/İngilizce dil seçeneği var</li>
            </ul>
          </div>

          <div className="panel-card" style={{ background: '#FEF2F2', borderLeft: '4px solid #DC2626' }}>
            <div className="settings-section-title">🆘 Sorun Yaşıyorsan</div>
            <ul style={{ marginLeft: 18, lineHeight: 2, fontSize: 13, color: '#991B1B' }}>
              <li><strong>"Sections / Add a new section" görmüyorum:</strong> Temanız Shopify 2.0 değil. Snippet yöntemini kullanın (yan sekme).</li>
              <li><strong>Yorumlar görünmüyor:</strong> Henüz onaylı yorum yok. BRN Admin → Yorum Yönetimi → "🧪 4 Demo Yorum Ekle" → hepsini onayla → sonra ürün sayfasını yenile.</li>
              <li><strong>CORS hatası:</strong> Console (F12)'de "blocked by CORS" görüyorsan, <code style={{background:'#fff',padding:'1px 6px',borderRadius:4}}>WIDGET_ALLOWED_ORIGINS</code> env değerini mağaza domain'inle ayarla veya <code style={{background:'#fff',padding:'1px 6px',borderRadius:4}}>*</code> bırak (geliştirme için).</li>
              <li><strong>Widget hiç yüklenmiyor:</strong> Tarayıcı console'unu aç → "Failed to load" yazıyorsa script URL'i hatalı. data-api-base'i manuel ayarlayabilirsin.</li>
            </ul>
          </div>
        </>
      )}

      {/* SECTION */}
      {tab === 'section' && (
        <>
          <div className="panel-card">
            <div className="settings-section-title">🎨 Theme Section (Tema editörden sürükle-bırak)</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Bu yöntemle yorum bölümü <strong>tema editörünün "Bölüm Ekle"</strong> menüsünde görünür.
              Drag-and-drop ile ürün sayfasına ekleyebilirsin.
            </p>
            <strong style={{ fontSize: 13 }}>📂 Dosya yolu:</strong>
            <code style={{ display: 'inline-block', background: 'var(--hover-bg)', padding: '2px 10px', borderRadius: 4, marginLeft: 8, fontSize: 12 }}>
              sections/brn-reviews.liquid
            </code>

            <div style={{ position: 'relative', marginTop: 14 }}>
              <button className="btn-primary"
                style={{ position: 'absolute', top: 8, right: 8, padding: '6px 14px', fontSize: 12, zIndex: 1 }}
                onClick={() => copy('section', replaceBase(SECTION_LIQUID))}>
                {copied === 'section' ? '✅ Kopyalandı!' : '📋 Kopyala'}
              </button>
              <pre style={{
                background: '#0F172A', color: '#A7F3D0', padding: 16, borderRadius: 10,
                fontSize: 11, overflowX: 'auto', maxHeight: 500, fontFamily: 'monospace',
                lineHeight: 1.5, margin: 0,
              }}>{replaceBase(SECTION_LIQUID)}</pre>
            </div>
          </div>
        </>
      )}

      {/* SNIPPET */}
      {tab === 'snippet' && (
        <div className="panel-card">
          <div className="settings-section-title">📄 Snippet (Mevcut product.liquid'e ekle)</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Mevcut <code style={{ background: 'var(--hover-bg)', padding: '1px 6px', borderRadius: 4 }}>templates/product.liquid</code>
            veya <code style={{ background: 'var(--hover-bg)', padding: '1px 6px', borderRadius: 4 }}>sections/main-product.liquid</code>
            dosyasının içine yapıştır.
          </p>
          <div style={{ position: 'relative' }}>
            <button className="btn-primary"
              style={{ position: 'absolute', top: 8, right: 8, padding: '6px 14px', fontSize: 12, zIndex: 1 }}
              onClick={() => copy('snippet', replaceBase(LIQUID_SNIPPET))}>
              {copied === 'snippet' ? '✅ Kopyalandı!' : '📋 Kopyala'}
            </button>
            <pre style={{
              background: '#0F172A', color: '#A7F3D0', padding: 16, borderRadius: 10,
              fontSize: 11, overflowX: 'auto', maxHeight: 500, fontFamily: 'monospace',
              lineHeight: 1.5, margin: 0,
            }}>{replaceBase(LIQUID_SNIPPET)}</pre>
          </div>
        </div>
      )}

      {/* SCRIPT */}
      {tab === 'script' && (
        <div className="panel-card">
          <div className="settings-section-title">⚡ Hızlı Script Tag</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Herhangi bir sayfaya, Shopify dışı bir siteye, blog yazısına vs. yapıştırabilirsin.
            <strong> data-product-id</strong> kısmını gerçek ürün ID'si ile değiştir.
          </p>
          <div style={{ position: 'relative' }}>
            <button className="btn-primary"
              style={{ position: 'absolute', top: 8, right: 8, padding: '6px 14px', fontSize: 12, zIndex: 1 }}
              onClick={() => copy('script', replaceBase(SCRIPT_TAG))}>
              {copied === 'script' ? '✅ Kopyalandı!' : '📋 Kopyala'}
            </button>
            <pre style={{
              background: '#0F172A', color: '#A7F3D0', padding: 16, borderRadius: 10,
              fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, margin: 0,
            }}>{replaceBase(SCRIPT_TAG)}</pre>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {tab === 'preview' && (
        <div className="panel-card">
          <div className="settings-section-title">👁 Canlı Önizleme</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Widget aşağıda demo ürün ID'si <strong>(8676958535734)</strong> ile yükleniyor:
          </p>
          <div style={{
            border: '2px dashed var(--border-color)', borderRadius: 10, padding: 20,
            background: '#fff',
          }}>
            <div id="brn-reviews-preview-host"
              dangerouslySetInnerHTML={{
                __html: `<div id="brn-reviews" data-product-id="8676958535734" data-product-title="Destroyer Jacket"></div>`,
              }} />
            <ScriptOnce src={`${origin}/widget/reviews.js`} />
          </div>
        </div>
      )}

      <div className="panel-card">
        <div className="settings-section-title">📡 API Endpoint'leri</div>
        <table className="data-table">
          <thead>
            <tr><th>Endpoint</th><th>Açıklama</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code style={{ fontSize: 11 }}>GET {origin}/api/public/reviews?productId=X</code></td>
              <td>Onaylanan yorumları listeler (+ özet)</td>
            </tr>
            <tr>
              <td><code style={{ fontSize: 11 }}>POST {origin}/api/public/reviews</code></td>
              <td>Yeni yorum gönderir (PENDING → admin onayı)</td>
            </tr>
            <tr>
              <td><code style={{ fontSize: 11 }}>GET {origin}/api/public/reviews/schema?productId=X</code></td>
              <td>JSON-LD Rich Snippets şeması</td>
            </tr>
            <tr>
              <td><code style={{ fontSize: 11 }}>{origin}/widget/reviews.js</code></td>
              <td>Vanilla JS widget (~9 KB minify edilince)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel-card" style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B' }}>
        <div style={{ fontSize: 13, color: '#92400E' }}>
          <strong>⚠️ Önemli:</strong> Şu an <code>localhost:3000</code> kullanılıyor. Üretime alındığında
          (<a href="https://vercel.com" target="_blank" rel="noopener" style={{ color: '#92400E' }}>Vercel</a> ile deploy),
          <code>{'{{API_BASE}}'}</code> kısmı otomatik olarak gerçek domain'inle değişecek.
          <br /><br />
          <strong>Güvenlik:</strong> Production'da <code>WIDGET_ALLOWED_ORIGINS</code> env değişkenini
          mağaza domain'lerinle sınırla. Örn:
          <code style={{ display: 'block', marginTop: 6, background: '#FEF3C7', padding: 8, borderRadius: 4 }}>
            WIDGET_ALLOWED_ORIGINS=sekerco.com,sekerco.myshopify.com
          </code>
        </div>
      </div>
    </div>
  )
}

/**
 * Widget script'ini tek seferlik yükle (preview için).
 */
function ScriptOnce({ src }: { src: string }) {
  useEffect(() => {
    if (!src) return
    if (document.querySelector(`script[src="${src}"]`)) return
    const s = document.createElement('script')
    s.src = src
    s.async = true
    document.body.appendChild(s)
  }, [src])
  return null
}
