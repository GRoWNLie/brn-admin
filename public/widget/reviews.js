/**
 * BRN Reviews Widget — Shopify temasına yerleştirilebilir vanilla JS widget
 *
 * Kullanım (Shopify product.liquid içinde):
 *   <div id="brn-reviews"
 *        data-product-id="{{ product.id }}"
 *        data-product-title="{{ product.title | escape }}"></div>
 *   <script src="https://YOUR-DOMAIN.com/widget/reviews.js" async></script>
 *
 * Opsiyonel data-* öznitelikleri:
 *   data-api-base    → API base URL (default: script src'den otomatik)
 *   data-theme       → "light" | "dark"
 *   data-locale      → "tr" | "en"
 *   data-show-form   → "1" | "0" (yorum yazma formu göster/gizle)
 *
 * Self-contained, jQuery yok, tree-shake yok, sadece <script> ekle çalışsın.
 */
(function () {
  'use strict'

  var container = document.getElementById('brn-reviews')
  if (!container) {
    console.warn('[BRN Reviews] #brn-reviews div\'i bulunamadı')
    return
  }

  // API base — script src'sinden otomatik tespit et
  function detectApiBase() {
    var override = container.getAttribute('data-api-base')
    if (override) return override.replace(/\/$/, '')
    var scripts = document.getElementsByTagName('script')
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || ''
      if (src.indexOf('/widget/reviews.js') >= 0) {
        return src.split('/widget/reviews.js')[0]
      }
    }
    return ''
  }

  var API_BASE = detectApiBase()
  var PRODUCT_ID = container.getAttribute('data-product-id') || ''
  var PRODUCT_TITLE = container.getAttribute('data-product-title') || ''
  var THEME = container.getAttribute('data-theme') || 'light'
  var LOCALE = container.getAttribute('data-locale') || 'tr'
  var SHOW_FORM = container.getAttribute('data-show-form') !== '0'

  if (!PRODUCT_ID) {
    container.innerHTML = '<div style="padding:20px;background:#fef2f2;color:#991b1b;border-radius:8px;">⚠️ BRN Reviews: data-product-id eksik</div>'
    return
  }

  // Vote storage (localStorage: hangi yorumlara oy verilmiş)
  var VOTE_KEY = 'brn_votes_' + PRODUCT_ID
  function getVotes() {
    try { return JSON.parse(localStorage.getItem(VOTE_KEY) || '{}') } catch (e) { return {} }
  }
  function saveVote(reviewId, type) {
    var v = getVotes(); v[reviewId] = type
    try { localStorage.setItem(VOTE_KEY, JSON.stringify(v)) } catch (e) {}
  }

  // ─────────────────────────────────────────────
  //                    i18n
  // ─────────────────────────────────────────────
  var T = LOCALE === 'en' ? {
    title: 'Customer Reviews',
    based_on: 'Based on {n} reviews',
    no_reviews: 'No reviews yet. Be the first!',
    write_review: 'Write a Review',
    write_first: 'Write the first review',
    name: 'Your Name',
    email: 'Email (won\'t be published)',
    rating: 'Rating',
    review_content: 'Your review',
    photos: 'Photos (optional)',
    add_photo: 'Add Photo',
    photo_hint: 'Up to 4 images, max 2MB each',
    submit: 'Submit Review',
    submitting: 'Submitting...',
    success: 'Thank you! Your review is pending approval.',
    error: 'Something went wrong',
    sort_newest: 'Newest',
    sort_highest: 'Highest Rated',
    sort_lowest: 'Lowest Rated',
    sort_helpful: 'Most Helpful',
    load_more: 'Load More',
    helpful: 'Helpful',
    not_helpful: 'Not helpful',
    vote_question: 'Was this helpful?',
  } : {
    title: 'Müşteri Yorumları',
    based_on: '{n} yorum üzerinden',
    no_reviews: 'Henüz yorum yok. İlk yorumu sen yap!',
    write_review: 'Yorum Yaz',
    write_first: 'İlk yorumu sen yaz',
    name: 'Adınız',
    email: 'Email (yayınlanmayacak)',
    rating: 'Puanınız',
    review_content: 'Yorumunuz',
    photos: 'Fotoğraflar (opsiyonel)',
    add_photo: 'Fotoğraf Ekle',
    photo_hint: 'En fazla 4 görsel, her biri max 2MB',
    submit: 'Gönder',
    submitting: 'Gönderiliyor...',
    success: 'Teşekkürler! Yorumun onay sürecindedir.',
    error: 'Bir hata oluştu',
    sort_newest: 'En Yeni',
    sort_highest: 'En Yüksek Puan',
    sort_lowest: 'En Düşük Puan',
    sort_helpful: 'En Faydalı',
    load_more: 'Daha Fazla Yükle',
    helpful: 'Faydalı',
    not_helpful: 'Faydasız',
    vote_question: 'Bu yorum faydalı mıydı?',
  }
  function t(key, vars) {
    var s = T[key] || key
    if (vars) for (var k in vars) s = s.replace('{' + k + '}', vars[k])
    return s
  }

  // ─────────────────────────────────────────────
  //                    CSS
  // ─────────────────────────────────────────────
  var dark = THEME === 'dark'
  var STYLES = `
    .brn-reviews { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif;
      color: ${dark ? '#e5e7eb' : '#1f2937'}; max-width: 800px; margin: 24px auto; }
    .brn-r-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
      padding-bottom: 12px; border-bottom: 2px solid ${dark ? '#374151' : '#e5e7eb'}; }
    .brn-r-title { font-size: 22px; font-weight: 800; margin: 0; }
    .brn-r-summary { display: flex; gap: 24px; align-items: flex-start; padding: 16px;
      background: ${dark ? '#1f2937' : '#f9fafb'}; border-radius: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .brn-r-avg { text-align: center; min-width: 100px; }
    .brn-r-avg-num { font-size: 48px; font-weight: 900; line-height: 1;
      color: ${dark ? '#fde68a' : '#f59e0b'}; }
    .brn-r-avg-stars { font-size: 18px; margin: 4px 0; }
    .brn-r-avg-count { font-size: 12px; color: ${dark ? '#9ca3af' : '#6b7280'}; }
    .brn-r-breakdown { flex: 1; min-width: 200px; }
    .brn-r-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px; }
    .brn-r-bar-label { width: 40px; }
    .brn-r-bar { flex: 1; height: 8px; background: ${dark ? '#374151' : '#e5e7eb'};
      border-radius: 4px; overflow: hidden; }
    .brn-r-bar-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); }
    .brn-r-bar-count { width: 30px; text-align: right; color: ${dark ? '#9ca3af' : '#6b7280'}; }
    .brn-r-actions { display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
    .brn-r-sort { padding: 6px 10px; border-radius: 6px; border: 1px solid ${dark ? '#374151' : '#d1d5db'};
      background: ${dark ? '#1f2937' : '#fff'}; color: inherit; font-size: 13px; }
    .brn-r-write-btn { background: ${dark ? '#fde68a' : '#0F172A'}; color: ${dark ? '#1f2937' : '#fff'};
      border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
    .brn-r-write-btn:hover { opacity: 0.9; }
    .brn-r-list { display: flex; flex-direction: column; gap: 14px; }
    .brn-r-item { padding: 16px; background: ${dark ? '#1f2937' : '#fff'};
      border: 1px solid ${dark ? '#374151' : '#e5e7eb'}; border-radius: 10px; }
    .brn-r-item-header { display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 8px; gap: 10px; flex-wrap: wrap; }
    .brn-r-stars { color: #f59e0b; font-size: 16px; letter-spacing: 1px; }
    .brn-r-item-author { font-weight: 700; font-size: 14px; }
    .brn-r-item-date { font-size: 11px; color: ${dark ? '#9ca3af' : '#6b7280'}; }
    .brn-r-item-title { font-weight: 700; margin: 6px 0 4px; font-size: 14px; }
    .brn-r-item-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .brn-r-item-photos { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .brn-r-item-photos img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px;
      border: 1px solid ${dark ? '#374151' : '#e5e7eb'}; cursor: pointer; transition: transform .15s; }
    .brn-r-item-photos img:hover { transform: scale(1.05); }
    .brn-r-vote { display: flex; align-items: center; gap: 8px; margin-top: 12px;
      padding-top: 10px; border-top: 1px solid ${dark ? '#374151' : '#f3f4f6'}; font-size: 12px;
      color: ${dark ? '#9ca3af' : '#6b7280'}; flex-wrap: wrap; }
    .brn-r-vote-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
      border-radius: 20px; border: 1px solid ${dark ? '#374151' : '#e5e7eb'};
      background: ${dark ? '#111827' : '#f9fafb'}; color: inherit; font-size: 12px;
      cursor: pointer; transition: all .15s; font-family: inherit; }
    .brn-r-vote-btn:hover:not(:disabled) { border-color: #f59e0b; color: #f59e0b; }
    .brn-r-vote-btn.voted-like { background: #d1fae5; border-color: #059669; color: #065f46; }
    .brn-r-vote-btn.voted-dislike { background: #fee2e2; border-color: #dc2626; color: #991b1b; }
    .brn-r-vote-btn:disabled { cursor: default; }
    .brn-r-empty { text-align: center; padding: 40px 20px; color: ${dark ? '#9ca3af' : '#6b7280'}; }
    .brn-r-empty-icon { font-size: 48px; margin-bottom: 12px; }
    .brn-r-empty-text { font-size: 15px; font-weight: 600; color: ${dark ? '#e5e7eb' : '#374151'}; }
    .brn-r-upload-btn { background: ${dark ? '#111827' : '#fff'}; color: inherit;
      border: 1px dashed ${dark ? '#4b5563' : '#d1d5db'}; padding: 10px 16px; border-radius: 8px;
      font-weight: 600; cursor: pointer; font-size: 13px; }
    .brn-r-upload-btn:hover { border-color: #f59e0b; color: #f59e0b; }
    .brn-r-upload-hint { font-size: 11px; color: ${dark ? '#6b7280' : '#9ca3af'}; margin-top: 6px; }
    .brn-r-thumbs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .brn-r-thumb { position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: hidden;
      border: 1px solid ${dark ? '#374151' : '#e5e7eb'}; }
    .brn-r-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .brn-r-thumb-del { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
      border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer;
      font-size: 12px; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0; }
    .brn-r-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100000;
      display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; }
    .brn-r-lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
    .brn-r-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 99999;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      opacity: 0; pointer-events: none; transition: opacity .2s; }
    .brn-r-overlay.open { opacity: 1; pointer-events: auto; }
    .brn-r-modal { background: ${dark ? '#1f2937' : '#fff'}; color: ${dark ? '#e5e7eb' : '#1f2937'};
      border-radius: 14px; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4); padding: 24px; position: relative;
      transform: translateY(12px) scale(0.98); transition: transform .2s; }
    .brn-r-overlay.open .brn-r-modal { transform: translateY(0) scale(1); }
    .brn-r-modal-close { position: absolute; top: 12px; right: 14px; background: none; border: none;
      font-size: 26px; line-height: 1; cursor: pointer; color: ${dark ? '#9ca3af' : '#9ca3af'}; padding: 0; }
    .brn-r-modal-close:hover { color: ${dark ? '#e5e7eb' : '#1f2937'}; }
    .brn-r-form h3 { margin: 0 0 16px; font-size: 18px; padding-right: 24px; }
    .brn-r-field { margin-bottom: 12px; }
    .brn-r-field label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;
      color: ${dark ? '#9ca3af' : '#374151'}; }
    .brn-r-field input, .brn-r-field textarea { width: 100%; padding: 8px 12px; border-radius: 6px;
      border: 1px solid ${dark ? '#374151' : '#d1d5db'}; font-size: 14px;
      background: ${dark ? '#111827' : '#fff'}; color: inherit; font-family: inherit; box-sizing: border-box; }
    .brn-r-field textarea { min-height: 100px; resize: vertical; }
    .brn-r-star-pick { display: flex; gap: 4px; }
    .brn-r-star-pick button { background: none; border: none; cursor: pointer; font-size: 28px;
      color: ${dark ? '#4b5563' : '#d1d5db'}; padding: 0; line-height: 1; transition: color .15s; }
    .brn-r-star-pick button.active, .brn-r-star-pick button:hover,
    .brn-r-star-pick button:hover ~ button.active { color: #f59e0b !important; }
    .brn-r-star-pick:hover button { color: #f59e0b; }
    .brn-r-star-pick:hover button:hover ~ button { color: ${dark ? '#4b5563' : '#d1d5db'}; }
    .brn-r-submit { background: #f59e0b; color: #1f2937; border: none; padding: 12px 24px;
      border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
    .brn-r-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .brn-r-msg { padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 10px; }
    .brn-r-msg.success { background: #d1fae5; color: #065f46; }
    .brn-r-msg.error { background: #fee2e2; color: #991b1b; }
    .brn-r-loading { text-align: center; padding: 30px; color: ${dark ? '#9ca3af' : '#6b7280'}; }
    .brn-r-load-more { display: block; width: 100%; padding: 12px; background: ${dark ? '#1f2937' : '#fff'};
      border: 1px solid ${dark ? '#374151' : '#d1d5db'}; border-radius: 8px; cursor: pointer; margin-top: 12px;
      color: inherit; font-size: 14px; font-weight: 600; }
  `

  // ─────────────────────────────────────────────
  //                  Render
  // ─────────────────────────────────────────────
  var state = { reviews: [], total: 0, avg: 0, breakdown: {}, sort: 'newest', offset: 0, loading: false }
  var pendingImages = [] // form'da seçilen görsellerin data URL'leri

  function stars(n, max) {
    max = max || 5
    var s = ''
    for (var i = 0; i < max; i++) s += i < Math.round(n) ? '★' : '☆'
    return s
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  function timeAgo(iso) {
    var d = new Date(iso)
    return d.toLocaleDateString(LOCALE === 'tr' ? 'tr-TR' : 'en-US',
      { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function injectStyles() {
    if (document.getElementById('brn-reviews-style')) return
    var s = document.createElement('style')
    s.id = 'brn-reviews-style'
    s.textContent = STYLES
    document.head.appendChild(s)
  }

  function render() {
    var html = '<div class="brn-reviews">'
    html += '<div class="brn-r-header">'
    html += '<h2 class="brn-r-title">⭐ ' + t('title') + '</h2>'
    html += '</div>'

    // Summary box (her zaman göster, yorum yoksa "Yorum Yaz" şovu)
    if (state.total > 0) {
      html += '<div class="brn-r-summary">'
      html += '<div class="brn-r-avg">'
      html += '<div class="brn-r-avg-num">' + state.avg.toFixed(1) + '</div>'
      html += '<div class="brn-r-avg-stars">' + stars(state.avg) + '</div>'
      html += '<div class="brn-r-avg-count">' + t('based_on', { n: state.total }) + '</div>'
      html += '</div>'
      html += '<div class="brn-r-breakdown">'
      for (var i = 5; i >= 1; i--) {
        var count = state.breakdown[i] || 0
        var pct = state.total > 0 ? (count / state.total * 100) : 0
        html += '<div class="brn-r-bar-row">'
        html += '<span class="brn-r-bar-label">' + i + ' ★</span>'
        html += '<div class="brn-r-bar"><div class="brn-r-bar-fill" style="width:' + pct + '%"></div></div>'
        html += '<span class="brn-r-bar-count">' + count + '</span>'
        html += '</div>'
      }
      html += '</div></div>'
    }

    // Actions
    html += '<div class="brn-r-actions">'
    if (state.total > 0) {
      html += '<select class="brn-r-sort" data-action="sort">'
      html += '<option value="newest"' + (state.sort === 'newest' ? ' selected' : '') + '>' + t('sort_newest') + '</option>'
      html += '<option value="highest"' + (state.sort === 'highest' ? ' selected' : '') + '>' + t('sort_highest') + '</option>'
      html += '<option value="lowest"' + (state.sort === 'lowest' ? ' selected' : '') + '>' + t('sort_lowest') + '</option>'
      html += '<option value="helpful"' + (state.sort === 'helpful' ? ' selected' : '') + '>' + t('sort_helpful') + '</option>'
      html += '</select>'
    } else { html += '<div></div>' }
    if (SHOW_FORM) {
      html += '<button class="brn-r-write-btn" data-action="toggle-form">✍️ ' +
        (state.total === 0 ? t('write_first') : t('write_review')) + '</button>'
    }
    html += '</div>'

    // List
    if (state.reviews.length === 0) {
      html += '<div class="brn-r-empty">'
      html += '<div class="brn-r-empty-icon">⭐</div>'
      html += '<div class="brn-r-empty-text">' + t('no_reviews') + '</div>'
      if (SHOW_FORM) {
        html += '<button class="brn-r-write-btn" data-action="toggle-form" style="margin-top:14px;">✍️ ' + t('write_first') + '</button>'
      }
      html += '</div>'
    } else {
      var votes = getVotes()
      html += '<div class="brn-r-list">'
      for (var j = 0; j < state.reviews.length; j++) {
        var r = state.reviews[j]
        var myVote = votes[r.id] || null
        html += '<div class="brn-r-item">'
        html += '<div class="brn-r-item-header">'
        html += '<div>'
        html += '<div class="brn-r-stars">' + stars(r.rating) + '</div>'
        html += '<div class="brn-r-item-author">' + escapeHtml(r.customerName) + '</div>'
        html += '</div>'
        html += '<div class="brn-r-item-date">' + timeAgo(r.createdAt) + '</div>'
        html += '</div>'
        if (r.title) html += '<div class="brn-r-item-title">' + escapeHtml(r.title) + '</div>'
        html += '<div class="brn-r-item-content">' + escapeHtml(r.content) + '</div>'
        if (r.images && r.images.length) {
          html += '<div class="brn-r-item-photos">'
          for (var p = 0; p < r.images.length; p++) {
            html += '<img src="' + encodeURI(r.images[p]) + '" alt="" loading="lazy" data-lightbox="' + encodeURI(r.images[p]) + '">'
          }
          html += '</div>'
        }
        // Like / Dislike
        html += '<div class="brn-r-vote">'
        html += '<span>' + t('vote_question') + '</span>'
        html += '<button class="brn-r-vote-btn' + (myVote === 'like' ? ' voted-like' : '') + '" data-vote="like" data-review="' + r.id + '"' + (myVote ? ' disabled' : '') + '>'
        html += '👍 ' + t('helpful') + ' <span data-like-count="' + r.id + '">(' + (r.helpfulCount || 0) + ')</span>'
        html += '</button>'
        html += '<button class="brn-r-vote-btn' + (myVote === 'dislike' ? ' voted-dislike' : '') + '" data-vote="dislike" data-review="' + r.id + '"' + (myVote ? ' disabled' : '') + '>'
        html += '👎 ' + t('not_helpful') + ' <span data-dislike-count="' + r.id + '">(' + (r.dislikeCount || 0) + ')</span>'
        html += '</button>'
        html += '</div>'
        html += '</div>'
      }
      html += '</div>'

      if (state.reviews.length < state.total) {
        html += '<button class="brn-r-load-more" data-action="load-more">' + t('load_more') + '</button>'
      }
    }

    html += '</div>'

    // Form — popup/modal olarak (gizli, overlay dışında body'e taşınır)
    if (SHOW_FORM) {
      html += '<div class="brn-r-overlay" id="brn-r-overlay">'
      html += '<div class="brn-r-modal brn-r-form" role="dialog" aria-modal="true">'
      html += '<button class="brn-r-modal-close" id="brn-r-close" aria-label="Kapat">&times;</button>'
      html += '<h3>✍️ ' + t('write_review') + '</h3>'
      html += '<div class="brn-r-field"><label>' + t('rating') + '</label>'
      html += '<div class="brn-r-star-pick" id="brn-r-stars">'
      for (var k = 1; k <= 5; k++) {
        html += '<button type="button" data-rating="' + k + '">★</button>'
      }
      html += '</div></div>'
      html += '<div class="brn-r-field"><label>' + t('name') + ' *</label>'
      html += '<input type="text" id="brn-r-name" required maxlength="80"></div>'
      html += '<div class="brn-r-field"><label>' + t('email') + '</label>'
      html += '<input type="email" id="brn-r-email" maxlength="120"></div>'
      html += '<div class="brn-r-field"><label>' + t('review_content') + ' *</label>'
      html += '<textarea id="brn-r-content" required minlength="5" maxlength="2000"></textarea></div>'
      html += '<div class="brn-r-field"><label>' + t('photos') + '</label>'
      html += '<div class="brn-r-upload" id="brn-r-upload">'
      html += '<input type="file" id="brn-r-files" accept="image/*" multiple style="display:none;">'
      html += '<button type="button" class="brn-r-upload-btn" id="brn-r-upload-btn">📷 ' + t('add_photo') + '</button>'
      html += '<div class="brn-r-upload-hint">' + t('photo_hint') + '</div>'
      html += '<div class="brn-r-thumbs" id="brn-r-thumbs"></div>'
      html += '</div></div>'
      html += '<button class="brn-r-submit" id="brn-r-submit">' + t('submit') + '</button>'
      html += '<div id="brn-r-form-msg"></div>'
      html += '</div></div>'
    }

    container.innerHTML = html
    bindEvents()
  }

  // ─────────────────────────────────────────────
  //                Event handlers
  // ─────────────────────────────────────────────
  function bindEvents() {
    var sortEl = container.querySelector('[data-action="sort"]')
    if (sortEl) sortEl.addEventListener('change', function (e) {
      state.sort = e.target.value
      state.offset = 0
      load()
    })

    var toggleBtns = container.querySelectorAll('[data-action="toggle-form"]')
    var overlay = container.querySelector('#brn-r-overlay')
    var closeBtn = container.querySelector('#brn-r-close')
    function openModal() {
      if (!overlay) return
      overlay.classList.add('open')
      document.body.style.overflow = 'hidden'
    }
    function closeModal() {
      if (!overlay) return
      overlay.classList.remove('open')
      document.body.style.overflow = ''
    }
    for (var b = 0; b < toggleBtns.length; b++) {
      toggleBtns[b].addEventListener('click', openModal)
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal)
    if (overlay) overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal()
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeModal()
    })

    // Görsel yükleme
    var uploadBtn = container.querySelector('#brn-r-upload-btn')
    var fileInput = container.querySelector('#brn-r-files')
    var thumbs = container.querySelector('#brn-r-thumbs')
    function renderThumbs() {
      if (!thumbs) return
      var h = ''
      for (var i = 0; i < pendingImages.length; i++) {
        h += '<div class="brn-r-thumb"><img src="' + pendingImages[i] + '" alt="">'
        h += '<button type="button" class="brn-r-thumb-del" data-thumb="' + i + '">&times;</button></div>'
      }
      thumbs.innerHTML = h
      var dels = thumbs.querySelectorAll('[data-thumb]')
      for (var j = 0; j < dels.length; j++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            pendingImages.splice(parseInt(btn.getAttribute('data-thumb'), 10), 1)
            renderThumbs()
          })
        })(dels[j])
      }
    }
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () { fileInput.click() })
      fileInput.addEventListener('change', function () {
        var files = fileInput.files || []
        for (var i = 0; i < files.length; i++) {
          if (pendingImages.length >= 4) break
          var f = files[i]
          if (!/^image\//.test(f.type)) continue
          if (f.size > 2 * 1024 * 1024) { alert(f.name + ' 2MB sınırını aşıyor'); continue }
          ;(function () {
            var reader = new FileReader()
            reader.onload = function (ev) {
              if (pendingImages.length < 4) { pendingImages.push(ev.target.result); renderThumbs() }
            }
            reader.readAsDataURL(f)
          })()
        }
        fileInput.value = ''
      })
    }
    renderThumbs()

    // Lightbox (yorumdaki görsele tıklama)
    var photos = container.querySelectorAll('[data-lightbox]')
    for (var pi = 0; pi < photos.length; pi++) {
      (function (img) {
        img.addEventListener('click', function () {
          var box = document.createElement('div')
          box.className = 'brn-r-lightbox'
          box.innerHTML = '<img src="' + img.getAttribute('data-lightbox') + '" alt="">'
          box.addEventListener('click', function () { document.body.removeChild(box) })
          document.body.appendChild(box)
        })
      })(photos[pi])
    }

    var loadMore = container.querySelector('[data-action="load-more"]')
    if (loadMore) loadMore.addEventListener('click', function () {
      state.offset += 20
      load(true)
    })

    // Vote butonları
    var voteBtns = container.querySelectorAll('[data-vote]')
    for (var vi = 0; vi < voteBtns.length; vi++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          vote(parseInt(btn.getAttribute('data-review'), 10), btn.getAttribute('data-vote'), btn)
        })
      })(voteBtns[vi])
    }

    // Star pick
    var pickedRating = 0
    var starButtons = container.querySelectorAll('#brn-r-stars button')
    for (var i = 0; i < starButtons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          pickedRating = parseInt(btn.getAttribute('data-rating'), 10)
          for (var j = 0; j < starButtons.length; j++) {
            starButtons[j].classList.toggle('active', parseInt(starButtons[j].getAttribute('data-rating'), 10) <= pickedRating)
          }
        })
      })(starButtons[i])
    }

    // Submit
    var submitBtn = container.querySelector('#brn-r-submit')
    if (submitBtn) submitBtn.addEventListener('click', function () {
      submit(pickedRating)
    })
  }

  function vote(reviewId, type, clickedBtn) {
    clickedBtn.disabled = true
    fetch(API_BASE + '/api/public/reviews/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: reviewId, type: type }),
    })
      .then(function (r) { return r.json() })
      .then(function (d) {
        if (!d.success) { clickedBtn.disabled = false; return }
        saveVote(reviewId, type)
        var all = container.querySelectorAll('[data-review="' + reviewId + '"]')
        for (var i = 0; i < all.length; i++) {
          all[i].disabled = true
          if (all[i].getAttribute('data-vote') === type) {
            all[i].classList.add(type === 'like' ? 'voted-like' : 'voted-dislike')
          }
        }
        var ls = container.querySelector('[data-like-count="' + reviewId + '"]')
        var ds = container.querySelector('[data-dislike-count="' + reviewId + '"]')
        if (ls) ls.textContent = '(' + d.likeCount + ')'
        if (ds) ds.textContent = '(' + d.dislikeCount + ')'
      })
      .catch(function () { clickedBtn.disabled = false })
  }

  function submit(rating) {
    var name = (container.querySelector('#brn-r-name') || {}).value
    var email = (container.querySelector('#brn-r-email') || {}).value
    var content = (container.querySelector('#brn-r-content') || {}).value
    var msg = container.querySelector('#brn-r-form-msg')
    var btn = container.querySelector('#brn-r-submit')

    if (!rating) { msg.innerHTML = '<div class="brn-r-msg error">⭐ ' + t('rating') + '</div>'; return }
    if (!name || !content || content.length < 5) { msg.innerHTML = '<div class="brn-r-msg error">' + t('error') + '</div>'; return }

    btn.disabled = true; btn.textContent = t('submitting')
    msg.innerHTML = ''

    fetch(API_BASE + '/api/public/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: PRODUCT_ID, productTitle: PRODUCT_TITLE,
        customerName: name, customerEmail: email,
        rating: rating, content: content,
        images: pendingImages,
      }),
    })
      .then(function (r) { return r.json() })
      .then(function (d) {
        btn.disabled = false; btn.textContent = t('submit')
        if (d.success) {
          msg.innerHTML = '<div class="brn-r-msg success">✅ ' + (d.message || t('success')) + '</div>'
          pendingImages = []
          ;['name', 'email', 'content'].forEach(function (k) {
            var el = container.querySelector('#brn-r-' + k); if (el) el.value = ''
          })
          var th = container.querySelector('#brn-r-thumbs'); if (th) th.innerHTML = ''
        } else {
          msg.innerHTML = '<div class="brn-r-msg error">❌ ' + (d.message || t('error')) + '</div>'
        }
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = t('submit')
        msg.innerHTML = '<div class="brn-r-msg error">❌ ' + t('error') + '</div>'
      })
  }

  // ─────────────────────────────────────────────
  //                  Load
  // ─────────────────────────────────────────────
  function load(append) {
    if (state.loading) return
    state.loading = true
    if (!append) container.innerHTML = '<div class="brn-r-loading">⏳ Loading reviews...</div>'

    var url = API_BASE + '/api/public/reviews?productId=' + encodeURIComponent(PRODUCT_ID)
      + '&limit=20&offset=' + state.offset + '&sort=' + state.sort

    fetch(url)
      .then(function (r) { return r.json() })
      .then(function (d) {
        state.loading = false
        if (d.success) {
          state.total = d.total
          state.avg = d.averageRating || 0
          state.breakdown = d.breakdown || {}
          state.reviews = append ? state.reviews.concat(d.reviews) : d.reviews
          render()
        } else {
          container.innerHTML = '<div class="brn-r-empty">⚠️ ' + (d.message || 'Error') + '</div>'
        }
      })
      .catch(function (e) {
        state.loading = false
        container.innerHTML = '<div class="brn-r-empty">⚠️ ' + e.message + '</div>'
      })
  }

  // ─────────────────────────────────────────────
  //                    Boot
  // ─────────────────────────────────────────────
  injectStyles()
  load()
})()
