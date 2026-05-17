import { useState } from 'react'
import { REFINERY_METHODS } from '../data/refineryMethods'
import { REFINERY_STATIONS } from '../data/refineryStations'
import { SC_ORES } from '../data/ores'
import { formatAUEC, formatTime } from '../lib/format'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { MethodComparisonTable } from './MethodComparisonTable'
import type { WorkOrderInput, OreRow } from '../lib/workOrderService'

interface Props {
  onSave: (input: WorkOrderInput, status: 'planning' | 'refining') => Promise<void>
  onCancel: () => void
}

const DEFAULT_METHOD = 'cormack'
const DEFAULT_STATION = 'ARC-L1'

export function WorkOrderForm({ onSave, onCancel }: Props) {
  const [station, setStation] = useState(DEFAULT_STATION)
  const [methodId, setMethodId] = useState(DEFAULT_METHOD)
  const [ores, setOres] = useState<OreRow[]>([{ oreType: '', rawAmount: 0 }])
  const [sellPrice, setSellPrice] = useState(0)
  const [quotedYield, setQuotedYield] = useState('')
  const [quotedCost, setQuotedCost] = useState('')
  const [quotedTimeH, setQuotedTimeH] = useState('')
  const [quotedTimeM, setQuotedTimeM] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const method = REFINERY_METHODS.find((m) => m.id === methodId)!
  const totalRaw = ores.reduce((s, o) => s + (o.rawAmount || 0), 0)

  // Live estimates — relative to Cormack baseline
  const estimatedYield = totalRaw * method.yieldMultiplier
  const estimatedTimeSeconds = totalRaw * 3600 * method.speedMultiplier // 1h/SCU baseline
  const estimatedCost = totalRaw * 500 * method.costMultiplier          // 500 aUEC/SCU baseline
  const estimatedGross = estimatedYield * sellPrice
  const estimatedNet = estimatedGross - estimatedCost

  // Actual in-game quote (user-entered)
  const actualYield = parseFloat(quotedYield) || 0
  const actualCost = parseFloat(quotedCost.replace(/,/g, '')) || 0
  const actualTimeSeconds =
    (parseFloat(quotedTimeH) || 0) * 3600 + (parseFloat(quotedTimeM) || 0) * 60
  const actualGross = actualYield * sellPrice
  const actualNet = actualGross - actualCost
  const hasQuote = actualYield > 0 && actualCost > 0

  function addOreRow() {
    setOres([...ores, { oreType: '', rawAmount: 0 }])
  }

  function removeOreRow(i: number) {
    setOres(ores.filter((_, idx) => idx !== i))
  }

  function updateOre(i: number, field: keyof OreRow, value: string | number) {
    setOres(ores.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!ores.some((o) => o.oreType && o.rawAmount > 0)) {
      e.ores = 'Add at least one ore with a non-zero amount'
    }
    if (sellPrice <= 0 && hasQuote) {
      e.sellPrice = 'Enter sell price to calculate profit'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(status: 'planning' | 'refining') {
    if (!validate()) return
    setBusy(true)
    try {
      await onSave(
        {
          refineryStation: station,
          method: methodId,
          ores: ores.filter((o) => o.oreType && o.rawAmount > 0),
          quotedYield: hasQuote ? actualYield : estimatedYield,
          quotedCost: hasQuote ? actualCost : estimatedCost,
          quotedTime: hasQuote ? actualTimeSeconds : estimatedTimeSeconds,
          sellPrice,
        },
        status,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-200 tracking-wide">New Work Order</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-xl leading-none">✕</button>
      </div>

      {/* Station + Method */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Refinery Station</label>
          <select
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {REFINERY_STATIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Refining Method</label>
          <select
            value={methodId}
            onChange={(e) => setMethodId(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {REFINERY_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — ×{m.yieldMultiplier} yield / ×{m.costMultiplier} cost
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Method info chips */}
      <div className="flex gap-2 flex-wrap -mt-3">
        <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-400">
          Yield ×{method.yieldMultiplier}
        </span>
        <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-400">
          Cost ×{method.costMultiplier}
        </span>
        <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-400">
          Speed ×{method.speedMultiplier}
        </span>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="text-xs text-amber-500 hover:text-amber-400 transition-colors ml-auto"
        >
          {showComparison ? 'Hide comparison ▲' : 'Compare all methods ▼'}
        </button>
      </div>

      {/* Method comparison table */}
      {showComparison && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 -mt-3">
          <MethodComparisonTable
            ores={ores}
            sellPrice={sellPrice}
            selectedMethod={methodId}
            onSelect={(id) => { setMethodId(id); setShowComparison(false) }}
          />
        </div>
      )}

      {/* Ore rows */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ore Mix</label>
          {errors.ores && <p className="text-xs text-red-400">{errors.ores}</p>}
        </div>

        {ores.map((ore, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                list="ore-list"
                placeholder="Ore type"
                value={ore.oreType}
                onChange={(e) => updateOre(i, 'oreType', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
              <datalist id="ore-list">
                {SC_ORES.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div className="w-28">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={ore.rawAmount || ''}
                  onChange={(e) => updateOre(i, 'rawAmount', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2.5 pr-10 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">SCU</span>
              </div>
            </div>
            {ores.length > 1 && (
              <button
                onClick={() => removeOreRow(i)}
                className="mt-2 text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addOreRow}
          className="self-start text-xs text-amber-500 hover:text-amber-400 transition-colors mt-1"
        >
          + Add ore
        </button>
      </div>

      {/* Sell price */}
      <Input
        label="Sell price per refined SCU (aUEC)"
        type="number"
        min="0"
        placeholder="e.g. 25000"
        value={sellPrice || ''}
        onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
        error={errors.sellPrice}
        className="font-mono"
      />

      {/* Estimate output */}
      {totalRaw > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Estimates <span className="normal-case">(baseline multipliers, verify in-game)</span>
          </p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Refined yield</p>
              <p className="font-mono text-slate-200">{estimatedYield.toFixed(2)} SCU</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Refinery time</p>
              <p className="font-mono text-slate-200">{formatTime(estimatedTimeSeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Refinery cost</p>
              <p className="font-mono text-slate-200">{formatAUEC(estimatedCost)} aUEC</p>
            </div>
            {sellPrice > 0 && (
              <div>
                <p className="text-xs text-slate-500">Est. net profit</p>
                <p className={`font-mono font-medium ${estimatedNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatAUEC(estimatedNet)} aUEC
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-game quote override */}
      <div className="border border-slate-700 rounded-lg p-4">
        <p className="text-xs text-amber-600 mb-3">
          Was the in-game refinery quote different? Enter the actual values below.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input
            label="Actual yield (SCU)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={quotedYield}
            onChange={(e) => setQuotedYield(e.target.value)}
            className="font-mono"
          />
          <Input
            label="Actual cost (aUEC)"
            type="number"
            min="0"
            placeholder="0"
            value={quotedCost}
            onChange={(e) => setQuotedCost(e.target.value)}
            className="font-mono"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Actual time</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={quotedTimeH}
                  onChange={(e) => setQuotedTimeH(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2.5 pr-7 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">h</span>
              </div>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={quotedTimeM}
                  onChange={(e) => setQuotedTimeM(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2.5 pr-7 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actual profit summary */}
        {hasQuote && sellPrice > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex gap-6 text-sm">
            <div>
              <p className="text-xs text-slate-500">Gross</p>
              <p className="font-mono text-slate-200">{formatAUEC(actualGross)} aUEC</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Net profit</p>
              <p className={`font-mono font-medium ${actualNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatAUEC(actualNet)} aUEC
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="secondary"
          loading={busy}
          onClick={() => handleSubmit('planning')}
          className="flex-1"
        >
          Save Draft
        </Button>
        <Button
          loading={busy}
          onClick={() => handleSubmit('refining')}
          className="flex-1"
        >
          Start Refining
        </Button>
      </div>
    </div>
  )
}
