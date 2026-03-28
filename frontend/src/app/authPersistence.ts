const STORAGE_KEY = 'auth'

interface PersistedAuth {
  token: string
  username: string
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number }
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function loadAuthState(): PersistedAuth | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined

    const auth = JSON.parse(raw) as PersistedAuth
    if (!auth.token || isTokenExpired(auth.token)) {
      localStorage.removeItem(STORAGE_KEY)
      return undefined
    }

    return auth
  } catch {
    return undefined
  }
}

export function saveAuthState(auth: PersistedAuth | null): void {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}
