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
{% endcomment %}

<div class="brn-feat-section">
  <div class="brn-feat-wrap" style="padding: {{ section.settings.padding_top }}px 20px {{ section.settings.padding_bottom }}px;">
    <div class="brn-feat-header">
      <div>
        {% if section.settings.eyebrow != blank %}<small>{{ section.settings.eyebrow }}</small>{% endif %}
        <h2>{{ section.settings.heading }}</h2>
      </div>
      {% if section.settings.link_label != blank %}
        <a class="brn-feat-link" href="{{ section.settings.link | default: '#' }}">{{ section.settings.link_label }} →</a>
      {% endif %}
    </div>

    <div class="brn-feat-grid">
      <div class="brn-feat-summary" data-api-base="${apiBase}">
        <div class="brn-feat-score"><span class="brn-feat-score-num">{{ section.settings.summary_score }}</span><span>/5</span></div>
        <div class="brn-feat-summary-stars" id="brn-feat-summary-stars">
          {% assign full = section.settings.summary_stars | round %}
          {% for i in (1..5) %}
            {% if i <= full %}★{% else %}☆{% endif %}
          {% endfor %}
        </div>
        <div class="brn-feat-summary-count">{{ section.settings.summary_count }}</div>
        <div class="brn-feat-bars">
          {% assign pcts = section.settings.distribution | split: ',' %}
          {% for i in (1..5) %}
            {% assign star = 6 | minus: i %}
            {% assign idx = i | minus: 1 %}
            {% assign pct = pcts[idx] | default: 0 | strip %}
            <div class="brn-feat-bar-row" data-star="{{ star }}">
              <span class="brn-feat-bar-lbl">{{ star }}★</span>
              <div class="brn-feat-bar-bg"><div class="brn-feat-bar-fill" style="width:{{ pct }}%;"></div></div>
              <span class="brn-feat-bar-pct">%{{ pct }}</span>
            </div>
          {% endfor %}
        </div>
        {% if section.settings.button_label != blank %}
          <a class="brn-feat-btn" href="{{ section.settings.button_link | default: '#' }}">{{ section.settings.button_label }}</a>
        {% endif %}
      </div>

      <div id="brn-feat-reviews"
           data-api-base="${apiBase}"
           data-limit="{{ section.settings.limit }}"
           data-show-product="{{ section.settings.show_product }}"></div>
    </div>
  </div>
</div>

