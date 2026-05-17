import { SESSION_WORDS } from '../data/sessionWords'

export function generateSessionCode(): string {
  const idx = Math.floor(Math.random() * SESSION_WORDS.length)
  return SESSION_WORDS[idx].toUpperCase()
}
