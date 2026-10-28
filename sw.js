'use strict';
/* オフラインでも遊べるようにする(ホーム画面に入れたあと、電波がなくても起動する)。
   ゲームは index.html 1枚で完結しているので、それと アイコン類だけを覚えておく。
   ゲームを直しただけなら VERSION は そのままでいい(開くたびに、まずネットで最新を取りにいくので)。
   FILES(覚えるファイル)を変えたときだけ VERSION を 1つ上げる(古い覚えを 一斉に捨てる)。 */
const VERSION = 'heppoko-v1';
const FILES = ['./', 'index.html', 'install.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png',
  'js/data.js', 'js/audio.js', 'js/engine.js', 'js/map.js', 'js/battle.js', 'js/doll.js', 'js/town.js', 'js/menu.js', 'js/battle-ui.js', 'js/photo.js', 'js/main.js',
  'shots/1.jpg', 'shots/2.jpg', 'shots/3.jpg', 'shots/4.jpg', 'shots/5.jpg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => {})))).then(() => self.skipWaiting())); // 1つ(例: まだ無い紹介画像)が取れなくても、ほかは覚える
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* 開くときは まずネットで最新を取りにいく。つながらなければ 覚えているものを出す。 */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
