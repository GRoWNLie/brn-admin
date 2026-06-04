/**
 * BRN Visitor Tracker — Shopify temasına eklenebilir vanilla JS canlı ziyaretçi beacon'ı.
 *
 * Kullanım (theme.liquid içinde </body> öncesi):
 *   <script src="https://YOUR-DOMAIN.com/widget/tracker.js" async></script>
 *
 * Her ~20 saniyede bir admin'e "ping" atar. Admin paneli son 5 dakikada
 * ping atan oturumları sayarak gerçek canlı ziyaretçi sayısını gösterir.
 * Plan/izin gerektirmez — veri tamamen kendi sunucumuzda tutulur.
 */
(function () {
  'use strict'

  var PING_INTERVAL_MS = 20000 // 20 sn

  // API base — script src'sinden otomatik tespit
  function detectApiBase() {
    var scripts = document.getElementsByTagName('script')
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || ''
      if (src.indexOf('/widget/tracker.js') >= 0) return src.split('/widget/tracker.js')[0]
    }
    return ''
  }
  var API_BASE = detectApiBase()
  var ENDPOINT = API_BASE + '/api/public/track'

  // Oturum token'ı — sekme oturumu boyunca sabit
  function getSid() {
    try {
      var k = 'brn_sid'
      var v = sessionStorage.getItem(k)
      if (!v) {
        v = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
        sessionStorage.setItem(k, v)
      }
      return v
    } catch (e) {
      // sessionStorage kapalıysa geçici token
      return 'v_' + Math.random().toString(36).slice(2, 12)
    }
  }
  var SID = getSid()

  function payload() {
    return JSON.stringify({
      sid: SID,
      path: location.pathname + location.search,
      referrer: document.referrer || '',
    })
  }

  function ping(useBeacon) {
    var body = payload()
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
        return
      }
    } catch (e) {}
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function () {})
    } catch (e) {}
  }

  // İlk ping + aralıklı ping
  ping(false)
  var timer = setInterval(function () {
    // Sekme arka plandaysa ping atma (gereksiz sayım olmasın)
    if (document.visibilityState === 'visible') ping(false)
  }, PING_INTERVAL_MS)

  // Sekme tekrar görünür olunca anında ping
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') ping(false)
  })

  // Sayfadan ayrılırken son ping (beacon ile)
  window.addEventListener('pagehide', function () {
    clearInterval(timer)
    ping(true)
  })
})()
