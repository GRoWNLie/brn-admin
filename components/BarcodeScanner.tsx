'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Kameradan barkod okuma — native BarcodeDetector API (Android Chrome/Edge destekler).
 * Desteklenmeyen tarayıcıda (iOS Safari vb.) uyarı gösterir, manuel girişe yönlendirir.
 */
export default function BarcodeScanner({
  onDetected, onClose,
}: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null
    let detector: any = null
    let raf = 0
    let stopped = false

    function cleanup() {
      stopped = true
      cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }

    async function scan() {
      if (stopped || !detector || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes && codes.length) {
          const val = codes[0].rawValue
          if (val) { cleanup(); onDetected(String(val)); return }
        }
      } catch { /* kare okunamadı, devam */ }
      raf = requestAnimationFrame(scan)
    }

    async function start() {
      const BD = (typeof window !== 'undefined') ? (window as any).BarcodeDetector : null
      if (!BD) { setSupported(false); return }
      try {
        detector = new BD({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code'] })
      } catch { try { detector = new BD() } catch { setSupported(false); return } }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        scan()
      } catch (e: any) {
        setErr(e?.name === 'NotAllowedError' ? 'Kamera izni reddedildi.' : (e?.message || 'Kamera açılamadı.'))
      }
    }

    start()
    return cleanup
  }, [onDetected])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg-panel)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <strong>📷 Barkod Okut</strong>
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={onClose}>✕ Kapat</button>
        </div>
        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Hedef çerçevesi */}
          {supported && !err && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '78%', height: '34%', border: '3px solid #10B981', borderRadius: 10, boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)' }} />
            </div>
          )}
        </div>
        <div style={{ padding: 14, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          {!supported
            ? <span style={{ color: '#B45309' }}>⚠️ Bu tarayıcı kamera barkod okumayı desteklemiyor (iOS Safari vb.). Android Chrome kullanın ya da barkodu elle girin.</span>
            : err
              ? <span style={{ color: '#B91C1C' }}>⚠️ {err}</span>
              : 'Barkodu yeşil çerçeveye hizalayın — otomatik okunacak.'}
        </div>
      </div>
    </div>
  )
}
