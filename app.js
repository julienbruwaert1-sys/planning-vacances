
/* Déclarées tôt (var, pas de TDZ) : savePlanning()/saveChecklist() appellent
   pushToSync() bien avant que la section Synchronisation (plus bas) ne
   s'exécute et ne leur donne leur vraie valeur. */
var syncRef = null;
var applyingRemoteUpdate = false;

/* Déclarées tôt pour la même raison : updateDatePlacement() (plus bas)
   appelle updateBottomNavVisibility() dès le chargement initial. */
const bottomNav = document.getElementById("bottomNav");
const bottomNavTabs = bottomNav.querySelectorAll(".bottom-nav-tab");
const planningTabContent = document.getElementById("planningTabContent");
const budgetTabContent = document.getElementById("budgetTabContent");
const profileTabContent = document.getElementById("profileTabContent");
const appTitle = document.getElementById("appTitle");
let activeMainTab = "planning";

const optionsMenuItem = document.getElementById("optionsMenuItem");
const syncMenuItem = document.getElementById("syncMenuItem");
const dataSettingsContent = document.getElementById("dataSettingsContent");
const dataSettingsSlot = document.getElementById("dataSettingsSlot");
const syncPanelContent = document.getElementById("syncPanelContent");
const syncPanelSlot = document.getElementById("syncPanelSlot");
const syncToggleBtn = document.getElementById("syncToggleBtn");
const syncPanel = document.getElementById("syncPanel");
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
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

function showConfirmModal(message,onConfirm){

    modalMessage.textContent = message;
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

    if(!name) return;

    planning[currentDay][slot].push({
        name,
        type,
        address,
        price,
        travelTime,
        reservationLink: reservationLink || null
    });

    savePlanning();

    document.getElementById("activityName").value="";
    document.getElementById("activityAddress").value="";
    document.getElementById("activityPrice").value="";
    document.getElementById("activityTravelTime").value="";
    document.getElementById("activityReservationLink").value="";

    renderActivities();

    closeFormDrawer();

    showToast(`« ${name} » ajoutée.`,{type:"success",duration:2500});
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

function updateTripSummary(){

    let total = 0;
    let hasAny = false;
    let dayWithData = 0;

    Object.keys(planning).forEach(day=>{

        let dayTotal = 0;
        let dayHas = false;

        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[day][slot] || []).forEach(a=>{
                if(a.price!==null && a.price!==undefined){
                    dayTotal += a.price;
                    dayHas = true;
                }
            });
        });

        if(dayHas){
            total += dayTotal;
            hasAny = true;
            dayWithData++;
        }
    });

    const tripSummary = document.getElementById("tripSummary");

    tripSummary.textContent = hasAny
        ? `💷 Budget total du séjour : ${total.toFixed(2)} £ `
          + `(sur ${dayWithData} jour${dayWithData>1?"s":""} renseigné${dayWithData>1?"s":""})`
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
        `💷 Total du jour : ${dayTotalPrice.toFixed(2)} £`;
        summary.appendChild(priceSpan);
    }

    if(hasTravel){
        const travelSpan = document.createElement("span");
        travelSpan.textContent =
        `🚗 Trajet total : ${dayTotalTravel} min`;
        summary.appendChild(travelSpan);
    }

    updateTripSummary();

    sections.forEach(section=>{

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

        const activities =
        planning[currentDay][section.key] || [];

        if(activities.length===0){

            slot.innerHTML=
            `<div class="dropzone">
                Déposez une activité ici
            </div>`;
        }

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
                    `💷 ${activity.price.toFixed(2)} £`;
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

            const mapBtn = document.createElement("button");
            mapBtn.className = "map-btn";
            mapBtn.textContent = "📍";
            mapBtn.title = "Ouvrir dans Google Maps";
            mapBtn.addEventListener("click",()=>{
                const query =
                (activity.address && activity.address.trim())
                || activity.name;

                window.open(
                    "https://www.google.com/maps/search/?api=1&query="
                    + encodeURIComponent(query),
                    "_blank"
                );
            });

            const btnGroup = document.createElement("div");
            btnGroup.className = "btn-group";
            btnGroup.appendChild(reorderGroup);
            btnGroup.appendChild(moveSelect);
            btnGroup.appendChild(mapBtn);

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
                    metaParts.push(`${activity.price.toFixed(2)} £`);
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
                Object.assign(planning,data.planning);

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
    auto:"Affichage : Auto",
    desktop:"Affichage : PC",
    mobile:"Affichage : Téléphone"
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
    searchToggleBtn.setAttribute("aria-expanded","false");
}

function toggleSearchPanel(){
    const isOpen = !searchPanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeDatePanel();
    }
    searchPanel.hidden = isOpen;
    searchToggleBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    if(!isOpen){
        globalSearch.focus();
    }
}

searchToggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    toggleSearchPanel();
});

