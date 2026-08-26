
/* Déclarées tôt (var, pas de TDZ) : savePlanning()/saveChecklist() appellent
   pushToSync() bien avant que la section Synchronisation (plus bas) ne
   s'exécute et ne leur donne leur vraie valeur. */
var syncRef = null;
var applyingRemoteUpdate = false;

/* Déclarée tôt pour la même raison : renderActivities()/updateConverterCountryHeader()
   (bien plus bas) s'exécutent dès le chargement initial et affichent le
   symbole de devise des prix. */
let priceCurrencySymbol = localStorage.getItem("priceCurrencySymbol") || "£";

/* Déclarées tôt pour la même raison : updateDatePlacement() (plus bas)
   appelle updateBottomNavVisibility() dès le chargement initial. */
const bottomNav = document.getElementById("bottomNav");
const bottomNavTabs = bottomNav.querySelectorAll(".bottom-nav-tab");
const planningTabContent = document.getElementById("planningTabContent");
const budgetTabContent = document.getElementById("budgetTabContent");
const profileTabContent = document.getElementById("profileTabContent");
const appTitle = document.getElementById("appTitle");
let activeMainTab = "planning";

/* Écran de création de voyage — affiché uniquement si aucune des clés
   ci-dessous n'existe (vrai premier lancement). Ne PAS se baser sur la
   seule absence de tripName : après le déploiement de cette fonctionnalité,
   tous les utilisateurs déjà actifs auraient tripName absent aussi, et se
   verraient à tort proposer de "créer" un voyage qu'ils ont déjà. */
const TRIP_NAME_KEY = "tripName";
let tripName = localStorage.getItem(TRIP_NAME_KEY) || "";

/* Distinct de isFirstLaunch : reste absent tant qu'aucun voyage n'a été
   validé via le formulaire (y compris après un "Plus tard"), pour piloter
   l'icône ➕ qui permet de revenir créer un voyage plus tard. */
const TRIP_CREATED_KEY = "tripCreated";

/* Pays de destination du voyage — distinct de appIconChoice (le logo réel
   de l'app) depuis qu'on peut garder le pays choisi tout en refusant
   d'appliquer son icône comme logo. Pilote la devise, le filtre carte et
   la restriction de géocodage. Déclaré avant geocodeAddress()/renderMapView()
   pour la même raison que COUNTRY_ISO_CODES/COUNTRY_BBOXES (TDZ). */
const TRIP_COUNTRY_KEY = "tripCountry";
let tripCountry = localStorage.getItem(TRIP_COUNTRY_KEY) || "";

const isFirstLaunch =
    localStorage.getItem("vacationPlanning")===null &&
    localStorage.getItem("startDate")===null &&
    localStorage.getItem("dayCount")===null &&
    localStorage.getItem("appIconChoice")===null;

if(isFirstLaunch){
    document.getElementById("welcomeView").hidden = false;
}else{
    if(!tripName){
        tripName = "Mon voyage";
        localStorage.setItem(TRIP_NAME_KEY,tripName);
    }
    if(!tripCountry){
        tripCountry = localStorage.getItem("appIconChoice") || "";
        if(tripCountry) localStorage.setItem(TRIP_COUNTRY_KEY,tripCountry);
    }
    if(!localStorage.getItem(TRIP_CREATED_KEY)){
        localStorage.setItem(TRIP_CREATED_KEY,"1");
    }
}

if(tripName){
    appTitle.textContent = "🌴 "+tripName;
}

document.getElementById("createTripMenuItem").hidden =
    localStorage.getItem(TRIP_CREATED_KEY)==="1";

const optionsMenuItem = document.getElementById("optionsMenuItem");
const syncMenuItem = document.getElementById("syncMenuItem");
const dataSettingsContent = document.getElementById("dataSettingsContent");
const dataSettingsSlot = document.getElementById("dataSettingsSlot");
const syncPanelContent = document.getElementById("syncPanelContent");
const syncPanelSlot = document.getElementById("syncPanelSlot");
const syncToggleBtn = document.getElementById("syncToggleBtn");
const syncPanel = document.getElementById("syncPanel");
const desktopProfileMenuItem = document.getElementById("desktopProfileMenuItem");
let profileConsolidated = null;

/* --- Menu options (coin) --- */

const optionsMenuBtn = document.getElementById("optionsMenuBtn");
const optionsMenuPanel = document.getElementById("optionsMenuPanel");

function closeOptionsMenu(){
    optionsMenuPanel.hidden = true;
    optionsMenuBtn.setAttribute("aria-expanded","false");
}

function toggleOptionsMenu(){
    const isOpen = !optionsMenuPanel.hidden;
    if(!isOpen){
        closeSearchPanel();
        closeDatePanel();
    }
    optionsMenuPanel.hidden = isOpen;
    optionsMenuBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

optionsMenuBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    toggleOptionsMenu();
});

optionsMenuPanel.addEventListener("click",(e)=>{
    if(e.target.closest(".menu-item")){
        closeOptionsMenu();
    }
});

document.addEventListener("click",(e)=>{
    if(!optionsMenuPanel.hidden && !e.target.closest(".corner-menu-item")){
        closeOptionsMenu();
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !optionsMenuPanel.hidden){
        closeOptionsMenu();
        optionsMenuBtn.focus();
    }
});

/* --- Système de notifications toast et de modale --- */

const toastContainer = document.getElementById("toastContainer");

function showToast(message,options={}){

    const toast = document.createElement("div");
    toast.className = "toast" +
        (options.type ? ` toast-${options.type}` : "");

    const msgSpan = document.createElement("span");
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    if(options.actionLabel && options.onAction){

        const actionBtn = document.createElement("button");
        actionBtn.className = "toast-undo-btn";
        actionBtn.textContent = options.actionLabel;
        actionBtn.addEventListener("click",()=>{
            options.onAction();
            toast.remove();
        });

        toast.appendChild(actionBtn);
    }

    toastContainer.appendChild(toast);

    setTimeout(()=>{
        toast.remove();
    },options.duration || 4000);
}

const modalOverlay = document.getElementById("modalOverlay");
const modalMessage = document.getElementById("modalMessage");
const modalPreviewImage = document.getElementById("modalPreviewImage");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

function showConfirmModal(message,onConfirm,options){

    options = options || {};

    modalMessage.textContent = message;

    if(options.previewSrc){
        modalPreviewImage.src = options.previewSrc;
        modalPreviewImage.hidden = false;
    }else{
        modalPreviewImage.hidden = true;
        modalPreviewImage.src = "";
    }

    modalOverlay.hidden = false;

    const cleanup = ()=>{
        modalOverlay.hidden = true;
        modalConfirm.removeEventListener("click",onConfirmClick);
        modalCancel.removeEventListener("click",onCancelClick);
    };

    const onConfirmClick = ()=>{
        cleanup();
        onConfirm();
    };

    const onCancelClick = ()=>{
        cleanup();
        if(options.onCancel) options.onCancel();
    };

    modalConfirm.addEventListener("click",onConfirmClick);
    modalCancel.addEventListener("click",onCancelClick);
}

const icons = {
    Restaurant:"🍽️",
    Musée:"🏛️",
    Bar:"🍹",
    Visite:"📍",
    Randonnée:"🥾",
    Shopping:"🛍️",
    Logement:"🏨",
    Spectacle:"🎭",
    Incontournable:"⭐",
    "Pépite locale":"💎",
    Pratique:"🧭"
};
const typeColors = {
    Restaurant:"#FB8C00",
    Musée:"#5C6BC0",
    Bar:"#EC407A",
    Visite:"#26A69A",
    Randonnée:"#66BB6A",
    Shopping:"#AB47BC",
    Logement:"#42A5F5",
    Spectacle:"#EF5350",
    Incontournable:"#FFB300",
    "Pépite locale":"#00ACC1",
    Pratique:"#78909C"
};
let dayCount =
parseInt(localStorage.getItem("dayCount"),10) || 7;

const planning =
JSON.parse(localStorage.getItem("vacationPlanning")) || {};

function ensureDaysExist(){
    for(let i=1;i<=dayCount;i++){
        if(!planning[i]){
            planning[i]={
                matin:[],
                midi:[],
                apresMidi:[],
                soir:[],
                title:""
            };
        }
    }
}

ensureDaysExist();
sanitizePlanningSlots();

let currentDay = 1;

let dragged = null;

function savePlanning(){
    localStorage.setItem(
        "vacationPlanning",
        JSON.stringify(planning)
    );
    pushToSync();
}

function createTabs(){

    const daySelect = document.getElementById("daySelect");
    daySelect.innerHTML="";

    for(let i=1;i<=dayCount;i++){

        const opt = document.createElement("option");
        opt.value = i;

        const title = planning[i] && planning[i].title;
        const dateLabel = typeof formatDayDate==="function"
            ? formatDayDate(i)
            : "";

        let label = `Jour ${i}`;
        if(dateLabel) label += ` — ${dateLabel}`;
        if(title) label += ` — ${title}`;

        opt.textContent = label;

        daySelect.appendChild(opt);
    }

    daySelect.value = currentDay;

    daySelect.onchange = ()=>{
        currentDay = parseInt(daySelect.value,10);
        renderTabs();
        renderActivities();
    };

    renderTabs();
}

function renderTabs(){

    const daySelect = document.getElementById("daySelect");

    if(daySelect.value != currentDay){
        daySelect.value = currentDay;
    }

    const customTitle =
    planning[currentDay] && planning[currentDay].title;

    const dateLabel = typeof formatDayDate==="function"
        ? formatDayDate(currentDay)
        : "";

    let heading = `Programme du Jour ${currentDay}`;
    if(dateLabel) heading += ` — ${dateLabel}`;
    if(customTitle) heading += ` — ${customTitle}`;

    document.getElementById("dayTitle").textContent = heading;
}

let editingActivity = null;

function addActivity(){

    const name =
    document.getElementById("activityName")
    .value.trim();

    const address =
    document.getElementById("activityAddress")
    .value.trim();

    const type =
    document.getElementById("activityType")
    .value;

    const slot =
    document.getElementById("timeSlot")
    .value;

    const priceRaw =
    document.getElementById("activityPrice")
    .value;

    const travelRaw =
    document.getElementById("activityTravelTime")
    .value;

    const reservationLink =
    document.getElementById("activityReservationLink")
    .value.trim();

    const price =
    priceRaw!=="" ? Math.max(0,parseFloat(priceRaw)) : null;

    const travelTime =
    travelRaw!=="" ? Math.max(0,parseInt(travelRaw,10)) : null;

    if(!name || !type) return;

    if(editingActivity){

        const { section, index } = editingActivity;
        const existing = planning[currentDay][section][index];

        const updated = Object.assign({},existing,{
            name, type, address, price, travelTime,
            reservationLink: reservationLink || null
        });

        if(slot===section){
            planning[currentDay][section][index] = updated;
        }else{
            planning[currentDay][section].splice(index,1);
            planning[currentDay][slot].push(updated);
        }

        savePlanning();
        renderActivities();
        closeFormDrawer();
        geocodeAddressInBackground(address);

        showToast(`« ${name} » modifiée.`,{type:"success",duration:2500});
        return;
    }

    planning[currentDay][slot].push({
        name,
        type,
        address,
        price,
        travelTime,
        reservationLink: reservationLink || null
    });

    savePlanning();
    renderActivities();
    closeFormDrawer();
    geocodeAddressInBackground(address);

    showToast(`« ${name} » ajoutée.`,{type:"success",duration:2500});
}

const activityTypeSelect = document.getElementById("activityType");

function updateActivityTypePlaceholderStyle(){
    activityTypeSelect.classList.toggle("select-placeholder",!activityTypeSelect.value);
}

activityTypeSelect.addEventListener("change",updateActivityTypePlaceholderStyle);
updateActivityTypePlaceholderStyle();

function fillActivityForm(activity,section){
    document.getElementById("activityName").value = activity.name || "";
    document.getElementById("activityAddress").value = activity.address || "";
    activityTypeSelect.value = activity.type;
    updateActivityTypePlaceholderStyle();
    document.getElementById("timeSlot").value = section;
    document.getElementById("activityPrice").value =
        (activity.price!==null && activity.price!==undefined) ? activity.price : "";
    document.getElementById("activityTravelTime").value =
        (activity.travelTime!==null && activity.travelTime!==undefined) ? activity.travelTime : "";
    document.getElementById("activityReservationLink").value = activity.reservationLink || "";
}

function clearActivityForm(){
    document.getElementById("activityName").value="";
    document.getElementById("activityAddress").value="";
    activityTypeSelect.selectedIndex = 0;
    updateActivityTypePlaceholderStyle();
    document.getElementById("activityPrice").value="";
    document.getElementById("activityTravelTime").value="";
    document.getElementById("activityReservationLink").value="";
}

function startEditActivity(section,index){

    const activity = planning[currentDay][section][index];
    if(!activity) return;

    editingActivity = { section, index };
    fillActivityForm(activity,section);

    document.getElementById("activitySubmitBtn").textContent = "Enregistrer les modifications";
    formToggleIcon.textContent = "✏️";

    openFormDrawer();
    document.getElementById("activityName").focus();
}

function deleteActivity(section,index){

    const activity = planning[currentDay][section][index];
    const dayAtDeletion = currentDay;

    showConfirmModal(
        `Supprimer « ${activity.name} » ?`,
        ()=>{

            planning[currentDay][section]
            .splice(index,1);

            savePlanning();
            renderActivities();

            showToast(
                `« ${activity.name} » supprimée.`,
                {
                    actionLabel:"Annuler",
                    onAction:()=>{

                        if(!planning[dayAtDeletion]){
                            planning[dayAtDeletion] = {
                                matin:[],midi:[],apresMidi:[],soir:[],title:""
                            };
                        }

                        planning[dayAtDeletion][section]
                        .splice(index,0,activity);

                        savePlanning();

                        if(currentDay===dayAtDeletion){
                            renderActivities();
                        }

                        showToast("Suppression annulée.",{type:"success"});
                    }
                }
            );
        }
    );
}

function moveByOffset(section,index,offset){

    const list = planning[currentDay][section];
    const newIndex = index + offset;

    if(newIndex < 0 || newIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    savePlanning();
    renderActivities();
}

function moveActivity(
    fromSection,
    fromIndex,
    toSection,
    toIndex=null
){

    const item =
    planning[currentDay][fromSection][fromIndex];

    planning[currentDay][fromSection]
    .splice(fromIndex,1);

    if(toIndex===null){

        planning[currentDay][toSection]
        .push(item);

    }else{
if (
    fromSection === toSection &&
    fromIndex < toIndex
) {
    toIndex--;
}
        planning[currentDay][toSection]
        .splice(toIndex,0,item);
    }

    savePlanning();
    renderActivities();
}

function updateConverterCountryHeader(){

    const country = COUNTRIES[tripCountry];
    const icon = APP_ICONS[tripCountry];

    const header = document.getElementById("converterCountryHeader");
    const nameEl = document.getElementById("converterCountryName");
    const subEl = document.getElementById("converterCountrySub");

    nameEl.textContent = country ? country.fr : "Voyage";

    header.style.backgroundImage = icon
        ? `url('${icon.icon512}')`
        : "none";

    let dayWithData = 0;

    Object.keys(planning).forEach(day=>{

        let dayHas = false;

        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[day][slot] || []).forEach(a=>{
                if(a.price!==null && a.price!==undefined) dayHas = true;
            });
        });

        if(dayHas) dayWithData++;
    });

    subEl.textContent = dayWithData>0
        ? `${dayWithData} jour${dayWithData>1?"s":""} renseigné${dayWithData>1?"s":""}`
        : "";
}

