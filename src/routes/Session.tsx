import { useEffect, useState } from 'react'
import { Routes, Route, useParams, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSession } from '../hooks/useSession'
import { useAppStore } from '../store/useAppStore'
import { updateDisplayName, leaveSession } from '../lib/sessionService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Toast, useToast } from '../components/ui/Toast'
import WorkOrders from './WorkOrders'
import Timers from './Timers'
import Crew from './Crew'
import Payouts from './Payouts'

export default function Session() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sessionId, displayName, clearSession, setDisplayName } = useAppStore()
  const { session, loading } = useSession(sessionId)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(displayName)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const { toast, show, dismiss } = useToast()

  // Redirect if session gone or user not a member
  useEffect(() => {
    if (!loading && (!session || (user && !session.members.includes(user.uid)))) {
      clearSession()
      navigate('/', { replace: true })
    }
  }, [session, loading, user, clearSession, navigate])

  async function saveName() {
    if (!sessionId || !user || !nameInput.trim()) return
    try {
      await updateDisplayName(sessionId, user.uid, nameInput.trim())
      setDisplayName(nameInput.trim())
      setEditingName(false)
    } catch {
      show('Failed to update name', 'error')
    }
  }

  async function handleLeave() {
    if (!sessionId || !user) return
    try {
      await leaveSession(sessionId, user.uid)
      clearSession()
      navigate('/', { replace: true })
    } catch {
      show('Failed to leave session', 'error')
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code ?? '')
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#/join/${code}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-400 text-sm animate-pulse">Loading session...</div>
      </div>
    )
  }

  if (!session) return null

  const memberList = session.members.map((uid) => ({
    uid,
    name: session.memberNames[uid] ?? 'Unknown',
  }))

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Session header */}
      <header className="bg-slate-800/80 border-b border-slate-700 px-4 py-3">
        {/* Code row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-amber-400 tracking-widest">{code}</span>
            <button
              onClick={copyCode}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-600 rounded px-2 py-1"
            >
              {codeCopied ? 'Copied!' : 'Copy code'}
            </button>
            <button
              onClick={copyLink}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-600 rounded px-2 py-1"
            >
              {linkCopied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLeave} className="text-red-400 hover:text-red-300">
            Leave
          </Button>
        </div>

        {/* Save code notice — always visible in session header */}
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-950/40 border border-amber-900/50 rounded px-2.5 py-1.5 mb-2">
          <span>⚠</span>
          <span>Save this code — you'll need it to rejoin from another device or after clearing site data.</span>
        </div>

        {/* Members row */}
        <div className="flex items-center gap-2 flex-wrap">
          {memberList.map((m) => (
            <div key={m.uid} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${m.uid === user?.uid ? 'bg-amber-400' : 'bg-slate-500'}`} />
              {m.uid === user?.uid && editingName ? (
                <span className="flex items-center gap-1">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="py-0.5 px-2 text-xs h-6 w-28"
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    autoFocus
                  />
                  <button onClick={saveName} className="text-xs text-amber-400">✓</button>
                  <button onClick={() => setEditingName(false)} className="text-xs text-slate-500">✕</button>
                </span>
              ) : (
                <button
                  onClick={() => m.uid === user?.uid && setEditingName(true)}
                  className={`text-xs ${m.uid === user?.uid ? 'text-slate-200 hover:text-amber-400' : 'text-slate-400'} transition-colors`}
                  title={m.uid === user?.uid ? 'Click to edit name' : undefined}
                >
                  {m.name}
                  {m.uid === user?.uid && <span className="ml-1 text-slate-500">✎</span>}
                </button>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Route content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/" element={<WorkOrders />} />
          <Route path="timers" element={<Timers />} />
          <Route path="crew" element={<Crew />} />
          <Route path="payouts" element={<Payouts />} />
        </Routes>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-800 border-t border-slate-700 flex">
        {[
          { to: `.`, label: 'Orders', icon: '📋', end: true },
          { to: `timers`, label: 'Timers', icon: '⏱', end: false },
          { to: `crew`, label: 'Crew', icon: '👥', end: false },
          { to: `payouts`, label: 'Payouts', icon: '💰', end: false },
        ].map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 text-xs transition-colors ${
                isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <span className="text-lg leading-none mb-0.5">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  )
}
