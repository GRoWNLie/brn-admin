/**
 * BRN Popup Widget — Shopify temasına eklenebilir vanilla JS popup.
 *
 * Kullanım (theme.liquid içinde </body> öncesi):
 *   <script src="https://YOUR-DOMAIN.com/widget/popup.js" async></script>
 *
 * Aktif popup konfigürasyonunu admin panelinden çeker. Aynı anda 1 aktif popup gösterilir.
 * Sıklık (once/session/always), tetikleyici (delay/exit_intent/scroll) admin'den ayarlanır.
 */
(function () {
  'use strict'

  // API base — script src'sinden otomatik tespit
  function detectApiBase() {
    var scripts = document.getElementsByTagName('script')
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || ''
      if (src.indexOf('/widget/popup.js') >= 0) return src.split('/widget/popup.js')[0]
    }
    return ''
  }
  var API_BASE = detectApiBase()

  function storageKey(id) { return 'brn_popup_' + id }

  function alreadyShown(p) {
    try {
      if (p.frequency === 'always') return false
      if (p.frequency === 'session') return sessionStorage.getItem(storageKey(p.id)) === '1'
      return localStorage.getItem(storageKey(p.id)) === '1' // once
    } catch (e) { return false }
  }
  function markShown(p) {
    try {
      if (p.frequency === 'session') sessionStorage.setItem(storageKey(p.id), '1')
      else if (p.frequency !== 'always') localStorage.setItem(storageKey(p.id), '1')
    } catch (e) {}
  }

  function injectStyles(dark) {
    if (document.getElementById('brn-popup-style')) return
    var s = document.createElement('style')
    s.id = 'brn-popup-style'
    s.textContent = [
      '.brn-pop-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s;}',
      '.brn-pop-overlay.show{opacity:1;}',
      '.brn-pop-overlay.pos-bottom-right{align-items:flex-end;justify-content:flex-end;background:transparent;pointer-events:none;}',
      '.brn-pop-overlay.pos-bottom-right .brn-pop{pointer-events:auto;}',
      '.brn-pop{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;background:#fff;color:#1f2937;border-radius:14px;width:100%;max-width:400px;padding:28px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.35);transform:translateY(14px) scale(.97);transition:transform .25s;text-align:center;}',
      '.brn-pop-overlay.show .brn-pop{transform:translateY(0) scale(1);}',
      '.brn-pop.dark{background:#1f2937;color:#e5e7eb;}',
      '.brn-pop-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#9ca3af;}',
      '.brn-pop-img{max-width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:14px;}',
      '.brn-pop-headline{font-size:24px;font-weight:800;margin:0 0 8px;}',
      '.brn-pop-desc{font-size:14px;opacity:.85;margin:0 0 16px;line-height:1.5;}',
      '.brn-pop-input{width:100%;padding:11px 14px;border-radius:8px;border:1px solid #d1d5db;font-size:14px;margin-bottom:10px;box-sizing:border-box;}',
      '.brn-pop.dark .brn-pop-input{background:#111827;color:#e5e7eb;border-color:#374151;}',
      '.brn-pop-btn{width:100%;background:#EC4899;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;}',
      '.brn-pop-btn:hover{opacity:.92;}',
      '.brn-pop-code{margin-top:14px;padding:12px;border:2px dashed #EC4899;border-radius:8px;font-size:20px;font-weight:800;letter-spacing:2px;color:#EC4899;}',
      '.brn-pop-msg{margin-top:10px;font-size:13px;color:#059669;}',
    ].join('\n')
    document.head.appendChild(s)
  }

  function show(p) {
    injectStyles(p.theme === 'dark')
    markShown(p)

    var overlay = document.createElement('div')
    overlay.className = 'brn-pop-overlay pos-' + (p.position || 'center')

    var card = document.createElement('div')
    card.className = 'brn-pop' + (p.theme === 'dark' ? ' dark' : '')

    var html = '<button class="brn-pop-close" aria-label="Kapat">&times;</button>'
    if (p.imageUrl) html += '<img class="brn-pop-img" src="' + p.imageUrl + '" alt="">'
    html += '<h2 class="brn-pop-headline">' + escapeHtml(p.headline) + '</h2>'
    if (p.description) html += '<p class="brn-pop-desc">' + escapeHtml(p.description) + '</p>'
    html += '<div class="brn-pop-body">'
    if (p.collectEmail) html += '<input class="brn-pop-input" type="email" placeholder="ornek@email.com">'
    html += '<button class="brn-pop-btn">' + escapeHtml(p.buttonText || 'Kupon Al') + '</button>'
    html += '</div>'
    card.innerHTML = html
    overlay.appendChild(card)
    document.body.appendChild(overlay)
    requestAnimationFrame(function () { overlay.classList.add('show') })

    function close() {
      overlay.classList.remove('show')
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay) }, 250)
    }
    card.querySelector('.brn-pop-close').addEventListener('click', close)
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close() })

    card.querySelector('.brn-pop-btn').addEventListener('click', function () {
      var input = card.querySelector('.brn-pop-input')
      var email = input ? input.value : ''
      if (p.collectEmail && (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
        if (input) { input.style.borderColor = '#DC2626'; input.focus() }
        return
      }
      fetch(API_BASE + '/api/public/popup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popupId: p.id, email: email }),
      }).catch(function () {})

      var body = card.querySelector('.brn-pop-body')
      var done = ''
      if (p.discountCode) {
        done += '<div class="brn-pop-msg">🎉 İndirim kodun hazır!</div>'
        done += '<div class="brn-pop-code">' + escapeHtml(p.discountCode) + '</div>'
      } else {
        done += '<div class="brn-pop-msg">🎉 Teşekkürler!</div>'
      }
      body.innerHTML = done
      setTimeout(close, 4000)
    })
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function setupTrigger(p) {
    if (p.triggerType === 'exit_intent') {
      var fired = false
      document.addEventListener('mouseout', function (e) {
        if (!fired && e.clientY <= 0) { fired = true; show(p) }
      })
    } else if (p.triggerType === 'scroll') {
      var fired2 = false
      window.addEventListener('scroll', function () {
        if (fired2) return
        var h = document.documentElement.scrollHeight - window.innerHeight
        var pct = h > 0 ? (window.scrollY / h) * 100 : 0
        if (pct >= (p.triggerValue || 50)) { fired2 = true; show(p) }
      })
    } else {
      setTimeout(function () { show(p) }, (p.triggerValue || 5) * 1000)
    }
  }

  // Boot
  fetch(API_BASE + '/api/public/popup')
    .then(function (r) { return r.json() })
    .then(function (d) {
      if (d.success && d.popup && !alreadyShown(d.popup)) setupTrigger(d.popup)
    })
    .catch(function () {})
})()