function renderActivities(){

    const container =
    document.getElementById("activities");

    container.innerHTML="";

    const sections=[
        {key:"matin",label:"🌅 Matin"},
        {key:"midi",label:"🍽️ Midi"},
        {key:"apresMidi",label:"☀️ Après-midi"},
        {key:"soir",label:"🌙 Soir"}
    ];

    let dayTotalPrice = 0;
    let dayTotalTravel = 0;
    let hasPrice = false;
    let hasTravel = false;

    sections.forEach(s=>{
        (planning[currentDay][s.key] || []).forEach(a=>{
            if(a.price!==null && a.price!==undefined){
                dayTotalPrice += a.price;
                hasPrice = true;
            }
            if(a.travelTime!==null && a.travelTime!==undefined){
                dayTotalTravel += a.travelTime;
                hasTravel = true;
            }
        });
    });

    const summary = document.getElementById("daySummary");
    summary.innerHTML = "";

    if(hasPrice){
        const priceSpan = document.createElement("span");
        priceSpan.textContent =
        `💷 Total du jour : ${dayTotalPrice.toFixed(2)} ${priceCurrencySymbol}`;
        summary.appendChild(priceSpan);
    }

    if(hasTravel){
        const travelSpan = document.createElement("span");
        travelSpan.textContent =
        `🚗 Trajet total : ${dayTotalTravel} min`;
        summary.appendChild(travelSpan);
    }

    updateConverterCountryHeader();

    sections.forEach(section=>{

        const activities =
        planning[currentDay][section.key] || [];

        if(activities.length===0) return;

        const sectionDiv =
        document.createElement("div");

        sectionDiv.innerHTML=
        `<h3>${section.label}</h3>`;

        const slot =
        document.createElement("div");

        slot.className="slot";

        slot.addEventListener("dragover",e=>{
            e.preventDefault();
        });

        slot.addEventListener("drop",e=>{
            e.preventDefault();

            if(!dragged) return;

            moveActivity(
    dragged.section,
    dragged.index,
    section.key
);

dragged = null;
        });

        activities.forEach((activity,index)=>{

            const div =
            document.createElement("div");

            div.className="activity";
            div.draggable=true;
            div.tabIndex=0;
            div.setAttribute(
                "aria-label",
                `${activity.name}, ${activity.type}. `
                + "Ctrl + flèche haut ou bas pour réordonner."
            );
            div.style.borderLeft =
            `5px solid ${typeColors[activity.type] || "#999"}`;

            div.addEventListener("keydown",(e)=>{

                if(!e.ctrlKey) return;

                if(e.key==="ArrowUp"){
                    e.preventDefault();
                    moveByOffset(section.key,index,-1);
                }else if(e.key==="ArrowDown"){
                    e.preventDefault();
                    moveByOffset(section.key,index,1);
                }
            });

            div.addEventListener("dragstart",()=>{

                dragged={
                    section:section.key,
                    index:index
                };

                div.classList.add("dragging");
            });

            div.addEventListener("dragend",()=>{

    div.classList.remove("dragging");
    dragged = null;

});

            div.addEventListener("dragover",e=>{
                e.preventDefault();
            });

            div.addEventListener("drop",e=>{

                e.preventDefault();
                e.stopPropagation();

                if(!dragged) return;

                if(
                    dragged.section===section.key
                    &&
                    dragged.index===index
                ){
                    dragged = null;
                    return;
                }

                moveActivity(
                    dragged.section,
                    dragged.index,
                    section.key,
                    index
                );

                dragged = null;
            });

            const infoDiv = document.createElement("div");

            const strong = document.createElement("strong");
            strong.textContent =
            `${icons[activity.type] || "📌"} `
            + (activity.time ? `${activity.time} – ` : "")
            + activity.name;

            const small = document.createElement("small");
            const dot = document.createElement("span");
            dot.style.display = "inline-block";
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.marginRight = "6px";
            dot.style.backgroundColor =
            typeColors[activity.type] || "#999";
            small.appendChild(dot);
            small.appendChild(
                document.createTextNode(activity.type)
            );

            infoDiv.appendChild(strong);
            infoDiv.appendChild(document.createElement("br"));
            infoDiv.appendChild(small);

            if(
                (activity.price!==null && activity.price!==undefined)
                ||
                (activity.travelTime!==null && activity.travelTime!==undefined)
                ||
                activity.duration
            ){

                const badgeRow = document.createElement("div");
                badgeRow.className = "badge-row";

                if(activity.price!==null && activity.price!==undefined){
                    const priceBadge = document.createElement("span");
                    priceBadge.className = "price-badge";
                    priceBadge.textContent =
                    `💷 ${activity.price.toFixed(2)} ${priceCurrencySymbol}`;
                    badgeRow.appendChild(priceBadge);
                }

                if(activity.travelTime!==null && activity.travelTime!==undefined){
                    const travelBadge = document.createElement("span");
                    travelBadge.className = "travel-badge";
                    travelBadge.textContent =
                    `🚗 ${activity.travelTime} min de trajet`;
                    badgeRow.appendChild(travelBadge);
                }

                if(activity.duration){
                    const durationBadge = document.createElement("span");
                    durationBadge.className = "duration-badge";
                    durationBadge.textContent =
                    `⏱️ ${activity.duration}`;
                    badgeRow.appendChild(durationBadge);
                }

                infoDiv.appendChild(badgeRow);
            }

            if(activity.note){
                const noteP = document.createElement("p");
                noteP.className = "activity-note";
                noteP.textContent = `💡 ${activity.note}`;
                infoDiv.appendChild(noteP);
            }

            const delBtn = document.createElement("button");
            delBtn.className = "delete";
            delBtn.textContent = "Supprimer";
            delBtn.addEventListener("click",()=>{
                deleteActivity(section.key,index);
            });

            const upBtn = document.createElement("button");
            upBtn.className = "reorder-btn";
            upBtn.textContent = "▲";
            upBtn.title = "Monter";
            upBtn.disabled = index === 0;
            upBtn.addEventListener("click",()=>{
                moveByOffset(section.key,index,-1);
            });

            const downBtn = document.createElement("button");
            downBtn.className = "reorder-btn";
            downBtn.textContent = "▼";
            downBtn.title = "Descendre";
            downBtn.disabled = index === activities.length - 1;
            downBtn.addEventListener("click",()=>{
                moveByOffset(section.key,index,1);
            });

            const reorderGroup = document.createElement("div");
            reorderGroup.className = "reorder-group";
            reorderGroup.appendChild(upBtn);
            reorderGroup.appendChild(downBtn);

            const moveSelect = document.createElement("select");
            moveSelect.className = "move-select";

            const moveDefaultOpt = document.createElement("option");
            moveDefaultOpt.textContent = "Déplacer vers…";
            moveDefaultOpt.value = "";
            moveSelect.appendChild(moveDefaultOpt);

            sections.forEach(s=>{
                if(s.key === section.key) return;
                const opt = document.createElement("option");
                opt.value = s.key;
                opt.textContent = s.label;
                moveSelect.appendChild(opt);
            });

            moveSelect.addEventListener("change",()=>{
                if(!moveSelect.value) return;
                moveActivity(section.key,index,moveSelect.value);
            });

            const editBtn = document.createElement("button");
            editBtn.className = "map-btn";
            editBtn.textContent = "✏️";
            editBtn.title = "Modifier l'activité";
            editBtn.addEventListener("click",()=>{
                startEditActivity(section.key,index);
            });

            const btnGroup = document.createElement("div");
            btnGroup.className = "btn-group";
            btnGroup.appendChild(reorderGroup);
            btnGroup.appendChild(moveSelect);
            btnGroup.appendChild(editBtn);

            if(activity.address && activity.address.trim()){
                const mapBtn = document.createElement("button");
                mapBtn.className = "map-btn";
                mapBtn.textContent = "📍";
                mapBtn.title = "Ouvrir dans Google Maps";
                mapBtn.addEventListener("click",()=>{
                    window.open(
                        "https://www.google.com/maps/search/?api=1&query="
                        + encodeURIComponent(activity.address.trim()),
                        "_blank"
                    );
                });
                btnGroup.appendChild(mapBtn);
            }

            if(activity.reservationLink){
                const reservationBtn = document.createElement("button");
                reservationBtn.className = "map-btn";
                reservationBtn.textContent = "🔗";
                reservationBtn.title = "Ouvrir la réservation";
                reservationBtn.addEventListener("click",()=>{
                    if(/^https?:\/\//i.test(activity.reservationLink)){
                        window.open(activity.reservationLink,"_blank","noopener,noreferrer");
                    }else{
                        showToast("Lien de réservation invalide (doit commencer par http:// ou https://).",{type:"error"});
                    }
                });
                btnGroup.appendChild(reservationBtn);
            }

            btnGroup.appendChild(delBtn);

            div.appendChild(infoDiv);
            div.appendChild(btnGroup);

            slot.appendChild(div);
        });

        sectionDiv.appendChild(slot);
        container.appendChild(sectionDiv);

    });

    renderTabs();
}

const themeToggle =
document.getElementById("themeToggle");
const resetButton =
document.getElementById("resetPlanning");

function resetPlanning(){

    showConfirmModal(
        "Voulez-vous vraiment supprimer tout le planning ? "
        + "Cette action est irréversible.",
        ()=>{

            Object.keys(planning).forEach(day=>{
                planning[day] = {
                    matin:[],
                    midi:[],
                    apresMidi:[],
                    soir:[],
                    title:""
                };
            });

            savePlanning();
            renderActivities();

            showToast("Planning réinitialisé.",{type:"success"});
        }
    );
}

resetButton.addEventListener(
    "click",
    resetPlanning
);

const deleteTripBtn = document.getElementById("deleteTripBtn");

deleteTripBtn.addEventListener("click",()=>{

    showConfirmModal(
        "Supprimer le voyage ? Le nom, les dates, le pays, le planning, la "
        + "checklist et les infos voyageur seront effacés"
        + (syncCode ? " et la synchronisation avec l'autre appareil sera coupée" : "")
        + ". Cette action est irréversible.",
        ()=>{

            if(syncRef) syncRef.off();
            syncRef = null;
            syncCode = "";
            localStorage.removeItem(SYNC_CODE_KEY);

            localStorage.removeItem("vacationPlanning");
            localStorage.removeItem(TRIP_NAME_KEY);
            localStorage.removeItem(TRIP_CREATED_KEY);
            localStorage.removeItem(TRIP_COUNTRY_KEY);
            localStorage.removeItem("startDate");
            localStorage.removeItem("dayCount");
            localStorage.removeItem("appIconChoice");
            localStorage.removeItem(CHECKLIST_STORAGE_KEY);
            localStorage.removeItem(CHECKLIST_TEMPLATE_STATE_KEY);
            localStorage.removeItem(TRAVELER_INFO_KEY);

            location.reload();
        }
    );
});

/* --- Export PDF / Impression --- */

const printBtn = document.getElementById("printBtn");

function buildPrintView(){

    const printView = document.getElementById("printView");
    printView.innerHTML = "";

    const title = document.createElement("h1");
    title.textContent = "🌴 Planification de Vacances";
    printView.appendChild(title);

    const sections = [
        {key:"matin",label:"🌅 Matin"},
        {key:"midi",label:"🍽️ Midi"},
        {key:"apresMidi",label:"☀️ Après-midi"},
        {key:"soir",label:"🌙 Soir"}
    ];

    for(let day=1;day<=dayCount;day++){

        const dayData = planning[day];
        if(!dayData) continue;

        const dateLabel = typeof formatDayDate==="function"
            ? formatDayDate(day)
            : "";

        let heading = `Jour ${day}`;
        if(dateLabel) heading += ` — ${dateLabel}`;
        if(dayData.title) heading += ` — ${dayData.title}`;

        const h2 = document.createElement("h2");
        h2.textContent = heading;
        printView.appendChild(h2);

        let dayHasActivity = false;

        sections.forEach(section=>{

            const list = dayData[section.key] || [];
            if(list.length===0) return;

            dayHasActivity = true;

            const h3 = document.createElement("h3");
            h3.textContent = section.label;
            printView.appendChild(h3);

            list.forEach(activity=>{

                const row = document.createElement("div");
                row.className = "print-activity";

                const nameLine = document.createElement("div");
                nameLine.textContent =
                (icons[activity.type] || "📌") + " "
                + (activity.time ? activity.time + " – " : "")
                + activity.name;
                row.appendChild(nameLine);

                const metaParts = [];
                if(activity.address) metaParts.push(activity.address);
                if(activity.price!==null && activity.price!==undefined){
                    metaParts.push(`${activity.price.toFixed(2)} ${priceCurrencySymbol}`);
                }
                if(activity.travelTime!==null && activity.travelTime!==undefined){
                    metaParts.push(`${activity.travelTime} min de trajet`);
                }
                if(activity.duration){
                    metaParts.push(`Durée : ${activity.duration}`);
                }

                if(metaParts.length>0){
                    const meta = document.createElement("div");
                    meta.className = "print-activity-meta";
                    meta.textContent = metaParts.join(" · ");
                    row.appendChild(meta);
                }

                if(activity.note){
                    const note = document.createElement("div");
                    note.className = "print-activity-meta";
                    note.textContent = `💡 ${activity.note}`;
                    row.appendChild(note);
                }

                if(activity.reservationLink){
                    const link = document.createElement("div");
                    link.className = "print-activity-meta";
                    link.textContent = `🔗 ${activity.reservationLink}`;
                    row.appendChild(link);
                }

                printView.appendChild(row);
            });
        });

        if(!dayHasActivity){
            const empty = document.createElement("div");
            empty.className = "print-activity-meta";
            empty.textContent = "Aucune activité planifiée.";
            printView.appendChild(empty);
        }
    }
}

printBtn.addEventListener("click",()=>{
    buildPrintView();
    window.print();
});

/* --- Devise de saisie des prix des activités (indépendante du convertisseur) --- */

const priceCurrencySelect = document.getElementById("priceCurrencySelect");
const activityPriceInput = document.getElementById("activityPrice");
const activityPriceSuffix = document.getElementById("activityPriceSuffix");

priceCurrencySelect.value = priceCurrencySymbol;
activityPriceInput.placeholder = `Prix (${priceCurrencySymbol})`;
activityPriceSuffix.textContent = `Prix (${priceCurrencySymbol})`;

priceCurrencySelect.addEventListener("change",()=>{
    priceCurrencySymbol = priceCurrencySelect.value;
    localStorage.setItem("priceCurrencySymbol",priceCurrencySymbol);
    activityPriceInput.placeholder = `Prix (${priceCurrencySymbol})`;
    activityPriceSuffix.textContent = `Prix (${priceCurrencySymbol})`;
    renderActivities();
    if(activeMainTab==="profile") renderProfileStats();
});

/* --- Export / Import JSON (sauvegarde complète) --- */

const exportDataBtn = document.getElementById("exportDataBtn");

