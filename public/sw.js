// public/sw.js
//
// WHAT: ده اللي بيسمح للإشعار يوصل حتى لو الموقع مقفول تماماً —
//       المتصفح بيشغّل الملف ده في الخلفية بمعزل عن أي تاب مفتوح،
//       وبيستنى أي push جاي من خوادم جوجل/آبل حتى لو التاب مقفول
// WHY:  من غير Service Worker، الإشعارات بتشتغل بس والموقع مفتوح
//       في تاب — بالظبط عكس اللي عايزينه
// KILL: من غيره، أي navigator.serviceWorker.register() هيفشل ومفيش
//       إشعارات خالص هتوصل

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// الحدث ده بيتنفذ لما يوصل push حقيقي من السيرفر — حتى لو مفيش
// ولا تاب واحد مفتوح للموقع أصلاً
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'UNO & SAMIR', body: event.data.text() }
  }

  const title = payload.title || 'UNO & SAMIR'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: payload.url || '/track-order' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// لما العميل يدوس على الإشعار — يفتحله الصفحة المناسبة (تتبع الطلب
// مثلاً)، أو لو الموقع مفتوح بالفعل في تاب، يركّز عليه بدل ما يفتح
// تاب جديد
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
