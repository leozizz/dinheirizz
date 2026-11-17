// pushClient.ts — Utilitários puros para Web Push no navegador (PWA)

export const isPushNotificationSupported = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const hasServiceWorker = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker)
  const hasPushManager = 'PushManager' in window && Boolean(window.PushManager)
  const hasNotification = 'Notification' in window && Boolean(window.Notification)

  return Boolean(hasServiceWorker && hasPushManager && hasNotification)
}

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (_err) {
    return null
  }
}

export const subscribeBrowserPush = async (vapidPublicKey: string): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return null
  }

  const registration = await navigator.serviceWorker.ready
  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    return existing
  }

  return await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  })
}

export const unsubscribeBrowserPush = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      return await subscription.unsubscribe()
    }
    return true
  } catch (_err) {
    return false
  }
}