exportDataBtn.addEventListener("click",()=>{

    const backup = {
        version:1,
        exportedAt:new Date().toISOString(),
        planning,
        dayCount,
        startDate:localStorage.getItem("startDate") || "",
        checklist:JSON.parse(
            localStorage.getItem("travelChecklist") || "[]"
        )
    };

    const blob = new Blob(
        [JSON.stringify(backup,null,2)],
        {type:"application/json"}
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
    `planning_vacances_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast("Sauvegarde exportée.",{type:"success"});
});

function handleImportBackupFile(file){

    const reader = new FileReader();

    reader.onload = (evt)=>{

        let data;

        try{
            data = JSON.parse(evt.target.result);
        }catch(err){
            showToast(
                "Fichier de sauvegarde invalide (JSON illisible).",
                {type:"error"}
            );
            importFile.value = "";
            return;
        }

        if(!data || typeof data.planning!=="object"){
            showToast(
                "Ce fichier ne semble pas être une sauvegarde valide.",
                {type:"error"}
            );
            importFile.value = "";
            return;
        }

        showConfirmModal(
            "Importer cette sauvegarde remplacera tout le planning "
            + "actuel. Continuer ?",
            ()=>{

                Object.keys(planning).forEach(k=>delete planning[k]);
                mergePlanningData(planning,data.planning);

                if(data.dayCount){
                    dayCount = data.dayCount;
                    document.getElementById("dayCount").value = dayCount;
                    localStorage.setItem("dayCount",dayCount);
                }

                if(data.startDate!==undefined){
                    startDate = data.startDate;
                    document.getElementById("startDate").value = startDate;
                    localStorage.setItem("startDate",startDate);
                }

                if(Array.isArray(data.checklist)){
                    checklist = data.checklist;
                    saveChecklist();
                    renderChecklist();
                }

                ensureDaysExist();
                savePlanning();

                if(currentDay > dayCount) currentDay = dayCount;

                createTabs();
                renderActivities();
                updateCountdownBanner();

                showToast("Sauvegarde importée avec succès.",{type:"success"});
            }
        );

        importFile.value = "";
    };

    reader.readAsText(file);
}

/* --- Import Excel / CSV / texte --- */

const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const templateBtn = document.getElementById("templateBtn");

importBtn.addEventListener("click",()=>{
    importFile.click();
});

function normalizeSlot(value){

    const v = (value || "").toString()
    .trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");

    if(v.startsWith("mat")) return "matin";
    if(v.startsWith("mid")) return "midi";
    if(v.includes("apres") || v.startsWith("pm")) return "apresMidi";
    if(v.startsWith("soi") || v.startsWith("even")) return "soir";

    return null;
}

function getField(row,names){

    for(const n of names){
        if(row[n] !== undefined && row[n] !== ""){
            return row[n].toString().trim();
        }
    }

    return "";
}

function importRows(rows){

    let imported = 0;
    let skipped = 0;
    let firstDay = null;
    let maxDay = 0;

    rows.forEach(row=>{

        const day = parseInt(
            getField(row,["Jour","jour","Day","day"]),
            10
        );

        const slot = normalizeSlot(
            getField(row,["Créneau","Creneau","Slot","Moment","slot"])
        );

        const name = getField(
            row,
            ["Nom","Nom_lieu","Activité","Activite","Name","name"]
        );

        const type =
        getField(row,["Type","type"]) || "Visite";

        const address =
        getField(row,["Adresse","Address","adresse"]);

        const priceField =
        getField(row,["Prix","Price","prix"]);

        const travelField =
        getField(row,["Trajet","Temps de trajet","Travel","trajet"]);

        const price =
        priceField!=="" ? Math.max(0,parseFloat(priceField.replace(",","."))) : null;

        const travelTime =
        travelField!=="" ? Math.max(0,parseInt(travelField,10)) : null;

        const time = getField(
            row,
            ["Heure_conseillee","Heure","Heure conseillée","Time"]
        );

        const duration = getField(
            row,
            ["Duree","Durée","Duration"]
        );

        const note = getField(
            row,
            ["Note","Notes","Remarque","Conseil"]
        );

        const reservationLink = getField(
            row,
            ["Lien_reservation","Lien_réservation","Reservation","Réservation","Booking","Lien"]
        );

        const dayTitle = getField(
            row,
            ["Jour_titre","JourTitre","Titre_jour","DayTitle"]
        );

        if(!day || day<1 || day>30 || !slot || !name){
            skipped++;
            return;
        }

        if(!planning[day]){
            planning[day] = {
                matin:[],
                midi:[],
                apresMidi:[],
                soir:[],
                title:""
            };
        }

        if(dayTitle){
            planning[day].title = dayTitle;
        }

        planning[day][slot].push({
            name,
            type,
            address,
            price: isNaN(price) ? null : price,
            travelTime: isNaN(travelTime) ? null : travelTime,
            time: time || null,
            duration: duration || null,
            note: note || null,
            reservationLink: reservationLink || null
        });

        imported++;

        if(firstDay===null) firstDay = day;
        if(day > maxDay) maxDay = day;
    });

    if(imported>0){

        if(maxDay > dayCount){
            dayCount = maxDay;
            document.getElementById("dayCount").value = dayCount;
            localStorage.setItem("dayCount",dayCount);
        }

        savePlanning();

        if(firstDay){
            currentDay = firstDay;
        }

        createTabs();
        renderActivities();
    }

    showToast(
        `${imported} activité(s) importée(s).`
        + (skipped>0
            ? ` ${skipped} ligne(s) ignorée(s).`
            : ""),
        {type: skipped>0 ? undefined : "success", duration:6000}
    );
}

let sheetJsLoadingPromise = null;

function loadSheetJS(){

    if(window.XLSX) return Promise.resolve();

    if(sheetJsLoadingPromise) return sheetJsLoadingPromise;

    sheetJsLoadingPromise = new Promise((resolve,reject)=>{

        const script = document.createElement("script");
        script.src = "vendor/xlsx.full.min.js";

        script.onload = ()=>resolve();
        script.onerror = ()=>reject(
            new Error("Impossible de charger la librairie d'import.")
        );

        document.head.appendChild(script);
    });

    return sheetJsLoadingPromise;
}

function handleImportFile(e){

    const file = e.target.files[0];
    if(!file) return;

    const isText = /\.(csv|txt)$/i.test(file.name);
    const reader = new FileReader();

    reader.onload = (evt)=>{

        loadSheetJS().then(()=>{

        try{

            let workbook;

            if(isText){
                workbook = XLSX.read(
                    evt.target.result,
                    {type:"string"}
                );
            }else{
                workbook = XLSX.read(
                    new Uint8Array(evt.target.result),
                    {type:"array"}
                );
            }

            const preferredSheetName =
            workbook.SheetNames.find(
                n => n.trim().toLowerCase()==="tout"
            );

            const sheet = workbook.Sheets[
                preferredSheetName || workbook.SheetNames[0]
            ];

            const rows =
            XLSX.utils.sheet_to_json(sheet,{defval:""});

            if(rows.length===0){
                showToast(
                    "Le fichier ne contient aucune ligne exploitable.",
                    {type:"error"}
                );
            }else{
                importRows(rows);
            }

        }catch(err){
            showToast(
                "Impossible de lire ce fichier. Vérifiez qu'il "
                + "contient bien les colonnes : Jour, Créneau, "
                + "Nom, Type, Adresse.",
                {type:"error",duration:6000}
            );
        }

        }).catch(()=>{
            showToast(
                "Impossible de charger le module d'import "
                + "(vérifiez votre connexion internet).",
                {type:"error",duration:6000}
            );
        }).finally(()=>{
            importFile.value = "";
        });
    };

    if(isText){
        reader.readAsText(file);
    }else{
        reader.readAsArrayBuffer(file);
    }
}

importFile.addEventListener("change",(e)=>{
    const file = e.target.files[0];
    if(!file) return;

    if(/\.json$/i.test(file.name)){
        handleImportBackupFile(file);
    }else{
        handleImportFile(e);
    }
});

templateBtn.addEventListener("click",()=>{

    const csv =
    "Jour;Créneau;Nom;Type;Adresse;Prix;Trajet\n"
    + "1;matin;Visite Tour Eiffel;Visite;"
    + "Champ de Mars, Paris;28;15\n"
    + "1;midi;Déjeuner Café de Paris;Restaurant;"
    + "Champs-Élysées, Paris;35;10\n"
    + "1;soir;Hôtel du Centre;Logement;;120;\n"
    + "2;apresMidi;Musée du Louvre;Musée;"
    + "Rue de Rivoli, Paris;22;20\n";

    const blob = new Blob(
        ["\uFEFF"+csv],
        {type:"text/csv;charset=utf-8;"}
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_planning.csv";
    a.click();
    URL.revokeObjectURL(url);
});

const layoutToggle =
document.getElementById("layoutToggle");

const layoutModes = ["auto","desktop","mobile"];
const layoutIcons = {
    auto:"🔄",
    desktop:"💻",
    mobile:"📱"
};
const layoutLabels = {
    auto:"Mode auto (clic pour changer)",
    desktop:"Mode PC (clic pour changer)",
    mobile:"Mode Téléphone (clic pour changer)"
};
const layoutMenuLabels = {
    auto:"Affichage mode auto",
    desktop:"Affichage mode PC",
    mobile:"Affichage mode téléphone"
};

function applyLayoutMode(mode){

    document.body.classList.remove(
        "desktop-mode",
        "mobile-mode"
    );

    if(mode==="desktop"){
        document.body.classList.add("desktop-mode");
    }else if(mode==="mobile"){
        document.body.classList.add("mobile-mode");
    }

    layoutToggle.querySelector(".menu-item-icon").textContent = layoutIcons[mode];
    layoutToggle.querySelector(".menu-item-label").textContent = layoutMenuLabels[mode];
    layoutToggle.title = layoutLabels[mode];
}

let currentLayoutMode =
localStorage.getItem("layoutMode") || "auto";

applyLayoutMode(currentLayoutMode);

layoutToggle.addEventListener("click",()=>{

    const currentIndex =
    layoutModes.indexOf(currentLayoutMode);

    currentLayoutMode =
    layoutModes[(currentIndex+1) % layoutModes.length];

    localStorage.setItem("layoutMode",currentLayoutMode);

    applyLayoutMode(currentLayoutMode);
    updateDatePlacement();
});

/* --- Pays (réutilisé par le logo ET le filtre "pays de vacances" de la carte) --- */

const COUNTRIES = {
    germany:{fr:"Allemagne",en:"Germany"},
    australia:{fr:"Australie",en:"Australia"},
    austria:{fr:"Autriche",en:"Austria"},
    belgium:{fr:"Belgique",en:"Belgium"},
    brazil:{fr:"Brésil",en:"Brazil"},
    canada:{fr:"Canada",en:"Canada"},
    chile:{fr:"Chili",en:"Chile"},
    china:{fr:"Chine",en:"China"},
    southkorea:{fr:"Corée du Sud",en:"South Korea"},
    croatia:{fr:"Croatie",en:"Croatia"},
    denmark:{fr:"Danemark",en:"Denmark"},
    egypt:{fr:"Égypte",en:"Egypt"},
    spain:{fr:"Espagne",en:"Spain"},
    usa:{fr:"États-Unis",en:"United States"},
    finland:{fr:"Finlande",en:"Finland"},
    france:{fr:"France",en:"France"},
    greece:{fr:"Grèce",en:"Greece"},
    hungary:{fr:"Hongrie",en:"Hungary"},
    india:{fr:"Inde",en:"India"},
    iceland:{fr:"Islande",en:"Iceland"},
    italy:{fr:"Italie",en:"Italy"},
    japan:{fr:"Japon",en:"Japan"},
    nepal:{fr:"Népal",en:"Nepal"},
    norway:{fr:"Norvège",en:"Norway"},
    netherlands:{fr:"Pays-Bas",en:"Netherlands"},
    portugal:{fr:"Portugal",en:"Portugal"},
    czechrepublic:{fr:"République tchèque",en:"Czech Republic"},
    romania:{fr:"Roumanie",en:"Romania"},
    singapore:{fr:"Singapour",en:"Singapore"},
    sweden:{fr:"Suède",en:"Sweden"},
    switzerland:{fr:"Suisse",en:"Switzerland"},
    thailand:{fr:"Thaïlande",en:"Thailand"},
    turkey:{fr:"Turquie",en:"Turkey"}
};

/* --- Logo de l'application (icône PWA à l'installation) --- */

const APP_ICONS = {
    default:{label:"🌍 Par défaut",icon192:"icons/icon-192-default.png",icon512:"icons/icon-512-default.png"},
    germany:{label:"🇩🇪 Allemagne",icon192:"icons/icon-192-germany.png",icon512:"icons/icon-512-germany.png"},
    australia:{label:"🇦🇺 Australie",icon192:"icons/icon-192-australia.png",icon512:"icons/icon-512-australia.png"},
    austria:{label:"🇦🇹 Autriche",icon192:"icons/icon-192-austria.png",icon512:"icons/icon-512-austria.png"},
    belgium:{label:"🇧🇪 Belgique",icon192:"icons/icon-192-belgium.png",icon512:"icons/icon-512-belgium.png"},
    brazil:{label:"🇧🇷 Brésil",icon192:"icons/icon-192-brazil.png",icon512:"icons/icon-512-brazil.png"},
    canada:{label:"🇨🇦 Canada",icon192:"icons/icon-192-canada.png",icon512:"icons/icon-512-canada.png"},
    chile:{label:"🇨🇱 Chili",icon192:"icons/icon-192-chile.png",icon512:"icons/icon-512-chile.png"},
    china:{label:"🇨🇳 Chine",icon192:"icons/icon-192-china.png",icon512:"icons/icon-512-china.png"},
    southkorea:{label:"🇰🇷 Corée du Sud",icon192:"icons/icon-192-southkorea.png",icon512:"icons/icon-512-southkorea.png"},
    croatia:{label:"🇭🇷 Croatie",icon192:"icons/icon-192-croatia.png",icon512:"icons/icon-512-croatia.png"},
    denmark:{label:"🇩🇰 Danemark",icon192:"icons/icon-192-denmark.png",icon512:"icons/icon-512-denmark.png"},
    egypt:{label:"🇪🇬 Égypte",icon192:"icons/icon-192-egypt.png",icon512:"icons/icon-512-egypt.png"},
    spain:{label:"🇪🇸 Espagne",icon192:"icons/icon-192-spain.png",icon512:"icons/icon-512-spain.png"},
    usa:{label:"🇺🇸 États-Unis",icon192:"icons/icon-192-usa.png",icon512:"icons/icon-512-usa.png"},
    finland:{label:"🇫🇮 Finlande",icon192:"icons/icon-192-finland.png",icon512:"icons/icon-512-finland.png"},
    france:{label:"🇫🇷 France",icon192:"icons/icon-192-france.png",icon512:"icons/icon-512-france.png"},
    greece:{label:"🇬🇷 Grèce",icon192:"icons/icon-192-greece.png",icon512:"icons/icon-512-greece.png"},
    hungary:{label:"🇭🇺 Hongrie",icon192:"icons/icon-192-hungary.png",icon512:"icons/icon-512-hungary.png"},
    india:{label:"🇮🇳 Inde",icon192:"icons/icon-192-india.png",icon512:"icons/icon-512-india.png"},
    iceland:{label:"🇮🇸 Islande",icon192:"icons/icon-192-iceland.png",icon512:"icons/icon-512-iceland.png"},
    italy:{label:"🇮🇹 Italie",icon192:"icons/icon-192-italy.png",icon512:"icons/icon-512-italy.png"},
    japan:{label:"🇯🇵 Japon",icon192:"icons/icon-192-japan.png",icon512:"icons/icon-512-japan.png"},
    nepal:{label:"🇳🇵 Népal",icon192:"icons/icon-192-nepal.png",icon512:"icons/icon-512-nepal.png"},
    norway:{label:"🇳🇴 Norvège",icon192:"icons/icon-192-norway.png",icon512:"icons/icon-512-norway.png"},
    netherlands:{label:"🇳🇱 Pays-Bas",icon192:"icons/icon-192-netherlands.png",icon512:"icons/icon-512-netherlands.png"},
    portugal:{label:"🇵🇹 Portugal",icon192:"icons/icon-192-portugal.png",icon512:"icons/icon-512-portugal.png"},
    czechrepublic:{label:"🇨🇿 République tchèque",icon192:"icons/icon-192-czechrepublic.png",icon512:"icons/icon-512-czechrepublic.png"},
    romania:{label:"🇷🇴 Roumanie",icon192:"icons/icon-192-romania.png",icon512:"icons/icon-512-romania.png"},
    singapore:{label:"🇸🇬 Singapour",icon192:"icons/icon-192-singapore.png",icon512:"icons/icon-512-singapore.png"},
    sweden:{label:"🇸🇪 Suède",icon192:"icons/icon-192-sweden.png",icon512:"icons/icon-512-sweden.png"},
    switzerland:{label:"🇨🇭 Suisse",icon192:"icons/icon-192-switzerland.png",icon512:"icons/icon-512-switzerland.png"},
    thailand:{label:"🇹🇭 Thaïlande",icon192:"icons/icon-192-thailand.png",icon512:"icons/icon-512-thailand.png"},
    turkey:{label:"🇹🇷 Turquie",icon192:"icons/icon-192-turkey.png",icon512:"icons/icon-512-turkey.png"}
};

/* Devise locale de chaque pays — utilisée pour préremplir la devise
   d'arrivée du Convertisseur à la création du voyage (voir welcomeCreateBtn). */
const COUNTRY_CURRENCIES = {
    germany:"EUR", australia:"AUD", austria:"EUR", belgium:"EUR", brazil:"BRL",
    canada:"CAD", chile:"CLP", china:"CNY", southkorea:"KRW", croatia:"EUR", denmark:"DKK",
    egypt:"EGP", spain:"EUR", usa:"USD", finland:"EUR", france:"EUR",
    greece:"EUR", hungary:"HUF", india:"INR", iceland:"ISK", italy:"EUR",
    japan:"JPY", nepal:"NPR", norway:"NOK", netherlands:"EUR", portugal:"EUR",
    czechrepublic:"CZK", romania:"RON", singapore:"SGD", sweden:"SEK",
    switzerland:"CHF", thailand:"THB", turkey:"TRY"
};

const appIconSelect = document.getElementById("appIconSelect");
const manifestLink = document.getElementById("manifestLink");
const faviconLink = document.getElementById("faviconLink");
const appleTouchIconLink = document.getElementById("appleTouchIconLink");

Object.keys(APP_ICONS).forEach(key=>{
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = APP_ICONS[key].label;
    appIconSelect.appendChild(opt);
});

const welcomeCountrySelect = document.getElementById("welcomeCountrySelect");

const welcomeCountryPlaceholder = document.createElement("option");
welcomeCountryPlaceholder.value = "";
welcomeCountryPlaceholder.textContent = "Sélectionne un pays";
welcomeCountryPlaceholder.disabled = true;
welcomeCountryPlaceholder.selected = true;
welcomeCountrySelect.appendChild(welcomeCountryPlaceholder);

Object.keys(APP_ICONS).forEach(key=>{
    if(key==="default") return;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = APP_ICONS[key].label;
    welcomeCountrySelect.appendChild(opt);
});

welcomeCountrySelect.classList.add("welcome-select-placeholder");

let welcomeIconChoice = "default";

welcomeCountrySelect.addEventListener("change",()=>{

    welcomeCountrySelect.classList.remove("welcome-select-placeholder");

    const newChoice = welcomeCountrySelect.value;
    const meta = APP_ICONS[newChoice];

    showConfirmModal(
        `Utiliser « ${meta.label} » comme logo de l'application ?`,
        ()=>{
            welcomeIconChoice = newChoice;
        },
        {
            previewSrc: meta.icon512,
            onCancel: ()=>{
                welcomeIconChoice = "default";
            }
        }
    );
});

