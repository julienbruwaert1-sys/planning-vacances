const CACHE_NAME = "planning-v177";

/* Cache des tuiles de carte : nom fixe, jamais purgé par activate (contrairement
   à CACHE_NAME), pour que les zones déjà visitées restent dispo hors-ligne
   même après une mise à jour de l'app. */
const TILE_CACHE_NAME = "planning-map-tiles-v1";

const APP_SHELL = [
    "./index.html",
    "./Planning_v1.0.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icons/icon-192-germany.png",
    "./icons/icon-512-germany.png",
    "./icons/icon-192-australia.png",
    "./icons/icon-512-australia.png",
    "./icons/icon-192-austria.png",
    "./icons/icon-512-austria.png",
    "./icons/icon-192-belgium.png",
    "./icons/icon-512-belgium.png",
    "./icons/icon-192-brazil.png",
    "./icons/icon-512-brazil.png",
    "./icons/icon-192-canada.png",
    "./icons/icon-512-canada.png",
    "./icons/icon-192-china.png",
    "./icons/icon-512-china.png",
    "./icons/icon-192-southkorea.png",
    "./icons/icon-512-southkorea.png",
    "./icons/icon-192-egypt.png",
    "./icons/icon-512-egypt.png",
    "./icons/icon-192-spain.png",
    "./icons/icon-512-spain.png",
    "./icons/icon-192-usa.png",
    "./icons/icon-512-usa.png",
    "./icons/icon-192-france.png",
    "./icons/icon-512-france.png",
    "./icons/icon-192-greece.png",
    "./icons/icon-512-greece.png",
    "./icons/icon-192-india.png",
    "./icons/icon-512-india.png",
    "./icons/icon-192-italy.png",
    "./icons/icon-512-italy.png",
    "./icons/icon-192-japan.png",
    "./icons/icon-512-japan.png",
    "./icons/icon-192-nepal.png",
    "./icons/icon-512-nepal.png",
    "./icons/icon-192-netherlands.png",
    "./icons/icon-512-netherlands.png",
    "./icons/icon-192-portugal.png",
    "./icons/icon-512-portugal.png",
    "./icons/icon-192-switzerland.png",
    "./icons/icon-512-switzerland.png",
    "./icons/icon-192-thailand.png",
    "./icons/icon-512-thailand.png",
    "./icons/icon-192-croatia.png",
    "./icons/icon-512-croatia.png",
    "./icons/icon-192-denmark.png",
    "./icons/icon-512-denmark.png",
    "./icons/icon-192-finland.png",
    "./icons/icon-512-finland.png",
    "./icons/icon-192-hungary.png",
    "./icons/icon-512-hungary.png",
    "./icons/icon-192-iceland.png",
    "./icons/icon-512-iceland.png",
    "./icons/icon-192-norway.png",
    "./icons/icon-512-norway.png",
    "./icons/icon-192-czechrepublic.png",
    "./icons/icon-512-czechrepublic.png",
    "./icons/icon-192-romania.png",
    "./icons/icon-512-romania.png",
    "./icons/icon-192-sweden.png",
    "./icons/icon-512-sweden.png",
    "./icons/icon-192-singapore.png",
    "./icons/icon-512-singapore.png",
    "./icons/icon-192-turkey.png",
    "./icons/icon-512-turkey.png",
    "./icons/icon-192-chile.png",
    "./icons/icon-512-chile.png",
    "./icons/icon-192-default.png",
    "./icons/icon-512-default.png",
    "./vendor/xlsx.full.min.js",
    "./vendor/firebase-app-compat.js",
    "./vendor/firebase-database-compat.js",
    "./vendor/leaflet.js",
    "./vendor/leaflet.css",
    "./vendor/leaflet.markercluster.js",
    "./vendor/MarkerCluster.css",
    "./vendor/MarkerCluster.Default.css"
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
            .filter(key=>key!==CACHE_NAME && key!==TILE_CACHE_NAME)
            .map(key=>caches.delete(key))
        ))
        .then(()=>self.clients.claim())
    );
});

self.addEventListener("fetch",event=>{

    const url = new URL(event.request.url);

    if(event.request.method!=="GET") return;

    if(url.hostname.endsWith("tile.openstreetmap.org")){
        event.respondWith(cacheFirstTiles(event.request));
        return;
    }

    if(RUNTIME_CACHE_HOSTS.includes(url.hostname)){
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    if(url.origin===self.location.origin){
        event.respondWith(cacheFirst(event.request));
    }
});

async function cacheFirstTiles(request){

    const cache = await caches.open(TILE_CACHE_NAME);
    const cached = await cache.match(request);
    if(cached) return cached;

    try{
        const response = await fetch(request);
        if(response.ok) cache.put(request,response.clone());
        return response;
    }catch(err){
        return cached || Response.error();
    }
}

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
