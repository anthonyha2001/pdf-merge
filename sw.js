// PDF Toolkit offline copy.
// The page itself: network first (so updates arrive at once), the saved copy when offline.
// The app's own files: the saved copy first. Libraries, fonts and language data from the CDNs: the saved copy at once,
// refreshed in the background. PDFs are never sent anywhere: this only stores the app.
const VERSION = 'pdfkit-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './lib/pdf-lib.min.js', './lib/pdf.min.js', './lib/pdf.worker.min.js', './lib/jszip.min.js',
  './icons/icon-192.png', './icons/icon-512.png'];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|tessdata\.projectnaptha\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then(c => c.put(req, res)); };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  if (req.mode === 'navigate' || (same && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(res => { put('./index.html', res.clone()); return res; })
      .catch(() => caches.match('./index.html', { ignoreSearch: true }).then(r => r || caches.match('./'))));
    return;
  }
  if (same) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { put(req, res.clone()); return res; })));
    return;
  }
  if (CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => { put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    }));
  }
});
