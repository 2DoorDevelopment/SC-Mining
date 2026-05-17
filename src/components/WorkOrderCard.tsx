import { useState } from 'react'
import { formatAUEC, formatTime } from '../lib/format'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useCountdown } from '../hooks/useCountdown'
import type { WorkOrder } from '../hooks/useWorkOrders'

interface Props {
  order: WorkOrder
  onStartRefining: () => Promise<void>
  onMarkSold: (finalSalePrice: number) => Promise<void>
  onDelete: () => Promise<void>
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'border-slate-600 bg-slate-800/40',
  refining: 'border-amber-700/60 bg-amber-950/20',
  ready: 'border-green-700/60 bg-green-950/20',
  sold: 'border-slate-700 bg-slate-800/20 opacity-60',
}

const STATUS_BADGE: Record<string, string> = {
  planning: 'bg-slate-700 text-slate-300',
  refining: 'bg-amber-800/60 text-amber-300',
  ready: 'bg-green-800/60 text-green-300',
  sold: 'bg-slate-700 text-slate-400',
}

export function WorkOrderCard({ order, onStartRefining, onMarkSold, onDelete }: Props) {
  const [showSoldInput, setShowSoldInput] = useState(false)
  const [salePrice, setSalePrice] = useState(
    order.finalSalePrice?.toString() ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [showQuoteEdit, setShowQuoteEdit] = useState(false)

  const endsAt =
    order.status === 'refining' && order.startedAt
      ? new Date(order.startedAt.toDate().getTime() + order.quotedTime * 1000)
      : null

  const secondsLeft = useCountdown(endsAt)
  const progress = endsAt && order.quotedTime > 0
    ? Math.max(0, Math.min(1, 1 - secondsLeft / order.quotedTime))
    : 0

  const net =
    (order.finalSalePrice ?? order.quotedYield * order.sellPrice) - order.quotedCost

  async function handleStartRefining() {
    setBusy(true)
    try { await onStartRefining() } finally { setBusy(false) }
  }

  async function handleMarkSold() {
    const price = parseFloat(salePrice.replace(/,/g, ''))
    if (!price) return
    setBusy(true)
    try { await onMarkSold(price) } finally { setBusy(false) }
  }

  return (
    <div className={`rounded-xl border p-4 transition-colors ${STATUS_COLORS[order.status]}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium rounded px-2 py-0.5 ${STATUS_BADGE[order.status]}`}>
              {order.status.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">{order.refineryStation}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{order.method.replace(/-/g, ' ')}</span>
          </div>

          {/* Ore mix */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {order.ores.map((o, i) => (
              <span key={i} className="text-xs bg-slate-700/60 rounded px-2 py-0.5 text-slate-300 font-mono">
                {o.rawAmount} SCU {o.oreType}
              </span>
            ))}
          </div>
        </div>

        {/* Delete */}
        {order.status !== 'refining' && (
          <button
            onClick={onDelete}
            className="text-slate-600 hover:text-red-400 transition-colors text-sm leading-none shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Timer for refining orders */}
      {order.status === 'refining' && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500">Time remaining</span>
            <span className={`font-mono text-lg font-medium ${secondsLeft === 0 ? 'text-green-400' : 'text-amber-400'}`}>
              {secondsLeft === 0 ? 'READY' : formatTime(secondsLeft)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-xs text-slate-500">Yield</p>
          <p className="font-mono text-sm text-slate-200">{order.quotedYield.toFixed(1)} SCU</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Cost</p>
          <p className="font-mono text-sm text-slate-200">{formatAUEC(order.quotedCost)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Est. net</p>
          <p className={`font-mono text-sm font-medium ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatAUEC(net)}
          </p>
        </div>
      </div>

      {/* Quote override hint */}
      {order.status === 'planning' && (
        <button
          onClick={() => setShowQuoteEdit(!showQuoteEdit)}
          className="text-xs text-slate-500 hover:text-amber-400 transition-colors mb-3 block"
        >
          Was the in-game quote different? {showQuoteEdit ? '▲ Hide' : '▼ Override'}
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'planning' && (
          <Button size="sm" loading={busy} onClick={handleStartRefining} className="flex-1">
            Start Refining
          </Button>
        )}

        {order.status === 'ready' && !showSoldInput && (
          <Button size="sm" onClick={() => setShowSoldInput(true)} className="flex-1">
            Mark Sold
          </Button>
        )}

        {order.status === 'ready' && showSoldInput && (
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Final sale (aUEC)"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="font-mono text-sm py-1.5"
            />
            <Button size="sm" loading={busy} onClick={handleMarkSold}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSoldInput(false)}>
              ✕
            </Button>
          </div>
        )}

        {order.status === 'sold' && order.finalSalePrice && (
          <div className="flex-1 text-center">
            <p className="text-xs text-slate-500">Final sale</p>
            <p className="font-mono text-green-400 font-medium">{formatAUEC(order.finalSalePrice)} aUEC</p>
          </div>
        )}
      </div>
    </div>
  )
}
