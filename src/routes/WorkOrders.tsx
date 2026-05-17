import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { saveWorkOrder, startRefining, markSold, deleteWorkOrder } from '../lib/workOrderService'
import type { WorkOrderInput } from '../lib/workOrderService'
import { WorkOrderForm } from '../components/WorkOrderForm'
import { WorkOrderCard } from '../components/WorkOrderCard'
import { Button } from '../components/ui/Button'
import { Toast, useToast } from '../components/ui/Toast'

const STATUS_ORDER = { refining: 0, ready: 1, planning: 2, sold: 3 }

export default function WorkOrders() {
  const { sessionId } = useAppStore()
  const { user } = useAuth()
  const { workOrders, loading } = useWorkOrders(sessionId)
  const [showForm, setShowForm] = useState(false)
  const { toast, show, dismiss } = useToast()

  async function handleSave(input: WorkOrderInput, status: 'planning' | 'refining') {
    if (!sessionId || !user) {
      show('No active session — set up Firebase first', 'error')
      return
    }
    try {
      await saveWorkOrder(sessionId, user.uid, input, status)
      setShowForm(false)
      show(status === 'refining' ? 'Refining started!' : 'Draft saved', 'success')
    } catch {
      show('Failed to save — check Firebase setup', 'error')
    }
  }

  async function handleStartRefining(orderId: string) {
    if (!sessionId) return
    try {
      await startRefining(sessionId, orderId)
    } catch {
      show('Failed to start refining', 'error')
    }
  }

  async function handleMarkSold(orderId: string, finalSalePrice: number) {
    if (!sessionId) return
    try {
      await markSold(sessionId, orderId, finalSalePrice)
      show('Marked as sold!', 'success')
    } catch {
      show('Failed to mark sold', 'error')
    }
  }

  async function handleDelete(orderId: string) {
    if (!sessionId) return
    try {
      await deleteWorkOrder(sessionId, orderId)
      show('Work order deleted', 'info')
    } catch {
      show('Failed to delete', 'error')
    }
  }

  const sorted = [...workOrders].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4),
  )

  const active = sorted.filter((o) => o.status !== 'sold')
  const sold = sorted.filter((o) => o.status === 'sold')

  if (showForm) {
    return (
      <>
        <WorkOrderForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
      </>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-200 tracking-wide uppercase">Work Orders</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>+ New Order</Button>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-500 text-sm animate-pulse">Loading...</div>
      )}

      {!loading && workOrders.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm mb-1">No work orders yet.</p>
          <p className="text-slate-600 text-xs">Submit a refinery job in-game, then track it here.</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="mt-4">
            + New Order
          </Button>
        </div>
      )}

      {/* Active orders */}
      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          {active.map((order) => (
            <WorkOrderCard
              key={order.id}
              order={order}
              onStartRefining={() => handleStartRefining(order.id)}
              onMarkSold={(price) => handleMarkSold(order.id, price)}
              onDelete={() => handleDelete(order.id)}
            />
          ))}
        </div>
      )}

      {/* Sold orders (collapsed) */}
      {sold.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-2">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {sold.length} sold order{sold.length !== 1 ? 's' : ''}
          </summary>
          <div className="flex flex-col gap-3 mt-3">
            {sold.map((order) => (
              <WorkOrderCard
                key={order.id}
                order={order}
                onStartRefining={() => handleStartRefining(order.id)}
                onMarkSold={(price) => handleMarkSold(order.id, price)}
                onDelete={() => handleDelete(order.id)}
              />
            ))}
          </div>
        </details>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  )
}