<style>
  .brn-feat-section { font-family: inherit; color: #111; }
  .brn-feat-wrap { max-width: 1280px; margin: 0 auto; }
  .brn-feat-header { display: flex; justify-content: space-between; align-items: flex-end;
    margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .brn-feat-header small { font-size: 11px; font-weight: 700; letter-spacing: 2px;
    color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 4px; }
  .brn-feat-header h2 { font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
  .brn-feat-link { font-size: 13px; font-weight: 700; color: #111; text-decoration: none; }
  .brn-feat-link:hover { color: #f59e0b; }

  .brn-feat-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: stretch; }
  @media (max-width: 1024px) { .brn-feat-grid { grid-template-columns: 1fr; } }

  .brn-feat-summary { background: #f5f5f5; border-radius: 16px; padding: 30px 24px;
    display: flex; flex-direction: column; align-items: center; text-align: center; }
  .brn-feat-score { font-size: 52px; font-weight: 900; line-height: 1; color: #111; }
  .brn-feat-score span { font-size: 22px; color: #9ca3af; font-weight: 700; }
  .brn-feat-summary-stars { color: #111; font-size: 20px; margin: 8px 0 4px; letter-spacing: 2px; }
  .brn-feat-summary-count { font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 14px; }
  .brn-feat-bars { width: 100%; display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .brn-feat-bar-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #4b5563; font-weight: 600; }
  .brn-feat-bar-lbl { width: 26px; }
  .brn-feat-bar-bg { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
  .brn-feat-bar-fill { height: 100%; background: #111; border-radius: 3px; }
  .brn-feat-bar-pct { width: 35px; text-align: right; font-size: 11px; color: #6b7280; }
  .brn-feat-btn { display: block; width: 100%; padding: 14px; background: #f5c518; color: #111;
    border: none; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer;
    text-align: center; text-decoration: none; letter-spacing: 0.5px; text-transform: uppercase; }
  .brn-feat-btn:hover { background: #eab308; }

  #brn-feat-reviews { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  @media (max-width: 768px) { #brn-feat-reviews { grid-template-columns: 1fr; } }

  .brn-feat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
    padding: 24px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
  .brn-feat-author { display: flex; gap: 12px; align-items: center; margin-bottom: 4px; }
  .brn-feat-avatar { width: 44px; height: 44px; border-radius: 50%; background: #111; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
  .brn-feat-name { font-weight: 800; font-size: 14px; color: #111; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .brn-feat-verified { display: inline-flex; align-items: center; gap: 3px; color: #059669;
    font-size: 11px; font-weight: 700; }
  .brn-feat-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .brn-feat-card-stars { color: #f5c518; font-size: 16px; letter-spacing: 1px; }
  .brn-feat-text { font-size: 14px; line-height: 1.6; color: #1f2937; margin: 0; }
  .brn-feat-ref { display: flex; align-items: center; gap: 10px; padding: 10px;
    background: #f9fafb; border-radius: 10px; }
  .brn-feat-ref-logo { width: 32px; height: 32px; border-radius: 8px; background: #111; color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; font-weight: 800; }
  .brn-feat-ref-text { display: flex; flex-direction: column; line-height: 1.3; }
  .brn-feat-ref-brand { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .brn-feat-ref-name { font-size: 13px; color: #111; font-weight: 700; }
  .brn-feat-empty { grid-column: 1 / -1; text-align: center; padding: 48px; color: #9ca3af;
    background: #f9fafb; border-radius: 16px; }
</style>

<script>
(function(){
  var host = document.getElementById('brn-feat-reviews')
  if (!host) return
  var apiBase = host.getAttribute('data-api-base')
  var limit   = host.getAttribute('data-limit') || '4'
  var showProd= host.getAttribute('data-show-product') === 'true'

  // CANLI ÖZET VERİSİ — toplam, ortalama, dağılım
  fetch(apiBase + '/api/public/reviews/stats')
    .then(function(r){ return r.json() })
    .then(function(s){
      if (!s.success || !s.total) return
      var summary = document.querySelector('.brn-feat-summary')
      if (!summary) return
      var scoreNum = summary.querySelector('.brn-feat-score-num')
      if (scoreNum) scoreNum.textContent = String(s.average).replace('.', ',')
      var starsEl = summary.querySelector('#brn-feat-summary-stars')
      if (starsEl) {
        var full = Math.round(s.average), out = ''
        for (var i = 1; i <= 5; i++) out += i <= full ? '★' : '☆'
        starsEl.textContent = out
      }
      var countEl = summary.querySelector('.brn-feat-summary-count')
      if (countEl) countEl.textContent = s.total.toLocaleString('tr-TR') + ' doğrulanmış değerlendirme'
      // Yıldız dağılım barları
      var rows = summary.querySelectorAll('.brn-feat-bar-row')
      rows.forEach(function(row, idx){
        var pct = s.distribution[idx] || 0
        var fill = row.querySelector('.brn-feat-bar-fill')
        var pctEl = row.querySelector('.brn-feat-bar-pct')
        if (fill) fill.style.width = pct + '%'
        if (pctEl) pctEl.textContent = '%' + pct
      })
    })
    .catch(function(){})

  function stars(n) {
    var s = ''
    for (var i = 0; i < 5; i++) s += i < Math.round(n) ? '★' : '☆'
    return s
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }
  function initials(name) {
    var parts = String(name||'').trim().split(/\\s+/).filter(Boolean)
    if (!parts.length) return '??'
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
  }
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })
    } catch (e) { return '' }
  }

  fetch(apiBase + '/api/public/reviews/featured?limit=' + limit)
    .then(function(r){ return r.json() })
    .then(function(d){
      if (!d.success || !d.reviews || !d.reviews.length) {
        host.innerHTML = '<div class="brn-feat-empty">Henüz öne çıkan yorum yok.</div>'
        return
      }
      var html = ''
      for (var i = 0; i < d.reviews.length; i++) {
        var r = d.reviews[i]
        html += '<div class="brn-feat-card">'
        html += '<div>'
        html += '<div class="brn-feat-author">'
        html += '<div class="brn-feat-avatar">' + esc(initials(r.customerName)) + '</div>'
        html += '<div>'
        html += '<div class="brn-feat-name">' + esc(r.customerName)
        html += '<span class="brn-feat-verified">✓ Doğrulanmış</span>'
        html += '</div>'
        html += '<div class="brn-feat-meta">' + esc(formatDate(r.createdAt)) + '</div>'
        html += '</div></div>'
        html += '<div class="brn-feat-card-stars">' + stars(r.rating) + '</div>'
        if (r.title) html += '<div style="font-weight:700;margin-top:8px;font-size:14px;">' + esc(r.title) + '</div>'
        html += '<p class="brn-feat-text" style="margin-top:8px;">' + esc(r.content) + '</p>'
        html += '</div>'
        if (showProd && r.productTitle) {
          html += '<div class="brn-feat-ref">'
          html += '<div class="brn-feat-ref-logo">★</div>'
          html += '<div class="brn-feat-ref-text">'
          html += '<span class="brn-feat-ref-brand">Sekerco</span>'
          html += '<span class="brn-feat-ref-name">' + esc(r.productTitle) + '</span>'
          html += '</div></div>'
        }
        html += '</div>'
      }
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
    { "type": "text", "id": "eyebrow", "label": "Üst Etiket", "default": "GERÇEK DENEYIMLER" },
    { "type": "text", "id": "heading", "label": "Başlık", "default": "Müşteri Yorumları" },
    { "type": "text", "id": "link_label", "label": "Sağdaki Link Metni", "default": "Tüm Yorumlar" },
    { "type": "url", "id": "link", "label": "Sağdaki Link Hedefi" },
    { "type": "header", "content": "Özet Kartı (Manuel)" },
    { "type": "text", "id": "summary_score", "label": "Puan", "default": "4,9" },
    { "type": "range", "id": "summary_stars", "label": "Dolu Yıldız", "min": 1, "max": 5, "step": 1, "default": 5 },
    { "type": "text", "id": "summary_count", "label": "Değerlendirme Metni", "default": "3.482 doğrulanmış değerlendirme" },
    { "type": "text", "id": "distribution", "label": "Yıldız Dağılımı (5,4,3,2,1 yüzdesi virgülle)", "default": "86,9,3,1,1" },
    { "type": "text", "id": "button_label", "label": "Buton Metni", "default": "YORUM YAZ" },
    { "type": "url", "id": "button_link", "label": "Buton Hedefi" },
    { "type": "header", "content": "Yorumlar (Otomatik)" },
    { "type": "range", "id": "limit", "label": "Gösterilecek Yorum Sayısı", "min": 2, "max": 8, "step": 1, "default": 4, "info": "Admin panelden 'Öne Çıkar' işaretlenen yorumlar burada gösterilir" },
    { "type": "checkbox", "id": "show_product", "label": "Ürün adını göster", "default": true },
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