document.getElementById("welcomeCreateBtn").addEventListener("click",()=>{

    const name = document.getElementById("welcomeTripName").value.trim();

    if(!name){
        showToast("Donne un nom à ton voyage pour continuer.",{type:"error"});
        return;
    }

    const country = welcomeCountrySelect.value;

    if(!country){
        showToast("Choisis un pays pour continuer.",{type:"error"});
        return;
    }

    const startDateVal = document.getElementById("welcomeStartDate").value;
    const endDateVal = document.getElementById("welcomeEndDate").value;
    const localCurrency = COUNTRY_CURRENCIES[country] || "USD";

    let dayCountVal = 7;

    if(startDateVal && endDateVal){

        const diffDays = Math.round(
            (new Date(endDateVal) - new Date(startDateVal)) / 86400000
        ) + 1;

        if(diffDays<1){
            showToast("La date de retour doit être après la date de départ.",{type:"error"});
            return;
        }

        dayCountVal = diffDays;
    }

    localStorage.setItem(TRIP_NAME_KEY,name);
    localStorage.setItem("appIconChoice",welcomeIconChoice);
    localStorage.setItem(TRIP_COUNTRY_KEY,country);
    if(startDateVal) localStorage.setItem("startDate",startDateVal);
    localStorage.setItem("dayCount",String(Math.min(30,Math.max(1,dayCountVal))));

    localStorage.setItem("baseCurrency","GBP");
    localStorage.setItem("priceCurrencySymbol","£");
    localStorage.setItem("targetCurrency",localCurrency);
    localStorage.setItem(TRIP_CREATED_KEY,"1");

    location.reload();
});

document.getElementById("welcomeLaterBtn").addEventListener("click",()=>{

    if(!localStorage.getItem("dayCount")){
        localStorage.setItem("dayCount",String(dayCount));
    }

    if(!tripName){
        tripName = "Mon voyage";
        localStorage.setItem(TRIP_NAME_KEY,tripName);
        appTitle.textContent = "🌴 "+tripName;
    }

    document.getElementById("createTripMenuItem").hidden = false;
    document.getElementById("welcomeView").hidden = true;
});

document.getElementById("createTripShortcutBtn").addEventListener("click",()=>{
    document.getElementById("welcomeView").hidden = false;
});

const APP_ICON_KEY = "appIconChoice";
let appIconChoice = localStorage.getItem(APP_ICON_KEY) || "default";
appIconSelect.value = appIconChoice;

let lastManifestBlobUrl = null;

function absUrl(path){
    return new URL(path,document.baseURI).href;
}

function applyAppIcon(key){

    const meta = APP_ICONS[key] || APP_ICONS.default;

    faviconLink.href = meta.icon192;
    appleTouchIconLink.href = meta.icon512;

    const manifest = {
        name:"Planification de Vacances",
        short_name:"Vacances",
        start_url:absUrl("./Planning_v1.0.html"),
        scope:absUrl("./"),
        display:"standalone",
        background_color:"#FCFDFE",
        theme_color:"#D2503B",
        lang:"fr",
        icons:[
            {src:absUrl(meta.icon192),sizes:"192x192",type:"image/png",purpose:"any"},
            {src:absUrl(meta.icon512),sizes:"512x512",type:"image/png",purpose:"any"},
            {src:absUrl(meta.icon192),sizes:"192x192",type:"image/png",purpose:"maskable"},
            {src:absUrl(meta.icon512),sizes:"512x512",type:"image/png",purpose:"maskable"}
        ]
    };

    const blob = new Blob([JSON.stringify(manifest)],{type:"application/json"});

    if(lastManifestBlobUrl) URL.revokeObjectURL(lastManifestBlobUrl);
    lastManifestBlobUrl = URL.createObjectURL(blob);
    manifestLink.href = lastManifestBlobUrl;
}

applyAppIcon(appIconChoice);

appIconSelect.addEventListener("change",()=>{

    const newChoice = appIconSelect.value;
    const previousChoice = appIconChoice;
    const meta = APP_ICONS[newChoice];

    showConfirmModal(
        `Utiliser « ${meta.label} » comme logo de l'application ?`,
        ()=>{
            appIconChoice = newChoice;
            localStorage.setItem(APP_ICON_KEY,appIconChoice);
            applyAppIcon(appIconChoice);
            updateMapCountryToggleLabel();
            updateConverterCountryHeader();
            showToast(
                "Logo mis à jour. Désinstalle puis réinstalle l'app pour le voir sur l'écran d'accueil.",
                {type:"success",duration:6000}
            );
        },
        {
            previewSrc: meta.icon512,
            onCancel: ()=>{
                appIconSelect.value = previousChoice;
                if(!isDesktopContext() && typeof appIconSelect.showPicker==="function"){
                    try{ appIconSelect.showPicker(); }catch(err){}
                }
            }
        }
    );
});

function updateThemeButton(){

    const isDark = document.body.classList.contains("dark");

    themeToggle.querySelector(".menu-item-icon").textContent = isDark ? "☀️" : "🌙";
    themeToggle.querySelector(".menu-item-label").textContent = isDark ? "Mode clair" : "Mode sombre";
    themeToggle.title = isDark ? "Mode clair" : "Mode sombre";
}

if(localStorage.getItem("theme")==="dark"){
    document.body.classList.add("dark");
}

themeToggle.addEventListener("click",()=>{

    document.body.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark")
            ? "dark"
            : "light"
    );

    updateThemeButton();
});

const welcomeThemeToggle = document.getElementById("welcomeThemeToggle");
welcomeThemeToggle.checked = document.body.classList.contains("dark");

welcomeThemeToggle.addEventListener("change",()=>{

    document.body.classList.toggle("dark",welcomeThemeToggle.checked);

    localStorage.setItem(
        "theme",
        welcomeThemeToggle.checked ? "dark" : "light"
    );

    updateThemeButton();
});

const dayCountInput = document.getElementById("dayCount");
dayCountInput.value = dayCount;

dayCountInput.addEventListener("change",()=>{

    let val = parseInt(dayCountInput.value,10);

    if(isNaN(val) || val<1) val = 1;
    if(val>30) val = 30;

    dayCountInput.value = val;
    dayCount = val;

    localStorage.setItem("dayCount",dayCount);

    ensureDaysExist();

    if(currentDay > dayCount){
        currentDay = dayCount;
    }

    createTabs();
    renderActivities();
});

/* --- Date de départ / compte à rebours / "Aujourd'hui" --- */

const startDateInput = document.getElementById("startDate");
const countdownBanner = document.getElementById("countdownBanner");
const jumpTodayBtn = document.getElementById("jumpTodayBtn");

const dateWrap = document.getElementById("dateWrap");
const dateInlineSlot = document.getElementById("dateInlineSlot");
const dateMenuItem = document.getElementById("dateMenuItem");
const dateToggleBtn = document.getElementById("dateToggleBtn");
const datePanel = document.getElementById("datePanel");
const dateProfileSlot = document.getElementById("dateProfileSlot");
const dateTabs = document.getElementById("dateTabs");
const dateTabButtons = dateTabs.querySelectorAll(".date-tab");
const dateWrapRows = dateWrap.querySelectorAll(".date-wrap-row");

let startDate = localStorage.getItem("startDate") || "";
startDateInput.value = startDate;

let activeDateTab = "dates";

function isDesktopContext(){
    if(document.body.classList.contains("desktop-mode")) return true;
    if(document.body.classList.contains("mobile-mode")) return false;
    return window.innerWidth > 600;
}

function updateDateTabs(){

    const desktop = isDesktopContext();

    dateTabs.hidden = !desktop;

    dateWrapRows.forEach(row=>{
        row.hidden = desktop && row.dataset.tab!==activeDateTab;
    });
}

dateTabButtons.forEach(btn=>{
    btn.addEventListener("click",()=>{
        activeDateTab = btn.dataset.tab;
        dateTabButtons.forEach(b=>b.classList.toggle("active",b===btn));
        updateDateTabs();
    });
});

function updateDatePlacement(){

    const desktop = isDesktopContext();

    if(desktop){
        dateInlineSlot.appendChild(dateWrap);
    }else{
        dateProfileSlot.appendChild(dateWrap);
    }

    dateMenuItem.hidden = true;
    closeDatePanel();

    updateDateTabs();
    updateBottomNavVisibility();
}

function closeDatePanel(){
    datePanel.hidden = true;
    dateToggleBtn.setAttribute("aria-expanded","false");
}

function toggleDatePanel(){
    const isOpen = !datePanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeSearchPanel();
    }
    datePanel.hidden = isOpen;
    dateToggleBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

dateToggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    toggleDatePanel();
});

document.addEventListener("click",(e)=>{
    if(!datePanel.hidden && !e.target.closest(".corner-menu-item")){
        closeDatePanel();
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !datePanel.hidden){
        closeDatePanel();
        dateToggleBtn.focus();
    }
});

let dateResizeTimer = null;
window.addEventListener("resize",()=>{
    clearTimeout(dateResizeTimer);
    dateResizeTimer = setTimeout(updateDatePlacement,150);
});

function dateForDay(dayNumber){

    if(!startDate) return null;

    const base = new Date(startDate+"T00:00:00");
    if(isNaN(base.getTime())) return null;

    const d = new Date(base);
    d.setDate(d.getDate() + (dayNumber - 1));
    return d;
}

function formatDayDate(dayNumber){

    const d = dateForDay(dayNumber);
    if(!d) return "";

    return d.toLocaleDateString("fr-FR",{
        weekday:"long",
        day:"numeric",
        month:"long"
    });
}

function updateCountdownBanner(){

    if(!isDesktopContext() && activeMainTab!=="planning"){
        countdownBanner.hidden = true;
        jumpTodayBtn.hidden = true;
        return;
    }

    if(!startDate){
        countdownBanner.hidden = true;
        jumpTodayBtn.hidden = true;
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    const base = new Date(startDate+"T00:00:00");

    if(isNaN(base.getTime())){
        countdownBanner.hidden = true;
        jumpTodayBtn.hidden = true;
        return;
    }

    const diffDays = Math.round(
        (base - today) / (1000*60*60*24)
    );

    countdownBanner.hidden = false;

    if(diffDays > 0){
        countdownBanner.textContent =
        `🧳 J-${diffDays} avant le départ !`;
    }else if(diffDays === 0){
        countdownBanner.textContent =
        "✈️ C'est le grand départ aujourd'hui !";
    }else{
        const tripDay = -diffDays + 1;
        if(tripDay <= dayCount){
            countdownBanner.textContent =
            `📍 Vous êtes en voyage — Jour ${tripDay}`;
        }else{
            countdownBanner.textContent =
            "🏠 Voyage terminé, bon retour !";
        }
    }

    jumpTodayBtn.hidden = (diffDays > 0);
}

function jumpToToday(){

    if(!startDate) return;

    const today = new Date();
    today.setHours(0,0,0,0);

    const base = new Date(startDate+"T00:00:00");
    const diffDays = Math.round(
        (today - base) / (1000*60*60*24)
    );

    const tripDay = diffDays + 1;

    if(tripDay < 1 || tripDay > dayCount){
        showToast(
            "Le jour d'aujourd'hui n'est pas dans la plage du voyage.",
            {type:"error"}
        );
        return;
    }

    currentDay = tripDay;
    renderTabs();
    renderActivities();
}

startDateInput.addEventListener("change",()=>{

    startDate = startDateInput.value;
    localStorage.setItem("startDate",startDate);

    updateCountdownBanner();
    updateDatePlacement();
    createTabs();
    renderTabs();
});

jumpTodayBtn.addEventListener("click",jumpToToday);

updateCountdownBanner();
updateDatePlacement();

/* --- Recherche globale --- */

const globalSearch = document.getElementById("globalSearch");
const searchResults = document.getElementById("searchResults");

function runGlobalSearch(query){

    const q = query.trim().toLowerCase();

    if(q.length < 2){
        searchResults.classList.remove("open");
        searchResults.innerHTML = "";
        return;
    }

    const sections = ["matin","midi","apresMidi","soir"];
    const matches = [];

    Object.keys(planning)
    .map(d=>parseInt(d,10))
    .sort((a,b)=>a-b)
    .forEach(day=>{

        sections.forEach(slot=>{

            (planning[day][slot] || []).forEach((activity,index)=>{

                const haystack = (
                    activity.name + " " +
                    (activity.address || "") + " " +
                    activity.type
                ).toLowerCase();

                if(haystack.includes(q)){
                    matches.push({day,slot,index,activity});
                }
            });
        });
    });

    searchResults.innerHTML = "";

    if(matches.length===0){

        const empty = document.createElement("div");
        empty.className = "search-result-item";
        empty.textContent = "Aucun résultat.";
        searchResults.appendChild(empty);

    }else{

        matches.slice(0,20).forEach(m=>{

            const item = document.createElement("div");
            item.className = "search-result-item";

            const nameDiv = document.createElement("div");
            nameDiv.textContent =
            `${icons[m.activity.type] || "📌"} ${m.activity.name}`;

            const dayDiv = document.createElement("div");
            dayDiv.className = "search-result-day";
            dayDiv.textContent =
            `Jour ${m.day}`
            + (m.activity.address ? ` · ${m.activity.address}` : "");

            item.appendChild(nameDiv);
            item.appendChild(dayDiv);

            item.addEventListener("click",()=>{
                currentDay = m.day;
                renderTabs();
                renderActivities();
                searchResults.classList.remove("open");
                globalSearch.value = "";
                closeSearchPanel();
            });

            searchResults.appendChild(item);
        });
    }

    searchResults.classList.add("open");
}

globalSearch.addEventListener("input",()=>{
    runGlobalSearch(globalSearch.value);
});

document.addEventListener("click",(e)=>{
    if(
        e.target!==globalSearch &&
        !searchResults.contains(e.target)
    ){
        searchResults.classList.remove("open");
    }
});

/* --- Panneau de recherche (coin) --- */

const searchToggleBtn = document.getElementById("searchToggleBtn");
const searchPanel = document.getElementById("searchPanel");

function closeSearchPanel(){
    searchPanel.hidden = true;
    searchToggleBtn.hidden = false;
    searchToggleBtn.setAttribute("aria-expanded","false");
}

function toggleSearchPanel(){
    const isOpen = !searchPanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeDatePanel();
    }
    searchPanel.hidden = isOpen;
    searchToggleBtn.hidden = !isOpen;
    searchToggleBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    if(!isOpen){
        globalSearch.focus();
    }
}

searchToggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    toggleSearchPanel();
});

const nearbyToiletsBtn = document.getElementById("nearbyToiletsBtn");

function openNearbyToilets(){

    const fallbackUrl =
    "https://www.google.com/maps/search/?api=1&query="
    + encodeURIComponent("toilettes publiques");

    if(!navigator.geolocation){
        window.open(fallbackUrl,"_blank","noopener,noreferrer");
        return;
    }

    // Ouvre l'onglet tout de suite (dans le geste utilisateur synchrone) pour
    // éviter le blocage de popup : le callback de géolocalisation arrive de
    // façon asynchrone, trop tard pour qu'un window.open() y passe encore.
    const newTab = window.open("","_blank");
    if(newTab) newTab.opener = null;

    navigator.geolocation.getCurrentPosition(
        pos=>{
            const { latitude, longitude } = pos.coords;
            const url = `https://www.google.com/maps/search/toilettes+publiques/@${latitude},${longitude},16z`;
            if(newTab && !newTab.closed) newTab.location.href = url;
            else window.open(url,"_blank","noopener,noreferrer");
        },
        ()=>{
            if(newTab && !newTab.closed) newTab.location.href = fallbackUrl;
            else window.open(fallbackUrl,"_blank","noopener,noreferrer");
        },
        { timeout:8000 }
    );
}

nearbyToiletsBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    openNearbyToilets();
});

document.addEventListener("click",(e)=>{
    if(!searchPanel.hidden && !e.target.closest(".corner-menu-item, .planning-search-wrap")){
        closeSearchPanel();
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !searchPanel.hidden){
        closeSearchPanel();
        searchToggleBtn.focus();
    }
});

updateThemeButton();
createTabs();
renderActivities();

/* --- Volet rétractable du formulaire d'ajout --- */

const formToggle = document.getElementById("formToggle");
const formToggleIcon = document.getElementById("formToggleIcon");
const formToggleLabel = document.getElementById("formToggleLabel");
const formDrawer = document.getElementById("formDrawer");

function openFormDrawer(){
    formDrawer.classList.add("open");
    formToggle.classList.add("open");
    formToggleLabel.textContent = "Fermer";
}

function closeFormDrawer(){
    formDrawer.classList.remove("open");
    formToggle.classList.remove("open");
    formToggleLabel.textContent = "Ajouter une activité";
    editingActivity = null;
    document.getElementById("activitySubmitBtn").textContent = "Ajouter";
    formToggleIcon.textContent = "➕";
    clearActivityForm();
}

function toggleFormDrawer(){
    if(formDrawer.classList.contains("open")){
        closeFormDrawer();
    }else{
        openFormDrawer();
        document.getElementById("activityName").focus();
    }
}

formToggle.addEventListener("click",toggleFormDrawer);

closeFormDrawer();

/* --- Checklist de voyage --- */

const CHECKLIST_STORAGE_KEY = "travelChecklist";

const checklistToggle = document.getElementById("checklistToggle");
const checklistToggleLabel = document.getElementById("checklistToggleLabel");
const checklistView = document.getElementById("checklistView");
const checklistBackBtn = document.getElementById("checklistBackBtn");
const checklistItemsEl = document.getElementById("checklistItems");
const checklistSuggestEl = document.getElementById("checklistSuggestions");
const checklistNewItem = document.getElementById("checklistNewItem");
const checklistAddBtn = document.getElementById("checklistAddBtn");
const checklistHideChecked = document.getElementById("checklistHideChecked");
const checklistProgressText = document.getElementById("checklistProgressText");
const checklistProgressPct = document.getElementById("checklistProgressPct");
const checklistProgressFill = document.getElementById("checklistProgressFill");

const CATEGORY_ICONS = {
    "Documents":"📄",
    "Électronique":"🔌",
    "Argent":"💰",
    "Santé":"💊",
    "Vêtements":"👕",
    "Divers":"🧳"
};

const CATEGORY_ORDER = ["Documents","Électronique","Argent","Santé","Vêtements","Divers"];

const defaultChecklist = [
    {label:"Passeport / carte d'identité",checked:false,category:"Documents"},
    {label:"Billets d'avion / train",checked:false,category:"Documents"},
    {label:"Réservations d'hôtel",checked:false,category:"Documents"},
    {label:"Assurance voyage",checked:false,category:"Documents"},
    {label:"Adaptateur secteur",checked:false,category:"Électronique"},
    {label:"Chargeurs & batterie externe",checked:false,category:"Électronique"},
    {label:"Argent liquide / carte bancaire",checked:false,category:"Argent"},
    {label:"Trousse de pharmacie",checked:false,category:"Santé"}
];

const checklistSuggestions = [
    {label:"Lunettes de soleil",category:"Vêtements"},
    {label:"Maillot de bain",category:"Vêtements"},
    {label:"Crème solaire",category:"Santé"},
    {label:"Parapluie",category:"Divers"},
    {label:"Livre / liseuse",category:"Divers"},
    {label:"Prise multiple",category:"Électronique"}
];

const CHECKLIST_TEMPLATES = {
    "🏖️ Plage":[
        {label:"Maillot de bain",category:"Vêtements"},
        {label:"Serviette de plage",category:"Divers"},
        {label:"Crème solaire",category:"Santé"},
        {label:"Lunettes de soleil",category:"Vêtements"},
        {label:"Tongs",category:"Vêtements"},
        {label:"Sac étanche",category:"Divers"}
    ],
    "⛰️ Montagne / randonnée":[
        {label:"Chaussures de randonnée",category:"Vêtements"},
        {label:"Veste imperméable",category:"Vêtements"},
        {label:"Gourde",category:"Divers"},
        {label:"Bâtons de marche",category:"Divers"},
        {label:"Trousse de premiers secours",category:"Santé"},
        {label:"Crème solaire",category:"Santé"}
    ],
    "🏙️ Ville / citytrip":[
        {label:"Chaussures confortables",category:"Vêtements"},
        {label:"Sac à dos léger",category:"Divers"},
        {label:"Batterie externe",category:"Électronique"},
        {label:"Plan / guide",category:"Divers"}
    ],
    "❄️ Hiver / ski":[
        {label:"Manteau chaud",category:"Vêtements"},
        {label:"Gants",category:"Vêtements"},
        {label:"Bonnet",category:"Vêtements"},
        {label:"Crème solaire (neige)",category:"Santé"},
        {label:"Chaufferettes",category:"Divers"}
    ]
};

const CHECKLIST_TEMPLATE_STATE_KEY = "activeChecklistTemplates";

let activeChecklistTemplates = new Set(
    JSON.parse(localStorage.getItem(CHECKLIST_TEMPLATE_STATE_KEY) || "[]")
);

function saveActiveChecklistTemplates(){
    localStorage.setItem(
        CHECKLIST_TEMPLATE_STATE_KEY,
        JSON.stringify(Array.from(activeChecklistTemplates))
    );
}

function toggleChecklistTemplate(templateName){

    const items = CHECKLIST_TEMPLATES[templateName];
    if(!items) return;

    if(activeChecklistTemplates.has(templateName)){

        activeChecklistTemplates.delete(templateName);

        items.forEach(templateItem=>{

            const label = templateItem.label.trim().toLowerCase();
            const idx = checklist.findIndex(
                i=>i.label.trim().toLowerCase()===label
            );
            if(idx===-1) return;

            const item = checklist[idx];
            if(item.checked) return;

            const claimedElsewhere = Array.from(activeChecklistTemplates).some(
                otherName=>(CHECKLIST_TEMPLATES[otherName] || [])
                    .some(i=>i.label.trim().toLowerCase()===label)
            );
            if(claimedElsewhere) return;

            checklist.splice(idx,1);
        });

    }else{

        activeChecklistTemplates.add(templateName);

        const existingLabels = new Set(
            checklist.map(i=>i.label.trim().toLowerCase())
        );

        items.forEach(templateItem=>{
            const label = templateItem.label.trim().toLowerCase();
            if(existingLabels.has(label)) return;
            checklist.push({
                label:templateItem.label,
                checked:false,
                category:templateItem.category
            });
            existingLabels.add(label);
        });
    }

    saveActiveChecklistTemplates();
    saveChecklist();
    renderChecklist();
    renderChecklistTemplateChips();
}

function renderChecklistTemplateChips(){

    const container = document.getElementById("checklistTemplateChips");
    container.innerHTML = "";

    Object.keys(CHECKLIST_TEMPLATES).forEach(name=>{

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "checklist-template-chip";
        if(activeChecklistTemplates.has(name)) chip.classList.add("active");
        chip.textContent = name;
        chip.addEventListener("click",()=>toggleChecklistTemplate(name));

        container.appendChild(chip);
    });
}

let checklist =
JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY))
|| defaultChecklist;

const collapsedChecklistCategories = new Set();
let hideCheckedItems = false;

function saveChecklist(){
    localStorage.setItem(
        CHECKLIST_STORAGE_KEY,
        JSON.stringify(checklist)
    );
    pushToSync();
}

function groupChecklistByCategory(){

    const groups = {};

    checklist.forEach((item,index)=>{
        const category = item.category || "Divers";
        if(!groups[category]) groups[category] = [];
        groups[category].push({...item,index});
    });

    return groups;
}

function renderChecklist(){

    checklistItemsEl.innerHTML = "";

    const groups = groupChecklistByCategory();

    const categories = CATEGORY_ORDER.filter(cat=>groups[cat]);
    Object.keys(groups).forEach(cat=>{
        if(!categories.includes(cat)) categories.push(cat);
    });

    categories.forEach(category=>{

        const items = groups[category];
        const doneInCategory = items.filter(i=>i.checked).length;

        const catDiv = document.createElement("div");
        catDiv.className = "checklist-category" +
            (collapsedChecklistCategories.has(category) ? " collapsed" : "");

        const head = document.createElement("div");
        head.className = "checklist-cat-head";

        const nameSpan = document.createElement("span");
        nameSpan.className = "name";
        nameSpan.textContent =
        `${CATEGORY_ICONS[category] || "🧳"} ${category}`;

        const countSpan = document.createElement("span");
        countSpan.className = "count";
        countSpan.textContent = `${doneInCategory}/${items.length}`;

        head.appendChild(nameSpan);
        head.appendChild(countSpan);

        head.addEventListener("click",()=>{
            if(collapsedChecklistCategories.has(category)){
                collapsedChecklistCategories.delete(category);
            }else{
                collapsedChecklistCategories.add(category);
            }
            renderChecklist();
        });

        catDiv.appendChild(head);

        const itemsWrap = document.createElement("div");
        itemsWrap.className = "checklist-cat-items";

        items.forEach(item=>{

            const row = document.createElement("div");
            row.className = "checklist-item" +
                (item.checked ? " checked" : "") +
                (hideCheckedItems && item.checked ? " hidden-when-checked" : "");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = item.checked;
            checkbox.id = `checklist-item-${item.index}`;
            checkbox.addEventListener("change",()=>{
                checklist[item.index].checked = checkbox.checked;
                saveChecklist();
                renderChecklist();
            });

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.style.flex = "1";
            label.style.cursor = "pointer";

            const span = document.createElement("span");
            span.textContent = item.label;
            label.appendChild(span);

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "checklist-remove";
            removeBtn.textContent = "✕";
            removeBtn.setAttribute("aria-label","Supprimer cet élément");
            removeBtn.addEventListener("click",()=>{
                checklist.splice(item.index,1);
                saveChecklist();
                renderChecklist();
            });

            row.appendChild(checkbox);
            row.appendChild(label);
            row.appendChild(removeBtn);

            itemsWrap.appendChild(row);
        });

        catDiv.appendChild(itemsWrap);
        checklistItemsEl.appendChild(catDiv);
    });

    updateChecklistProgress();
    renderChecklistSuggestions();
}

function updateChecklistProgress(){

    const doneCount = checklist.filter(i=>i.checked).length;
    const total = checklist.length;
    const pct = total>0 ? Math.round((doneCount/total)*100) : 0;

    checklistToggleLabel.textContent =
    total>0
        ? `Checklist de voyage (${doneCount}/${total})`
        : "Checklist de voyage";

    checklistProgressText.textContent = `${doneCount} / ${total} préparés`;
    checklistProgressPct.textContent = `${pct}%`;
    checklistProgressFill.style.width = `${pct}%`;
}

function renderChecklistSuggestions(){

    checklistSuggestEl.innerHTML = "";

    const existingLabels =
    checklist.map(i=>i.label.toLowerCase());

    checklistSuggestions
        .filter(s=>!existingLabels.includes(s.label.toLowerCase()))
        .forEach(suggestion=>{

            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "checklist-chip";
            chip.textContent = `+ ${suggestion.label}`;
            chip.addEventListener("click",()=>{
                checklist.push({
                    label:suggestion.label,
                    checked:false,
                    category:suggestion.category
                });
                saveChecklist();
                renderChecklist();
            });

            checklistSuggestEl.appendChild(chip);
        });
}

function addChecklistItem(){

    const label = checklistNewItem.value.trim();
    if(!label) return;

    checklist.push({label,checked:false,category:"Divers"});
    saveChecklist();
    renderChecklist();

    checklistNewItem.value = "";
    checklistNewItem.focus();
}

checklistAddBtn.addEventListener("click",addChecklistItem);

checklistNewItem.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
        e.preventDefault();
        addChecklistItem();
    }
});

checklistHideChecked.addEventListener("change",()=>{
    hideCheckedItems = checklistHideChecked.checked;
    renderChecklist();
});

renderChecklistTemplateChips();

function openChecklistView(){
    closeOptionsMenu();
    closeSearchPanel();
    closeDatePanel();
    checklistView.hidden = false;
    checklistToggle.setAttribute("aria-expanded","true");
    checklistBackBtn.focus();
}

function closeChecklistView(){
    checklistView.hidden = true;
    checklistToggle.setAttribute("aria-expanded","false");
    checklistToggle.focus();
}

checklistToggle.addEventListener("click",openChecklistView);
checklistBackBtn.addEventListener("click",closeChecklistView);

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !checklistView.hidden){
        closeChecklistView();
    }
});

renderChecklist();

/* --- Bandeau de navigation (bas, mobile uniquement) --- */

function setActiveMainTab(tab){
    activeMainTab = tab;
    bottomNavTabs.forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.mainTab===tab);
    });
    planningTabContent.hidden = tab!=="planning";
    budgetTabContent.hidden = tab!=="budget";
    profileTabContent.hidden = tab!=="profile";
    appTitle.hidden = tab!=="planning";
    updateCountdownBanner();
    if(tab==="profile") renderProfileStats();
}

document.querySelectorAll(".mobile-tab-back").forEach(btn=>{
    btn.addEventListener("click",()=>setActiveMainTab("planning"));
});

function updateProfileConsolidation(desktop){

    if(desktop===profileConsolidated) return;
    profileConsolidated = desktop;

    optionsMenuPanel.hidden = true;
    syncPanel.hidden = true;
    optionsMenuBtn.setAttribute("aria-expanded","false");
    syncToggleBtn.setAttribute("aria-expanded","false");

    if(desktop){
        optionsMenuPanel.appendChild(dataSettingsContent);
        syncPanel.appendChild(syncPanelContent);
        optionsMenuItem.hidden = false;
        syncMenuItem.hidden = false;
        desktopProfileMenuItem.hidden = false;
    }else{
        dataSettingsSlot.appendChild(dataSettingsContent);
        syncPanelSlot.appendChild(syncPanelContent);
        optionsMenuItem.hidden = true;
        syncMenuItem.hidden = true;
        desktopProfileMenuItem.hidden = true;
    }
}

function syncBottomNavHeight(){
    if(bottomNav.hidden) return;
    document.documentElement.style.setProperty(
        "--bottom-nav-h",
        bottomNav.offsetHeight + "px"
    );
}

