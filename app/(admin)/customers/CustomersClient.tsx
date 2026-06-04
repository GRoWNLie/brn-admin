'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CustomerListResult, formatCurrency, formatDate } from '@/lib/shopify-data'

export default function CustomersClient({
  data, search, first,
}: {
  data: CustomerListResult
  search: string
  first: number
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [searchInput, setSearchInput] = useState(search)
  const [pending, startTransition] = useTransition()

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '') params.delete(k); else params.set(k, v)
    }
    if ('search' in updates) params.delete('after')
    startTransition(() => router.push(`/customers?${params.toString()}`))
  }

  return (
    <div className="panel-card">
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-box-table">
            <input
              type="text"
              placeholder="Ad, email ara..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') navigate({ search: searchInput }) }}
            />
          </div>
          <button className="btn-secondary" onClick={() => navigate({ search: searchInput })}>
            {pending ? '...' : 'Ara'}
          </button>
          {search && (
            <button className="btn-secondary" onClick={() => { setSearchInput(''); navigate({ search: '' }) }}>
              ✕ Temizle
            </button>
          )}
        </div>
      </div>

      {data.customers.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          {search ? `"${search}" araması için müşteri bulunamadı.` : 'Henüz müşteri yok.'}
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" className="custom-checkbox" /></th>
                <th>Müşteri</th>
                <th>Email / Telefon</th>
                <th>Sipariş Sayısı</th>
                <th>Toplam Harcama</th>
                <th>Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/customers/${encodeURIComponent(c.id)}`)}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="custom-checkbox" />
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name" style={{ color: '#2563EB', fontWeight: 600 }}>{c.displayName || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-email">{c.email || '—'}</span>
                      {c.phone && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-delivered">{c.ordersCount} sipariş</span>
                  </td>
                  <td>
                    <strong>{formatCurrency(c.totalSpent, c.currency)}</strong>
                  </td>
                  <td>
                    <div className="date-cell">
                      <span className="date-main">
                        {new Date(c.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        <div>
          Sayfa başına:
          <select
            className="row-count-select"
            value={first}
            onChange={e => navigate({ first: e.target.value, after: undefined })}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{data.customers.length} müşteri gösteriliyor</span>
          {sp.get('after') && (
            <button className="btn-secondary" onClick={() => navigate({ after: undefined })} disabled={pending}>
              « İlk Sayfa
            </button>
          )}
          {data.pageInfo.hasNextPage && (
            <button
              className="btn-secondary"
              onClick={() => navigate({ after: data.pageInfo.endCursor ?? undefined })}
              disabled={pending}
            >
              Sonraki Sayfa »
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
