// يحفظ ملفات التطبيق على الجهاز ليفتح بدون إنترنت.
// غيّر رقم الإصدار عند تعديل الملفات لإجبار الأجهزة على التحديث.
const CACHE = "hse-field-v1";
const SHELL = [
  "./",
  "./index.html",
  "./firebase-config.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const RUNTIME_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // ملفات التطبيق: الشبكة أولًا (لتصل التحديثات)، ثم النسخة المحفوظة عند انقطاع الاتصال
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // مكتبات Firebase والخطوط: النسخة المحفوظة أولًا
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // اتصالات قاعدة البيانات نفسها لا تمر من هنا.
});
