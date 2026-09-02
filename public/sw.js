self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients
      .claim()
      .then(() =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }),
      )
      .then((clients) =>
        Promise.allSettled(clients.map((client) => client.navigate(client.url))),
      ),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;
      if (event.request.mode === 'navigate') {
        const cachedShell = await caches.match('/index.html');
        if (cachedShell) return cachedShell;
      }
      return Response.error();
    }),
  );
});
