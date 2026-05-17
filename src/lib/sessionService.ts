import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { generateSessionCode } from './sessionCode'

export interface SessionDoc {
  id: string
  code: string
  createdBy: string
  members: string[]
  memberNames: Record<string, string>
  shipName: string
  location: string
  status: 'active' | 'completed' | 'archived'
}

async function codeExists(code: string): Promise<boolean> {
  const q = query(collection(db, 'sessions'), where('code', '==', code), where('status', '==', 'active'))
  const snap = await getDocs(q)
  return !snap.empty
}

export async function createSession(uid: string, displayName: string): Promise<SessionDoc> {
  let code = generateSessionCode()
  // Retry on collision (extremely rare at 2-person scale)
  while (await codeExists(code)) {
    code = generateSessionCode()
  }

  const ref = await addDoc(collection(db, 'sessions'), {
    code,
    createdAt: serverTimestamp(),
    createdBy: uid,
    members: [uid],
    memberNames: { [uid]: displayName },
    shipName: '',
    location: '',
    status: 'active',
  })

  return { id: ref.id, code, createdBy: uid, members: [uid], memberNames: { [uid]: displayName }, shipName: '', location: '', status: 'active' }
}

export async function joinSessionByCode(
  code: string,
  uid: string,
  displayName: string,
): Promise<SessionDoc> {
  const q = query(
    collection(db, 'sessions'),
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'active'),
  )
  const snap = await getDocs(q)

  if (snap.empty) throw new Error('Session not found. Check the code and try again.')

  const docSnap = snap.docs[0]
  const data = docSnap.data() as Omit<SessionDoc, 'id'>

  if (!data.members.includes(uid)) {
    await updateDoc(docSnap.ref, {
      members: arrayUnion(uid),
      [`memberNames.${uid}`]: displayName,
    })
  }

  return { id: docSnap.id, ...data }
}

export async function getSessionByCode(code: string): Promise<SessionDoc | null> {
  const q = query(
    collection(db, 'sessions'),
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'active'),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) }
}

export async function getSessionById(sessionId: string): Promise<SessionDoc | null> {
  const snap = await getDoc(doc(db, 'sessions', sessionId))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<SessionDoc, 'id'>) }
}

export async function updateDisplayName(
  sessionId: string,
  uid: string,
  name: string,
): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), {
    [`memberNames.${uid}`]: name,
  })
}

export async function leaveSession(sessionId: string, uid: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) return

  const data = snap.data() as SessionDoc
  const remaining = data.members.filter((m) => m !== uid)

  if (remaining.length === 0) {
    await updateDoc(sessionRef, { status: 'archived' })
  } else {
    await updateDoc(sessionRef, {
      members: remaining,
    })
  }
}
