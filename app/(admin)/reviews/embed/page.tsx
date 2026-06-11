'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SECTION_LIQUID = (apiBase: string) => `{% comment %}
  BRN Müşteri Yorumları — Ürün sayfası section
  Dosya: sections/brn-reviews.liquid
  Ekle: Shopify Admin → Themes → Edit code → Sections → "Add a new section" → brn-reviews
{% endcomment %}

{% if product %}
<div class="brn-reviews-section page-width" style="padding: 48px 20px;">
  <div id="brn-reviews"
       data-product-id="{{ product.id }}"
       data-product-title="{{ product.title | escape }}"
       data-locale="{{ section.settings.locale | default: 'tr' }}"
       data-theme="{{ section.settings.theme | default: 'light' }}"
       data-show-form="{{ section.settings.show_form | default: 1 }}"></div>
  <script src="${apiBase}/widget/reviews.js" async></script>

  {% comment %} SEO: Google Yıldız Rich Snippets {% endcomment %}
  <script type="application/ld+json" id="brn-schema-{{ product.id }}"></script>
  <script>
    (function(){
      fetch('${apiBase}/api/public/reviews/schema?productId={{ product.id }}'
        + '&productName=' + encodeURIComponent({{ product.title | json }})
        + '&productUrl=' + encodeURIComponent('{{ shop.url }}{{ product.url }}'))
        .then(function(r){ return r.json() })
        .then(function(d){ if(d.success && d.schema){ document.getElementById('brn-schema-{{ product.id }}').textContent = JSON.stringify(d.schema) } })
    })()
  </script>
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
      "type": "select", "id": "theme", "label": "Tema", "default": "light",
      "options": [
        { "value": "light", "label": "Açık" },
        { "value": "dark", "label": "Koyu" }
      ]
    },
    {
      "type": "select", "id": "locale", "label": "Dil", "default": "tr",
      "options": [
        { "value": "tr", "label": "Türkçe" },
        { "value": "en", "label": "English" }
      ]
    },
    {
      "type": "checkbox", "id": "show_form", "label": "Yorum yazma formu göster", "default": true
    }
  ],
  "presets": [{ "name": "BRN Yorumları", "category": "Ürün" }]
}
{% endschema %}`

const FEATURED_SECTION_LIQUID = (apiBase: string) => `{% comment %}
  BRN Öne Çıkan Yorumlar — Anasayfa section
  Dosya: sections/brn-featured-reviews.liquid
  Ekle: Shopify Admin → Themes → Edit code → Sections → "Add a new section" → brn-featured-reviews
  Sonra: Customize → Anasayfa → "Add section" → "BRN Öne Çıkan Yorumlar"
{% endcomment %}

<div class="brn-featured-section page-width" style="padding: {{ section.settings.padding_top }}px 20px {{ section.settings.padding_bottom }}px;">
  {% if section.settings.title != blank %}
    <h2 style="text-align:{{ section.settings.title_align }}; font-size:{{ section.settings.title_size }}px; margin-bottom:8px; font-weight:800;">
      {{ section.settings.title }}
    </h2>
  {% endif %}
  {% if section.settings.subtitle != blank %}
    <p style="text-align:{{ section.settings.title_align }}; color:#6b7280; margin-bottom:32px; font-size:15px;">
      {{ section.settings.subtitle }}
    </p>
  {% endif %}

  <div id="brn-featured-reviews"
       data-api-base="${apiBase}"
       data-limit="{{ section.settings.limit }}"
       data-columns="{{ section.settings.columns }}"
       data-theme="{{ section.settings.theme }}"
       data-show-product="{{ section.settings.show_product }}"></div>
</div>

