import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './routes/Landing'
import Session from './routes/Session'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join/:code" element={<Landing />} />
      <Route path="/session/:code/*" element={<Session />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
