import { Routes, Route } from 'react-router-dom'
import WorkOrders from './WorkOrders'
import Timers from './Timers'
import Crew from './Crew'
import Payouts from './Payouts'

export default function Session() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<WorkOrders />} />
          <Route path="timers" element={<Timers />} />
          <Route path="crew" element={<Crew />} />
          <Route path="payouts" element={<Payouts />} />
        </Routes>
      </main>
    </div>
  )
}