<style>
  .brn-feat-grid { display: grid; gap: 20px; }
  .brn-feat-grid[data-cols="2"] { grid-template-columns: repeat(2, 1fr); }
  .brn-feat-grid[data-cols="3"] { grid-template-columns: repeat(3, 1fr); }
  .brn-feat-grid[data-cols="4"] { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 768px) { .brn-feat-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 1024px) { .brn-feat-grid[data-cols="4"] { grid-template-columns: repeat(2, 1fr); } }
  .brn-feat-card {
    padding: 24px; border-radius: 14px; border: 1px solid #e5e7eb;
    background: #fff; display: flex; flex-direction: column; gap: 10px;
  }
  .brn-feat-card[data-dark="true"] { background: #1f2937; border-color: #374151; color: #e5e7eb; }
  .brn-feat-stars { color: #f59e0b; font-size: 18px; letter-spacing: 2px; }
  .brn-feat-quote { font-size: 15px; line-height: 1.7; flex: 1; }
  .brn-feat-author { font-weight: 700; font-size: 13px; }
  .brn-feat-product { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .brn-feat-vote { font-size: 11px; color: #9ca3af; display: flex; gap: 10px; margin-top: 4px; }
  .brn-feat-empty { text-align: center; padding: 48px; color: #9ca3af; }
</style>

<script>
(function(){
  var host = document.getElementById('brn-featured-reviews')
  if (!host) return
  var apiBase = host.getAttribute('data-api-base')
  var limit   = host.getAttribute('data-limit') || '6'
  var cols    = host.getAttribute('data-columns') || '3'
  var dark    = host.getAttribute('data-theme') === 'dark'
  var showProd= host.getAttribute('data-show-product') === 'true'

  function stars(n) {
    var s = ''
    for (var i = 0; i < 5; i++) s += i < Math.round(n) ? '★' : '☆'
    return s
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n) + '…' : s
  }

  fetch(apiBase + '/api/public/reviews/featured?limit=' + limit)
    .then(function(r){ return r.json() })
    .then(function(d){
      if (!d.success || !d.reviews || !d.reviews.length) {
        host.innerHTML = '<div class="brn-feat-empty">Henüz öne çıkan yorum yok.</div>'
        return
      }
      var html = '<div class="brn-feat-grid" data-cols="' + cols + '">'
      for (var i = 0; i < d.reviews.length; i++) {
        var r = d.reviews[i]
        html += '<div class="brn-feat-card" data-dark="' + dark + '">'
        html += '<div class="brn-feat-stars">' + stars(r.rating) + '</div>'
        if (r.title) html += '<strong style="font-size:14px;">' + esc(r.title) + '</strong>'
        html += '<div class="brn-feat-quote">&ldquo;' + esc(truncate(r.content, 200)) + '&rdquo;</div>'
        html += '<div>'
        html += '<div class="brn-feat-author">— ' + esc(r.customerName) + '</div>'
        if (showProd && r.productTitle) html += '<div class="brn-feat-product">📦 ' + esc(r.productTitle) + '</div>'
        html += '<div class="brn-feat-vote">👍 ' + (r.helpfulCount||0) + ' &nbsp; 👎 ' + (r.dislikeCount||0) + '</div>'
        html += '</div>'
        html += '</div>'
      }
      html += '</div>'
      host.innerHTML = html
    })
    .catch(function(){ host.innerHTML = '<div class="brn-feat-empty">Yorumlar yüklenemedi.</div>' })
})()
</script>

{% schema %}
{
  "name": "BRN Öne Çıkan Yorumlar",
  "tag": "section",
  "class": "brn-featured-reviews-section",
  "settings": [
    { "type": "header", "content": "Başlık" },
    { "type": "text", "id": "title", "label": "Başlık", "default": "Müşterilerimiz Ne Diyor?" },
    { "type": "text", "id": "subtitle", "label": "Alt Başlık", "default": "Gerçek müşteri yorumları" },
    {
      "type": "select", "id": "title_align", "label": "Başlık Hizalama", "default": "center",
      "options": [
        { "value": "left", "label": "Sol" },
        { "value": "center", "label": "Orta" },
        { "value": "right", "label": "Sağ" }
      ]
    },
    { "type": "range", "id": "title_size", "label": "Başlık Boyutu", "min": 20, "max": 48, "step": 2, "default": 32, "unit": "px" },
    { "type": "header", "content": "Düzen" },
    {
      "type": "select", "id": "columns", "label": "Kolon Sayısı", "default": "3",
      "options": [
        { "value": "2", "label": "2 Kolon" },
        { "value": "3", "label": "3 Kolon" },
        { "value": "4", "label": "4 Kolon" }
      ]
    },
    { "type": "range", "id": "limit", "label": "Gösterilecek Yorum Sayısı", "min": 2, "max": 12, "step": 1, "default": 6 },
    { "type": "checkbox", "id": "show_product", "label": "Ürün adını göster", "default": false },
    {
      "type": "select", "id": "theme", "label": "Kart Teması", "default": "light",
      "options": [
        { "value": "light", "label": "Açık" },
        { "value": "dark", "label": "Koyu" }
      ]
    },
    { "type": "header", "content": "Boşluk" },
    { "type": "range", "id": "padding_top", "label": "Üst Boşluk", "min": 0, "max": 100, "step": 4, "default": 60, "unit": "px" },
    { "type": "range", "id": "padding_bottom", "label": "Alt Boşluk", "min": 0, "max": 100, "step": 4, "default": 60, "unit": "px" }
  ],
  "presets": [{ "name": "BRN Öne Çıkan Yorumlar", "category": "Sosyal Kanıt" }]
}
{% endschema %}`

const SNIPPET_LIQUID = (apiBase: string) => `{% comment %}
  BRN Reviews — Snippet yöntemi
  Mevcut sections/main-product.liquid veya templates/product.liquid içine yapıştır
{% endcomment %}
<div id="brn-reviews"
     data-product-id="{{ product.id }}"
     data-product-title="{{ product.title | escape }}"
     data-locale="tr"
     data-theme="light"
     data-show-form="1"></div>
<script src="${apiBase}/widget/reviews.js" async></script>`

const SCRIPT_TAG = (apiBase: string) => `<!-- BRN Reviews — herhangi bir sayfaya ekle -->
<div id="brn-reviews" data-product-id="ÜRÜN_ID_BURAYA"></div>
<script src="${apiBase}/widget/reviews.js" async></script>`

export default function EmbedPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [tab, setTab] = useState<'guide' | 'section' | 'featured' | 'snippet' | 'script' | 'preview'>('guide')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [])

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const codeBlock = (code: string, label: string) => (
    <div style={{ position: 'relative', marginTop: 14 }}>
      <button className="btn-primary"
        style={{ position: 'absolute', top: 8, right: 8, padding: '6px 14px', fontSize: 12, zIndex: 1 }}
        onClick={() => copy(label, code)}>
        {copied === label ? '✅ Kopyalandı!' : '📋 Kopyala'}
      </button>
      <pre style={{
        background: '#0F172A', color: '#A7F3D0', padding: 16, borderRadius: 10,
        fontSize: 11, overflowX: 'auto', maxHeight: 560, fontFamily: 'monospace',
        lineHeight: 1.5, margin: 0,
      }}>{code}</pre>
    </div>
  )

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
          <strong>🎯 İki ayrı section vardır:</strong>
          <ul style={{ marginLeft: 18, marginTop: 6, lineHeight: 2 }}>
            <li><strong>🎨 Ürün Yorumları (brn-reviews)</strong> — Ürün sayfasında, ürüne özel yorumlar + yorum yazma formu</li>
            <li><strong>🏠 Öne Çıkan Yorumlar (brn-featured-reviews)</strong> — Anasayfada, admin tarafından seçilmiş en iyi yorumlar</li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        {[
          { v: 'guide', label: '🎯 Kurulum Rehberi' },
          { v: 'section', label: '🎨 Ürün Sayfası Section' },
          { v: 'featured', label: '🏠 Anasayfa Öne Çıkanlar' },
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

      {/* GUIDE */}
      {tab === 'guide' && (
        <>
          <div className="panel-card">
            <div className="settings-section-title">🎨 Ürün Sayfası Yorumları — Kurulum</div>
            {[
              { step: 1, title: 'Tema Kod Editörünü Aç', desc: 'Shopify Admin → Online Store → Themes → aktif tema → "..." → Edit code', bg: '#EFF6FF', border: '#2563EB' },
              { step: 2, title: 'Yeni Section Oluştur', desc: 'Sections klasörü → "Add a new section" → isim: brn-reviews', bg: '#F5F3FF', border: '#7C3AED' },
              { step: 3, title: 'Kodu Yapıştır', desc: '"🎨 Ürün Sayfası Section" sekmesindeki kodu kopyala → dosyaya yapıştır → Save', bg: '#ECFDF5', border: '#059669',
                action: { label: '🎨 Section Koduna Git', onClick: () => setTab('section') } },
              { step: 4, title: 'Ürün Sayfasına Ekle', desc: 'Themes → Customize → bir ürün sayfasına git → "Add section" → "BRN Müşteri Yorumları" → konumlandır → Save', bg: '#FFFBEB', border: '#F59E0B' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, padding: 16, marginBottom: 8, background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, margin: '2px 0 4px' }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>{s.desc}</p>
                  {s.action && <button className="btn-primary" style={{ marginTop: 8, fontSize: 12, padding: '5px 12px' }} onClick={s.action.onClick}>{s.action.label}</button>}
                </div>
              </div>
            ))}
          </div>

          <div className="panel-card">
            <div className="settings-section-title">🏠 Anasayfa Öne Çıkan Yorumlar — Kurulum</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Önce BRN Admin → Yorum Yönetimi → Onaylı sekmesinde yorumların yanındaki <strong>"☆ Öne Çıkar"</strong> butonuna tıkla. Seçilen yorumlar anasayfada görünecek.
            </p>
            {[
              { step: 1, title: 'Yorumları Öne Çıkar', desc: 'BRN Admin → Yorum Yönetimi → Onaylı → Her yorumun sağında "☆ Öne Çıkar" butonuna tıkla (sarıya döner = seçildi)', bg: '#FFFBEB', border: '#F59E0B' },
              { step: 2, title: 'Yeni Section Oluştur', desc: 'Shopify → Sections → "Add a new section" → isim: brn-featured-reviews', bg: '#F5F3FF', border: '#7C3AED' },
              { step: 3, title: 'Kodu Yapıştır', desc: '"🏠 Anasayfa Öne Çıkanlar" sekmesindeki kodu yapıştır → Save', bg: '#ECFDF5', border: '#059669',
                action: { label: '🏠 Featured Koduna Git', onClick: () => setTab('featured') } },
              { step: 4, title: 'Anasayfaya Ekle', desc: 'Themes → Customize → Anasayfa → "Add section" → "BRN Öne Çıkan Yorumlar" → kolon/başlık ayarla → Save', bg: '#EFF6FF', border: '#2563EB' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, padding: 16, marginBottom: 8, background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, margin: '2px 0 4px' }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>{s.desc}</p>
                  {s.action && <button className="btn-primary" style={{ marginTop: 8, fontSize: 12, padding: '5px 12px' }} onClick={s.action.onClick}>{s.action.label}</button>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SECTION — Ürün sayfası */}
      {tab === 'section' && (
        <div className="panel-card">
          <div className="settings-section-title">🎨 Ürün Sayfası Section</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Ürüne özel yorumlar + like/dislike + yorum yazma formu. Tema editöründen "BRN Müşteri Yorumları" olarak eklenir.
          </p>
          <code style={{ fontSize: 12, background: 'var(--hover-bg)', padding: '2px 10px', borderRadius: 4 }}>
            sections/brn-reviews.liquid
          </code>
          {codeBlock(SECTION_LIQUID(origin), 'section')}
        </div>
      )}

      {/* FEATURED — Anasayfa */}
      {tab === 'featured' && (
        <div className="panel-card">
          <div className="settings-section-title">🏠 Anasayfa Öne Çıkan Yorumlar Section</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Admin panelinde "Öne Çıkar" işaretlenen APPROVED yorumları grid olarak gösterir. 2/3/4 kolon, başlık, ürün adı gösterme gibi seçenekler tema editöründen ayarlanır.
          </p>
          <code style={{ fontSize: 12, background: 'var(--hover-bg)', padding: '2px 10px', borderRadius: 4 }}>
            sections/brn-featured-reviews.liquid
          </code>
          {codeBlock(FEATURED_SECTION_LIQUID(origin), 'featured')}

          <div style={{ marginTop: 16, padding: 14, background: '#FFFBEB', borderRadius: 8, fontSize: 13, color: '#92400E' }}>
            <strong>💡 Tema editöründe ayarlayabileceklerin:</strong>
            <ul style={{ marginLeft: 18, marginTop: 6, lineHeight: 2 }}>
              <li>Başlık metni ve hizalama</li>
              <li>Kaç yorum gösterileceği (2-12 arası)</li>
              <li>Kolon sayısı (2 / 3 / 4)</li>
              <li>Ürün adını göster/gizle</li>
              <li>Açık / Koyu kart teması</li>
              <li>Üst/alt boşluk miktarı</li>
            </ul>
          </div>
        </div>
      )}

      {/* SNIPPET */}
      {tab === 'snippet' && (
        <div className="panel-card">
          <div className="settings-section-title">📄 Snippet (Mevcut product.liquid'e ekle)</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Mevcut <code style={{ background: 'var(--hover-bg)', padding: '1px 6px', borderRadius: 4 }}>sections/main-product.liquid</code> dosyasının içine yapıştır.
          </p>
          {codeBlock(SNIPPET_LIQUID(origin), 'snippet')}
        </div>
      )}

      {/* SCRIPT */}
      {tab === 'script' && (
        <div className="panel-card">
          <div className="settings-section-title">⚡ Hızlı Script Tag</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Herhangi bir sayfaya yapıştır. <strong>data-product-id</strong> kısmını gerçek ürün ID'si ile değiştir.
          </p>
          {codeBlock(SCRIPT_TAG(origin), 'script')}
        </div>
      )}

      {/* PREVIEW */}
      {tab === 'preview' && (
        <div className="panel-card">
          <div className="settings-section-title">👁 Canlı Önizleme — Ürün Widget</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Demo ürün ID'si <strong>(8676958535734)</strong> ile yükleniyor:
          </p>
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: 10, padding: 20, background: '#fff' }}>
            <div dangerouslySetInnerHTML={{
              __html: `<div id="brn-reviews" data-product-id="8676958535734" data-product-title="Destroyer Jacket"></div>`,
            }} />
            <ScriptOnce src={`${origin}/widget/reviews.js`} />
          </div>
        </div>
      )}

      {/* API reference */}
      <div className="panel-card">
        <div className="settings-section-title">📡 API Endpoint'leri</div>
        <table className="data-table">
          <thead><tr><th>Endpoint</th><th>Açıklama</th></tr></thead>
          <tbody>
            <tr><td><code style={{ fontSize: 11 }}>GET /api/public/reviews?productId=X</code></td><td>Ürüne özel onaylı yorumlar</td></tr>
            <tr><td><code style={{ fontSize: 11 }}>POST /api/public/reviews</code></td><td>Yeni yorum gönder (PENDING)</td></tr>
            <tr><td><code style={{ fontSize: 11 }}>POST /api/public/reviews/vote</code></td><td>Like / Dislike oyla</td></tr>
            <tr><td><code style={{ fontSize: 11 }}>GET /api/public/reviews/featured</code></td><td>Öne çıkan yorumlar (anasayfa)</td></tr>
            <tr><td><code style={{ fontSize: 11 }}>GET /api/public/reviews/schema?productId=X</code></td><td>JSON-LD Rich Snippets (SEO)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScriptOnce({ src }: { src: string }) {
  useEffect(() => {
    if (!src) return
    if (document.querySelector(`script[src="${src}"]`)) return
    const s = document.createElement('script')
    s.src = src; s.async = true
    document.body.appendChild(s)
  }, [src])
  return null
}
