// Service Worker — Financeiro Coutinho
// Permite abrir o app offline e instalá-lo no celular.
// Ao publicar uma versão nova, mude o número da versão abaixo (v1 -> v2 ...)
// para forçar a limpeza do cache antigo.
const CACHE = 'financeiro-v1';

// Arquivos locais essenciais (o resto, como React/Tailwind/Firebase via CDN,
// é guardado automaticamente na primeira vez que o app abre com internet).
const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(ESSENCIAIS.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // nunca intercepta gravações

  const url = new URL(req.url);

  // Deixa o Firebase cuidar da própria rede (ele tem offline próprio para os dados)
  const dominiosFirebase = [
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebaseinstallations.googleapis.com',
    'firebaseio.com'
  ];
  if (dominiosFirebase.some((d) => url.hostname.includes(d))) return;

  // Página HTML: tenta a rede primeiro (pega atualizações), cai pro cache se offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Demais recursos (scripts CDN, ícones, fontes): cache primeiro, rede como reserva
  event.respondWith(
    caches.match(req).then((cacheado) =>
      cacheado ||
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
          return resp;
        })
        .catch(() => cacheado)
    )
  );
});
