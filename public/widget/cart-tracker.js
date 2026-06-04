/**
 * BRN Cart Tracker — Shopify temasına eklenen canlı sepet beacon'ı.
 * Kullanım (theme.liquid </body> öncesi):
 *   <script src="https://YOUR-DOMAIN.com/widget/cart-tracker.js" async></script>
 *
 * Üye müşterinin sepet içeriğini admin paneline gönderir (cart-track endpoint).
 * Müşteri e-postası Shopify storefront değişkenlerinden okunur (giriş yapmışsa).
 */
(function () {
  'use strict'

  function detectApiBase() {
    var s = document.getElementsByTagName('script')
    for (var i = 0; i < s.length; i++) {
      var src = s[i].src || ''
      if (src.indexOf('/widget/cart-tracker.js') >= 0) return src.split('/widget/cart-tracker.js')[0]
    }
    return ''
  }
  var API_BASE = detectApiBase()
  var lastHash = ''

  function customerEmail() {
    try {
      if (window.__st && window.__st.cid && window.ShopifyAnalytics && window.ShopifyAnalytics.meta) {}
      // Tema giriş yapmış müşteri e-postasını farklı yerlerde tutabilir:
      if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.page) {
        var c = window.ShopifyAnalytics.meta.page.customerEmail
        if (c) return c
      }
      var meta = document.querySelector('meta[property="og:email"]')
      if (meta) return meta.getAttribute('content')
    } catch (e) {}
    return null
  }
  function customerId() {
    try {
      if (window.__st && window.__st.cid) return String(window.__st.cid)
    } catch (e) {}
    return null
  }

  function send(cart) {
    var items = (cart.items || []).map(function (it) {
      return {
        title: it.product_title || it.title,
        quantity: it.quantity,
        price: (it.final_line_price != null ? it.final_line_price : it.line_price) / 100,
        image: it.image || it.featured_image && it.featured_image.url || null,
        sku: it.sku || null,
      }
    })
    var payload = {
      cartToken: cart.token || ('anon_' + (customerId() || 'x')),
      customerEmail: customerEmail(),
      customerId: customerId(),
      items: items,
      total: (cart.total_price || 0) / 100,
      currency: cart.currency || 'TRY',
    }
    var hash = JSON.stringify(payload.items) + payload.total
    if (hash === lastHash) return
    lastHash = hash
    try {
      fetch(API_BASE + '/api/public/cart-track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), keepalive: true,
      }).catch(function () {})
    } catch (e) {}
  }

  function poll() {
    try {
      fetch('/cart.js', { credentials: 'same-origin' })
        .then(function (r) { return r.json() })
        .then(function (cart) { send(cart) })
        .catch(function () {})
    } catch (e) {}
  }

  poll()
  setInterval(function () { if (document.visibilityState === 'visible') poll() }, 15000)
  // Sepet değişimlerinde (çoğu tema fetch ile günceller) — kısa gecikmeyle poll
  document.addEventListener('click', function () { setTimeout(poll, 1200) })
})()
