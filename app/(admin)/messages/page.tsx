'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Conv {
  id: number; type: string; title: string | null; lastMessage: string
  lastMessageAt: string | null; unread: number
  taskStatus: string | null; taskAssignee: string | null; taskDueAt: string | null
}
interface Msg { id: number; senderId: number; senderName: string; body: string; fileData: string | null; fileName: string | null; createdAt: string; mine: boolean }
interface U { id: number; name: string; email: string; role: string }

const TYPE_ICON: Record<string, string> = { dm: '💬', channel: '📢', task: '📋' }
const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Açık', cls: 'pending' }, IN_PROGRESS: { label: 'Devam Ediyor', cls: 'pending' }, DONE: { label: 'Tamamlandı', cls: 'delivered' },
}

export default function MessagesPage() {
  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [active, setActive] = useState<any>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [me, setMe] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<{ data: string; name: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [users, setUsers] = useState<U[]>([])
  const [modal, setModal] = useState<null | 'dm' | 'task' | 'channel'>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConvs = useCallback(async () => {
    const d = await fetch('/api/messages').then(r => r.json()).catch(() => null)
    if (d?.success) { setConvs(d.conversations); setMe(d.me) }
  }, [])

  const loadThread = useCallback(async (id: number) => {
    const d = await fetch(`/api/messages/${id}`).then(r => r.json()).catch(() => null)
    if (d?.success) { setActive(d.conversation); setMsgs(d.messages); setMe(d.me) }
  }, [])

  useEffect(() => { loadConvs() }, [loadConvs])
  useEffect(() => { fetch('/api/messages/users').then(r => r.json()).then(d => { if (d.success) setUsers(d.users) }).catch(() => {}) }, [])

  // aktif thread + liste polling
  useEffect(() => {
    if (!activeId) return
    loadThread(activeId)
    const t = setInterval(() => { loadThread(activeId); loadConvs() }, 4000)
    return () => clearInterval(t)
  }, [activeId, loadThread, loadConvs])

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [msgs])

  async function openConv(id: number) { setActiveId(id); setActive(null); setMsgs([]) }

  async function send() {
    if (!activeId || (!text.trim() && !file)) return
    setSending(true)
    try {
      await fetch(`/api/messages/${activeId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, fileData: file?.data, fileName: file?.name }),
      })
      setText(''); setFile(null)
      await loadThread(activeId); await loadConvs()
    } finally { setSending(false) }
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 3_000_000) { alert('Dosya en fazla 3MB olabilir'); return }
    const reader = new FileReader()
    reader.onload = () => setFile({ data: String(reader.result), name: f.name })
    reader.readAsDataURL(f)
  }

  async function setTaskStatus(status: string) {
    if (!activeId) return
    await fetch(`/api/messages/${activeId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskStatus: status }) })
    await loadThread(activeId); await loadConvs()
  }

  async function createConv(payload: any) {
    const d = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
    if (d.success) { setModal(null); await loadConvs(); openConv(d.id) }
    else alert('❌ ' + d.message)
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">💬 Mesajlaşma</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setModal('dm')}>➕ DM</button>
          <button className="btn-secondary" onClick={() => setModal('task')}>📋 Görev Ata</button>
          <button className="btn-primary" onClick={() => setModal('channel')}>📢 Kanal</button>
        </div>
      </div>

      <div className="panel-card" style={{ padding: 0, display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 560, overflow: 'hidden' }}>
        {/* Konuşma listesi */}
        <div style={{ borderRight: '1px solid var(--border-color)', overflowY: 'auto', maxHeight: 620 }}>
          {convs.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Henüz konuşma yok. DM/Görev/Kanal başlat.</div>
          ) : convs.map(c => (
            <div key={c.id} onClick={() => openConv(c.id)} style={{
              padding: '12px 14px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
              background: activeId === c.id ? 'var(--hover-bg)' : 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {TYPE_ICON[c.type]} {c.title}
                </span>
                {c.unread > 0 && <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px' }}>{c.unread}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {c.type === 'task' && c.taskStatus ? <span className={`status-badge ${TASK_STATUS[c.taskStatus]?.cls}`} style={{ fontSize: 9, marginRight: 4 }}>{TASK_STATUS[c.taskStatus]?.label}</span> : null}
                {c.lastMessage || (c.type === 'task' ? `Atanan: ${c.taskAssignee || '—'}` : '—')}
              </div>
            </div>
          ))}
        </div>

        {/* Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 620 }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Bir konuşma seç
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong>{TYPE_ICON[active.type]} {active.title}</strong>
                {active.type === 'task' && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <small style={{ color: 'var(--text-muted)' }}>Atanan: {active.taskAssignee || '—'}{active.taskDueAt ? ` · Son: ${new Date(active.taskDueAt).toLocaleDateString('tr-TR')}` : ''}</small>
                    <select className="form-select" style={{ fontSize: 12, padding: '4px 8px' }} value={active.taskStatus || 'OPEN'} onChange={e => setTaskStatus(e.target.value)}>
                      <option value="OPEN">Açık</option>
                      <option value="IN_PROGRESS">Devam Ediyor</option>
                      <option value="DONE">Tamamlandı</option>
                    </select>
                  </div>
                )}
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {msgs.map(m => (
                  <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    {!m.mine && active.type !== 'dm' && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{m.senderName}</div>}
                    <div style={{ background: m.mine ? '#2563EB' : 'var(--hover-bg)', color: m.mine ? '#fff' : 'var(--text-main)', padding: '8px 12px', borderRadius: 12, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.body}
                      {m.fileData && (
                        <div style={{ marginTop: 6 }}>
                          {m.fileData.startsWith('data:image')
                            ? <img src={m.fileData} alt={m.fileName || ''} style={{ maxWidth: '100%', borderRadius: 8 }} />
                            : <a href={m.fileData} download={m.fileName || 'dosya'} style={{ color: m.mine ? '#fff' : '#2563EB', textDecoration: 'underline', fontSize: 12 }}>📎 {m.fileName || 'Dosya indir'}</a>}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: m.mine ? 'right' : 'left', marginTop: 2 }}>
                      {new Date(m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {msgs.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 30 }}>İlk mesajı sen yaz 👋</div>}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', padding: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: 16, padding: '8px 10px' }} title="Dosya ekle">
                  📎<input type="file" hidden onChange={pickFile} />
                </label>
                <textarea className="form-select" style={{ flex: 1, minHeight: 40, maxHeight: 120, resize: 'vertical' }}
                  placeholder={file ? `📎 ${file.name} — mesaj yaz...` : 'Mesaj yaz...'}
                  value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
                <button className="btn-primary" onClick={send} disabled={sending || (!text.trim() && !file)}>{sending ? '...' : '➤'}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {modal && <CreateModal kind={modal} users={users} onClose={() => setModal(null)} onCreate={createConv} />}
    </div>
  )
}

function CreateModal({ kind, users, onClose, onCreate }: { kind: 'dm' | 'task' | 'channel'; users: U[]; onClose: () => void; onCreate: (p: any) => void }) {
  const [target, setTarget] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [due, setDue] = useState('')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
          {kind === 'dm' ? '💬 Yeni DM' : kind === 'task' ? '📋 Görev Ata' : '📢 Yeni Kanal'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {kind === 'channel' ? (
            <div><label className="form-label">Kanal Adı</label>
              <input className="form-select" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Genel, Operasyon..." /></div>
          ) : (
            <div><label className="form-label">{kind === 'task' ? 'Atanan Kişi' : 'Kişi'}</label>
              <select className="form-select" style={{ width: '100%' }} value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">Seç...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select></div>
          )}
          {kind === 'task' && (
            <>
              <div><label className="form-label">Görev Başlığı</label>
                <input className="form-select" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: Stok sayımını tamamla" /></div>
              <div><label className="form-label">Açıklama (ilk mesaj)</label>
                <textarea className="form-select" style={{ width: '100%', minHeight: 60 }} value={body} onChange={e => setBody(e.target.value)} /></div>
              <div><label className="form-label">Son Tarih (opsiyonel)</label>
                <input type="date" className="form-select" style={{ width: '100%' }} value={due} onChange={e => setDue(e.target.value)} /></div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn-primary" onClick={() => {
            if (kind === 'dm') onCreate({ type: 'dm', targetUserId: Number(target) })
            else if (kind === 'channel') onCreate({ type: 'channel', title })
            else onCreate({ type: 'task', title, assigneeId: Number(target), body, dueAt: due || undefined })
          }}>Oluştur</button>
          <button className="btn-secondary" onClick={onClose}>İptal</button>
        </div>
      </div>
    </div>
  )
}
