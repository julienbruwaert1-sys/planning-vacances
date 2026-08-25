const CACHE_NAME = "planning-v41";

const APP_SHELL = [
    "./index.html",
    "./Planning_v1.0.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./vendor/xlsx.full.min.js",
    "./vendor/firebase-app-compat.js",
    "./vendor/firebase-database-compat.js"
];

const RUNTIME_CACHE_HOSTS = [
    "fonts.googleapis.com",
    "fonts.gstatic.com"
];

self.addEventListener("install",event=>{
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache=>cache.addAll(APP_SHELL))
        .then(()=>self.skipWaiting())
    );
});

self.addEventListener("activate",event=>{
    event.waitUntil(
        caches.keys()
        .then(keys=>Promise.all(
            keys
            .filter(key=>key!==CACHE_NAME)
            .map(key=>caches.delete(key))
        ))
        .then(()=>self.clients.claim())
    );
});

self.addEventListener("fetch",event=>{

    const url = new URL(event.request.url);

    if(event.request.method!=="GET") return;

    if(RUNTIME_CACHE_HOSTS.includes(url.hostname)){
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    if(url.origin===self.location.origin){
        event.respondWith(cacheFirst(event.request));
    }
});

async function cacheFirst(request){

    const cached = await caches.match(request);
    if(cached) return cached;

    try{
        const response = await fetch(request);
        if(response.ok){
            const cache = await caches.open(CACHE_NAME);
            cache.put(request,response.clone());
        }
        return response;
    }catch(err){
        return cached || Response.error();
    }
}

async function staleWhileRevalidate(request){

    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkFetch = fetch(request)
    .then(response=>{
        if(response.ok) cache.put(request,response.clone());
        return response;
    })
    .catch(()=>cached);

    return cached || networkFetch;
}
