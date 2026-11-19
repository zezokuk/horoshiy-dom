'use client'

import { useState } from 'react'

type Status = 'free' | 'reserved' | 'sold'

const ITEMS: { value: Status; label: string; bg: string; fg: string }[] = [
  { value: 'free', label: 'Свободен', bg: '#2e6b45', fg: '#ffffff' },
  { value: 'reserved', label: 'Бронь', bg: '#a5482d', fg: '#ffffff' },
  { value: 'sold', label: 'Продан', bg: '#6e7671', fg: '#ffffff' },
]

/** Быстрое переключение статуса дома прямо в таблице списка домов админки (в 1 клик). */
export function StatusCell({
  cellData,
  rowData,
}: {
  cellData?: unknown
  rowData?: { id?: number | string }
}) {
  const initial = (cellData === 'free' || cellData === 'reserved' || cellData === 'sold' ? cellData : 'free') as Status
  const [status, setStatus] = useState<Status>(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(false)

  const change = async (next: Status, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (saving || next === status || !rowData?.id) return
    const prev = status
    setStatus(next)
    setSaving(true)
    setErr(false)
    try {
      const res = await fetch(`/api/houses/${rowData.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setStatus(prev)
      setErr(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ display: 'inline-flex', gap: 4, alignItems: 'center', opacity: saving ? 0.65 : 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      {ITEMS.map((it) => {
        const active = status === it.value
        return (
          <button
            key={it.value}
            type="button"
            disabled={saving}
            onClick={(e) => change(it.value, e)}
            style={{
              cursor: saving ? 'wait' : 'pointer',
              borderRadius: 999,
              border: active ? `1px solid ${it.bg}` : '1px solid rgba(128,128,128,0.3)',
              background: active ? it.bg : 'transparent',
              color: active ? it.fg : 'inherit',
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1,
              padding: '5px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {it.label}
          </button>
        )
      })}
      {err && <span style={{ color: '#a5482d', fontSize: 11 }} title="Ошибка сохранения">!</span>}
    </div>
  )
}
