'use client'

import { useEffect, useMemo, useState } from 'react'

interface AuthUser {
  id: string
  fullName: string
  username: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  permissions: string[]
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    loading: true
  })

  useEffect(() => {
    let active = true

    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          throw new Error('unauthorized')
        }
        return res.json()
      })
      .then((data) => {
        if (!active) return
        setState({
          user: data.user || null,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          loading: false
        })
      })
      .catch(() => {
        if (!active) return
        setState({ user: null, permissions: [], loading: false })
      })

    return () => {
      active = false
    }
  }, [])

  const can = useMemo(() => {
    return (permission?: string) => {
      if (!permission) return true
      if (state.user?.role === 'ADMIN') return true
      return state.permissions.includes(permission)
    }
  }, [state.permissions, state.user?.role])

  return {
    ...state,
    can
  }
}