function updateBottomNavVisibility(){

    const desktop = isDesktopContext();

    bottomNav.hidden = desktop;
    document.body.classList.toggle("has-bottom-nav",!desktop);
    updateProfileConsolidation(desktop);

    if(desktop){
        planningTabContent.hidden = false;
        budgetTabContent.hidden = false;
        profileTabContent.hidden = true;
    }else{
        setActiveMainTab(activeMainTab);
    }

    syncBottomNavHeight();
}

window.addEventListener("resize",syncBottomNavHeight);

if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(syncBottomNavHeight);
}

if(window.ResizeObserver){
    new ResizeObserver(syncBottomNavHeight).observe(bottomNav);
}

function closeAllFullscreenViews(){
    if(!checklistView.hidden) closeChecklistView();
    document.querySelectorAll(".profile-sub-view").forEach(view=>{
        if(!view.hidden) view.hidden = true;
    });
}

bottomNavTabs.forEach(btn=>{
    btn.addEventListener("click",(e)=>{

        e.stopPropagation();

        const tab = btn.dataset.mainTab;

        closeAllFullscreenViews();

        if(tab==="reservations"){
            renderReservations();
            document.getElementById("reservationsView").hidden = false;
            setActiveMainTab("planning");
            return;
        }

        if(tab==="map"){
            document.getElementById("mapView").hidden = false;
            renderMapView();
            setActiveMainTab("planning");
            return;
        }

        setActiveMainTab(tab);
    });
});

/* --- Profil : infos voyageur (100% local, jamais synchronisé/exporté) --- */

const TRAVELER_INFO_KEY = "travelerInfo";
const travelerNameInput = document.getElementById("travelerName");
const travelerPassportInput = document.getElementById("travelerPassport");
const travelerEmergencyInput = document.getElementById("travelerEmergency");
const travelerFlightNumberInput = document.getElementById("travelerFlightNumber");
const travelerBookingRefInput = document.getElementById("travelerBookingRef");
const travelerInsuranceInput = document.getElementById("travelerInsurance");

function loadTravelerInfo(){
    const info = JSON.parse(localStorage.getItem(TRAVELER_INFO_KEY) || "{}");
    travelerNameInput.value = info.name || "";
    travelerPassportInput.value = info.passport || "";
    travelerEmergencyInput.value = info.emergency || "";
    travelerFlightNumberInput.value = info.flightNumber || "";
    travelerBookingRefInput.value = info.bookingRef || "";
    travelerInsuranceInput.value = info.insurance || "";
}

function saveTravelerInfo(){
    localStorage.setItem(TRAVELER_INFO_KEY,JSON.stringify({
        name: travelerNameInput.value.trim(),
        passport: travelerPassportInput.value.trim(),
        emergency: travelerEmergencyInput.value.trim(),
        flightNumber: travelerFlightNumberInput.value.trim(),
        bookingRef: travelerBookingRefInput.value.trim(),
        insurance: travelerInsuranceInput.value.trim()
    }));
}

[
    travelerNameInput,
    travelerPassportInput,
    travelerEmergencyInput,
    travelerFlightNumberInput,
    travelerBookingRefInput,
    travelerInsuranceInput
].forEach(input=>{
    input.addEventListener("change",saveTravelerInfo);
});

loadTravelerInfo();

/* --- Profil : Aide et support (notes locales, aucun backend) --- */

const HELP_NOTES_KEY = "helpSupportNotes";
const helpNotesInput = document.getElementById("helpNotesInput");

helpNotesInput.value = localStorage.getItem(HELP_NOTES_KEY) || "";

helpNotesInput.addEventListener("input",()=>{
    localStorage.setItem(HELP_NOTES_KEY,helpNotesInput.value);
});

/* --- Profil : statistiques du voyage --- */

const profileStatsEl = document.getElementById("profileStats");

function renderProfileStats(){

    let totalPrice = 0;
    let activityCount = 0;

    Object.keys(planning).forEach(day=>{
        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[day][slot] || []).forEach(a=>{
                activityCount++;
                if(a.price!==null && a.price!==undefined){
                    totalPrice += a.price;
                }
            });
        });
    });

    let daysRemainingText = "Date de départ non définie";

    if(startDate){
        const today = new Date();
        today.setHours(0,0,0,0);
        const base = new Date(startDate+"T00:00:00");

        if(!isNaN(base.getTime())){
            const diffDays = Math.round((base-today)/(1000*60*60*24));
            if(diffDays>0){
                daysRemainingText = `🧳 J-${diffDays} avant le départ`;
            }else if(diffDays===0){
                daysRemainingText = "✈️ C'est le grand départ aujourd'hui !";
            }else{
                daysRemainingText = "🏠 Voyage en cours ou terminé";
            }
        }
    }

    const tripStepCount = localStorage.getItem("tripStepCount");
    const tripDistanceKm = localStorage.getItem("tripDistanceKm");

    profileStatsEl.innerHTML = `
        <div class="profile-stat">
            <span class="profile-stat-value">${totalPrice.toFixed(2)} ${priceCurrencySymbol}</span>
            <span class="profile-stat-label">Budget total</span>
        </div>
        <div class="profile-stat">
            <span class="profile-stat-value">${activityCount}</span>
            <span class="profile-stat-label">Activités</span>
        </div>
        <div class="profile-stat">
            <span class="profile-stat-value">${dayCount}</span>
            <span class="profile-stat-label">Jours de voyage</span>
        </div>
        <div class="profile-stat">
            <span class="profile-stat-value">${tripStepCount || "0"}</span>
            <span class="profile-stat-label">Pas</span>
        </div>
        <div class="profile-stat">
            <span class="profile-stat-value">${tripDistanceKm || "0"} km</span>
            <span class="profile-stat-label">Distance</span>
        </div>
        <div class="profile-stat-full">${daysRemainingText}</div>
        <div class="profile-stat-full profile-stat-hint">🚶 Pas et distance : à connecter à une application podomètre à partir de la date de départ (fonctionnalité à venir).</div>
    `;
}

/* --- Profil : réservations (vue consolidée des liens par activité) --- */

function renderReservations(){

    const reservationsList = document.getElementById("reservationsList");
    reservationsList.innerHTML = "";

    const sections = ["matin","midi","apresMidi","soir"];
    const matches = [];

    Object.keys(planning)
    .map(d=>parseInt(d,10))
    .sort((a,b)=>a-b)
    .forEach(day=>{
        sections.forEach(slot=>{
            (planning[day][slot] || []).forEach(activity=>{
                if(activity.reservationLink){
                    matches.push({day,activity});
                }
            });
        });
    });

    if(matches.length===0){
        const empty = document.createElement("div");
        empty.className = "search-result-item";
        empty.textContent = "Aucune réservation enregistrée pour l'instant.";
        reservationsList.appendChild(empty);
        return;
    }

    matches.forEach(m=>{

        const item = document.createElement("div");
        item.className = "search-result-item";

        const nameDiv = document.createElement("div");
        nameDiv.textContent =
        `${icons[m.activity.type] || "📌"} ${m.activity.name}`;

        const dayDiv = document.createElement("div");
        dayDiv.className = "search-result-day";
        dayDiv.textContent =
        `Jour ${m.day}`
        + (m.activity.time ? ` · ${m.activity.time}` : "");

        item.appendChild(nameDiv);
        item.appendChild(dayDiv);

        item.addEventListener("click",()=>{
            if(/^https?:\/\//i.test(m.activity.reservationLink)){
                window.open(m.activity.reservationLink,"_blank","noopener,noreferrer");
            }else{
                showToast("Lien de réservation invalide (doit commencer par http:// ou https://).",{type:"error"});
            }
        });

        reservationsList.appendChild(item);
    });
}

/* --- Carte du voyage (Leaflet + tuiles OpenStreetMap, géocodage Nominatim) --- */

const GEOCODE_CACHE_KEY = "geocodeCache";

function loadGeocodeCache(){
    return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
}

function saveGeocodeCache(cache){
    localStorage.setItem(GEOCODE_CACHE_KEY,JSON.stringify(cache));
}

function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

const GEOCODE_OVERRIDE_KEY = "geocodeAddressOverride";

function loadGeocodeOverrides(){
    return JSON.parse(localStorage.getItem(GEOCODE_OVERRIDE_KEY) || "{}");
}

function saveGeocodeOverrides(overrides){
    localStorage.setItem(GEOCODE_OVERRIDE_KEY,JSON.stringify(overrides));
}

/* Codes ISO 3166-1 alpha-2, utilisés pour restreindre la recherche
   Nominatim au pays de destination (paramètre countrycodes) et réduire
   les mauvais géocodages (ex. adresse ambiguë placée dans le mauvais pays).
   Déclaré avant geocodeAddress() car backfillGeocodeCache() l'appelle dès
   le chargement de la page (avant que le reste du script ne s'exécute). */
const COUNTRY_ISO_CODES = {
    germany:"de", australia:"au", austria:"at", belgium:"be", brazil:"br",
    canada:"ca", chile:"cl", china:"cn", southkorea:"kr", croatia:"hr", denmark:"dk",
    egypt:"eg", spain:"es", usa:"us", finland:"fi", france:"fr",
    greece:"gr", hungary:"hu", india:"in", iceland:"is", italy:"it",
    japan:"jp", nepal:"np", norway:"no", netherlands:"nl", portugal:"pt",
    czechrepublic:"cz", romania:"ro", singapore:"sg", sweden:"se",
    switzerland:"ch", thailand:"th", turkey:"tr"
};

async function queryNominatim(queryText,countryCode){

    const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q="
        + encodeURIComponent(queryText)
        + (countryCode ? "&countrycodes="+countryCode : "");

    const response = await fetchWithTimeout(url,8000);

    // Respecte la politique d'usage de Nominatim (max ~1 requête/seconde).
    await wait(1100);

    if(!response.ok){
        throw new Error("Nominatim: réponse HTTP "+response.status);
    }

    return response.json();
}

async function geocodeAddress(address){

    const cache = loadGeocodeCache();
    if(cache[address]) return cache[address];

    const overrides = loadGeocodeOverrides();
    const queryText = overrides[address] || address;
    const countryCode = COUNTRY_ISO_CODES[tripCountry] || null;

    let results = countryCode ? await queryNominatim(queryText,countryCode) : [];

    if(!results.length){
        results = await queryNominatim(queryText,null);
    }

    if(!results.length){
        throw new Error(`Adresse introuvable : ${queryText}`);
    }

    const coords = {
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon)
    };

    cache[address] = coords;
    saveGeocodeCache(cache);

    return coords;
}

function geocodeAddressInBackground(address){
    if(!address || !address.trim()) return;
    geocodeAddress(address.trim()).catch(err=>{
        console.error("Géocodage en arrière-plan impossible :",err);
    });
}

async function backfillGeocodeCache(){
    for(const {activity} of collectActivitiesWithAddress()){
        try{
            await geocodeAddress(activity.address.trim());
        }catch(err){
            console.error("Géocodage en arrière-plan impossible :",err);
        }
    }
}

if(navigator.onLine){
    backfillGeocodeCache();
}

function collectActivitiesWithAddress(dayFilter,typeFilter){

    const sections = ["matin","midi","apresMidi","soir"];
    const list = [];

    Object.keys(planning)
    .map(d=>parseInt(d,10))
    .sort((a,b)=>a-b)
    .forEach(day=>{
        if(dayFilter && day!==dayFilter) return;
        sections.forEach(slot=>{
            (planning[day][slot] || []).forEach(activity=>{
                if(typeFilter && activity.type!==typeFilter) return;
                if(activity.address && activity.address.trim()){
                    list.push({day,activity});
                }
            });
        });
    });

    return list;
}

const mapDaySelect = document.getElementById("mapDaySelect");
const mapTypeSelect = document.getElementById("mapTypeSelect");

