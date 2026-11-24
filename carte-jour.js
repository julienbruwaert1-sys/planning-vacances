/* --- Carte du jour (maquette C validée, 2026-11-24) ---
   Ouverte en touchant la photo de destination en haut du Planning.
   Quatre écrans dans une seule vue plein écran (#dayMapView) :
   - principal : carte du jour (étapes numérotées + trajet) et liste avec
     les temps de trajet ; bascule « Tout le voyage » (C3 : tous les jours,
     filtres par type) ;
   - fiche d'un lieu (C2) : panneau du bas ouvert depuis une épingle ou une
     ligne de la liste ;
   - En route (C4) : prochaine étape, position, « partir dans », décaler la
     suite, marquer fait ;
   - Logement et transports (C5) : logement du voyage + arrêts proches
     (Overpass, mis en cache).
   Fichier séparé d'app.js (déjà ~17 500 lignes) mais il réutilise ses
   fonctions globales (planning, geocodeAddress, haversineMeters,
   openExternalUrl...) : il DOIT être chargé après app.js.
   Sécurité : tout texte venant des activités ou d'OpenStreetMap passe par
   textContent (jamais innerHTML), même règle que les popups de la carte
   du voyage (voir trip_map_feature). */
(function(){

    const view = document.getElementById("dayMapView");
    const banner = document.getElementById("destinationPhotoBanner");
    if(!view || !banner || typeof L==="undefined") return;

    const SLOT_KEYS = ["matin","midi","apresMidi","soir"];
    const TRANSIT_CACHE_KEY = "dayMapTransitCache";
    const TRANSIT_CACHE_DAYS = 30;

    const el = {
        main: document.getElementById("dmMain"),
        back: document.getElementById("dmBackBtn"),
        kicker: document.getElementById("dmKicker"),
        title: document.getElementById("dmTitle"),
        chips: document.getElementById("dmDayChips"),
        filters: document.getElementById("dmFilters"),
        map: document.getElementById("dmMap"),
        badge: document.getElementById("dmMapBadge"),
        list: document.getElementById("dmList"),
        enRouteBtn: document.getElementById("dmEnRouteBtn"),
        lodgingBtn: document.getElementById("dmLodgingBtn"),
        sheet: document.getElementById("dmSheet"),
        backdrop: document.getElementById("dmSheetBackdrop"),
        enRoute: document.getElementById("dmEnRoute"),
        lodging: document.getElementById("dmLodging")
    };

    const state = {
        day: 1,
        mode: "day",          // "day" | "trip"
        typeFilter: "",
        sheet: null,          // {day, n}
        lastPos: null,        // {lat, lon}
        shiftOpen: false
    };

    let map = null, pinsLayer = null, routeLayer = null;
    let markersByKey = {};
    let enRouteMap = null, lodgingMap = null;
    let clockTimer = null;
    let geocodeRunning = false;
    const geocodeFailed = new Set();

    /* ---------- Petits outils ---------- */

    function h(tag,props,children){
        const node = document.createElement(tag);
        if(props){
            Object.keys(props).forEach(k=>{
                const v = props[k];
                if(v===null || v===undefined || v===false) return;
                if(k==="class") node.className = v;
                else if(k==="text") node.textContent = v;
                else if(k==="onclick") node.addEventListener("click",v);
                else if(k==="style") node.setAttribute("style",v);
                else node.setAttribute(k,v===true ? "" : v);
            });
        }
        (children||[]).forEach(c=>{
            if(c===null || c===undefined || c===false) return;
            node.appendChild(typeof c==="string" ? document.createTextNode(c) : c);
        });
        return node;
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    function icon(pathD,size){
        const s = document.createElementNS(SVG_NS,"svg");
        s.setAttribute("width",size||18);
        s.setAttribute("height",size||18);
        s.setAttribute("viewBox","0 0 24 24");
        s.setAttribute("fill","none");
        s.setAttribute("stroke","currentColor");
        s.setAttribute("stroke-width","2");
        s.setAttribute("stroke-linecap","round");
        s.setAttribute("stroke-linejoin","round");
        s.setAttribute("aria-hidden","true");
        const p = document.createElementNS(SVG_NS,"path");
        p.setAttribute("d",pathD);
        s.appendChild(p);
        return s;
    }
    const ICON = {
        back:"M15 18l-6-6 6-6",
        next:"M9 18l6-6-6-6",
        close:"M18 6 6 18M6 6l12 12",
        go:"M3 11 21 3l-8 18-2-8z",
        ticket:"M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2zM13 6v12",
        check:"M5 12.5 10 17 19 7",
        pin:"M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
        walk:"M13 4a2 2 0 1 0 0 .01M10 21l2-6 3 3v3M8 12l2-4 4 1 2 3 3 1M10 8l-3 4",
        bulb:"M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z",
        home:"M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6",
        copy:"M9 9h11v11H9zM5 15H4V4h11v1",
        clock:"M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
    };

    function parseTime(t){
        const m = /^(\d{1,2}):(\d{2})$/.exec((t||"").trim());
        return m ? parseInt(m[1],10)*60 + parseInt(m[2],10) : null;
    }
    function fmtTime(min){
        min = Math.max(0,Math.min(23*60+59,Math.round(min)));
        return String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0");
    }
    function parseDuration(d){
        const s = (d||"").toLowerCase().replace(/\s/g,"");
        if(!s || s==="-") return null;
        let m = /^(\d+)h(\d{1,2})?$/.exec(s);
        if(m) return parseInt(m[1],10)*60 + (m[2] ? parseInt(m[2],10) : 0);
        m = /^(\d+)(min|mn|m)$/.exec(s);
        if(m) return parseInt(m[1],10);
        return null;
    }
    function priceLabel(a){
        if(a.price===null || a.price===undefined || a.price==="") return "";
        if(Number(a.price)===0) return "gratuit";
        return Number(a.price).toLocaleString("fr-FR")+" "+activityPriceSymbol(a);
    }
    function walkMinutesBetween(a,b){
        return Math.max(1,Math.round(haversineMeters(a.lat,a.lon,b.lat,b.lon)*1.3/80));
    }
    function cachedCoords(address){
        if(!address || !address.trim()) return null;
        const c = loadGeocodeCache()[address.trim()];
        return c && typeof c.lat==="number" ? c : null;
    }
    function directionsUrl(address){
        return "https://www.google.com/maps/dir/?api=1&travelmode=walking&destination="
            + encodeURIComponent(address.trim());
    }
    function shortWeekday(day){
        const d = dateForDay(day);
        if(!d) return "J";
        return d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".","");
    }
    function dayOfMonth(day){
        const d = dateForDay(day);
        return d ? String(d.getDate()) : String(day);
    }
    function tripDayToday(){
        if(!startDate) return null;
        const now = getTripNow();
        const start = new Date(startDate+"T00:00:00");
        if(isNaN(start.getTime())) return null;
        const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
        const n = Math.round((today - start)/86400000) + 1;
        return (n>=1 && n<=dayCount) ? n : null;
    }
    function nowMinutes(){
        const n = getTripNow();
        return n.getHours()*60 + n.getMinutes();
    }

    /* ---------- Données ---------- */

    // Étapes numérotées d'un jour (le logement n'est pas une étape : il
    // devient l'épingle « maison »), dans l'ordre du Planning.
    function dayData(day){
        const p = planning[day];
        const steps = [], homes = [];
        if(!p) return {steps,homes};
        SLOT_KEYS.forEach(slot=>{
            (p[slot]||[]).forEach(activity=>{
                const item = {day,slot,activity};
                if(activity.type==="Logement") homes.push(item);
                else steps.push(item);
            });
        });
        steps.forEach((s,i)=>{ s.n = i+1; });
        return {steps,homes};
    }

    // Logement principal du voyage : celui qui revient le plus souvent.
    function findLodging(){
        const groups = {};
        for(let d=1; d<=dayCount; d++){
            dayData(d).homes.forEach(item=>{
                const key = (item.activity.address||item.activity.name||"").trim().toLowerCase();
                if(!key) return;
                if(!groups[key]) groups[key] = [];
                groups[key].push(item);
            });
        }
        let best = null;
        Object.keys(groups).forEach(k=>{
            if(!best || groups[k].length>best.length) best = groups[k];
        });
        if(!best) return null;
        const withAddress = best.find(i=>i.activity.address && i.activity.address.trim()) || best[0];
        return {first:best[0], last:best[best.length-1], main:withAddress, all:best};
    }

    function legInfo(prev,step){
        const a = step.activity;
        if(typeof a.travelTime==="number" && a.travelTime>0){
            return {minutes:a.travelTime,label:a.travelTime+" min de trajet"};
        }
        if(!prev) return null;
        const c1 = cachedCoords(prev.activity.address), c2 = cachedCoords(a.address);
        if(!c1 || !c2) return null;
        const meters = haversineMeters(c1.lat,c1.lon,c2.lat,c2.lon)*1.3;
        if(meters<=3500){
            const m = Math.max(1,Math.round(meters/80));
            return {minutes:m,label:"≈ "+m+" min à pied"};
        }
        return {minutes:null,label:"≈ "+(meters/1000).toFixed(1).replace(".",",")+" km"};
    }

    /* Géocode en tâche de fond les adresses pas encore en cache (une par
       une : geocodeAddress() respecte déjà la limite de Nominatim), puis
       redessine. Les adresses introuvables ne sont pas réessayées. */
    async function geocodeMissing(addresses){
        if(geocodeRunning) return;
        const todo = addresses.filter(a=>a && a.trim() && !cachedCoords(a) && !geocodeFailed.has(a.trim()));
        if(!todo.length) return;
        geocodeRunning = true;
        el.badge.hidden = false;
        el.badge.textContent = "Localisation des adresses…";
        for(const address of todo){
            if(view.hidden) break;
            try{
                await geocodeAddress(address.trim());
            }catch(err){
                geocodeFailed.add(address.trim());
            }
        }
        geocodeRunning = false;
        if(!view.hidden) renderMain();
    }

    /* ---------- Carte principale ---------- */

    function ensureMap(){
        if(map) return;
        map = L.map(el.map,{zoomControl:false,attributionControl:true}).setView([47.5,19.05],12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
            maxZoom:19,
            attribution:"© OpenStreetMap"
        }).addTo(map);
        routeLayer = L.layerGroup().addTo(map);
        pinsLayer = L.layerGroup().addTo(map);
    }

    function pinIcon(label,variant,selected){
        const size = selected ? 40 : (variant==="dim" ? 24 : 30);
        const div = h("div",{class:"dm-pin"+(variant==="dim" ? " dim" : "")+(selected ? " sel" : ""),text:String(label)});
        return L.divIcon({className:"dm-pin-wrap",html:div,iconSize:[size,size],iconAnchor:[size/2,size/2]});
    }
    function homeIcon(){
        const div = h("div",{class:"dm-home"},[icon(ICON.home,16)]);
        return L.divIcon({className:"dm-pin-wrap",html:div,iconSize:[30,30],iconAnchor:[15,15]});
    }

    function renderMain(){
        const day = state.day;
        const p = planning[day] || {};
        el.kicker.textContent = state.mode==="trip"
            ? (tripName||"Voyage")+" · "+dayCount+" jours"
            : "Jour "+day+(dateForDay(day) ? " · "+formatDayDate(day) : "");
        el.title.textContent = state.mode==="trip" ? "Tout le voyage" : (p.title || "Jour "+day);

        view.querySelectorAll("[data-dm-mode]").forEach(b=>{
            const on = b.dataset.dmMode===state.mode;
            b.classList.toggle("active",on);
            b.setAttribute("aria-selected",on ? "true" : "false");
        });

        renderDayChips();
        el.filters.hidden = state.mode!=="trip";
        if(state.mode==="trip") renderFilters();
        el.enRouteBtn.parentElement.hidden = state.mode==="trip";

        ensureMap();
        pinsLayer.clearLayers();
        routeLayer.clearLayers();
        markersByKey = {};

        const points = [];
        const missing = [];
        const days = state.mode==="trip" ? Array.from({length:dayCount},(_,i)=>i+1) : [day];

        days.forEach(d=>{
            const {steps,homes} = dayData(d);
            const route = [];
            steps.forEach(step=>{
                const a = step.activity;
                if(state.mode==="trip" && state.typeFilter && a.type!==state.typeFilter) return;
                const c = cachedCoords(a.address);
                if(!c){ if(a.address) missing.push(a.address); return; }
                const isSel = state.sheet && state.sheet.day===d && state.sheet.n===step.n;
                const variant = (state.mode==="trip" && d!==state.day) ? "dim" : "";
                const label = state.mode==="trip" ? d : step.n;
                const marker = L.marker([c.lat,c.lon],{icon:pinIcon(label,variant,isSel),zIndexOffset:variant ? 0 : 500})
                    .addTo(pinsLayer)
                    .on("click",()=>openSheet(d,step.n));
                markersByKey[d+":"+step.n] = marker;
                if(d===state.day) route.push([c.lat,c.lon]);
                points.push([c.lat,c.lon]);
            });
            if(d===state.day && route.length>1){
                L.polyline(route,{color:"#F5A524",weight:3,opacity:.8,dashArray:"6 8"}).addTo(routeLayer);
            }
            homes.forEach(item=>{ if(item.activity.address && !cachedCoords(item.activity.address)) missing.push(item.activity.address); });
        });

        const lodging = findLodging();
        const home = lodging && cachedCoords(lodging.main.activity.address);
        if(home){
            L.marker([home.lat,home.lon],{icon:homeIcon(),zIndexOffset:1000})
                .addTo(pinsLayer)
                .on("click",openLodging);
            if(state.mode==="day" || !points.length) points.push([home.lat,home.lon]);
        }else if(lodging && lodging.main.activity.address){
            missing.push(lodging.main.activity.address);
        }

        setTimeout(()=>{
            map.invalidateSize();
            if(points.length===1) map.setView(points[0],15);
            else if(points.length) map.fitBounds(points,{padding:[36,36],maxZoom:16});
        },0);

        if(state.mode==="day") renderDayList(); else renderTripList();

        if(!geocodeRunning){
            const total = state.mode==="day" ? dayTotalMinutes(day) : 0;
            el.badge.hidden = !total;
            if(total) el.badge.textContent = "≈ "+total+" min de trajet au total";
        }
        if(missing.length) geocodeMissing(missing);
    }

    function dayTotalMinutes(day){
        const {steps} = dayData(day);
        let total = 0;
        steps.forEach((s,i)=>{
            const leg = legInfo(i ? steps[i-1] : null,s);
            if(leg && leg.minutes) total += leg.minutes;
        });
        return total;
    }

    function renderDayChips(){
        el.chips.textContent = "";
        for(let d=1; d<=dayCount; d++){
            const on = d===state.day;
            const b = h("button",{
                type:"button",
                class:"dm-day-chip"+(on ? " active" : ""),
                "aria-pressed":on ? "true" : "false",
                "aria-label":"Jour "+d,
                onclick:()=>{ state.day = d; state.sheet = null; closeSheet(true); renderMain(); }
            },[h("small",{text:shortWeekday(d)}),h("b",{text:dayOfMonth(d)})]);
            el.chips.appendChild(b);
        }
        const active = el.chips.querySelector(".active");
        if(active) setTimeout(()=>active.scrollIntoView({block:"nearest",inline:"center"}),0);
    }

    function renderFilters(){
        el.filters.textContent = "";
        const present = new Set();
        for(let d=1; d<=dayCount; d++) dayData(d).steps.forEach(s=>{ if(s.activity.type) present.add(s.activity.type); });
        const make = (value,label)=>h("button",{
            type:"button",
            class:"dm-filter"+(state.typeFilter===value ? " active" : ""),
            onclick:()=>{ state.typeFilter = value; renderMain(); }
        },[label]);
        el.filters.appendChild(make("","Tous"));
        Object.keys(icons).forEach(type=>{
            if(present.has(type) && type!=="Logement") el.filters.appendChild(make(type,icons[type]+" "+type));
        });
    }

    function renderDayList(){
        el.list.textContent = "";
        const {steps} = dayData(state.day);
        if(!steps.length){
            el.list.appendChild(h("p",{class:"dm-empty",text:"Aucune activité prévue ce jour-là."}));
            return;
        }
        steps.forEach((step,i)=>{
            const a = step.activity;
            if(i){
                const leg = legInfo(steps[i-1],step);
                el.list.appendChild(h("div",{class:"dm-leg"},[h("i"),leg ? leg.label : ""]));
            }
            const meta = [a.type, a.duration && a.duration!=="-" ? a.duration : "", priceLabel(a), !a.address ? "sans adresse" : ""]
                .filter(Boolean).join(" · ");
            el.list.appendChild(h("button",{
                type:"button",
                class:"dm-row"+(a.done ? " done" : ""),
                onclick:()=>openSheet(state.day,step.n)
            },[
                h("span",{class:"dm-num"+(a.done ? " done" : "")},[a.done ? icon(ICON.check,14) : String(step.n)]),
                h("span",{class:"dm-time",text:a.time || "—"}),
                h("span",{class:"dm-row-text"},[
                    h("span",{class:"dm-row-name",text:a.name}),
                    h("span",{class:"dm-row-meta",text:meta})
                ])
            ]));
        });
    }

    function renderTripList(){
        el.list.textContent = "";
        for(let d=1; d<=dayCount; d++){
            const {steps} = dayData(d);
            const count = steps.filter(s=>!state.typeFilter || s.activity.type===state.typeFilter).length;
            const p = planning[d] || {};
            el.list.appendChild(h("button",{
                type:"button",
                class:"dm-daycard"+(d===state.day ? " active" : ""),
                onclick:()=>{ state.day = d; state.mode = "day"; state.typeFilter = ""; renderMain(); }
            },[
                h("span",{class:"dm-daycard-date",text:"J"+d+(dateForDay(d) ? " · "+formatDayDateShort(d) : "")}),
                h("span",{class:"dm-daycard-title",text:p.title || "Jour "+d}),
                h("span",{class:"dm-daycard-meta",text:count+(count>1 ? " lieux" : " lieu")})
            ]));
        }
    }

    /* ---------- Fiche d'un lieu (C2) ---------- */

    function openSheet(day,n){
        const {steps} = dayData(day);
        const step = steps.find(s=>s.n===n);
        if(!step) return;
        const prevSel = state.sheet;
        state.sheet = {day,n};
        refreshPinSelection(prevSel);
        renderSheet(steps,step);
        el.sheet.hidden = false;
        el.backdrop.hidden = false;
        el.sheet.scrollTop = 0;
        const c = cachedCoords(step.activity.address);
        if(c && map) map.panTo([c.lat,c.lon]);
    }

    function refreshPinSelection(prevSel){
        [prevSel,state.sheet].forEach(sel=>{
            if(!sel) return;
            const m = markersByKey[sel.day+":"+sel.n];
            if(!m) return;
            const isSel = state.sheet && state.sheet.day===sel.day && state.sheet.n===sel.n;
            const variant = (state.mode==="trip" && sel.day!==state.day) ? "dim" : "";
            m.setIcon(pinIcon(state.mode==="trip" ? sel.day : sel.n,variant,isSel));
            m.setZIndexOffset(isSel ? 2000 : (variant ? 0 : 500));
        });
    }

    function closeSheet(silent){
        const prevSel = state.sheet;
        state.sheet = null;
        el.sheet.hidden = true;
        el.backdrop.hidden = true;
        if(!silent) refreshPinSelection(prevSel);
    }

    function renderSheet(steps,step){
        const a = step.activity;
        const start = parseTime(a.time);
        const dur = parseDuration(a.duration);
        const range = a.time ? (a.time+(start!==null && dur ? " – "+fmtTime(start+dur) : "")) : "";
        const prev = steps[step.n-2] || null;
        const next = steps[step.n] || null;

        el.sheet.textContent = "";
        el.sheet.appendChild(h("div",{class:"dm-grabber"}));

        el.sheet.appendChild(h("div",{class:"dm-sheet-top"},[
            h("span",{class:"dm-sheet-kicker",text:"Étape "+step.n+" sur "+steps.length+(state.mode==="trip" ? " · jour "+step.day : "")}),
            range ? h("span",{class:"dm-sheet-range",text:"· "+range}) : null,
            h("span",{class:"dm-sheet-nav"},[
                h("button",{type:"button",class:"dm-icon-btn sm","aria-label":"Étape précédente",disabled:!prev,onclick:()=>prev && openSheet(step.day,prev.n)},[icon(ICON.back)]),
                h("button",{type:"button",class:"dm-icon-btn sm","aria-label":"Étape suivante",disabled:!next,onclick:()=>next && openSheet(step.day,next.n)},[icon(ICON.next)]),
                h("button",{type:"button",class:"dm-icon-btn sm","aria-label":"Fermer",onclick:()=>closeSheet()},[icon(ICON.close)])
            ])
        ]));

        el.sheet.appendChild(h("h3",{class:"dm-sheet-title",text:a.name}));

        const chips = [a.type ? (icons[a.type] ? icons[a.type]+" " : "")+a.type : "", priceLabel(a), a.duration && a.duration!=="-" ? a.duration : ""].filter(Boolean);
        if(chips.length) el.sheet.appendChild(h("div",{class:"dm-chiprow"},chips.map(c=>h("span",{class:"dm-chip",text:c}))));

        const actions = h("div",{class:"dm-actions"});
        if(a.address && a.address.trim()){
            actions.appendChild(h("button",{type:"button",class:"dm-btn dm-btn-accent",onclick:()=>openExternalUrl(directionsUrl(a.address))},[icon(ICON.go,17),"Y aller"]));
        }
        if(a.reservationLink){
            actions.appendChild(h("button",{type:"button",class:"dm-btn",onclick:()=>openReservationLink(a.reservationLink)},[icon(ICON.ticket,17),"Réservation"]));
        }
        actions.appendChild(h("button",{
            type:"button",
            class:"dm-btn"+(a.done ? " dm-btn-done" : ""),
            "aria-pressed":a.done ? "true" : "false",
            onclick:()=>{ toggleDone(a); openSheet(step.day,step.n); }
        },[icon(ICON.check,17),"Fait"]));
        el.sheet.appendChild(actions);

        if(a.address){
            el.sheet.appendChild(infoRow(ICON.pin,"Adresse",a.address,()=>openAddressInMaps(a.address)));
        }
        if(prev){
            const leg = legInfo(prev,step);
            if(leg) el.sheet.appendChild(infoRow(ICON.walk,"Depuis l'étape "+prev.n,leg.label+" depuis « "+prev.activity.name+" »"));
        }
        if(a.note){
            el.sheet.appendChild(infoRow(ICON.bulb,"À savoir",a.note));
        }

        if(next){
            const leg = legInfo(step,next);
            el.sheet.appendChild(h("button",{type:"button",class:"dm-nextrow",onclick:()=>openSheet(step.day,next.n)},[
                h("span",{class:"dm-num dim",text:String(next.n)}),
                h("span",{class:"dm-row-text"},[
                    h("span",{class:"dm-row-meta",text:"Ensuite"+(leg ? " · "+leg.label : "")}),
                    h("span",{class:"dm-row-name",text:(next.activity.time ? next.activity.time+" · " : "")+next.activity.name})
                ]),
                icon(ICON.next)
            ]));
        }
    }

    function infoRow(iconPath,label,value,onClick){
        const body = h("span",{class:"dm-info-text"},[
            h("b",{text:label}),
            h("span",{text:value})
        ]);
        if(onClick){
            return h("button",{type:"button",class:"dm-info dm-info-link",onclick:onClick},[icon(iconPath),body]);
        }
        return h("div",{class:"dm-info"},[icon(iconPath),body]);
    }

    function toggleDone(activity,value){
        activity.done = value===undefined ? !activity.done : value;
        savePlanning();
        try{ renderActivities(); }catch(err){ console.error(err); }
        if(state.mode==="day") renderDayList();
    }

    /* ---------- En route (C4) ---------- */

    function openEnRoute(){
        const today = tripDayToday();
        if(today && today!==state.day){
            state.day = today;
            renderMain();
        }
        state.shiftOpen = false;
        el.enRoute.hidden = false;
        renderEnRoute();
        clearInterval(clockTimer);
        clockTimer = setInterval(()=>{ if(!el.enRoute.hidden) renderEnRoute(); },30000);
        getCurrentPositionAsync({enableHighAccuracy:true,timeout:10000,maximumAge:60000})
            .then(pos=>{
                state.lastPos = {lat:pos.coords.latitude,lon:pos.coords.longitude};
                if(!el.enRoute.hidden) renderEnRoute();
            })
            .catch(()=>{});
    }

    function closeEnRoute(){
        el.enRoute.hidden = true;
        clearInterval(clockTimer);
        clockTimer = null;
        if(enRouteMap){ enRouteMap.remove(); enRouteMap = null; }
        renderMain();
    }

    function renderEnRoute(){
        const day = state.day;
        const {steps} = dayData(day);
        const next = steps.find(s=>!s.activity.done) || null;
        const isToday = tripDayToday()===day;

        if(enRouteMap){ enRouteMap.remove(); enRouteMap = null; }
        el.enRoute.textContent = "";

        el.enRoute.appendChild(h("div",{class:"dm-sub-head"},[
            h("button",{type:"button",class:"dm-icon-btn","aria-label":"Retour à la carte du jour",onclick:closeEnRoute},[icon(ICON.back,20)]),
            h("div",{class:"dm-head-text"},[
                h("div",{class:"dm-kicker",text:(dateForDay(day) ? formatDayDateShort(day)+" · " : "")+"Jour "+day}),
                h("h2",{class:"dm-title",text:"En route"})
            ]),
            h("div",{class:"dm-clock",text:fmtTime(nowMinutes())})
        ]));

        if(!isToday){
            el.enRoute.appendChild(h("p",{class:"dm-notice",text:"Aperçu : ce jour n'est pas aujourd'hui. Les temps « partir dans » ne s'affichent que le jour même."}));
        }

        if(!steps.length){
            el.enRoute.appendChild(h("p",{class:"dm-empty",text:"Aucune étape prévue ce jour-là."}));
            return;
        }

        // Avancement de la journée
        const doneCount = steps.filter(s=>s.activity.done).length;
        const progress = h("div",{class:"dm-progress"},[
            h("div",{class:"dm-progress-line"}),
            h("div",{class:"dm-progress-fill",style:"width:"+(steps.length>1 ? Math.min(100,(doneCount/(steps.length-1))*100) : 0)+"%"})
        ]);
        steps.forEach(s=>{
            const isNext = next && s.n===next.n;
            progress.appendChild(h("div",{class:"dm-step"},[
                h("span",{class:"dm-step-dot"+(s.activity.done ? " done" : isNext ? " next" : "")},[s.activity.done ? icon(ICON.check,13) : String(s.n)]),
                h("small",{text:s.activity.time || "—"})
            ]));
        });
        el.enRoute.appendChild(progress);

        if(!next){
            el.enRoute.appendChild(h("div",{class:"dm-card dm-card-pad"},[
                h("div",{class:"dm-card-kicker",text:"Journée terminée"}),
                h("div",{class:"dm-card-title",text:"Toutes les étapes sont faites."})
            ]));
            return;
        }

        const a = next.activity;
        const target = cachedCoords(a.address);
        let walk = null;
        if(target && state.lastPos) walk = walkMinutesBetween(state.lastPos,target);
        else{
            const leg = legInfo(steps[next.n-2] || null,next);
            if(leg && leg.minutes) walk = leg.minutes;
        }
        const start = parseTime(a.time);
        let leaveLabel = "—";
        if(isToday && start!==null){
            const left = start - nowMinutes() - (walk || 0);
            leaveLabel = left>1 ? left+" min" : left>=-1 ? "Maintenant" : "En retard";
        }

        const card = h("div",{class:"dm-card"});
        const mapBox = h("div",{class:"dm-mini-map"});
        card.appendChild(mapBox);
        const posLabel = state.lastPos ? "Votre position" : "Position indisponible";
        card.appendChild(h("div",{class:"dm-card-pad"},[
            h("div",{class:"dm-card-kicker",text:"Prochaine étape · "+next.n+" sur "+steps.length}),
            h("div",{class:"dm-card-title",text:a.name}),
            h("div",{class:"dm-stats"},[
                stat("Arrivée prévue",a.time || "—"),
                stat(state.lastPos && target ? "À pied d'ici" : "Trajet",walk ? walk+" min" : "—"),
                stat("Partir dans",leaveLabel,true)
            ]),
            h("div",{class:"dm-faint",text:posLabel})
        ]));
        el.enRoute.appendChild(card);

        if(a.note) el.enRoute.appendChild(infoRow(ICON.bulb,"À savoir",a.note));

        const actions = h("div",{class:"dm-stack"});
        if(a.address && a.address.trim()){
            actions.appendChild(h("button",{type:"button",class:"dm-btn dm-btn-accent dm-btn-big",onclick:()=>openExternalUrl(directionsUrl(a.address))},[icon(ICON.go,19),"Ouvrir l'itinéraire dans Maps"]));
        }
        actions.appendChild(h("div",{class:"dm-actions two"},[
            h("button",{type:"button",class:"dm-btn","aria-expanded":state.shiftOpen ? "true" : "false",onclick:()=>{ state.shiftOpen = !state.shiftOpen; renderEnRoute(); }},[icon(ICON.clock,17),"Décaler la suite"]),
            h("button",{type:"button",class:"dm-btn",onclick:()=>{ toggleDone(a,true); showToast("« "+a.name+" » marquée comme faite."); renderEnRoute(); }},[icon(ICON.check,17),"Étape faite"])
        ]));
        if(state.shiftOpen){
            actions.appendChild(h("div",{class:"dm-actions three"},[15,30,60].map(m=>
                h("button",{type:"button",class:"dm-btn",onclick:()=>shiftRemaining(day,next.n,m)},["+ "+(m===60 ? "1 h" : m+" min")])
            )));
        }
        el.enRoute.appendChild(actions);

        // Mini-carte : position + prochaine étape
        setTimeout(()=>{
            if(el.enRoute.hidden || !mapBox.isConnected) return;
            enRouteMap = L.map(mapBox,{zoomControl:false,attributionControl:false,dragging:true});
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(enRouteMap);
            const pts = [];
            if(target){
                L.marker([target.lat,target.lon],{icon:pinIcon(next.n,"",true)}).addTo(enRouteMap);
                pts.push([target.lat,target.lon]);
            }
            if(state.lastPos){
                L.marker([state.lastPos.lat,state.lastPos.lon],{icon:L.divIcon({className:"dm-pin-wrap",html:h("div",{class:"dm-me"}),iconSize:[20,20],iconAnchor:[10,10]})}).addTo(enRouteMap);
                pts.push([state.lastPos.lat,state.lastPos.lon]);
            }
            if(pts.length===2) L.polyline(pts,{color:"#F5A524",weight:4,opacity:.85,dashArray:"2 8",lineCap:"round"}).addTo(enRouteMap);
            if(pts.length===1) enRouteMap.setView(pts[0],15);
            else if(pts.length) enRouteMap.fitBounds(pts,{padding:[40,40],maxZoom:16});
            else enRouteMap.setView([47.5,19.05],12);
        },0);
    }

    function stat(label,value,accent){
        return h("div",{class:"dm-stat"+(accent ? " accent" : "")},[h("small",{text:label}),h("b",{text:value})]);
    }

    // Décale l'heure des étapes pas encore faites, à partir de fromN.
    function shiftRemaining(day,fromN,minutes){
        const {steps} = dayData(day);
        let moved = 0;
        steps.forEach(s=>{
            if(s.n<fromN || s.activity.done) return;
            const t = parseTime(s.activity.time);
            if(t===null) return;
            s.activity.time = fmtTime(t+minutes);
            moved++;
        });
        state.shiftOpen = false;
        if(moved){
            savePlanning();
            try{ renderActivities(); }catch(err){ console.error(err); }
            showToast(moved+" étape"+(moved>1 ? "s décalées" : " décalée")+" de "+(minutes===60 ? "1 h" : minutes+" min")+".");
        }else{
            showToast("Aucune étape avec une heure à décaler.");
        }
        renderEnRoute();
    }

    /* ---------- Logement et transports (C5) ---------- */

    function openLodging(){
        el.lodging.hidden = false;
        renderLodging();
    }

    function closeLodging(){
        el.lodging.hidden = true;
        if(lodgingMap){ lodgingMap.remove(); lodgingMap = null; }
    }

    function renderLodging(){
        if(lodgingMap){ lodgingMap.remove(); lodgingMap = null; }
        el.lodging.textContent = "";
        const lodging = findLodging();

        const mapBox = h("div",{class:"dm-lodging-map"});
        el.lodging.appendChild(h("div",{class:"dm-lodging-top"},[
            mapBox,
            h("button",{type:"button",class:"dm-icon-btn dm-float","aria-label":"Retour à la carte du jour",onclick:closeLodging},[icon(ICON.back,20)])
        ]));

        const body = h("div",{class:"dm-sub-body"});
        el.lodging.appendChild(body);

        if(!lodging){
            body.appendChild(h("p",{class:"dm-empty",text:"Aucun logement dans ce voyage. Ajoute une activité de type « Logement » avec son adresse."}));
            return;
        }

        const a = lodging.main.activity;
        const nights = lodging.last.day - lodging.first.day;
        body.appendChild(h("div",{class:"dm-card-kicker",text:"Logement"+(nights>0 ? " · "+nights+(nights>1 ? " nuits" : " nuit") : "")}));
        body.appendChild(h("h2",{class:"dm-title big",text:a.name}));
        if(a.address) body.appendChild(h("div",{class:"dm-muted",text:a.address}));

        const firstDate = dateForDay(lodging.first.day) ? formatDayDateShort(lodging.first.day) : "Jour "+lodging.first.day;
        const lastDate = dateForDay(lodging.last.day) ? formatDayDateShort(lodging.last.day) : "Jour "+lodging.last.day;
        body.appendChild(h("div",{class:"dm-stats two"},[
            stat("Arrivée · "+firstDate,lodging.first.activity.time || "—"),
            stat("Départ · "+lastDate,lodging.all.length>1 ? (lodging.last.activity.time || "—") : "—")
        ]));

        const actions = h("div",{class:"dm-actions two"});
        if(a.address && a.address.trim()){
            actions.appendChild(h("button",{type:"button",class:"dm-btn dm-btn-accent",onclick:()=>openExternalUrl(directionsUrl(a.address))},[icon(ICON.go,17),"Rentrer"]));
            actions.appendChild(h("button",{type:"button",class:"dm-btn",onclick:()=>copyText(a.address)},[icon(ICON.copy,17),"Copier l'adresse"]));
        }
        body.appendChild(actions);

        const note = lodging.first.activity.note || a.note;
        if(note) body.appendChild(infoRow(ICON.bulb,"À savoir",note));

        body.appendChild(h("div",{class:"dm-section",text:"Transports à proximité"}));
        const transitBox = h("div",{class:"dm-transit"},[h("p",{class:"dm-faint",text:"Recherche des arrêts proches…"})]);
        body.appendChild(transitBox);

        const home = cachedCoords(a.address);
        setTimeout(()=>{
            if(el.lodging.hidden || !mapBox.isConnected) return;
            lodgingMap = L.map(mapBox,{zoomControl:false,attributionControl:false});
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(lodgingMap);
            if(home){
                L.marker([home.lat,home.lon],{icon:homeIcon(),zIndexOffset:1000}).addTo(lodgingMap);
                lodgingMap.setView([home.lat,home.lon],16);
            }else{
                lodgingMap.setView([47.5,19.05],12);
            }
        },0);

        if(!home){
            transitBox.textContent = "";
            transitBox.appendChild(h("p",{class:"dm-faint",text:a.address ? "Adresse pas encore localisée : réessaie dans un instant (connexion internet nécessaire)." : "Ajoute l'adresse du logement pour voir les transports proches."}));
            if(a.address) geocodeAddress(a.address.trim()).then(()=>{ if(!el.lodging.hidden) renderLodging(); }).catch(()=>{});
            return;
        }

        loadTransit(a.address.trim(),home).then(items=>{
            if(el.lodging.hidden || !transitBox.isConnected) return;
            transitBox.textContent = "";
            if(!items.length){
                transitBox.appendChild(h("p",{class:"dm-faint",text:"Aucun arrêt trouvé à moins de 700 m."}));
                return;
            }
            items.forEach(t=>{
                transitBox.appendChild(h("div",{class:"dm-transit-row"},[
                    h("span",{class:"dm-badge kind-"+t.kindKey,text:t.kind}),
                    h("span",{class:"dm-row-text"},[
                        h("span",{class:"dm-row-name",text:t.name}),
                        t.lines ? h("span",{class:"dm-row-meta",text:"Lignes "+t.lines}) : null
                    ]),
                    h("em",{text:t.minutes+" min"})
                ]));
                if(lodgingMap){
                    const tag = h("div",{class:"dm-tag",text:t.kind+" · "+t.minutes+" min"});
                    L.marker([t.lat,t.lon],{icon:L.divIcon({className:"dm-pin-wrap",html:tag,iconSize:null,iconAnchor:[0,12]})}).addTo(lodgingMap);
                }
            });
        }).catch(()=>{
            if(!transitBox.isConnected) return;
            transitBox.textContent = "";
            transitBox.appendChild(h("p",{class:"dm-faint",text:"Transports indisponibles pour le moment (hors-ligne ou service surchargé)."}));
        });
    }

    async function loadTransit(address,home){
        let cache = {};
        try{ cache = JSON.parse(localStorage.getItem(TRANSIT_CACHE_KEY)) || {}; }catch(err){ cache = {}; }
        const hit = cache[address];
        if(hit && Date.now()-hit.at < TRANSIT_CACHE_DAYS*86400000) return hit.items;

        const around = `(around:700,${home.lat},${home.lon})`;
        const aroundBus = `(around:450,${home.lat},${home.lon})`;
        const query = `[out:json][timeout:15];(`
            + `node["railway"~"^(station|halt|tram_stop|subway_entrance)$"]${around};`
            + `node["public_transport"="station"]${around};`
            + `node["highway"="bus_stop"]${aroundBus};`
            + `);out 80;`;
        const data = await queryOverpass(query);

        const best = {};
        (data.elements||[]).forEach(e=>{
            const t = e.tags || {};
            let kindKey = null;
            if(t.station==="subway" || t.railway==="subway_entrance" || t.subway==="yes") kindKey = "metro";
            else if(t.railway==="tram_stop" || t.tram==="yes") kindKey = "tram";
            else if(t.highway==="bus_stop" || t.bus==="yes" || t.trolleybus==="yes") kindKey = "bus";
            else if(t.railway==="station" || t.railway==="halt" || t.train==="yes") kindKey = "train";
            if(!kindKey || !t.name) return;
            const meters = haversineMeters(home.lat,home.lon,e.lat,e.lon);
            const key = kindKey+"|"+t.name.toLowerCase();
            if(best[key] && best[key].meters<=meters) return;
            best[key] = {
                kindKey,
                kind:{metro:"Métro",tram:"Tram",bus:"Bus",train:"Train"}[kindKey],
                name:t.name,
                lines:(t.route_ref || "").split(";").map(s=>s.trim()).filter(Boolean).join(", "),
                lat:e.lat, lon:e.lon, meters
            };
        });

        const perKind = {};
        const items = Object.values(best)
            .sort((x,y)=>x.meters-y.meters)
            .filter(it=>{
                perKind[it.kindKey] = (perKind[it.kindKey]||0) + 1;
                return perKind[it.kindKey]<=3;
            })
            .slice(0,8)
            .map(it=>({...it,minutes:Math.max(1,Math.round(it.meters*1.3/80))}));

        cache[address] = {at:Date.now(),items};
        try{ localStorage.setItem(TRANSIT_CACHE_KEY,JSON.stringify(cache)); }catch(err){}
        return items;
    }

    function copyText(text){
        const done = ()=>showToast("Adresse copiée.");
        if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(text).then(done).catch(()=>showToast("Copie impossible.",{type:"error"}));
        }else{
            showToast("Copie impossible sur cet appareil.",{type:"error"});
        }
    }

    /* ---------- Ouverture, fermeture, retour ---------- */

    function openDayMapView(){
        closeAllFullscreenViews();
        state.day = tripDayToday() || (typeof currentDay==="number" && currentDay>=1 && currentDay<=dayCount ? currentDay : 1);
        state.mode = "day";
        state.typeFilter = "";
        state.sheet = null;
        el.sheet.hidden = true;
        el.backdrop.hidden = true;
        el.enRoute.hidden = true;
        el.lodging.hidden = true;
        view.hidden = false;
        el.main.scrollTop = 0;
        renderMain();
    }

    // Appelée par handleBackNavigation() (app.js) : ferme d'abord le
    // sous-écran ou la fiche ouverte, avant la vue entière.
    window.dayMapHandleBack = function(){
        if(view.hidden) return false;
        if(!el.enRoute.hidden){ closeEnRoute(); return true; }
        if(!el.lodging.hidden){ closeLodging(); return true; }
        if(!el.sheet.hidden){ closeSheet(); return true; }
        return false;
    };

    // closeAllFullscreenViews() masque la vue sans passer par ici : on
    // nettoie quand elle disparaît (minuteur, mini-cartes).
    new MutationObserver(()=>{
        if(!view.hidden) return;
        clearInterval(clockTimer);
        clockTimer = null;
        if(enRouteMap){ enRouteMap.remove(); enRouteMap = null; }
        if(lodgingMap){ lodgingMap.remove(); lodgingMap = null; }
        el.enRoute.hidden = true;
        el.lodging.hidden = true;
        el.sheet.hidden = true;
        el.backdrop.hidden = true;
        state.sheet = null;
    }).observe(view,{attributes:true,attributeFilter:["hidden"]});

    el.back.addEventListener("click",()=>{ view.hidden = true; });
    el.backdrop.addEventListener("click",()=>closeSheet());
    el.enRouteBtn.addEventListener("click",openEnRoute);
    el.lodgingBtn.addEventListener("click",openLodging);
    view.querySelectorAll("[data-dm-mode]").forEach(b=>{
        b.addEventListener("click",()=>{
            if(state.mode===b.dataset.dmMode) return;
            state.mode = b.dataset.dmMode;
            state.typeFilter = "";
            closeSheet(true);
            renderMain();
        });
    });

    banner.setAttribute("role","button");
    banner.setAttribute("tabindex","0");
    banner.setAttribute("aria-label","Ouvrir la carte du jour");
    banner.addEventListener("click",openDayMapView);
    banner.addEventListener("keydown",e=>{
        if(e.key==="Enter" || e.key===" "){ e.preventDefault(); openDayMapView(); }
    });

})();
