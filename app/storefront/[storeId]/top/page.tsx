'use client'

export default function StorefrontTop() {
  return (
    <div>
      <h1 className="sf-h1">En Çok Sipariş Verdiklerin</h1>
      <p className="sf-muted">Sık aldığın ürünleri tek tıkla yeniden sipariş ver.</p>
      <div className="sf-card" style={{ marginTop: 16, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontWeight: 600 }}>Veri yok</div>
        <div className="sf-muted" style={{ fontSize: 13, marginTop: 6 }}>Faz 3'te sipariş geçmişinden hesaplanacak.</div>
      </div>
    </div>
  )
}
