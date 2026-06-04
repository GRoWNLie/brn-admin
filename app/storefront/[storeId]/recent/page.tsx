'use client'

export default function StorefrontRecent() {
  return (
    <div>
      <h1 className="sf-h1">Son Görüntülediklerin</h1>
      <p className="sf-muted">Son baktığın ürünleri buradan kolayca tekrar bul.</p>
      <div className="sf-card" style={{ marginTop: 16, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>👁</div>
        <div style={{ fontWeight: 600 }}>Henüz görüntülenen ürün yok</div>
        <div className="sf-muted" style={{ fontSize: 13, marginTop: 6 }}>Faz 3'te localStorage + tracker beacon ile dolacak.</div>
      </div>
    </div>
  )
}
