'use client'

import { useEffect, useRef, useState } from 'react'

interface Message {
  id?: number
  role: 'user' | 'assistant'
  content: string
  toolName?: string | null
  toolInput?: any
  toolResult?: any
  createdAt?: string
}

interface Conversation {
  id: number
  title: string
  createdAt: string
  updatedAt: string
}

const QUICK_PROMPTS = [
  '📊 Geçen ay toplam satışım ne kadardı?',
  '🏆 En çok satan 5 ürünüm hangileri?',
  '⚠️ Stoğu kritik seviyede olan ürünleri listele',
  '👑 En değerli 10 müşterim kimler?',
  '📈 Son 7 günün satış raporunu detayla',
  '💡 Bu ay nasıl daha çok satış yaparım?',
]

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [mockedNotice, setMockedNotice] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function loadConversations() {
    const res = await fetch('/api/ai/chat')
    const data = await res.json()
    if (data.success) setConversations(data.conversations || [])
  }

  async function loadConversation(id: number) {
    const res = await fetch(`/api/ai/chat?conversationId=${id}`)
    const data = await res.json()
    if (data.success) {
      setMessages(data.messages || [])
      setConversationId(id)
    }
  }

  function newChat() {
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(prompt?: string) {
    const text = prompt ?? input
    if (!text.trim()) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.mocked) setMockedNotice(true)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
        }])
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId)
          loadConversations()
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Hata: ${data.message}`,
        }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Bağlantı hatası: ${e?.message}`,
      }])
    } finally { setSending(false) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🤖 Yapay Zeka Asistanı</h1>
        <div className="product-actions-right">
          <button className="btn-secondary" onClick={newChat}>➕ Yeni Sohbet</button>
        </div>
      </div>

      {mockedNotice && (
        <div className="panel-card" style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: 13, color: '#92400E' }}>
            <strong>⚠️ Mock mod:</strong> ANTHROPIC_API_KEY tanımlanmamış — gerçek AI cevap için
            <a href="https://console.anthropic.com" target="_blank" style={{ marginLeft: 4, color: '#92400E', fontWeight: 700 }}>
              console.anthropic.com
            </a>'dan key al ve .env'ye ekle.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Sol: Önceki sohbetler */}
        <div className="panel-card" style={{ padding: 0, maxHeight: 600, overflowY: 'auto' }}>
          <div style={{ padding: 14, borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13 }}>
            Geçmiş Sohbetler
          </div>
          {conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              Henüz sohbet yok
            </div>
          ) : conversations.map(c => (
            <div key={c.id}
              onClick={() => loadConversation(c.id)}
              style={{
                padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer', fontSize: 12,
                background: conversationId === c.id ? 'var(--hover-bg)' : 'transparent',
              }}>
              <div style={{ fontWeight: 600 }}>{c.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(c.updatedAt).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
        </div>

        {/* Sağ: Sohbet */}
        <div className="panel-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 600 }}>
          {messages.length === 0 ? (
            <div style={{ padding: 30, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🤖</div>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>BRN AI Asistan</h2>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380, marginBottom: 24 }}>
                Mağazanız hakkında her şeyi sor. Satışlar, müşteriler, stok — verilerinle gerçek cevaplar.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
                {QUICK_PROMPTS.map(q => (
                  <button key={q} className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: 10, marginBottom: 14,
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {m.role === 'assistant' && (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#7C3AED', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 16,
                    }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth: '75%',
                    padding: '10px 14px', borderRadius: 12,
                    background: m.role === 'user' ? '#2563EB' : 'var(--hover-bg)',
                    color: m.role === 'user' ? '#fff' : 'var(--text-main)',
                    whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5,
                  }}>
                    {m.content}
                  </div>
                  {m.role === 'user' && (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#2563EB', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 14, fontWeight: 700,
                    }}>B</div>
                  )}
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#7C3AED',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>🤖</div>
                  <div style={{
                    padding: '10px 14px', borderRadius: 12, background: 'var(--hover-bg)',
                    fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)',
                  }}>
                    Düşünüyor<span className="ai-dots">...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: 14, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
            <input
              className="form-select"
              style={{ flex: 1 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !sending) send() }}
              placeholder="Soru yaz... (Örn: Bu ay en çok ne sattım?)"
              disabled={sending}
            />
            <button className="btn-primary" disabled={sending || !input.trim()} onClick={() => send()}>
              {sending ? '⏳' : '🚀 Gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
