'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'error'

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading')
  const [error, setError] = useState<string | null>(null)
  const vapidKeyRef = useRef<string>('')

  // Check current state on mount
  useEffect(() => {
    checkState()
  }, [])

  const checkState = async () => {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    // Fetch VAPID key from server (runtime, not build-time)
    if (!vapidKeyRef.current) {
      try {
        const res = await fetch('/api/push/vapid')
        const data = await res.json()
        if (data.publicKey) {
          vapidKeyRef.current = data.publicKey
        } else {
          setState('error')
          setError('VAPID key not configured')
          return
        }
      } catch {
        setState('error')
        setError('Failed to fetch VAPID key')
        return
      }
    }

    // Check notification permission
    const permission = Notification.permission
    if (permission === 'denied') {
      setState('denied')
      return
    }

    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        // Verify with server
        const res = await fetch('/api/push/subscribe')
        const data = await res.json()
        setState(data.subscribed ? 'subscribed' : 'unsubscribed')
      } else {
        setState('unsubscribed')
      }
    } catch {
      setState('unsubscribed')
    }
  }

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState('loading')
      setError(null)

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return false
      }

      // Wait for service worker
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKeyRef.current) as BufferSource,
      })

      // Send to server
      const subJson = subscription.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          }
        }),
      })

      if (!res.ok) throw new Error('فشل في حفظ الاشتراك')

      setState('subscribed')
      return true
    } catch (err) {
      console.error('Push subscribe failed:', err)
      setError(err instanceof Error ? err.message : 'فشل في التفعيل')
      setState('error')
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState('loading')
      setError(null)

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe()

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setState('unsubscribed')
      return true
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
      setError(err instanceof Error ? err.message : 'فشل في الإلغاء')
      setState('error')
      return false
    }
  }, [])

  const sendTestNotification = useCallback(async () => {
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alerts: [{
            id: 'test-1',
            type: 'HEALTH',
            severity: 'info',
            title: 'إشعار تجريبي',
            message: 'تم تفعيل الإشعارات بنجاح! ستصلك تنبيهات المزرعة تلقائياً.',
            date: new Date().toISOString(),
          }]
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  return {
    state,
    error,
    isSupported: state !== 'unsupported',
    isSubscribed: state === 'subscribed',
    isDenied: state === 'denied',
    isLoading: state === 'loading',
    subscribe,
    unsubscribe,
    sendTestNotification,
    refresh: checkState,
  }
}
