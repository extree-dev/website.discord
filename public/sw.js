const CACHE_NAME = 'v1-core'
const RUNTIME_CACHE = 'v1-runtime'

const criticalAssets = [
  '/',
  '/login',
  '/static/js/vendor-react.js',
  '/static/js/vendor-styles.js'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(criticalAssets))
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // API кэшируем по-другому
    event.respondWith(networkFirst(event.request))
  } else {
    event.respondWith(cacheFirst(event.request))
  }
})