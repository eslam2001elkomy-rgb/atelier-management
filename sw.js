// تحديد اسم الكاش الخاص بالتطبيق
const CACHE_NAME = 'atelier-v1';

// الملفات اللي التطبيق محتاجها عشان يشتغل (هنا ممكن تضيف مسارات ملفاتك)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. حدث التثبيت: بيخزن الملفات في الكاش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. حدث التفعيل: بينظف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. حدث الجلب: بيقدم الملفات من الكاش عشان التطبيق يفتح بسرعة
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
