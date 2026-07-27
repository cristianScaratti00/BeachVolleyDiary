/* Beach Volley Diary — service worker minimo.
   Fa due cose sole:
   1. rende il sito installabile ("Aggiungi a Home"): Chrome mostra il prompt
      di installazione solo se esiste un service worker con un handler `fetch`;
   2. serve una pagina di cortesia quando l'app viene aperta senza rete.

   Deliberatamente NON mette in cache i bundle dell'app: gli asset di Vite
   hanno l'hash nel nome e cambiano ad ogni deploy, quindi una cache qui
   porterebbe solo il rischio di servire una versione stantia. Tutto ciò che
   non è una navigazione passa dritto alla rete. */

const CACHE = 'bvd-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `cache: 'reload'` evita che la pagina offline venga presa dalla cache
      // HTTP del browser: al primo install vogliamo quella appena deployata.
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.mode !== 'navigate') return

  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return (
        cached ||
        new Response('<h1>Sei offline</h1>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      )
    }),
  )
})
