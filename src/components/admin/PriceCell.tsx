/** Price in the admin lists: «8 800 000 ₽» instead of «8800000» — managers read prices, not digits. */
export function PriceCell({ cellData }: { cellData?: unknown }) {
  const n = typeof cellData === 'number' ? cellData : Number(cellData)
  if (!cellData || !Number.isFinite(n)) return <span>—</span>
  return <span style={{ whiteSpace: 'nowrap' }}>{n.toLocaleString('ru-RU')} ₽</span>
}
