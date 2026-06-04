/**
 * Shopify "Access denied" hatalarında kullanıcıya adım adım
 * çözüm rehberi gösteren ortak component.
 */

interface Props {
  /** Hangi alan için erişim reddedildi: customers / orders / products vs. */
  field: string
  rawMessage: string
}

export default function ShopifyAccessDeniedHelp({ field, rawMessage }: Props) {
  const isCustomers = /customers?/i.test(field)
  const isOrders = /orders?/i.test(field)

  const requiredScopes: string[] = []
  if (isCustomers) requiredScopes.push('read_customers')
  if (isOrders) requiredScopes.push('read_orders', 'read_all_orders')

  return (
    <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
        ⚠️ Shopify erişimi reddedildi
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        {rawMessage}
      </div>

      <div style={{
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 10, padding: 18, fontSize: 13, color: '#92400E',
      }}>
        <strong style={{ fontSize: 14 }}>
          🔐 Custom App Erişim Eksik — Sırayla Yap:
        </strong>

        {/* ADIM 1 — Scope kontrol */}
        <div style={{ marginTop: 14 }}>
          <strong>1️⃣ Admin API Scope&apos;ları Aç</strong>
          <p style={{ marginTop: 4, marginLeft: 12 }}>
            Shopify Admin → <strong>Settings</strong> → <strong>Apps and sales channels</strong> →{' '}
            <strong>Develop apps</strong> → <strong>BRN Admin</strong> → <strong>Configuration</strong>{' '}
            → <strong>Admin API access scopes</strong>
          </p>
          <p style={{ marginTop: 6, marginLeft: 12 }}>Aç:</p>
          <ul style={{ marginLeft: 28, marginTop: 4 }}>
            {requiredScopes.map(s => (
              <li key={s}><code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>{s}</code></li>
            ))}
          </ul>
        </div>

        {/* ADIM 2 — Protected customer data */}
        {(isCustomers || isOrders) && (
          <div style={{ marginTop: 14 }}>
            <strong>2️⃣ Protected Customer Data Access (En Kritik Adım!)</strong>
            <p style={{ marginTop: 4, marginLeft: 12 }}>
              Aynı sayfada aşağı kaydır, <strong>&quot;Protected customer data access&quot;</strong> bölümünü bul.
            </p>
            <p style={{ marginTop: 6, marginLeft: 12 }}>
              <strong>&quot;Request access&quot;</strong> veya <strong>&quot;Edit&quot;</strong> butonuna bas:
            </p>
            <ul style={{ marginLeft: 28, marginTop: 4, lineHeight: 1.8 }}>
              <li>✅ <strong>Customer data — Address, Email, Phone, Name</strong> tümünü işaretle</li>
              <li>📝 &quot;What will you do with this data?&quot; sorusuna yaz:<br />
                <em style={{ fontSize: 12 }}>&quot;Internal admin panel for managing store customers and orders.&quot;</em>
              </li>
              <li>📝 &quot;How is data stored?&quot;: <em style={{ fontSize: 12 }}>&quot;Local PostgreSQL database, not shared with third parties.&quot;</em></li>
              <li>✅ <strong>Save</strong> bas</li>
            </ul>
            <p style={{ marginTop: 8, marginLeft: 12, fontSize: 12, fontStyle: 'italic' }}>
              Development store&apos;larda hemen aktif olur; production&apos;da Shopify onayı gerekebilir.
            </p>
          </div>
        )}

        {/* ADIM 3 — Token yeniden oluştur */}
        <div style={{ marginTop: 14 }}>
          <strong style={{ color: '#DC2626' }}>3️⃣ Token&apos;ı YENİDEN OLUŞTUR (Çoğu Kişi Bunu Unutuyor!)</strong>
          <p style={{ marginTop: 4, marginLeft: 12 }}>
            Scope ekledikten sonra eski token, yeni izinleri görmez. <strong>Mecbur yeni token üretmelisin:</strong>
          </p>
          <ul style={{ marginLeft: 28, marginTop: 4, lineHeight: 1.8 }}>
            <li><strong>API credentials</strong> sekmesine geç</li>
            <li>Mevcut token altındaki <strong>&quot;Reveal token once&quot;</strong> veya <strong>&quot;Install/Reinstall app&quot;</strong></li>
            <li>Yeni <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>shpat_...</code> token&apos;ı kopyala</li>
          </ul>
        </div>

        {/* ADIM 4 — .env güncelle */}
        <div style={{ marginTop: 14 }}>
          <strong>4️⃣ .env Dosyasını Güncelle</strong>
          <p style={{ marginTop: 4, marginLeft: 12 }}>Yeni token&apos;ı <strong>İKİ YERE</strong> yapıştır:</p>
          <pre style={{
            background: '#1E293B', color: '#A7F3D0',
            padding: 12, borderRadius: 8, fontSize: 11,
            marginTop: 6, marginLeft: 12, overflowX: 'auto',
          }}>{`SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_yeni_token_buraya"
SHOP_ACCESS_TOKEN="shpat_yeni_token_buraya"`}</pre>
        </div>

        {/* ADIM 5 — Dev server reset */}
        <div style={{ marginTop: 14 }}>
          <strong>5️⃣ Dev Server&apos;ı Yeniden Başlat</strong>
          <p style={{ marginTop: 4, marginLeft: 12 }}>
            <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>Ctrl+C</code>{' '}
            ile durdur, sonra <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>npm run dev</code>.
            Next.js env&apos;i sadece başlangıçta okur.
          </p>
        </div>
      </div>
    </div>
  )
}