function populateMapDaySelect(){

    const previousValue = mapDaySelect.value;
    mapDaySelect.innerHTML = "";

    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "Tous les jours";
    mapDaySelect.appendChild(allOpt);

    for(let i=1;i<=dayCount;i++){
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Jour ${i}`;
        mapDaySelect.appendChild(opt);
    }

    mapDaySelect.value = previousValue;
}

mapDaySelect.addEventListener("change",renderMapView);
mapTypeSelect.addEventListener("change",renderMapView);

/* --- Filtre "pays de vacances" (réutilise le pays du logo choisi) --- */

const mapCountryToggle = document.getElementById("mapCountryToggle");
let mapCountryFilterActive = false;

function updateMapCountryToggleLabel(){
    const country = COUNTRIES[tripCountry];
    mapCountryToggle.textContent = country
        ? `🌍 ${country.fr} uniquement`
        : "🌍 Pays de vacances uniquement";
}

/* Zones approximatives du territoire principal (métropole), sans les
   territoires d'outre-mer — Nominatim renvoie les frontières
   administratives complètes (ex. la France avec la Guyane), ce qui
   étale la carte sur toute la planète au lieu de recentrer localement. */
const COUNTRY_BBOXES = {
    germany:{south:47.3,north:55.1,west:5.9,east:15.0},
    australia:{south:-43.7,north:-10.5,west:112.9,east:153.7},
    austria:{south:46.4,north:49.0,west:9.5,east:17.2},
    belgium:{south:49.5,north:51.5,west:2.5,east:6.4},
    brazil:{south:-33.8,north:5.3,west:-73.9,east:-34.8},
    canada:{south:41.7,north:83.1,west:-141.0,east:-52.6},
    chile:{south:-55.9,north:-17.5,west:-75.6,east:-66.4},
    china:{south:18.2,north:53.6,west:73.5,east:135.1},
    southkorea:{south:33.1,north:38.6,west:125.0,east:129.6},
    croatia:{south:42.4,north:46.6,west:13.5,east:19.5},
    denmark:{south:54.5,north:57.8,west:8.0,east:15.2},
    egypt:{south:22.0,north:31.7,west:25.0,east:35.0},
    spain:{south:36.0,north:43.8,west:-9.3,east:4.3},
    usa:{south:24.5,north:49.4,west:-125.0,east:-66.9},
    finland:{south:59.7,north:70.1,west:20.5,east:31.6},
    france:{south:41.3,north:51.1,west:-5.2,east:9.6},
    greece:{south:34.8,north:41.8,west:19.3,east:28.3},
    hungary:{south:45.7,north:48.6,west:16.1,east:22.9},
    india:{south:6.5,north:35.5,west:68.1,east:97.4},
    iceland:{south:63.3,north:66.6,west:-24.6,east:-13.5},
    italy:{south:36.6,north:47.1,west:6.6,east:18.5},
    japan:{south:24.0,north:45.6,west:122.9,east:145.9},
    nepal:{south:26.3,north:30.5,west:80.0,east:88.2},
    norway:{south:57.9,north:71.2,west:4.5,east:31.3},
    netherlands:{south:50.7,north:53.6,west:3.3,east:7.3},
    portugal:{south:36.8,north:42.2,west:-9.6,east:-6.1},
    czechrepublic:{south:48.5,north:51.1,west:12.0,east:18.9},
    romania:{south:43.6,north:48.3,west:20.2,east:29.7},
    singapore:{south:1.15,north:1.48,west:103.6,east:104.1},
    sweden:{south:55.3,north:69.1,west:10.9,east:24.2},
    switzerland:{south:45.8,north:47.9,west:5.9,east:10.6},
    thailand:{south:5.6,north:20.5,west:97.3,east:105.7},
    turkey:{south:35.8,north:42.1,west:25.6,east:44.8}
};

function getCountryBbox(countryKey){
    return COUNTRY_BBOXES[countryKey] || null;
}

function isWithinBbox(lat,lon,bbox){
    return lat>=bbox.south && lat<=bbox.north && lon>=bbox.west && lon<=bbox.east;
}

mapCountryToggle.addEventListener("click",()=>{
    mapCountryFilterActive = !mapCountryFilterActive;
    mapCountryToggle.classList.toggle("active",mapCountryFilterActive);
    mapCountryToggle.setAttribute("aria-pressed",String(mapCountryFilterActive));
    renderMapView();
});

updateMapCountryToggleLabel();

function fixMarkerPosition(address){

    const overrides = loadGeocodeOverrides();

    const suggestion = prompt(
        "L'adresse actuelle a mal été localisée. Précise-la (ville, pays…) "
        + "pour une meilleure position :",
        overrides[address] || address
    );

    if(suggestion===null || !suggestion.trim()) return;

    overrides[address] = suggestion.trim();
    saveGeocodeOverrides(overrides);

    const cache = loadGeocodeCache();
    delete cache[address];
    saveGeocodeCache(cache);

    renderMapView();
}

let mapInstance = null;
let mapMarkersLayer = null;
let mapUserLocationLayer = null;
let mapPoiLayer = null;
let mapRouteLayer = null;

function showUserLocationOnMap(){

    if(!navigator.geolocation || !mapUserLocationLayer) return;

    navigator.geolocation.getCurrentPosition(
        pos=>{
            const { latitude, longitude } = pos.coords;

            const youIcon = L.divIcon({
                className:"map-you-icon",
                html:"",
                iconSize:[22,22],
                iconAnchor:[11,11]
            });

            L.marker([latitude,longitude],{icon:youIcon,zIndexOffset:1000})
            .addTo(mapUserLocationLayer)
            .bindPopup("Vous êtes ici");
        },
        ()=>{},
        { timeout:8000 }
    );
}

async function renderMapView(){

    const mapContainer = document.getElementById("mapContainer");
    const offlineNotice = document.getElementById("mapOfflineNotice");

    mapContainer.hidden = false;
    offlineNotice.hidden = true;

    if(!navigator.onLine){
        showToast(
            "Hors-ligne : seules les zones déjà consultées et les adresses déjà "
            + "localisées s'afficheront.",
            {duration:5000}
        );
    }

    populateMapDaySelect();

    if(!mapInstance){

        mapInstance = L.map(mapContainer).setView([20,0],2);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
            maxZoom:19,
            attribution:"© OpenStreetMap"
        }).addTo(mapInstance);

        mapMarkersLayer = L.markerClusterGroup({maxClusterRadius:50}).addTo(mapInstance);
        mapUserLocationLayer = L.layerGroup().addTo(mapInstance);
        mapRouteLayer = L.layerGroup().addTo(mapInstance);
        mapPoiLayer = L.markerClusterGroup({maxClusterRadius:50,disableClusteringAtZoom:17}).addTo(mapInstance);

        setTimeout(()=>mapInstance.invalidateSize(),0);

    }else{
        setTimeout(()=>mapInstance.invalidateSize(),0);
    }

    mapMarkersLayer.clearLayers();
    mapUserLocationLayer.clearLayers();
    mapRouteLayer.clearLayers();
    showUserLocationOnMap();

    const dayFilter = mapDaySelect.value ? parseInt(mapDaySelect.value,10) : null;
    const typeFilter = mapTypeSelect.value || null;

    let countryBbox = null;

    if(mapCountryFilterActive){
        countryBbox = getCountryBbox(tripCountry);
        if(!countryBbox){
            showToast(
                "Choisis d'abord un pays de destination pour utiliser ce filtre.",
                {type:"error"}
            );
        }
    }

    const entries = collectActivitiesWithAddress(dayFilter,typeFilter);
    const points = [];

    for(const {day,activity} of entries){
        try{

            const coords = await geocodeAddress(activity.address.trim());

            if(countryBbox && !isWithinBbox(coords.lat,coords.lon,countryBbox)){
                continue;
            }

            const icon = L.divIcon({
                className:"map-pin-icon",
                html: icons[activity.type] || "📍",
                iconSize:[18,18],
                iconAnchor:[9,18]
            });

            const popup = document.createElement("div");

            const nameEl = document.createElement("strong");
            nameEl.textContent = activity.name;

            const metaEl = document.createElement("div");
            metaEl.textContent =
            `Jour ${day}${activity.time ? " · "+activity.time : ""}`;

            const addressEl = document.createElement("div");
            addressEl.textContent = activity.address;

            const fixBtn = document.createElement("button");
            fixBtn.type = "button";
            fixBtn.className = "map-popup-fix-btn";
            fixBtn.textContent = "🔁 Corriger la position";
            fixBtn.addEventListener("click",()=>{
                fixMarkerPosition(activity.address.trim());
            });

            popup.appendChild(nameEl);
            popup.appendChild(metaEl);
            popup.appendChild(addressEl);
            popup.appendChild(fixBtn);

            L.marker([coords.lat,coords.lon],{icon})
            .addTo(mapMarkersLayer)
            .bindPopup(popup);

            points.push([coords.lat,coords.lon]);

        }catch(err){
            console.error("Géocodage impossible :",err);
        }
    }

    if(dayFilter && points.length>=2){
        L.polyline(points,{
            color:"#3D7CFF",
            weight:3,
            opacity:0.7,
            dashArray:"6 6"
        }).addTo(mapRouteLayer);
    }

    if(countryBbox){
        mapInstance.fitBounds([
            [countryBbox.south,countryBbox.west],
            [countryBbox.north,countryBbox.east]
        ],{padding:[10,10]});
    }else if(points.length){
        mapInstance.fitBounds(points,{padding:[30,30]});
    }
}

/* --- Recherche libre sur la zone visible ("pharmacie", "supermarché",
   nom d'un lieu…) via Nominatim, restreinte à la zone affichée (viewbox
   + bounded=1). Chargée à la demande uniquement (bouton "Rechercher ici"),
   jamais automatiquement au pan/zoom, pour rester raisonnable côté réseau. */

const POI_MIN_ZOOM = 13;
const POI_CACHE_KEY = "poiCache";
const POI_CACHE_TTL_MS = 24*60*60*1000;

const POI_ICONS = {
    restaurant:"🍽️", fast_food:"🍔", cafe:"☕", bar:"🍹", pub:"🍺",
    toilets:"🚻", pharmacy:"💊", hospital:"🏥", supermarket:"🛒",
    convenience:"🛒", bakery:"🥖", atm:"🏧", bank:"🏦", hotel:"🏨",
    museum:"🏛️", fuel:"⛽"
};

function poiIconFor(item){
    return POI_ICONS[item.type] || "📍";
}

const mapPoiToggle = document.getElementById("mapPoiToggle");
const mapPoiSearchInput = document.getElementById("mapPoiSearchInput");
const mapPoiSearchBtn = document.getElementById("mapPoiSearchBtn");
let mapPoiActive = false;

function loadPoiCache(){
    return JSON.parse(localStorage.getItem(POI_CACHE_KEY) || "{}");
}

function savePoiCache(cache){
    localStorage.setItem(POI_CACHE_KEY,JSON.stringify(cache));
}

function poiCacheKeyFor(searchText,bounds){
    return searchText.toLowerCase()+"_"+[
        bounds.getSouth().toFixed(2),
        bounds.getWest().toFixed(2),
        bounds.getNorth().toFixed(2),
        bounds.getEast().toFixed(2)
    ].join("_");
}

async function fetchPoiForSearch(searchText,bounds){

    const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=20"
        + "&q="+encodeURIComponent(searchText)
        + "&viewbox="+[bounds.getWest(),bounds.getNorth(),bounds.getEast(),bounds.getSouth()].join(",")
        + "&bounded=1";

    const response = await fetchWithTimeout(url,8000);
    await wait(1100);

    if(!response.ok){
        throw new Error("Nominatim: réponse HTTP "+response.status);
    }

    const results = await response.json();

    return results.map(r=>({
        lat:parseFloat(r.lat),
        lon:parseFloat(r.lon),
        type:r.type,
        name:r.display_name
    }));
}

function renderPoiMarkers(places){

    mapPoiLayer.clearLayers();

    places.forEach(place=>{

        const icon = L.divIcon({
            className:"map-poi-pin",
            html:poiIconFor(place),
            iconSize:[16,16],
            iconAnchor:[8,16]
        });

        L.marker([place.lat,place.lon],{icon})
        .addTo(mapPoiLayer)
        .bindPopup(place.name);
    });
}

async function searchPoiHere(){

    const searchText = mapPoiSearchInput.value.trim();

    if(!searchText){
        showToast("Tape ce que tu cherches (pharmacie, supermarché, nom d'un lieu…).",{type:"error"});
        return;
    }

    if(!navigator.onLine){
        showToast(
            "Hors-ligne : la recherche sur la carte nécessite une connexion.",
            {type:"error"}
        );
        return;
    }

    if(mapInstance.getZoom() < POI_MIN_ZOOM){
        showToast(
            "Zoome davantage sur la carte pour lancer une recherche.",
            {type:"error"}
        );
        return;
    }

    const bounds = mapInstance.getBounds();
    const cacheKey = poiCacheKeyFor(searchText,bounds);
    const cache = loadPoiCache();
    const cached = cache[cacheKey];

    if(cached && (Date.now()-cached.timestamp) < POI_CACHE_TTL_MS){
        renderPoiMarkers(cached.places);
        return;
    }

    try{

        const places = await fetchPoiForSearch(searchText,bounds);

        if(!places.length){
            showToast("Aucun résultat pour cette recherche sur la zone visible.",{type:"error"});
            return;
        }

        cache[cacheKey] = {places,timestamp:Date.now()};
        savePoiCache(cache);

        renderPoiMarkers(places);

    }catch(err){
        console.error("Recherche sur la carte impossible :",err);
        showToast("Impossible de lancer la recherche pour le moment.",{type:"error"});
    }
}

mapPoiToggle.addEventListener("click",()=>{

    mapPoiActive = !mapPoiActive;
    mapPoiToggle.classList.toggle("active",mapPoiActive);
    mapPoiToggle.setAttribute("aria-pressed",String(mapPoiActive));
    mapPoiSearchInput.hidden = !mapPoiActive;
    mapPoiSearchBtn.hidden = !mapPoiActive;

    if(!mapPoiActive && mapPoiLayer){
        mapPoiLayer.clearLayers();
    }
});

mapPoiSearchBtn.addEventListener("click",searchPoiHere);

mapPoiSearchInput.addEventListener("keydown",e=>{
    if(e.key==="Enter") searchPoiHere();
});

/* --- Profil : liste + sous-écrans plein écran --- */

const APP_VERSION = "1.0.0";

document.getElementById("profileVersion").textContent = APP_VERSION;
document.getElementById("profileVersionAbout").textContent = APP_VERSION;

document.querySelectorAll("[data-profile-view]").forEach(row=>{
    row.addEventListener("click",()=>{
        closeAllFullscreenViews();
        if(row.dataset.profileView==="checklistView"){
            openChecklistView();
            return;
        }
        const view = document.getElementById(row.dataset.profileView);
        if(!view) return;
        view.hidden = false;
        if(row.dataset.profileView==="reservationsView") renderReservations();
        if(row.dataset.profileView==="tripStatsView") renderProfileStats();
        if(row.dataset.profileView==="mapView") renderMapView();
    });
});

document.querySelectorAll(".profile-back").forEach(btn=>{
    btn.addEventListener("click",()=>{
        btn.closest(".profile-sub-view").hidden = true;
    });
});

document.addEventListener("keydown",(e)=>{
    if(e.key!=="Escape") return;
    document.querySelectorAll(".profile-sub-view").forEach(view=>{
        if(!view.hidden) view.hidden = true;
    });
});

/* --- Convertisseur de devises GBP ↔ (JPY / EUR) --- */

const CURRENCIES = {
    GBP:{symbol:"£",decimals:2,label:"Livre (GBP)"},
    JPY:{symbol:"¥",decimals:0,label:"Yen (JPY)"},
    EUR:{symbol:"€",decimals:2,label:"Euro (EUR)"},
    USD:{symbol:"$",decimals:2,label:"Dollar (USD)"},
    CZK:{symbol:"Kč",decimals:2,label:"Couronne tchèque (CZK)"},
    DKK:{symbol:"kr",decimals:2,label:"Couronne danoise (DKK)"},
    HUF:{symbol:"Ft",decimals:0,label:"Forint (HUF)"},
    ISK:{symbol:"kr",decimals:0,label:"Couronne islandaise (ISK)"},
    NOK:{symbol:"kr",decimals:2,label:"Couronne norvégienne (NOK)"},
    RON:{symbol:"lei",decimals:2,label:"Leu roumain (RON)"},
    SEK:{symbol:"kr",decimals:2,label:"Couronne suédoise (SEK)"},
    SGD:{symbol:"S$",decimals:2,label:"Dollar de Singapour (SGD)"},
    TRY:{symbol:"₺",decimals:2,label:"Livre turque (TRY)"},
    AUD:{symbol:"A$",decimals:2,label:"Dollar australien (AUD)"},
    BRL:{symbol:"R$",decimals:2,label:"Real brésilien (BRL)"},
    CAD:{symbol:"C$",decimals:2,label:"Dollar canadien (CAD)"},
    CLP:{symbol:"CLP$",decimals:0,label:"Peso chilien (CLP)"},
    CHF:{symbol:"Fr",decimals:2,label:"Franc suisse (CHF)"},
    CNY:{symbol:"¥",decimals:2,label:"Yuan (CNY)"},
    EGP:{symbol:"E£",decimals:2,label:"Livre égyptienne (EGP)"},
    INR:{symbol:"₹",decimals:2,label:"Roupie indienne (INR)"},
    KRW:{symbol:"₩",decimals:0,label:"Won sud-coréen (KRW)"},
    NPR:{symbol:"Rs",decimals:2,label:"Roupie népalaise (NPR)"},
    THB:{symbol:"฿",decimals:2,label:"Baht thaïlandais (THB)"}
};

function rateStorageKey(base,currency){
    return "rate_"+base+"_"+currency;
}

function rateTimestampKey(base,currency){
    return "rateTimestamp_"+base+"_"+currency;
}

const baseInput = document.getElementById("baseInput");
const baseCurrencyDisplay = document.getElementById("baseCurrencyDisplay");
const converterBaseCurrencySelect = document.getElementById("converterBaseCurrencySelect");
const targetInput = document.getElementById("targetInput");
const targetCurrencyDisplay = document.getElementById("targetCurrencyDisplay");
const targetCurrencySelect = document.getElementById("targetCurrency");
const rateInfo = document.getElementById("rateInfo");

[converterBaseCurrencySelect,targetCurrencySelect].forEach(select=>{
    select.innerHTML = "";
    Object.keys(CURRENCIES).forEach(code=>{
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code} (${CURRENCIES[code].symbol})`;
        select.appendChild(opt);
    });
});

let baseCurrency = localStorage.getItem("baseCurrency") || "GBP";
converterBaseCurrencySelect.value = baseCurrency;

let targetCurrency = localStorage.getItem("targetCurrency") || "JPY";
targetCurrencySelect.value = targetCurrency;

let currentRate = null;
let rateIsLive = false;
let rateTimestamp = null;

function applyCurrencyMeta(){

    const baseMeta = CURRENCIES[baseCurrency];
    const targetMeta = CURRENCIES[targetCurrency];

    baseInput.step = baseMeta.decimals===0 ? "1" : "0.01";
    baseCurrencyDisplay.textContent = baseCurrency;
    targetCurrencyDisplay.textContent = targetCurrency;
    targetInput.step = targetMeta.decimals===0 ? "1" : "0.01";
}

applyCurrencyMeta();

converterBaseCurrencySelect.addEventListener("change",()=>{

    baseCurrency = converterBaseCurrencySelect.value;
    localStorage.setItem("baseCurrency",baseCurrency);

    applyCurrencyMeta();
    baseInput.value = "";
    targetInput.value = "";
    currentRate = null;

    fetchExchangeRate();
});

targetCurrencySelect.addEventListener("change",()=>{

    targetCurrency = targetCurrencySelect.value;
    localStorage.setItem("targetCurrency",targetCurrency);

    applyCurrencyMeta();
    targetInput.value = "";
    currentRate = null;

    fetchExchangeRate();
});

function formatTimestamp(iso){

    if(!iso) return "";

    const d = new Date(iso);

    if(isNaN(d.getTime())) return "";

    return d.toLocaleString("fr-FR",{
        day:"2-digit",
        month:"2-digit",
        year:"numeric",
        hour:"2-digit",
        minute:"2-digit"
    });
}