document.addEventListener("click",(e)=>{
    if(!searchPanel.hidden && !e.target.closest(".corner-menu-item")){
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
    }else{
        dataSettingsSlot.appendChild(dataSettingsContent);
        syncPanelSlot.appendChild(syncPanelContent);
        optionsMenuItem.hidden = true;
        syncMenuItem.hidden = true;
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

        if(tab==="checklist"){
            openChecklistView();
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

function loadTravelerInfo(){
    const info = JSON.parse(localStorage.getItem(TRAVELER_INFO_KEY) || "{}");
    travelerNameInput.value = info.name || "";
    travelerPassportInput.value = info.passport || "";
    travelerEmergencyInput.value = info.emergency || "";
}

function saveTravelerInfo(){
    localStorage.setItem(TRAVELER_INFO_KEY,JSON.stringify({
        name: travelerNameInput.value.trim(),
        passport: travelerPassportInput.value.trim(),
        emergency: travelerEmergencyInput.value.trim()
    }));
}

[travelerNameInput,travelerPassportInput,travelerEmergencyInput].forEach(input=>{
    input.addEventListener("change",saveTravelerInfo);
});

loadTravelerInfo();

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

    profileStatsEl.innerHTML = `
        <div class="profile-stat">
            <span class="profile-stat-value">${totalPrice.toFixed(2)} £</span>
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
        <div class="profile-stat-full">${daysRemainingText}</div>
    `;
}

/* --- Profil : liste + sous-écrans plein écran --- */

const APP_VERSION = "1.0.0";

document.getElementById("profileVersion").textContent = APP_VERSION;
document.getElementById("profileVersionAbout").textContent = APP_VERSION;

document.querySelectorAll(".profile-row").forEach(row=>{
    row.addEventListener("click",()=>{
        const view = document.getElementById(row.dataset.profileView);
        if(view) view.hidden = false;
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
    JPY:{symbol:"¥",decimals:0,label:"Yen (JPY)"},
    EUR:{symbol:"€",decimals:2,label:"Euro (EUR)"}
};

function rateStorageKey(currency){
    return "gbpRate_"+currency;
}

function rateTimestampKey(currency){
    return "gbpRateTimestamp_"+currency;
}

const gbpInput = document.getElementById("gbpInput");
const targetInput = document.getElementById("targetInput");
const targetFieldLabel = document.getElementById("targetFieldLabel");
const converterTitle = document.getElementById("converterTitle");
const targetCurrencySelect = document.getElementById("targetCurrency");
const rateInfo = document.getElementById("rateInfo");

let targetCurrency = localStorage.getItem("targetCurrency") || "JPY";
targetCurrencySelect.value = targetCurrency;

let currentRate = null;
let rateIsLive = false;
let rateTimestamp = null;

function applyCurrencyMeta(){

    const meta = CURRENCIES[targetCurrency];

    targetFieldLabel.textContent = meta.symbol;
    targetInput.step = meta.decimals===0 ? "1" : "0.01";
    converterTitle.textContent = `GBP ↔ ${targetCurrency}`;
}

applyCurrencyMeta();

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

    const rateText = document.createElement("div");
    rateText.textContent =
    `1 £ = ${currentRate.toFixed(2)} ${CURRENCIES[targetCurrency].symbol}`;

    const dateText = document.createElement("div");
    dateText.style.marginTop = "2px";
    dateText.textContent =
    formatTimestamp(rateTimestamp)
        ? `(mis à jour le ${formatTimestamp(rateTimestamp)})`
        : "";

    rateInfo.appendChild(rateText);
    rateInfo.appendChild(statusSpan);
    rateInfo.appendChild(dateText);
}

function convertFromGBP(){

    if(currentRate===null) return;

    const val = parseFloat(gbpInput.value);

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
        gbpInput.value = "";
        return;
    }

    gbpInput.value = (val / currentRate).toFixed(2);
}

gbpInput.addEventListener("input",convertFromGBP);
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

async function tryFrankfurter(currency){

    const response = await fetchWithTimeout(
        `https://api.frankfurter.app/latest?from=GBP&to=${currency}`,
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

async function tryOpenErApi(currency){

    const response = await fetchWithTimeout(
        "https://open.er-api.com/v6/latest/GBP",
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

    const currency = targetCurrency;
    const providers = [tryFrankfurter,tryOpenErApi];
    let lastError = null;

    for(const provider of providers){

        try{

            const rate = await provider(currency);

            currentRate = rate;
            rateIsLive = true;
            rateTimestamp = new Date().toISOString();

            localStorage.setItem(rateStorageKey(currency),rate);
            localStorage.setItem(rateTimestampKey(currency),rateTimestamp);

            lastError = null;
            break;

        }catch(err){
            lastError = err;
            console.error("Échec du fournisseur de taux :",err);
        }
    }

    if(lastError){

        const cachedRate =
        localStorage.getItem(rateStorageKey(currency));

        if(cachedRate){
            currentRate = parseFloat(cachedRate);
            rateIsLive = false;
            rateTimestamp =
            localStorage.getItem(rateTimestampKey(currency));
        }else{
            currentRate = null;
            rateIsLive = false;
            rateTimestamp = null;
        }
    }

    if(currency!==targetCurrency) return;

    updateRateDisplay();

    if(currentRate!==null && gbpInput.value!==""){
        convertFromGBP();
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
const syncUnlinkBtn = document.getElementById("syncUnlinkBtn");

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
        syncRef.set(collectSyncData()).catch(err=>{
            console.error("Erreur de synchronisation :",err);
        });
    },800);
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
        Object.assign(planning,data.planning);
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
    window.addEventListener("load",()=>{
        navigator.serviceWorker.register("service-worker.js",{updateViaCache:"none"})
        .then(registration=>{

            registration.update();

            document.addEventListener("visibilitychange",()=>{
                if(document.visibilityState==="visible"){
                    registration.update();
                }
            });

            registration.addEventListener("updatefound",()=>{

                const newWorker = registration.installing;
                if(!newWorker) return;

                newWorker.addEventListener("statechange",()=>{
                    if(
                        newWorker.state==="installed" &&
                        navigator.serviceWorker.controller
                    ){
                        showToast(
                            "Nouvelle version disponible. Rechargez la page pour la mettre à jour.",
                            {duration:8000}
                        );
                    }
                });
            });
        })
        .catch(err=>{
            console.error("Échec de l'enregistrement du Service Worker :",err);
        });
    });
}

