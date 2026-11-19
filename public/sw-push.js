// sw-push.js — Service Worker Handler para Web Push e Notificações do Dinheirizz

self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  let payload = {}
  try {
    payload = event.data.json()
  } catch (_err) {
    payload = {
      title: 'Dinheirizz',
      body: event.data.text()
    }
  }

  const title = payload.title || 'Dinheirizz'
  const options = {
    body: payload.body || 'Você possui um novo alerta financeiro.',
    icon: payload.icon || '/dinheirizz-dark/android-chrome-192x192.png',
    badge: payload.badge || '/dinheirizz-dark/favicon-32x32.png',
    data: payload.data || { url: '/' },
    vibrate: [100, 50, 100]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client && typeof client.navigate === 'function') {
              client.navigate(targetUrl)
            }
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})