function updateRateDisplay(){

    if(currentRate===null){

        rateInfo.innerHTML = "";

        const msg = document.createElement("div");
        msg.textContent =
        "Taux de change indisponible (pas de connexion au "
        + "service, et aucun taux enregistré précédemment).";

        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "rate-retry-btn";
        retryBtn.textContent = "🔄 Réessayer";
        retryBtn.addEventListener("click",fetchExchangeRate);

        rateInfo.appendChild(msg);
        rateInfo.appendChild(retryBtn);
        return;
    }

    const statusSpan =
    document.createElement("span");

    statusSpan.className =
    rateIsLive ? "rate-live" : "rate-cached";

    statusSpan.textContent =
    rateIsLive
        ? "● Taux en direct"
        : "● Dernier taux enregistré";

    rateInfo.innerHTML = "";

    const rateRow = document.createElement("div");
    rateRow.className = "rate-row";

    const rateText = document.createElement("span");
    rateText.textContent =
    `1 ${baseCurrency} = ${currentRate.toFixed(2)} ${targetCurrency}`;

    rateRow.appendChild(statusSpan);
    rateRow.appendChild(rateText);

    const dateText = document.createElement("div");
    dateText.className = "rate-date";
    dateText.textContent =
    formatTimestamp(rateTimestamp)
        ? `(mis à jour le ${formatTimestamp(rateTimestamp)})`
        : "";

    rateInfo.appendChild(rateRow);
    rateInfo.appendChild(dateText);
}

function convertFromBase(){

    if(currentRate===null) return;

    const val = parseFloat(baseInput.value);

    if(isNaN(val)){
        targetInput.value = "";
        return;
    }

    targetInput.value =
    (val * currentRate).toFixed(CURRENCIES[targetCurrency].decimals);
}

function convertFromTarget(){

    if(currentRate===null) return;

    const val = parseFloat(targetInput.value);

    if(isNaN(val)){
        baseInput.value = "";
        return;
    }

    baseInput.value = (val / currentRate).toFixed(CURRENCIES[baseCurrency].decimals);
}

baseInput.addEventListener("input",convertFromBase);
targetInput.addEventListener("input",convertFromTarget);

async function fetchWithTimeout(url,ms){

    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),ms);

    try{
        const response = await fetch(url,{signal:controller.signal});
        return response;
    }finally{
        clearTimeout(timer);
    }
}

async function tryFrankfurter(base,currency){

    if(base===currency) return 1;

    const response = await fetchWithTimeout(
        `https://api.frankfurter.app/latest?from=${base}&to=${currency}`,
        7000
    );

    if(!response.ok){
        throw new Error("Frankfurter: réponse HTTP "+response.status);
    }

    const data = await response.json();
    const rate = data.rates && data.rates[currency];

    if(!rate){
        throw new Error(`Frankfurter: ${currency} absent de la réponse`);
    }

    return rate;
}

async function tryOpenErApi(base,currency){

    if(base===currency) return 1;

    const response = await fetchWithTimeout(
        `https://open.er-api.com/v6/latest/${base}`,
        7000
    );

    if(!response.ok){
        throw new Error("open.er-api.com: réponse HTTP "+response.status);
    }

    const data = await response.json();

    if(data.result!=="success" || !data.rates || !data.rates[currency]){
        throw new Error("open.er-api.com: réponse invalide");
    }

    return data.rates[currency];
}

async function fetchExchangeRate(){

    rateInfo.textContent = "Chargement du taux…";

    const base = baseCurrency;
    const currency = targetCurrency;
    const providers = [tryFrankfurter,tryOpenErApi];
    let lastError = null;

    for(const provider of providers){

        try{

            const rate = await provider(base,currency);

            currentRate = rate;
            rateIsLive = true;
            rateTimestamp = new Date().toISOString();

            localStorage.setItem(rateStorageKey(base,currency),rate);
            localStorage.setItem(rateTimestampKey(base,currency),rateTimestamp);

            lastError = null;
            break;

        }catch(err){
            lastError = err;
            console.error("Échec du fournisseur de taux :",err);
        }
    }

    if(lastError){

        const cachedRate =
        localStorage.getItem(rateStorageKey(base,currency));

        if(cachedRate){
            currentRate = parseFloat(cachedRate);
            rateIsLive = false;
            rateTimestamp =
            localStorage.getItem(rateTimestampKey(base,currency));
        }else{
            currentRate = null;
            rateIsLive = false;
            rateTimestamp = null;
        }
    }

    if(base!==baseCurrency || currency!==targetCurrency) return;

    updateRateDisplay();

    if(currentRate!==null && baseInput.value!==""){
        convertFromBase();
    }
}

fetchExchangeRate();

window.addEventListener("offline",()=>{
    if(currentRate!==null){
        rateIsLive = false;
        updateRateDisplay();
    }
});

window.addEventListener("online",()=>{
    fetchExchangeRate();
    const mapView = document.getElementById("mapView");
    if(mapView && !mapView.hidden) renderMapView();
});

setInterval(fetchExchangeRate,30*60*1000);

/* --- Synchronisation multi-appareils (Firebase Realtime Database) --- */

const firebaseConfig = {
    apiKey: "AIzaSyB5jzUJi6ChRKA3th75mNZEE_8Kf10C22E",
    authDomain: "planning-vacances-70bd8.firebaseapp.com",
    databaseURL: "https://planning-vacances-70bd8-default-rtdb.firebaseio.com",
    projectId: "planning-vacances-70bd8",
    storageBucket: "planning-vacances-70bd8.firebasestorage.app",
    messagingSenderId: "80389776651",
    appId: "1:80389776651:web:95d1a2383858705310ee0e"
};

firebase.initializeApp(firebaseConfig);
const syncDb = firebase.database();

const SYNC_CODE_KEY = "syncCode";
const SYNC_DEVICE_ID_KEY = "syncDeviceId";
const SYNC_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let syncDeviceId = localStorage.getItem(SYNC_DEVICE_ID_KEY);
if(!syncDeviceId){
    syncDeviceId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b=>b.toString(16).padStart(2,"0"))
        .join("");
    localStorage.setItem(SYNC_DEVICE_ID_KEY,syncDeviceId);
}

let syncCode = localStorage.getItem(SYNC_CODE_KEY) || "";
let syncPushTimer = null;

const syncUnpaired = document.getElementById("syncUnpaired");
const syncPaired = document.getElementById("syncPaired");
const syncGenerateBtn = document.getElementById("syncGenerateBtn");
const syncCodeInput = document.getElementById("syncCodeInput");
const syncJoinBtn = document.getElementById("syncJoinBtn");
const syncCodeDisplay = document.getElementById("syncCodeDisplay");
const syncStatus = document.getElementById("syncStatus");
const syncHistoryInfo = document.getElementById("syncHistoryInfo");
const syncUnlinkBtn = document.getElementById("syncUnlinkBtn");

const SYNC_HISTORY_KEY = "syncHistory";

function renderSyncHistory(){
    const history = JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || "null");
    if(!history){
        syncHistoryInfo.textContent = "";
        return;
    }
    const who = history.deviceId===syncDeviceId ? "cet appareil" : "un autre appareil";
    const when = new Date(history.updatedAt).toLocaleString("fr-FR",{
        day:"2-digit",month:"2-digit",year:"numeric",
        hour:"2-digit",minute:"2-digit"
    });
    syncHistoryInfo.textContent = `🕓 Dernière modification par ${who} — ${when}`;
}

function recordSyncHistory(deviceId,updatedAt){
    localStorage.setItem(SYNC_HISTORY_KEY,JSON.stringify({deviceId,updatedAt}));
    renderSyncHistory();
}

function generateSyncCode(){
    let code = "";
    const randomValues = crypto.getRandomValues(new Uint32Array(10));
    for(let i=0;i<10;i++){
        code += SYNC_CODE_CHARS[randomValues[i] % SYNC_CODE_CHARS.length];
    }
    return code;
}

function updateSyncPanelView(){
    if(syncCode){
        syncUnpaired.hidden = true;
        syncPaired.hidden = false;
        syncCodeDisplay.textContent = syncCode;
        renderSyncHistory();
    }else{
        syncUnpaired.hidden = false;
        syncPaired.hidden = true;
    }
}

function collectSyncData(){
    return {
        planning,
        checklist,
        dayCount,
        startDate,
        updatedAt: Date.now(),
        deviceId: syncDeviceId
    };
}

function pushToSync(){

    if(!syncRef || applyingRemoteUpdate) return;

    clearTimeout(syncPushTimer);

    syncPushTimer = setTimeout(()=>{
        const payload = collectSyncData();
        syncRef.set(payload).then(()=>{
            recordSyncHistory(payload.deviceId,payload.updatedAt);
        }).catch(err=>{
            console.error("Erreur de synchronisation :",err);
        });
    },800);
}

const UNSAFE_OBJECT_KEYS = ["__proto__","constructor","prototype"];

function mergePlanningData(target,source){
    Object.keys(source || {}).forEach(key=>{
        if(UNSAFE_OBJECT_KEYS.includes(key)) return;
        target[key] = source[key];
    });
}

function sanitizePlanningSlots(){
    Object.keys(planning).forEach(day=>{
        const d = planning[day];
        if(!Array.isArray(d.matin)) d.matin = [];
        if(!Array.isArray(d.midi)) d.midi = [];
        if(!Array.isArray(d.apresMidi)) d.apresMidi = [];
        if(!Array.isArray(d.soir)) d.soir = [];
        if(d.title===undefined) d.title = "";
    });
}

function applySyncData(data){

    if(!data) return;

    applyingRemoteUpdate = true;

    if(data.planning){
        Object.keys(planning).forEach(key=>delete planning[key]);
        mergePlanningData(planning,data.planning);
        sanitizePlanningSlots();
        savePlanning();
    }

    if(Array.isArray(data.checklist)){
        checklist = data.checklist;
        saveChecklist();
    }

    if(data.dayCount){
        dayCount = data.dayCount;
        dayCountInput.value = dayCount;
        localStorage.setItem("dayCount",dayCount);
    }

    if(data.startDate!==undefined){
        startDate = data.startDate;
        startDateInput.value = startDate;
        localStorage.setItem("startDate",startDate);
    }

    ensureDaysExist();
    if(currentDay > dayCount) currentDay = dayCount;

    createTabs();
    renderActivities();
    renderChecklist();
    updateCountdownBanner();
    updateDatePlacement();

    applyingRemoteUpdate = false;

    syncStatus.textContent =
    `🟢 Synchronisé — ${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;

    recordSyncHistory(data.deviceId,data.updatedAt);
}

function startSyncListener(){

    if(syncRef) syncRef.off();

    syncRef = syncDb.ref("trips/"+syncCode);

    syncRef.on("value",(snapshot)=>{

        const data = snapshot.val();
        if(!data || data.deviceId===syncDeviceId) return;

        applySyncData(data);

    },(err)=>{
        console.error("Erreur de connexion à la synchronisation :",err);
        syncStatus.textContent = "⚠️ Connexion à la synchro impossible";
    });
}

function pairWithCode(code,options){

    syncCode = code;
    localStorage.setItem(SYNC_CODE_KEY,syncCode);

    startSyncListener();
    updateSyncPanelView();

    if(options && options.isNew){
        pushToSync();
        syncStatus.textContent = "🟢 Code généré, en attente de l'autre appareil";
    }
}

syncToggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isOpen = !syncPanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeSearchPanel();
        closeDatePanel();
    }
    syncPanel.hidden = isOpen;
    syncToggleBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
});

document.addEventListener("click",(e)=>{
    if(!syncPanel.hidden && !e.target.closest(".corner-menu-item")){
        syncPanel.hidden = true;
        syncToggleBtn.setAttribute("aria-expanded","false");
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !syncPanel.hidden){
        syncPanel.hidden = true;
        syncToggleBtn.setAttribute("aria-expanded","false");
    }
});

/* --- Profil (desktop) : mêmes sous-écrans que le bandeau mobile --- */

const desktopProfileBtn = document.getElementById("desktopProfileBtn");
const desktopProfilePanel = document.getElementById("desktopProfilePanel");

desktopProfileBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isOpen = !desktopProfilePanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeSearchPanel();
        closeDatePanel();
        syncPanel.hidden = true;
        syncToggleBtn.setAttribute("aria-expanded","false");
    }
    desktopProfilePanel.hidden = isOpen;
    desktopProfileBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
});

desktopProfilePanel.addEventListener("click",(e)=>{
    if(e.target.closest(".menu-item")){
        desktopProfilePanel.hidden = true;
        desktopProfileBtn.setAttribute("aria-expanded","false");
    }
});

document.addEventListener("click",(e)=>{
    if(!desktopProfilePanel.hidden && !e.target.closest(".corner-menu-item")){
        desktopProfilePanel.hidden = true;
        desktopProfileBtn.setAttribute("aria-expanded","false");
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !desktopProfilePanel.hidden){
        desktopProfilePanel.hidden = true;
        desktopProfileBtn.setAttribute("aria-expanded","false");
    }
});

syncGenerateBtn.addEventListener("click",()=>{
    const code = generateSyncCode();
    pairWithCode(code,{isNew:true});
    showToast("Code de synchro généré.",{type:"success"});
});

syncJoinBtn.addEventListener("click",()=>{

    const code = syncCodeInput.value.trim().toUpperCase();
    if(!code) return;

    syncJoinBtn.disabled = true;

    syncDb.ref("trips/"+code).once("value").then(snapshot=>{

        syncJoinBtn.disabled = false;

        const data = snapshot.val();

        if(!data){
            showToast("Aucune donnée trouvée pour ce code.",{type:"error"});
            return;
        }

        showConfirmModal(
            "Lier cet appareil remplacera son planning actuel par celui reçu de l'autre appareil. Continuer ?",
            ()=>{
                pairWithCode(code,{isNew:false});
                applySyncData(data);
                syncCodeInput.value = "";
                showToast("Appareil lié avec succès.",{type:"success"});
            }
        );

    }).catch(()=>{
        syncJoinBtn.disabled = false;
        showToast("Impossible de contacter le service de synchronisation.",{type:"error"});
    });
});

syncUnlinkBtn.addEventListener("click",()=>{
    if(syncRef) syncRef.off();
    syncRef = null;
    syncCode = "";
    localStorage.removeItem(SYNC_CODE_KEY);
    updateSyncPanelView();
    showToast("Synchronisation désactivée sur cet appareil.");
});

updateSyncPanelView();

if(syncCode){
    startSyncListener();
}

/* --- Service Worker (installation & fonctionnement hors-ligne) --- */

if("serviceWorker" in navigator){

    const hadControllerAtLoad = !!navigator.serviceWorker.controller;
    let refreshingForUpdate = false;

    navigator.serviceWorker.addEventListener("controllerchange",()=>{

        updateCacheVersionBadge();

        if(!hadControllerAtLoad || refreshingForUpdate) return;

        refreshingForUpdate = true;
        sessionStorage.setItem("justUpdatedApp","1");
        window.location.reload();
    });

    window.addEventListener("load",()=>{
        navigator.serviceWorker.register("service-worker.js",{updateViaCache:"none"})
        .then(registration=>{

            registration.update();

            document.addEventListener("visibilitychange",()=>{
                if(document.visibilityState==="visible"){
                    registration.update();
                }
            });
        })
        .catch(err=>{
            console.error("Échec de l'enregistrement du Service Worker :",err);
        });
    });
}

if(sessionStorage.getItem("justUpdatedApp")){
    sessionStorage.removeItem("justUpdatedApp");
    showToast("✅ Application mise à jour.",{type:"success",duration:3000});
}

/* --- Badge de version du cache (coin bas-droit, vérification rapide) --- */

const cacheVersionBadge = document.getElementById("cacheVersionBadge");

function updateCacheVersionBadge(){
    if(!("caches" in window)) return;
    caches.keys().then(keys=>{
        const planningKeys = keys.filter(k=>k.startsWith("planning-"));
        cacheVersionBadge.textContent = planningKeys.length
            ? `Cache : ${planningKeys[planningKeys.length-1]}`
            : "";
    });
}

updateCacheVersionBadge();

