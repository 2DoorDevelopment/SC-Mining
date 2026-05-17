import { REFINERY_METHODS } from '../data/refineryMethods'
import { formatAUEC, formatTime } from '../lib/format'

interface OreRow {
  oreType: string
  rawAmount: number
}

interface Props {
  ores: OreRow[]
  sellPrice: number
  baseYield?: number   // fraction, default 1.0
  baseCostPerSCU?: number
  baseTimePerSCU?: number // seconds
  onSelect: (methodId: string) => void
  selectedMethod: string
}

export function MethodComparisonTable({
  ores,
  sellPrice,
  baseYield = 1.0,
  baseCostPerSCU = 500,
  baseTimePerSCU = 3600,
  onSelect,
  selectedMethod,
}: Props) {
  const totalRaw = ores.reduce((s, o) => s + o.rawAmount, 0)

  const rows = REFINERY_METHODS.map((m) => {
    const refined = totalRaw * baseYield * m.yieldMultiplier
    const cost = totalRaw * baseCostPerSCU * m.costMultiplier
    const timeSeconds = totalRaw * baseTimePerSCU * m.speedMultiplier
    const gross = refined * sellPrice
    const net = gross - cost
    return { method: m, refined, cost, timeSeconds, gross, net }
  })

  const bestNet = Math.max(...rows.map((r) => r.net))
  const bestTime = Math.min(...rows.map((r) => r.timeSeconds))
  const bestCost = Math.min(...rows.map((r) => r.cost))

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-slate-500 mb-3">
        Estimates — verify against in-game quote. Base cost/time scaled to total{' '}
        <span className="font-mono">{totalRaw} SCU</span>.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700">
            <th className="text-left py-2 pr-3">Method</th>
            <th className="text-right py-2 px-2">Yield</th>
            <th className="text-right py-2 px-2">Cost</th>
            <th className="text-right py-2 px-2">Time</th>
            <th className="text-right py-2 pl-2">Net</th>
            <th className="py-2 pl-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ method, refined, cost, timeSeconds, net }) => {
            const isBestNet = net === bestNet
            const isBestTime = timeSeconds === bestTime
            const isBestCost = cost === bestCost
            const isSelected = method.id === selectedMethod

            return (
              <tr
                key={method.id}
                onClick={() => onSelect(method.id)}
                className={`border-b border-slate-800 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-950/40'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <td className="py-2.5 pr-3">
                  <div className={`font-medium ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                    {method.name}
                  </div>
                  <div className="text-xs text-slate-500">{method.description}</div>
                </td>
                <td className="text-right py-2.5 px-2 font-mono text-slate-300">
                  {refined.toFixed(1)} SCU
                  {isBestNet && (
                    <span className="ml-1 text-xs text-green-400">↑</span>
                  )}
                </td>
                <td className={`text-right py-2.5 px-2 font-mono ${isBestCost ? 'text-green-400' : 'text-slate-300'}`}>
                  {formatAUEC(cost)}
                </td>
                <td className={`text-right py-2.5 px-2 font-mono text-xs ${isBestTime ? 'text-green-400' : 'text-slate-400'}`}>
                  {formatTime(timeSeconds)}
                </td>
                <td className={`text-right py-2.5 pl-2 font-mono font-medium ${net >= 0 ? (isBestNet ? 'text-green-400' : 'text-slate-200') : 'text-red-400'}`}>
                  {formatAUEC(net)}
                </td>
                <td className="pl-3 py-2.5">
                  {isSelected && (
                    <span className="text-amber-400 text-xs">✓</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
