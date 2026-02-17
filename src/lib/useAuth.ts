'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'

interface AuthUser {
  id: string
  fullName: string
  username: string
  role: string
  tenantId: string
  farmId: string
}

interface FarmInfo {
  id: string
  name: string
  nameAr: string
  currency?: string
}

interface UserFarm {
  id: string
  name: string
  nameAr: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  farm: FarmInfo | null
  farms: UserFarm[]
  permissions: string[]
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    farm: null,
    farms: [],
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
          farm: data.farm || null,
          farms: Array.isArray(data.farms) ? data.farms : [],
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          loading: false
        })
      })
      .catch(() => {
        if (!active) return
        setState({ user: null, farm: null, farms: [], permissions: [], loading: false })
      })

    return () => {
      active = false
    }
  }, [])

  const can = useMemo(() => {
    return (permission?: string) => {
      if (!permission) return true
      if (['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(state.user?.role || '')) return true
      return state.permissions.includes(permission)
    }
  }, [state.permissions, state.user?.role])

  const switchFarm = useCallback(async (farmId: string) => {
    const res = await fetch('/api/farms/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId })
    })
    if (res.ok) {
      window.location.reload()
    }
  }, [])

  return {
    ...state,
    can,
    switchFarm,
  }
}
