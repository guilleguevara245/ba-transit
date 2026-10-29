import { useEffect, useState } from 'react'
import { getSession, subscribeSession } from '../utils/session.js'

/** La sesion actual ({ token, user } o null), siempre al dia. */
export function useSession() {
  const [session, setSession] = useState(getSession)
  useEffect(() => subscribeSession(setSession), [])
  return session
}
