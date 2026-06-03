var CACHE = 'everyday-v6';
var STATIC = ['/manifest.json', '/icon.png'];

var API_DOMAINS = [
  'open.er-api.com','frankfurter.app','jsdelivr.net',
  'mymemory.translated','open-meteo.com','geocoding-api'
];

function isAPI(url) {
  return API_DOMAINS.some(function(d){ return url.indexOf(d) >= 0; });
}

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(STATIC); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // API calls — always network, never cache
  if (isAPI(url)) {
    e.respondWith(fetch(e.request, {cache:'no-store'}).catch(function(){
      return new Response('{}', {headers:{'Content-Type':'application/json'}});
    }));
    return;
  }

  // index.html — network first, fall back to cache
  if (url.indexOf('/index.html') >= 0 || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).then(function(res){
        var clone = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return res;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // Everything else — cache first
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        return caches.open(CACHE).then(function(c){
          c.put(e.request, res.clone());
          return res;
        });
      }).catch(function(){ return caches.match('/index.html'); });
    })
  );
});
