import { useEffect, useState } from 'react'
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })

    signInAnonymously(auth).catch((e) => {
      // Firebase not configured yet (missing env vars) or domain not authorized
      const msg =
        e.code === 'auth/invalid-api-key'
          ? 'Firebase not configured — add your .env.local keys to enable sessions.'
          : e.code === 'auth/unauthorized-domain'
            ? 'Add this domain to Firebase Auth → Authorized Domains.'
            : `Auth error: ${e.message}`
      setError(msg)
      setLoading(false)
    })

    return unsub
  }, [])

  return { user, loading, error }
}
