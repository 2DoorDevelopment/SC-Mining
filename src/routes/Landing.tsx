import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../store/useAppStore'
import { createSession, joinSessionByCode, getSessionById } from '../lib/sessionService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Toast, useToast } from '../components/ui/Toast'

export default function Landing() {
  const { code: deepLinkCode } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useAuth()
  const { displayName, lastSessionCode, sessionId, setSession, setDisplayName } = useAppStore()

  const [tab, setTab] = useState<'create' | 'join'>(deepLinkCode ? 'join' : 'create')
  const [nameInput, setNameInput] = useState(displayName)
  const [codeInput, setCodeInput] = useState(deepLinkCode ?? '')
  const [busy, setBusy] = useState(false)
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')
  const { toast, show, dismiss } = useToast()

  // Auto-rejoin last session
  useEffect(() => {
    if (!user || !lastSessionCode) return

    async function tryRejoin() {
      try {
        const session = await getSessionById(sessionId ?? '')
        if (session && session.members.includes(user!.uid) && session.status === 'active') {
          navigate(`/session/${session.code}`, { replace: true })
        }
      } catch {
        // Session gone — stay on landing
      }
    }

    tryRejoin()
  }, [user, lastSessionCode, sessionId, navigate])

  function validateName(): boolean {
    if (!nameInput.trim()) {
      setNameError('Enter a display name')
      return false
    }
    setNameError('')
    return true
  }

  async function handleCreate() {
    if (!validateName() || !user) return
    setBusy(true)
    try {
      setDisplayName(nameInput.trim())
      const session = await createSession(user.uid, nameInput.trim())
      setSession(session.id, session.code)
      navigate(`/session/${session.code}`)
    } catch (e) {
      show((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!validateName() || !user) return
    if (!codeInput.trim()) {
      setCodeError('Enter a session code')
      return
    }
    setCodeError('')
    setBusy(true)
    try {
      setDisplayName(nameInput.trim())
      const session = await joinSessionByCode(codeInput.trim(), user.uid, nameInput.trim())
      setSession(session.id, session.code)
      navigate(`/session/${session.code}`)
    } catch (e) {
      setCodeError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-400 text-sm animate-pulse">Initializing...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-amber-400 tracking-widest uppercase mb-1">
          Quantum Yield
        </h1>
        <p className="text-slate-500 text-sm tracking-wider">SC Mining Co-op Tool</p>
      </div>

      {/* Firebase not configured banner */}
      {authError && (
        <div className="w-full max-w-sm mb-6 px-4 py-3 bg-slate-800 border border-amber-600 rounded text-amber-300 text-sm">
          {authError}
        </div>
      )}

      {/* Tab switcher */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex rounded overflow-hidden border border-slate-700">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'create' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            New Session
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'join' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            Join Session
          </button>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
        <Input
          label="Your name"
          placeholder="e.g. Noah"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          error={nameError}
          maxLength={24}
          autoFocus
        />

        {tab === 'join' && (
          <Input
            label="Session code"
            placeholder="e.g. TIBURON"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            error={codeError}
            maxLength={12}
            className="font-mono tracking-widest text-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        )}

        <Button
          size="lg"
          loading={busy}
          disabled={!user || !!authError}
          onClick={tab === 'create' ? handleCreate : handleJoin}
          className="w-full mt-2"
        >
          {tab === 'create' ? 'Create Session' : 'Join Session'}
        </Button>
      </div>

      {/* Deep-link note */}
      {deepLinkCode && (
        <p className="mt-4 text-slate-500 text-xs">
          Joining session <span className="font-mono text-slate-300">{deepLinkCode}</span>
        </p>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </div>
  )
}
