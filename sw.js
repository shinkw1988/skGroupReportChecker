const CACHE_NAME = 'group-checker-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './favicon.png',
    './background.jpg',
    'https://fonts.googleapis.com/css2?family=Yusei+Magic&display=swap'
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// ネットワーク優先（オフライン時はキャッシュを使用）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
