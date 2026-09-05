
/* --- Détection "app native (Capacitor)" ---
   Cette app reste 100% web pour l'instant : ce qui suit ne change RIEN au
   comportement actuel (window.Capacitor n'existe jamais dans un navigateur
   normal, isNativeApp() renvoie donc toujours false ici). C'est un point
   d'accroche pour une éventuelle conversion en appli Android via Capacitor
   plus tard, sans réécrire le code à ce moment-là :
   - Caméra (voir "vue caméra maison" plus bas, openDayCameraView/
     startCameraStream/capturePhotoFromCamera) : getUserMedia() plafonne la
     qualité en dessous de l'appli caméra native. Le plugin @capacitor/camera
     (Camera.getPhoto()) donnerait la pleine résolution du capteur.
   - Enregistrement galerie (résolu 2026-09-05, saveBlobToNativeGalleryAlbum()
     près de nativeCameraAvailable()) : @capacitor-community/media écrit
     vraiment dans un album dédié ("Tabi Go", NATIVE_PHOTO_ALBUM_NAME) au
     lieu du dossier Téléchargements générique — utilisé à la fois par la
     capture caméra native (captureNativePhotoOrFallback) et par les photos
     choisies/importées (saveBlobToGallery). downloadBlobToGallery/
     saveBlobToGallery restent le repli web/PWA (impossible d'écrire dans
     un album choisi depuis un navigateur normal).
   - Le bouton "Live Server ↔ en ligne" (switchServerBtn, juste en dessous)
     n'a plus de sens dans une appli empaquetée (pas deux origines à changer)
     — masqué via isNativeApp() dès maintenant.
   - IndexedDB et le Service Worker n'ont besoin d'aucun changement : une
     WebView Capacitor tourne sur une vraie origine (capacitor://localhost),
     donc les deux fonctionnent nativement (contrairement à file:// en dev,
     voir la note sur indexedDB.open() qui bloque sous file://).
   - Service Worker : décidé de continuer à l'enregistrer sans condition même
     en natif (pas de if(!isNativeApp())). Son cache d'app-shell devient
     redondant (les fichiers sont déjà embarqués), mais son AUTRE rôle —
     staleWhileRevalidate pour Google Fonts, cacheFirstTiles pour les tuiles
     OpenStreetMap — reste utile même en natif, et la redondance de l'autre
     partie est un coût négligeable. Pas de branche à écrire ici.
   - Liens externes (résolu 2026-09-05, openExternalUrl()/
     nativeBrowserAvailable() près de nearbyToiletsBtn) : Maps/itinéraire,
     réservations (renderReservations + le popover d'activité), secours
     "toilettes publiques" (nearbyToiletsBtn) passent maintenant par
     @capacitor/browser (Browser.open()) quand disponible — window.open()
     n'a pas de comportement garanti dans une WebView Capacitor (navigue
     parfois la WebView elle-même au lieu d'ouvrir un onglet/navigateur
     externe, ce qui ferait perdre l'état de l'appli). window.open() reste
     le repli web/PWA, inchangé.
   - Impression / export PDF (résolu 2026-09-05, printBtn/tripBookBtn, via
     printOrExportPdfIfNative()/exportPrintViewAsPdf() juste en dessous) :
     les WebView Android n'implémentent pas window.print() par défaut —
     window.print() reste utilisé tel quel sur le web (fonctionne très
     bien), mais en natif un vrai PDF est maintenant généré (jsPDF +
     html2canvas, vendorisés comme les autres dépendances, aucun des deux
     n'est un plugin Capacitor — de simples librairies JS, identiques
     web/natif) à partir du même #printView que l'impression web,
     paginé en A4 et partagé/téléchargé via shareOrDownloadFile().
   - Géolocalisation (résolu 2026-09-05, getCurrentPositionAsync()/
     nativeGeolocationAvailable() juste après isNativeApp()) : toilettes à
     proximité, météo, "ma position" sur la carte passent par
     @capacitor/geolocation quand disponible — gère la demande de
     permission runtime Android correctement, contrairement à
     navigator.geolocation dont la boîte de dialogue est connue pour être
     peu fiable dans une WebView. navigator.geolocation reste le repli
     web/PWA, inchangé.
   - Bouton retour matériel Android : corrigé (2026-09-04, voir
     handleBackNavigation() près de closeAllFullscreenViews()) — piège le
     retour via history.pushState()/popstate (se réarme tant qu'il y a
     quelque chose à fermer : modale/visionneuse/menu/vue plein écran/onglet
     non-Planning), testable dès maintenant dans un navigateur normal.
     Fonctionnera tel quel une fois empaqueté (la WebView Capacitor
     déclenche déjà history.back() par défaut sur le bouton matériel tant
     qu'aucun App.addListener('backButton',...) n'est enregistré) —
     l'installer resterait une amélioration de robustesse, pas un
     prérequis. Étendu (2026-09-04, audit "verif") pour couvrir #tripLockView
     en toute première branche — sans ça, le retour tombait dans le cas
     générique et pouvait fermer des panneaux/changer d'onglet SOUS l'écran
     de verrouillage encore affiché, voire quitter l'appli, sans jamais agir
     sur le verrou lui-même.
   - navigator.clipboard (copyTextToClipboard, ex. code de synchro) :
     fonctionne tel quel dans une WebView Capacitor (contexte sécurisé,
     capacitor://localhost) — pas de changement prévu, @capacitor/clipboard
     resterait un filet de secours seulement si ça se révèle peu fiable en
     usage réel.
   - <input type="file"> (importFile/importIcsFile/dayPhotoInput/
     attachmentFileInput) : ouvre déjà le sélecteur natif Android dans une
     WebView Capacitor, rien à changer.
   - Documents partagés entre appareils (2026-09-03, uploadAttachmentToCloud/
     downloadAndOpenAttachment/attachTripAttachmentsListener, Firebase
     Storage) : fetch()/XHR vers un domaine externe (firebasestorage.
     googleapis.com), comme les appels Auth/Realtime Database déjà en place
     — fonctionne tel quel dans la WebView par défaut de Capacitor (même
     moteur/mêmes règles CORS qu'un navigateur, storage.rules + cors.json
     déjà configurés côté Firebase). Attention seulement si un jour le
     plugin @capacitor/http (qui contourne CORS en faisant la requête côté
     natif) est introduit ailleurs dans l'appli : il faudrait alors vérifier
     que ces trois fonctions restent sur fetch()/XHR classique, pas la
     bascule automatique.
   - Retour haptique (triggerHaptic, navigator.vibrate) : fonctionne déjà en
     web/Android, mais jamais sur iOS (Safari/WKWebView n'a pas l'API
     Vibration) — @capacitor/haptics couvrirait aussi iOS avec de vrais
     motifs (impact léger/moyen/fort) au lieu d'un buzz minuté.
   - Écran allumé pendant la navigation (mapWakeLockToggle, Screen Wake
     Lock API) : fonctionne déjà dans une WebView Capacitor sans plugin —
     @capacitor/keep-awake resterait un filet de secours si un test sur
     appareil réel montrait le contraire.
   - Podomètre (fonctionnel 2026-09-05, @capgo/capacitor-pedometer —
     statistique "Pas" dans Statistiques du voyage, voir
     syncTripStepsOnce() juste après le bloc verrou par voyage) : l'API
     publique d'origine du plugin (startMeasurementUpdates()/écoute
     continue) ne comptait QUE pendant que l'appli écoutait activement —
     perdait les pas faits appli fermée ou même juste en arrière-plan
     (signalé 2026-09-05). Corrigé par un vrai patch natif
     (patches/@capgo+capacitor-pedometer+*.patch, réappliqué automatiquement
     après chaque npm install via patch-package, voir "postinstall" dans
     package.json) qui ajoute getRawStepCount() : une lecture ponctuelle de
     la valeur BRUTE cumulée depuis le démarrage du téléphone (le capteur
     matériel tourne en continu au niveau du système, quelle que soit
     l'appli). Comparer deux lectures brutes à chaque ouverture/reprise de
     l'appli (voir l'appel dans syncTripStepsOnce() + le listener
     visibilitychange) donne le vrai nombre de pas entre les deux, sans
     avoir besoin d'écouter en continu — donc sans service Android en
     arrière-plan à maintenir. Distance/cadence/étages restent iOS
     uniquement côté plugin ; la "Distance" affichée dans l'UI est une
     ESTIMATION à partir des pas (estimateDistanceKm(), foulée moyenne
     0,75 m), jamais une vraie mesure GPS. Décompte borné à la fenêtre
     réelle du voyage (getTripDateWindowStatus(), 2026-09-05) : rien
     n'est ajouté avant la date de départ ni après le dernier jour — le
     total reste ensuite figé tel quel, consultable dans l'Historique des
     voyages une fois le voyage archivé (voir openTripHistoryDetail()).
   - Export calendrier : exportIcsBtn/buildPlanningICS() reste un fichier
     .ics que l'utilisateur doit ouvrir manuellement (utile pour partager
     vers un autre calendrier/appareil) — voir aussi
     addPlanningToNativeCalendar() juste après (résolu 2026-09-05,
     @ebarooni/capacitor-calendar) qui ajoute maintenant les activités
     DIRECTEMENT dans le calendrier du téléphone, sans dialogue ni fichier
     intermédiaire. buildPlanningEventList() est la source de vérité
     partagée entre les deux chemins.
   - Scanner de QR code (fonctionnel 2026-09-05, qrScanBtn, voir
     handleScannedQrValue()/scanQrNative() juste après le bloc synchro) :
     @capacitor-mlkit/barcode-scanning (méthode scan(), interface native
     complète comme Camera.takePhoto) prend le relais quand disponible —
     jsQR (décodage JS pur sur des frames de canvas) reste utilisé tel quel
     sur web/PWA, et en repli si le plugin natif échoue.
   - Sauvegarde automatique sur Google Drive (fonctionnelle 2026-09-05, voir
     GOOGLE_WEB_CLIENT_ID/connectGoogleDrive()/backupToGoogleDrive() près
     de exportDataBtn) : @capgo/capacitor-social-login pour l'OAuth (pas
     @codetrix-studio/capacitor-google-auth, confirmé abandonné/incompatible
     Capacitor 8) + appels REST directs à l'API Drive v3 (pas de plugin
     "backup" tout fait fiable). Seul le JSON déjà exporté par
     exportDataBtn est sauvegardé (buildBackupPayload(), partagée entre les
     deux) — PAS les photos/documents IndexedDB, décision explicite pour
     rester simple/fiable. Stocké dans le dossier caché de l'appli sur
     Drive (appDataFolder, scope drive.appdata), un seul fichier écrasé à
     chaque sauvegarde. Repose sur deux identifiants OAuth Google Cloud
     distincts (Web pour le code, Android pour le SHA-1 du keystore —
     jamais utilisé dans le code mais doit exister côté Google) ; tant que
     le projet Google Cloud reste en statut "Test" (cas normal pour un
     usage perso), le jeton expire après ~7 jours — une reconnexion
     occasionnelle (bouton "Connecter Google Drive") reste alors
     nécessaire, décision explicite acceptée plutôt que la vérification
     Google qu'exigerait le statut "Production". Différent de Android Auto
     Backup (configuration XML pure, invisible, zéro JS — non retenu ici
     car sans bouton ni confirmation visible) et de document_sync_feature
     (2026-09-03, Firebase Storage, appareils appairés entre eux — pas une
     sauvegarde personnelle hors appairage).
   - Notifications locales (fonctionnelles 2026-09-05, voir
     syncScheduledNotifications() juste après buildPlanningICS()) :
     @capacitor/local-notifications, rappel 30 min avant une activité
     planifiée avec horaire + notification le matin du jour de départ.
     Rien d'équivalent sur le web (Notification API existe mais programmer
     un envoi futur sans backend n'a pas de sens hors app native). Pas de
     permission d'alarme exacte demandée (SCHEDULE_EXACT_ALARM) — repli
     automatique du plugin sur une alarme approximative, suffisant pour un
     simple rappel.
   - Raccourcis d'appli (2 de plus 2026-09-05 : "scanqr"/"addactivity",
     voir handleAppShortcut() tout en bas du fichier) : ce mécanisme existe
     déjà pour la PWA (manifest.json "shortcuts", ?shortcut=photo/expense)
     — étendu ici avec deux nouvelles valeurs ET un vrai res/xml/
     shortcuts.xml natif pour que l'appui long sur l'icône Android
     fonctionne aussi une fois empaquetée (le "shortcuts" du manifest.json
     PWA ne s'applique qu'à une installation navigateur/TWA, pas à une
     appli native standard). Chaque raccourci natif ouvre une ACTION_VIEW
     vers l'URL de l'appli avec ?shortcut=xxx — comme le mode server.url
     charge cette URL telle quelle, ?shortcut=xxx apparaît directement
     dans location.search au démarrage, même mécanisme déjà en place pour
     ?sync=CODE, aucun code natif Java au-delà du fichier XML.
   - Widget écran d'accueil (2026-09-05, PRÉPARATION seulement — aucun
     widget visuel construit) : un widget Android est un composant natif à
     part entière (AppWidgetProvider + RemoteViews + layout XML), sans
     équivalent Capacitor — la WebView de l'appli n'y a joue aucun rôle,
     rien de possible depuis ce fichier JS seul. Ce qui EST fait ici :
     updateHomeWidgetData() (voir juste après syncScheduledNotifications())
     maintient à jour un petit objet JSON stable dans localStorage
     (HOME_WIDGET_DATA_KEY : nom du voyage, jours restants, prochaine
     activité) à chaque sauvegarde du planning et à chaque changement de
     dates — le jour où un vrai widget natif est construit, son
     AppWidgetProvider Java lira cette même clé (via WebView.
     evaluateJavascript ou, plus simplement, en dupliquant l'écriture vers
     une SharedPreferences côté natif) plutôt que de recalculer la logique
     "prochaine activité" une seconde fois en Java.
   - Traduction par appareil photo (fonctionnelle 2026-09-05, bouton
     "Traduire une photo" dans le menu ⋮ → Importer, voir
     startPhotoTranslation() près de captureNativePhotoOrFallback()) :
     choix retenu = gratuit/hors-ligne, @capacitor-mlkit/text-recognition
     (OCR, modèle Latin embarqué dans l'appli) + language-identification
     (détecte la langue source) + translation (modèle téléchargé à la
     demande, ~30 Mo, mis en cache ensuite) — 100% Capacitor, aucun
     équivalent web, bouton masqué hors isNativeApp(). Traduit toujours
     vers le français (TRANSLATE_TARGET_LANGUAGE). L'option API cloud
     payante (Google Cloud Vision + Translation) reste documentée ici pour
     mémoire mais n'a pas été retenue.
   - Authentification biométrique (fonctionnelle 2026-09-04 — voir le
     verrou par voyage, requestTripUnlock()/openTripLockView() juste après
     la section haptique) : @aparajita/capacitor-biometric-auth (pas
     capacitor-native-biometric, qui dépend d'un trop vieux @capacitor/core
     ^3.4.3 — incompatible avec ce projet en Capacitor 8). Vendorisé comme
     @capacitor/camera (vendor/capacitor-biometric-auth.js + sa dépendance
     vendor/capacitor-app.js, même shim capacitorExports). checkBiometry()
     décide si #tripLockBiometricPanel s'affiche (biométrie vraiment
     enrôlée sur l'appareil, pas juste le matériel présent) ; le PIN
     partagé (synchronisé entre appareils, voir SYNC_SECTION_GROUPS) reste
     le seul repli — authenticate() est appelé avec
     allowDeviceCredential:false pour ne jamais laisser le déverrouillage
     du TÉLÉPHONE lui-même se substituer au code de l'appli, deux secrets
     sans rapport l'un avec l'autre.
   - Stockage sécurisé/chiffré (2026-09-04, aucun code existant) :
     @capacitor/preferences (le stockage clé-valeur officiel Capacitor,
     remplacerait localStorage) N'EST PAS chiffré par défaut — un vrai
     stockage sécurisé demanderait un plugin dédié (ex.
     capacitor-secure-storage-plugin, s'appuie sur Android Keystore).
     Aujourd'hui, rien dans l'appli n'a vraiment besoin de ce niveau de
     protection : le code de synchro n'est pas un secret au sens fort (accès
     limité par les règles Firebase, pas par le secret du code lui-même),
     et le reste (planning, checklist...) n'est pas sensible. À reconsidérer
     seulement si une vraie donnée sensible apparaît un jour (ex. un
     identifiant de connexion, si l'authentification biométrique ci-dessus
     est construite et a besoin de stocker quelque chose entre les
     sessions).
   - Nouveau JS/CSS/HTML : à chaque nouvelle fonction touchant caméra,
     téléchargement de fichier, impression, géolocalisation, presse-papier,
     partage, lien externe ou navigation (retour matériel), ajoute le même
     genre de commentaire "CAPACITOR" au point concerné plutôt que d'attendre
     la prochaine session de préparation Android — voir
     [[feedback_capacitor_prep_habit]] dans la mémoire. */
function isNativeApp(){
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/* CAPACITOR (2026-09-05, résolu) : @capacitor/geolocation gère la demande
   de permission runtime Android correctement (ACCESS_COARSE/FINE_LOCATION),
   contrairement à navigator.geolocation dont la boîte de dialogue est
   connue pour être peu fiable dans une WebView. getCurrentPositionAsync()
   retourne une Promise dans les deux cas avec EXACTEMENT la même forme
   (result.coords.latitude/longitude) — les 3 appelants (openNearbyToilets,
   requestUserLocationForWeather, showUserLocationOnMap) n'ont donc besoin
   que de passer du style callback (success, error) au style .then()/
   .catch(), rien d'autre à adapter. */
function nativeGeolocationAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation);
}

async function getCurrentPositionAsync(options){
    if(nativeGeolocationAvailable()){
        try{
            await window.Capacitor.Plugins.Geolocation.requestPermissions();
        }catch(err){} // ignoré : getCurrentPosition() en dessous échouera proprement si refusé
        return window.Capacitor.Plugins.Geolocation.getCurrentPosition(options);
    }
    return new Promise((resolve,reject)=>{
        navigator.geolocation.getCurrentPosition(resolve,reject,options);
    });
}

/* Impression / export PDF (résolu 2026-09-05) : window.print() n'existe
   pas dans une WebView Android — window.print() reste utilisé tel quel
   sur le web (fonctionne très bien), mais en natif exportPrintViewAsPdf()
   prend le relais : rend #printView (déjà rempli par buildPrintView()/
   buildTripBookView()) via html2canvas (jsPDF ne sait pas lire du HTML/CSS
   directement), puis découpe l'image obtenue en pages A4 pour un vrai
   fichier PDF partageable/téléchargeable (shareOrDownloadFile(), voir
   près de saveBlobToGallery()). Limite assumée : la découpe en pages est
   à hauteur fixe, pas consciente des sauts de section — un titre de jour
   peut tomber à cheval sur deux pages (contrairement à l'impression web,
   qui a ses propres règles page-break-before dans style.css). #printView
   est normalement display:none (voir style.css) — rendu visible par un
   style inline le temps du rendu, jamais via une vraie impression
   navigateur, d'où le déplacement de sa typographie hors de
   @media print dans style.css (2026-09-05). */
async function exportPrintViewAsPdf(fileName){

    const printView = document.getElementById("printView");
    const originalCssText = printView.style.cssText;

    // Largeur fixe (plutôt que 100%) : un rendu reproductible quelle que
    // soit la taille de l'écran, proche des proportions d'une page A4.
    printView.style.cssText = "display:block;position:fixed;left:-99999px;top:0;width:800px;padding:24px;color:#000;background:#fff;";

    try{
        const canvas = await window.html2canvas(printView,{backgroundColor:"#ffffff",scale:2});

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({unit:"mm",format:"a4"});

        const pageWidthMm = pdf.internal.pageSize.getWidth() - 20; // marges 10mm de chaque côté
        const pageHeightMm = pdf.internal.pageSize.getHeight() - 20;
        const pxPerMm = canvas.width / pageWidthMm;
        const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        const sliceCtx = sliceCanvas.getContext("2d");

        let renderedPx = 0;
        let pageIndex = 0;

        while(renderedPx < canvas.height){
            const sliceHeightPx = Math.min(pageHeightPx,canvas.height-renderedPx);
            sliceCanvas.height = sliceHeightPx;
            sliceCtx.clearRect(0,0,sliceCanvas.width,sliceHeightPx);
            sliceCtx.drawImage(canvas,0,renderedPx,canvas.width,sliceHeightPx,0,0,canvas.width,sliceHeightPx);

            if(pageIndex>0) pdf.addPage();
            pdf.addImage(sliceCanvas.toDataURL("image/jpeg",0.92),"JPEG",10,10,pageWidthMm,sliceHeightPx/pxPerMm);

            renderedPx += sliceHeightPx;
            pageIndex++;
        }

        await shareOrDownloadFile(pdf.output("blob"),fileName);
        showToast("PDF généré.",{type:"success"});
    }catch(err){
        console.error("Génération du PDF impossible :",err);
        showToast("Génération du PDF impossible.",{type:"error"});
    }finally{
        printView.style.cssText = originalCssText;
    }
}

function nativePdfExportAvailable(){
    return isNativeApp() && !!(window.jspdf && window.html2canvas);
}

function printOrExportPdfIfNative(fileName){
    if(nativePdfExportAvailable()){
        exportPrintViewAsPdf(fileName);
        return;
    }
    if(isNativeApp()){
        showToast(
            "Génération du PDF indisponible sur cet appareil — utilise Exporter > Mes données, ou ouvre la version web pour imprimer.",
            {type:"error",duration:6000}
        );
        return;
    }
    window.print();
}

/* Déclarées tôt (var, pas de TDZ) : savePlanning()/saveChecklist() appellent
   pushToSync() bien avant que la section Synchronisation (plus bas) ne
   s'exécute et ne leur donne leur vraie valeur. */
var syncRef = null;
var applyingRemoteUpdate = false;

/* Déclarées tôt pour la même raison : renderActivities()/updateConverterCountryHeader()
   (bien plus bas) s'exécutent dès le chargement initial et affichent le prix
   des activités dans SA devise (activity.priceCurrency, "départ" ou
   "arrivée" du convertisseur — remplace l'ancienne devise de saisie unique,
   voir activity_price_currency en mémoire). CURRENCIES est une donnée pure
   (aucune dépendance), sans risque à charger ici ; baseCurrency/targetCurrency
   ne sont que les valeurs lues depuis localStorage — le remplissage des
   <select> correspondants (converterBaseCurrencySelect/targetCurrencySelect,
   qui eux ONT besoin du DOM et de CURRENCIES) reste plus bas, à sa place
   naturelle dans la section Convertisseur. */
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
let baseCurrency = localStorage.getItem("baseCurrency") || "GBP";
let targetCurrency = localStorage.getItem("targetCurrency") || "JPY";
/* currentRate aussi ici (pas juste déclarée plus bas avec le reste du
   Convertisseur) : activityPriceInBase() ci-dessous, appelée dès le premier
   renderActivities() au chargement, la lit — même raison que
   baseCurrency/targetCurrency juste au-dessus. Reste réassignée à sa vraie
   valeur plus bas, une fois le taux de change récupéré (async). */
let currentRate = null;

function activityPriceSymbol(activity){
    const code = activity.priceCurrency;
    return (code && CURRENCIES[code]) ? CURRENCIES[code].symbol : CURRENCIES[baseCurrency].symbol;
}

/* Miroir de tricountAmountInBase() : convertit vers baseCurrency pour les
   totaux agrégés (jour, statistiques) quand l'activité a été saisie dans
   targetCurrency — currentRate n'est prêt qu'une fois le taux de change
   récupéré (async), d'où le repli "tel quel" sinon, même logique que côté
   Tricount. */
function activityPriceInBase(activity){
    if(activity.price===null || activity.price===undefined) return 0;
    const currency = activity.priceCurrency || baseCurrency;
    if(currency===baseCurrency) return activity.price;
    if(currency===targetCurrency && typeof currentRate==="number" && currentRate) return activity.price / currentRate;
    return activity.price;
}

/* Déclarées tôt pour la même raison : renderActivities() (bien plus bas)
   s'exécute dès le chargement initial et affiche déjà le badge "dépense
   Tricount liée" sur les activités concernées — valeurs réelles chargées
   plus bas, dans la section Tricount, qui réaffiche ensuite les activités. */
/* Chargées tout de suite (pas de [] en attendant "plus bas" comme avant) :
   setActiveMainTab() (plus bas) appelle désormais switchTricountTab() dès
   qu'on entre sur l'onglet budget pour choisir Participants ou Nouvelle
   dépense selon tricountParticipants.length — y compris depuis
   restoreLastMainView() qui peut s'exécuter dès le chargement initial si le
   dernier onglet mémorisé était "budget". Avec l'ancien chargement tardif,
   restoreLastMainView() lisait toujours un tableau vide à ce moment-là et
   ouvrait à tort sur Participants même avec des participants existants
   (repéré en testant ce nouveau comportement). renderActivities() (pour le
   badge "dépense liée") reste appelée plus bas, une fois le reste du rendu
   prêt — seule la lecture localStorage a besoin d'être précoce. */
const TRICOUNT_PARTICIPANTS_KEY = "tricountParticipants";
const TRICOUNT_EXPENSES_KEY = "tricountExpenses";
let tricountParticipants = JSON.parse(localStorage.getItem(TRICOUNT_PARTICIPANTS_KEY)) || [];
let tricountExpenses = JSON.parse(localStorage.getItem(TRICOUNT_EXPENSES_KEY)) || [];

/* Déclarées tôt pour la même raison (voir juste au-dessus) : setActiveMainTab()
   (plus bas) appelle désormais switchTricountTab() dès qu'on entre sur l'onglet
   budget, y compris depuis restoreLastMainView() qui peut s'exécuter dès le
   chargement initial si le dernier onglet mémorisé était "budget" — sans ça,
   même bug de TDZ que celui corrigé le 2026-08-31 (voir
   feedback_tdz_const_declaration_order en mémoire). */
const tricountTabButtons = document.querySelectorAll("#tricountTabs .date-tab");
const tricountTabPanels = document.querySelectorAll(".tricount-tab-panel");

const PRICE_CURRENCY_ICONS = { "£":"💷", "€":"💶", "$":"💵", "¥":"💴" };
function priceCurrencyIcon(symbol){
    return PRICE_CURRENCY_ICONS[symbol] || "💰";
}

/* Déclarées tôt pour la même raison : updateDatePlacement() (plus bas)
   appelle updateBottomNavVisibility() dès le chargement initial. */
const bottomNav = document.getElementById("bottomNav");
const bottomNavTabs = bottomNav.querySelectorAll(".bottom-nav-tab");
/* Barre latérale PC (réorganisation affichage PC, mockup B, 2026-09-02) —
   déclarée ici pour la même raison que bottomNav/bottomNavTabs juste
   au-dessus : updateBottomNavVisibility() la référence dès le tout premier
   appel (via updateDatePlacement(), plus bas). */
const desktopSidebar = document.getElementById("desktopSidebar");
const desktopSidebarItems = desktopSidebar.querySelectorAll(".desktop-sidebar-item");
const desktopSidebarBottom = document.getElementById("desktopSidebarBottom");
/* checklistToggle : même raison, déclaré ici (et pas plus bas avec le
   reste de la section Checklist) car applyActiveMainTabDisplay() (plus
   bas) le référence désormais, et applyActiveMainTabDisplay() est elle
   aussi appelée dès ce premier appel à updateBottomNavVisibility(). */
const checklistToggle = document.getElementById("checklistToggle");
const planningTabContent = document.getElementById("planningTabContent");
const budgetTabContent = document.getElementById("budgetTabContent");
const profileTabContent = document.getElementById("profileTabContent");
/* Réservations/Album : de vrais onglets sur mobile depuis le 2026-08-31 (au
   même titre que planning/budget/profile ci-dessus), pas des .fullscreen-view
   ouvertes par-dessus le Planning comme avant — c'était la cause du bandeau
   du bas qui ne s'allumait jamais sur ces deux-là et du liseré récurrent
   (voir planning_only_ui_visibility_rule en mémoire). Gardent quand même la
   classe .fullscreen-view/.profile-sub-view : encore utile sur desktop, où
   elles restent ouvertes via le menu du coin (#desktopProfilePanel), pas via
   le bandeau du bas — voir applyActiveMainTabDisplay()/le gestionnaire
   .profile-back plus bas pour le détail des deux chemins. */
const reservationsView = document.getElementById("reservationsView");
const albumView = document.getElementById("albumView");
const appTitle = document.getElementById("appTitle");
const appTitleRow = document.querySelector(".app-title-row");
let activeMainTab = "planning";
/* Déclarées ici (et non plus loin, près de setActiveMainTab) car
   updateDatePlacement() les utilise dès l'exécution initiale du script
   (ligne ~3738, bien avant sa propre définition ne serait un problème vu le
   hoisting des fonctions) — un const utilisé avant son initialisation (TDZ)
   aurait sinon fait planter tout le script à ce moment-là, empêchant
   n'importe quel onglet d'être masqué correctement (bug du 2026-08-31). */
const LAST_MAIN_TAB_KEY = "lastMainTab";
const LAST_FULLSCREEN_VIEW_KEY = "lastFullscreenView";

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

/* Posée par le bouton "Plus tard" pour que le backfill silencieux ci-dessous
   (destiné aux utilisateurs déjà actifs avant l'existence de cet écran) ne
   pose pas TRIP_CREATED_KEY à leur place — sinon le raccourci ➕ disparaît
   dès le rechargement suivant alors qu'aucun voyage n'a été créé. */
const WELCOME_LATER_KEY = "welcomeSkipped";

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

/* Lu ici (très tôt, avant la décision d'afficher l'écran de bienvenue) en
   plus de sa lecture habituelle près de la fin du fichier (qui déclenche la
   vraie liaison) : sur un téléphone jamais utilisé, scanner le QR de sync
   d'un autre appareil affichait "Créons ton voyage", forçant à taper "Plus
   tard" à la main avant même que la liaison ait eu la moindre chance de
   s'exécuter (async, .once("value")) — déroutant, puisqu'un voyage va de
   toute façon arriver dans l'instant qui suit. Un simple .has() suffit ici,
   pas besoin de lire le code lui-même. */
const arrivingViaSyncLink = new URLSearchParams(location.search).has("sync");

/* Lecture directe de la clé littérale (pas via TRIP_HISTORY_KEY/
   loadTripHistory(), déclarés bien plus bas dans la section "Historique
   des voyages" — les appeler ici lèverait un ReferenceError, même TDZ
   qu'arrivingViaSyncLink juste au-dessus). Sert uniquement à savoir si
   "Plus tard"/"Annuler" ont un sens ici : sans AUCUN voyage nulle part (ni
   en cours, ni archivé), les cacher évite une impasse — surtout que le
   raccourci ➕ pour revenir créer un voyage plus tard a été retiré (voir
   plus bas, ex-createTripShortcutBtn). */
let hasAnyTripHistory = false;
try{
    const rawHistory = JSON.parse(localStorage.getItem("tripHistory"));
    hasAnyTripHistory = Array.isArray(rawHistory) && rawHistory.length>0;
}catch(err){
    hasAnyTripHistory = false;
}

if(isFirstLaunch && !arrivingViaSyncLink){
    document.getElementById("welcomeView").hidden = false;
    if(!localStorage.getItem(TRIP_CREATED_KEY) && !hasAnyTripHistory){
        document.getElementById("welcomeLaterBtn").hidden = true;
        document.getElementById("welcomeCancelBtn").hidden = true;
    }
}else{
    if(!tripName){
        tripName = "Mon voyage";
        localStorage.setItem(TRIP_NAME_KEY,tripName);
    }
    if(!tripCountry){
        tripCountry = localStorage.getItem("appIconChoice") || "";
        if(tripCountry) localStorage.setItem(TRIP_COUNTRY_KEY,tripCountry);
    }
    if(!localStorage.getItem(TRIP_CREATED_KEY) && !localStorage.getItem(WELCOME_LATER_KEY)){
        localStorage.setItem(TRIP_CREATED_KEY,"1");
    }
}

/* Identifiant du voyage actif — permet de distinguer les photos (IndexedDB)
   et l'historique d'un voyage de ceux d'un autre. N'existait pas avant
   l'historique des voyages : les utilisateurs déjà actifs reçoivent un id
   généré au premier chargement après cette mise à jour (les photos déjà
   prises sont rattachées à ce même id lors de la migration, voir
   migrateLegacyPhotos()). */
const CURRENT_TRIP_ID_KEY = "currentTripId";
let currentTripId = localStorage.getItem(CURRENT_TRIP_ID_KEY);
if(!currentTripId){
    currentTripId = generateId();
    localStorage.setItem(CURRENT_TRIP_ID_KEY,currentTripId);
}

if(tripName){
    appTitle.textContent = appTitleEmoji()+" "+tripName;
}

const cornerMenu = document.querySelector(".corner-menu");
const optionsMenuItem = document.getElementById("optionsMenuItem");
const syncMenuItem = document.getElementById("syncMenuItem");
const displaySettingsContent = document.getElementById("displaySettingsContent");
const displaySettingsSlot = document.getElementById("displaySettingsSlot");
const dataSettingsContent = document.getElementById("dataSettingsContent");
const dataSettingsSlot = document.getElementById("dataSettingsSlot");
const syncPanelContent = document.getElementById("syncPanelContent");
const syncPanelSlot = document.getElementById("syncPanelSlot");
const syncToggleBtn = document.getElementById("syncToggleBtn");
const syncPanel = document.getElementById("syncPanel");
const desktopProfileMenuItem = document.getElementById("desktopProfileMenuItem");
let profileConsolidated = null;

/* Onglets de la page Réglages & données (mobile uniquement — CSS scopé par
   #dataSettingsSlot vs #optionsMenuPanel décide de l'affichage réel, voir
   style.css ; ici on gère juste quel groupe porte .active-tab, ce qui reste
   correct quel que soit l'endroit où dataSettingsContent se trouve). */
const settingsTabs = document.getElementById("settingsTabs");
const settingsTabButtons = settingsTabs.querySelectorAll(".date-tab");
const settingsTabGroups = dataSettingsContent.querySelectorAll(".settings-tab-group");

function updateSettingsTabs(activeTab){
    settingsTabGroups.forEach(group=>{
        group.classList.toggle("active-tab",group.dataset.tab===activeTab);
    });
}

settingsTabButtons.forEach(btn=>{
    btn.addEventListener("click",()=>{
        settingsTabButtons.forEach(b=>b.classList.toggle("active",b===btn));
        updateSettingsTabs(btn.dataset.tab);
    });
});

updateSettingsTabs("donnees");

/* --- Menu options (coin) --- */

const optionsMenuBtn = document.getElementById("optionsMenuBtn");
const optionsMenuPanel = document.getElementById("optionsMenuPanel");

/* Déclarés ici (pas plus bas, près de leur logique respective) : closeAllMenus()
   les référence, et closeAllMenus() peut être appelée dès le chargement
   initial via restoreLastMainView() (tout en bas du fichier, restaure la
   dernière vue plein écran ouverte en ré-émettant un vrai .click() sur son
   déclencheur) — bien avant que la déclaration originale, plus bas dans le
   fichier, n'ait eu la moindre chance de s'exécuter. Trouvé 2026-09-05 en
   testant une fonctionnalité sans rapport (ReferenceError TDZ sur
   desktopProfilePanel qui empêchait TOUT le reste du script de s'exécuter
   dès qu'une vue plein écran était ouverte à la fermeture précédente de
   l'appli — même famille de bug que [[feedback_tdz_const_declaration_order]],
   mais ici un throw synchrone en plein chargement, pas juste un premier
   appel silencieusement raté). */
const choicePopover = document.getElementById("choicePopover");
const mapMorePanel = document.getElementById("mapMorePanel");
const desktopProfilePanel = document.getElementById("desktopProfilePanel");

function closeOptionsMenu(){
    optionsMenuPanel.hidden = true;
    optionsMenuBtn.setAttribute("aria-expanded","false");
}

function toggleOptionsMenu(){
    const isOpen = !optionsMenuPanel.hidden;
    if(!isOpen){
        closeSearchPanel();
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
    modalConfirm.textContent = options.confirmLabel || "Confirmer";
    modalCancel.textContent = options.cancelLabel || "Annuler";

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
    /* 🚶 pas 📍 (2026-09-02) : 📍 sert déjà partout ailleurs à indiquer
       "cette activité a une adresse" (suffixe de carte, popups carte,
       "Ouvrir dans Maps"...) — le garder aussi comme icône du TYPE Visite
       affichait deux 📍 identiques côte à côte sur la même carte dès
       qu'une visite avait une adresse renseignée, illisible. */
    Visite:"🚶",
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

/* Type de lieu optionnel (2026-09-02) : "Sans" n'a pas d'entrée dans `icons`,
   donc icons[type] est déjà undefined pour ce cas — pas de fallback 📌 ici,
   contrairement aux pins de la vue Carte qui ont toujours besoin d'un
   marqueur visible (eux gardent volontairement `icons[type] || "📍"`). */
function activityIconPrefix(type){
    return icons[type] ? icons[type] + " " : "";
}

let activityTypeFilter = "";

function dayHasActivityType(day,type){
    if(!type) return true;
    const dayData = planning[day];
    if(!dayData) return false;
    const sections = ["matin","midi","apresMidi","soir"];
    return sections.some(slot=>(dayData[slot] || []).some(a=>a.type===type));
}

/* Appelé uniquement quand le filtre change (pas à chaque createTabs(), sinon
   ajouter/modifier une activité pourrait faire sauter l'utilisateur vers un
   autre jour sans qu'il l'ait demandé) : si le jour affiché n'a plus
   l'activité filtrée, passe au premier jour qui l'a. */
function jumpToFirstDayWithType(type){
    if(dayHasActivityType(currentDay,type)) return;
    for(let i=1;i<=dayCount;i++){
        if(dayHasActivityType(i,type)){
            currentDay = i;
            return;
        }
    }
}

function closeCategoryFilterDropdown(){
    categoryFilterDropdown.hidden = true;
    categoryFilterBtn.setAttribute("aria-expanded","false");
}

function renderCategoryTabs(){

    const container = document.getElementById("categoryFilterDropdown");
    container.innerHTML = "";

    /* Ne liste que les types réellement présents dans le voyage (2026-09-04)
       — même patron que populateMapTypeSelect() : sans ce filtre, les 11
       types fixes s'affichaient tous, même ceux sans la moindre activité,
       menant à des filtres qui vidaient systématiquement la liste. */
    const presentTypes = new Set();
    Object.keys(planning).forEach(day=>{
        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[day][slot] || []).forEach(activity=>{
                if(activity.type) presentTypes.add(activity.type);
            });
        });
    });

    /* Le filtre actif peut se retrouver sur un type qui n'a plus aucune
       activité (dernière activité de ce type supprimée) — sa case n'est
       alors plus affichée du tout, ce qui laisserait le filtre "coincé"
       actif sans qu'aucun onglet ne le montre. On le réinitialise. */
    if(activityTypeFilter && !presentTypes.has(activityTypeFilter)){
        activityTypeFilter = "";
    }

    categoryFilterBtn.classList.toggle("active",!!activityTypeFilter);

    const allTab = document.createElement("button");
    allTab.type = "button";
    allTab.className = "category-tab" + (activityTypeFilter ? "" : " active");
    allTab.innerHTML =
        `<span class="category-tab-icon">🌴</span>`
        + `<span class="category-tab-label">Tous</span>`;
    allTab.addEventListener("click",()=>{
        activityTypeFilter = "";
        renderCategoryTabs();
        createTabs();
        renderActivities();
        closeCategoryFilterDropdown();
    });
    container.appendChild(allTab);

    Object.keys(icons).forEach(type=>{
        if(!presentTypes.has(type)) return;

        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "category-tab" + (activityTypeFilter===type ? " active" : "");
        tab.innerHTML =
            `<span class="category-tab-icon">${icons[type]}</span>`
            + `<span class="category-tab-label">${type}</span>`;
        tab.addEventListener("click",()=>{
            activityTypeFilter = activityTypeFilter===type ? "" : type;
            jumpToFirstDayWithType(activityTypeFilter);
            renderCategoryTabs();
            createTabs();
            renderActivities();
            closeCategoryFilterDropdown();
        });
        container.appendChild(tab);
    });
}

const categoryFilterBtn = document.getElementById("categoryFilterBtn");
const categoryFilterDropdown = document.getElementById("categoryFilterDropdown");

categoryFilterBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isOpen = !categoryFilterDropdown.hidden;
    categoryFilterDropdown.hidden = isOpen;
    categoryFilterBtn.setAttribute("aria-expanded",String(!isOpen));
});

document.addEventListener("click",(e)=>{
    if(!categoryFilterDropdown.hidden && !e.target.closest("#categoryFilterBtn, #categoryFilterDropdown")){
        closeCategoryFilterDropdown();
    }
});

let dayCount =
parseInt(localStorage.getItem("dayCount"),10) || 7;

const planning =
JSON.parse(localStorage.getItem("vacationPlanning")) || {};

/* Déplacé ici (2026-09-04) : renderCategoryTabs() lit désormais `planning`
   (liste des types réellement présents) — appelée avant sa déclaration
   plus haut, ça levait un ReferenceError (TDZ) dès le chargement, même
   schéma déjà rencontré avec CURRENCIES/baseCurrency/activityAttachmentCounts. */
renderCategoryTabs();

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

function savePlanning(){
    localStorage.setItem(
        "vacationPlanning",
        JSON.stringify(planning)
    );
    pushToSync();
    scheduleNotificationsSyncDebounced();
    updateHomeWidgetData();
}

function createTabs(){

    const daySelect = document.getElementById("daySelect");
    daySelect.innerHTML="";

    for(let i=1;i<=dayCount;i++){

        const opt = document.createElement("option");
        opt.value = i;

        const title = planning[i] && planning[i].title;

        let label = `Jour ${i}`;
        if(title) label += ` — ${title}`;

        opt.textContent = label;

        if(!dayHasActivityType(i,activityTypeFilter)){
            opt.disabled = true;
        }

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

    /* Mockup C validé : "Jour X" disparaît d'ici au profit de la date
       courte ("mar. 1 sept.") dès qu'une date de départ existe — le menu
       déroulant juste au-dessus garde "Jour X" séparément (voir
       formatDayDateShort()). Sans date de départ, il n'y a pas de vraie
       date à afficher : on retombe sur "Jour X" comme avant, seul cas où
       ce titre le montre encore. */
    const dateLabel = typeof formatDayDateShort==="function"
        ? formatDayDateShort(currentDay)
        : "";

    let heading = dateLabel || `Jour ${currentDay}`;
    if(customTitle) heading += ` — ${customTitle}`;

    document.getElementById("dayTitle").textContent = heading;

    renderDayWeather();
    renderDayPhotos();
}

document.getElementById("dayTitleEditBtn").addEventListener("click",()=>{

    const current = (planning[currentDay] && planning[currentDay].title) || "";
    const newTitle = prompt("Titre du jour (optionnel) :",current);

    if(newTitle===null) return;

    if(!planning[currentDay]){
        planning[currentDay] = { matin:[], midi:[], apresMidi:[], soir:[], title:"" };
    }

    planning[currentDay].title = newTitle.trim();
    savePlanning();
    renderTabs();
});

document.getElementById("dayDuplicateBtn").addEventListener("click",()=>{

    const input = prompt(
        `Dupliquer les activités de ce jour vers quel jour ? (1-${dayCount}, jour actuel : ${currentDay})`,
        ""
    );
    if(input===null) return;

    const targetDay = parseInt(input.trim(),10);

    if(!Number.isInteger(targetDay) || targetDay<1 || targetDay>dayCount){
        showToast(`Numéro de jour invalide (1-${dayCount} attendu).`,{type:"error"});
        return;
    }

    if(targetDay===currentDay){
        showToast("Choisis un jour différent du jour actuel.",{type:"error"});
        return;
    }

    const performDuplicate = ()=>{
        /* Nouveaux id (generateId(), pas une copie de l'id d'origine) pour
           chaque activité dupliquée : les photos/documents/dépenses Tricount
           liés sont tous indexés par activityId — garder le même id créerait
           un lien fantôme entre deux activités désormais indépendantes sur
           deux jours différents. */
        const clone = section =>
            ((planning[currentDay] && planning[currentDay][section]) || [])
                .map(a=>({...a,id:generateId()}));

        planning[targetDay] = {
            matin: clone("matin"),
            midi: clone("midi"),
            apresMidi: clone("apresMidi"),
            soir: clone("soir"),
            title: (planning[currentDay] && planning[currentDay].title) || ""
        };

        savePlanning();
        showToast(`Jour ${currentDay} dupliqué vers le jour ${targetDay}.`,{type:"success"});
    };

    const targetHasActivities = planning[targetDay] && ["matin","midi","apresMidi","soir"]
        .some(s=>(planning[targetDay][s]||[]).length>0);

    if(targetHasActivities){
        showConfirmModal(
            `Le jour ${targetDay} contient déjà des activités — elles seront remplacées par une copie du jour ${currentDay}. Continuer ?`,
            performDuplicate,
            {confirmLabel:"Remplacer",cancelLabel:"Annuler"}
        );
    }else{
        performDuplicate();
    }
});

document.getElementById("tripNameEditBtn").addEventListener("click",()=>{

    const newName = prompt("Nom du voyage :",tripName);

    if(newName===null) return;

    const trimmed = newName.trim();

    if(!trimmed){
        showToast("Le nom du voyage ne peut pas être vide.",{type:"error"});
        return;
    }

    tripName = trimmed;
    localStorage.setItem(TRIP_NAME_KEY,tripName);
    appTitle.textContent = appTitleEmoji()+" "+tripName;
    pushToSync();
});

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

    const time =
    document.getElementById("activityTime")
    .value;

    const duration =
    document.getElementById("activityDuration")
    .value.trim();

    const note =
    document.getElementById("activityNote")
    .value.trim();

    const tags =
    document.getElementById("activityTags")
    .value.split(",")
    .map(t=>t.trim())
    .filter((t,i,arr)=>t && arr.indexOf(t)===i);

    const price =
    priceRaw!=="" ? Math.max(0,parseFloat(priceRaw)) : null;

    const priceCurrency =
    price!==null ? (activityPriceCurrencyRole==="target" ? targetCurrency : baseCurrency) : null;

    const travelTime =
    travelRaw!=="" ? Math.max(0,parseInt(travelRaw,10)) : null;

    if(!name){
        showToast("Donne un nom à l'activité.",{type:"error"});
        return;
    }

    if(editingActivity){

        const { section, id } = editingActivity;
        const list = planning[currentDay][section];
        const index = list.findIndex(a=>a.id===id);

        if(index===-1){
            showToast("Cette activité n'existe plus — elle a peut-être été supprimée entre-temps.",{type:"error"});
            editingActivity = null;
            closeFormDrawer();
            return;
        }

        const existing = list[index];

        const updated = Object.assign({},existing,{
            name, type, address, price, priceCurrency, travelTime, tags,
            time: time || null,
            duration: duration || null,
            note: note || null,
            reservationLink: reservationLink || null
        });

        if(slot===section){
            planning[currentDay][section][index] = updated;
        }else{
            planning[currentDay][section].splice(index,1);
            planning[currentDay][slot].push(updated);
        }

        savePlanning();
        createTabs();
        renderActivities();
        closeFormDrawer();
        geocodeAddressInBackground(address);

        showToast(`« ${name} » modifiée.`,{type:"success",duration:2500});
        return;
    }

    planning[currentDay][slot].push({
        id: generateId(),
        name,
        type,
        address,
        price,
        priceCurrency,
        travelTime,
        tags,
        time: time || null,
        duration: duration || null,
        note: note || null,
        reservationLink: reservationLink || null
    });

    savePlanning();
    createTabs();
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
    activityPriceCurrencyRole =
        (activity.priceCurrency===targetCurrency && targetCurrency!==baseCurrency) ? "target" : "base";
    updateActivityPriceCurrencyToggle();
    document.getElementById("activityTravelTime").value =
        (activity.travelTime!==null && activity.travelTime!==undefined) ? activity.travelTime : "";
    document.getElementById("activityReservationLink").value = activity.reservationLink || "";
    document.getElementById("activityTime").value = activity.time || "";
    document.getElementById("activityDuration").value = activity.duration || "";
    document.getElementById("activityNote").value = activity.note || "";
    document.getElementById("activityTags").value = (activity.tags || []).join(", ");
}

function clearActivityForm(){
    document.getElementById("activityName").value="";
    document.getElementById("activityAddress").value="";
    activityTypeSelect.selectedIndex = 0;
    updateActivityTypePlaceholderStyle();
    document.getElementById("activityPrice").value="";
    activityPriceCurrencyRole = "base";
    updateActivityPriceCurrencyToggle();
    document.getElementById("activityTravelTime").value="";
    document.getElementById("activityReservationLink").value="";
    document.getElementById("activityTime").value="";
    document.getElementById("activityDuration").value="";
    document.getElementById("activityNote").value="";
    document.getElementById("activityTags").value="";
}

function startEditActivity(section,index){

    const activity = planning[currentDay][section][index];
    if(!activity) return;

    editingActivity = { section, id: activity.id };
    fillActivityForm(activity,section);

    document.getElementById("activitySubmitBtn").textContent = "Enregistrer les modifications";
    formToggleIcon.textContent = "✏️";

    openFormDrawer();
    document.getElementById("activityName").focus();
}

async function deleteActivity(section,index){

    const activity = planning[currentDay][section][index];
    const dayAtDeletion = currentDay;

    /* Signalé 2026-09-03 : supprimer une activité ne touchait jamais ses
       photos liées (IndexedDB) — elles restaient, mais retombaient
       silencieusement dans "Sans activité" de l'Album (leur activityId ne
       correspond plus à rien). Pas de suppression en cascade des photos
       (garde les souvenirs), juste un avertissement avant de confirmer. */
    let linkedPhotoCount = 0;
    try{
        const dayPhotos = await getDayPhotos(dayAtDeletion);
        linkedPhotoCount = dayPhotos.filter(p=>p.activityId===activity.id).length;
    }catch(err){
        console.error("Impossible de vérifier les photos liées à l'activité :",err);
    }

    /* Même logique que pour les photos ci-dessus, étendue aux documents
       (2026-09-03) — désormais potentiellement partagés dans le cloud, un
       document orphelin y resterait aussi bien sans qu'aucune interface ne
       permette d'y revenir. */
    let linkedAttachmentCount = 0;
    try{
        linkedAttachmentCount = (await getActivityAttachments(dayAtDeletion,activity.id)).length;
    }catch(err){
        console.error("Impossible de vérifier les documents liés à l'activité :",err);
    }

    const photoWarning = linkedPhotoCount
        ? ` ${linkedPhotoCount===1 ? "1 photo restera" : `${linkedPhotoCount} photos resteront`} dans l'Album sans activité liée.`
        : "";
    const attachmentWarning = linkedAttachmentCount
        ? ` ${linkedAttachmentCount===1 ? "1 document restera" : `${linkedAttachmentCount} documents resteront`} lié(s) à une activité supprimée.`
        : "";

    showConfirmModal(
        `Supprimer « ${activity.name} » ?${photoWarning}${attachmentWarning}`,
        ()=>{

            function finishDeleteActivity(){

                planning[dayAtDeletion][section]
                .splice(index,1);

                triggerHaptic(30);
                savePlanning();
                jumpToFirstDayWithType(activityTypeFilter);
                createTabs();
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
                            createTabs();

                            if(currentDay===dayAtDeletion){
                                renderActivities();
                            }

                            showToast("Suppression annulée.",{type:"success"});
                        }
                    }
                );
            }

            const linkedExpenses = tricountExpenses.filter(exp=>exp.activityId===activity.id);

            if(linkedExpenses.length){
                showConfirmModal(
                    linkedExpenses.length===1
                        ? "Cette activité a une dépense Tricount liée. La supprimer aussi ?"
                        : `Cette activité a ${linkedExpenses.length} dépenses Tricount liées. Les supprimer aussi ?`,
                    ()=>{
                        tricountExpenses = tricountExpenses.filter(exp=>exp.activityId!==activity.id);
                        saveTricountExpenses();
                        renderTricount();
                        finishDeleteActivity();
                    },
                    {
                        confirmLabel:"Supprimer aussi",
                        cancelLabel:"Garder la dépense",
                        onCancel: finishDeleteActivity
                    }
                );
            }else{
                finishDeleteActivity();
            }
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

/* Glisser-déposer réel (2026-09-02), en remplacement du HTML5 draggable
   natif d'origine (souris uniquement — sans effet au toucher, donc
   invisible sur téléphone, la plateforme principale de cette app). Les
   Pointer Events unifient souris/tactile/stylet en une seule API : une
   poignée dédiée (⠿, pas la carte entière) évite qu'un tap normal sur
   l'activité (modifier, ouvrir le menu ⋮...) ne déclenche un glisser par
   erreur. Les boutons ▲▼/"Déplacer vers…" existants restent en place,
   c'est juste une alternative plus rapide — pas un remplacement. */
function bindActivityDragHandle(handle,div,container){

    let drag = null;

    function clearIndicators(){
        container.querySelectorAll(".activity.drag-over-top,.activity.drag-over-bottom")
            .forEach(el=>el.classList.remove("drag-over-top","drag-over-bottom"));
    }

    function endDrag(){
        if(!drag) return;
        div.classList.remove("dragging");
        div.style.transform = "";
        clearIndicators();
        drag = null;
    }

    handle.addEventListener("pointerdown",(e)=>{
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        drag = {
            fromSection: div.dataset.section,
            fromIndex: parseInt(div.dataset.index,10),
            startY: e.clientY,
            cards: Array.from(container.querySelectorAll(".activity")).filter(el=>el!==div),
            slots: Array.from(container.querySelectorAll(".slot")),
            target: null
        };
        div.classList.add("dragging");
    });

    handle.addEventListener("pointermove",(e)=>{
        if(!drag) return;

        div.style.transform = `translateY(${e.clientY-drag.startY}px)`;

        clearIndicators();

        const overCard = drag.cards.find(card=>{
            const rect = card.getBoundingClientRect();
            return e.clientY>=rect.top && e.clientY<=rect.bottom;
        });

        if(overCard){
            const rect = overCard.getBoundingClientRect();
            const before = e.clientY < rect.top+rect.height/2;
            overCard.classList.add(before ? "drag-over-top" : "drag-over-bottom");
            drag.target = {
                section: overCard.dataset.section,
                index: parseInt(overCard.dataset.index,10),
                before
            };
            return;
        }

        // Aucune carte survolée : dépose en fin de section si le pointeur
        // est au-dessus d'une section vide (ou après sa dernière carte).
        const overSlot = drag.slots.find(slot=>{
            const rect = slot.getBoundingClientRect();
            return e.clientY>=rect.top && e.clientY<=rect.bottom;
        });

        drag.target = overSlot ? {section:overSlot.dataset.section,index:null} : null;
    });

    function finishDrag(){
        if(!drag) return;
        const {fromSection,fromIndex,target} = drag;
        endDrag();

        if(!target) return;

        if(target.index===null){
            if(target.section===fromSection) return;
            moveActivity(fromSection,fromIndex,target.section);
            return;
        }

        let toIndex = target.before ? target.index : target.index+1;
        if(target.section===fromSection && (toIndex===fromIndex || toIndex===fromIndex+1)) return;

        moveActivity(fromSection,fromIndex,target.section,toIndex);
    }

    handle.addEventListener("pointerup",finishDrag);
    handle.addEventListener("pointercancel",endDrag);
}

function updateConverterCountryHeader(){

    const country = COUNTRIES[tripCountry];
    const icon = APP_ICONS[tripCountry] || APP_ICONS.default;

    const header = document.getElementById("converterCountryHeader");
    const nameEl = document.getElementById("converterCountryName");
    const subEl = document.getElementById("converterCountrySub");

    nameEl.textContent = country ? country.fr : "Voyage";

    header.style.backgroundImage = `url('${icon.icon512}')`;

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

/* Déclaré ici (bien avant refreshActivityAttachmentCounts()/le reste du
   système de documents, plus bas avec le reste d'IndexedDB) : renderActivities()
   le lit à CHAQUE rendu, y compris le tout premier appel inconditionnel un
   peu plus bas dans le fichier — le déclarer près de sa vraie section
   aurait levé un ReferenceError (TDZ) dès le chargement, même schéma déjà
   rencontré avec CURRENCIES/baseCurrency. Rempli de façon asynchrone (scan
   IndexedDB), donc vide au tout premier rendu — un second rendu suit dès
   que refreshActivityAttachmentCounts() se résout, voir son appel initial. */
let activityAttachmentCounts = {};

function activityHasAttachments(day,activityId){
    return !!activityAttachmentCounts[day+":"+activityId];
}

/* Repliage des sections Matin/Midi/Après-midi/Soir (2026-09-02) — clé
   distincte de ALBUM_COLLAPSE_KEY/RESERVATIONS_COLLAPSE_KEY (déclarées
   bien plus bas dans le fichier, section Album/Réservations) pour ne pas
   lier leur état de repliage à celui du Planning. Réutilise isDayCollapsed()/
   toggleDayCollapsed() telles quelles : elles ne font que .includes()/
   .indexOf() sur un tableau, une clé composite "jour-section" (ex. "3-matin")
   fonctionne aussi bien qu'un simple numéro de jour. Déclarée ici (avant sa
   section "normale" plus bas, comme ALBUM_COLLAPSE_KEY) parce que
   renderActivities() est appelée dès le chargement initial (ligne ~4829),
   bien avant que le fichier n'atteigne la déclaration de ALBUM_COLLAPSE_KEY
   — même TDZ que déjà rencontré plusieurs fois cette session. */
const PLANNING_SLOT_COLLAPSE_KEY = "planningCollapsedSlots";

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
                /* Converti vers baseCurrency (activityPriceInBase()) : un
                   total qui mélangerait des prix saisis dans des devises
                   différentes sans conversion n'aurait aucun sens. */
                dayTotalPrice += activityPriceInBase(a);
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

    // Réglage "Total du jour & trajet" (Affichage → Vue Planning, 2026-09-02).
    if(showDayTotals){

        if(hasPrice){
            const baseSymbol = CURRENCIES[baseCurrency].symbol;
            const priceSpan = document.createElement("span");
            priceSpan.textContent =
            `${priceCurrencyIcon(baseSymbol)} Total du jour : ${dayTotalPrice.toFixed(2)} ${baseSymbol}`;
            summary.appendChild(priceSpan);
        }

        if(hasTravel){
            const travelSpan = document.createElement("span");
            travelSpan.textContent =
            `🚗 Trajet total : ${dayTotalTravel} min`;
            summary.appendChild(travelSpan);
        }
    }
    // Pas besoin de summary.hidden=... : #daySummary:empty{display:none}
    // (déjà en CSS) masque déjà tout seul le cas "rien à afficher", que ce
    // soit parce que showDayTotals est faux ou qu'aucune activité n'a de
    // prix/trajet — aucun enfant ajouté dans les deux cas.

    updateConverterCountryHeader();

    sections.forEach(section=>{

        const activities =
        planning[currentDay][section.key] || [];

        const visibleCount = activities.filter(
            a=>!activityTypeFilter || a.type===activityTypeFilter
        ).length;

        if(visibleCount===0) return;

        const sectionDiv =
        document.createElement("div");
        sectionDiv.className = "day-slot-section";

        const slotCollapseKey = `${currentDay}-${section.key}`;
        const isCollapsed = isDayCollapsed(PLANNING_SLOT_COLLAPSE_KEY,currentTripId,slotCollapseKey);

        const head = document.createElement("h3");
        head.className = "day-slot-head";
        head.setAttribute("role","button");
        head.tabIndex = 0;
        head.setAttribute("aria-expanded",String(!isCollapsed));

        const headLabel = document.createElement("span");
        headLabel.textContent = section.label;
        head.appendChild(headLabel);

        /* Chevron : même balisage SVG que .album-day-toggle (Album/
           Réservations) pour rester visuellement cohérent — voir
           renderPhotoGroups()/renderReservations(). */
        const toggleIcon = document.createElement("span");
        toggleIcon.className = "day-slot-toggle";
        const svgNS = "http://www.w3.org/2000/svg";
        const chevronSvg = document.createElementNS(svgNS,"svg");
        chevronSvg.setAttribute("width","15");
        chevronSvg.setAttribute("height","15");
        chevronSvg.setAttribute("viewBox","0 0 20 20");
        chevronSvg.setAttribute("fill","none");
        chevronSvg.setAttribute("stroke","currentColor");
        chevronSvg.setAttribute("stroke-width","2");
        chevronSvg.setAttribute("stroke-linecap","round");
        chevronSvg.setAttribute("stroke-linejoin","round");
        const chevronPath = document.createElementNS(svgNS,"path");
        chevronPath.setAttribute("d","M5 8l5 5 5-5");
        chevronSvg.appendChild(chevronPath);
        toggleIcon.appendChild(chevronSvg);
        head.appendChild(toggleIcon);

        const toggleSlot = ()=>{
            sectionDiv.classList.toggle("collapsed");
            const nowCollapsed = sectionDiv.classList.contains("collapsed");
            head.setAttribute("aria-expanded",String(!nowCollapsed));
            toggleDayCollapsed(PLANNING_SLOT_COLLAPSE_KEY,currentTripId,slotCollapseKey);
        };
        head.addEventListener("click",toggleSlot);
        head.addEventListener("keydown",(e)=>{
            if(e.key==="Enter" || e.key===" "){
                e.preventDefault();
                toggleSlot();
            }
        });

        if(isCollapsed) sectionDiv.classList.add("collapsed");
        sectionDiv.appendChild(head);

        const slot =
        document.createElement("div");

        slot.className="slot";
        /* Le drop sur une section vide (aucune carte à cibler) reste géré
           par activityDragState.currentSection à la fin du glisser — voir
           bindActivityDragHandle() plus bas. Pas de dragover/drop natifs
           ici : tout le glisser-déposer passe désormais par les Pointer
           Events (souris ET tactile), voir la poignée ⠿ sur chaque carte. */
        slot.dataset.section = section.key;

        activities.forEach((activity,index)=>{

            if(activityTypeFilter && activity.type!==activityTypeFilter) return;

            const div =
            document.createElement("div");

            div.className="activity";
            div.tabIndex=0;
            div.dataset.section = section.key;
            div.dataset.index = index;
            div.setAttribute(
                "aria-label",
                `${activity.name}${activity.type ? ", "+activity.type : ""}. `
                + "Ctrl + flèche haut ou bas pour réordonner."
            );
            div.style.setProperty("--type-color",typeColors[activity.type] || "#999");
            if(activity.done) div.classList.add("done");

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

            /* Double-tap = "marquer fait" (mockup A validé, 2026-09-02) —
               geste jusqu'ici inutilisé sur la carte. Le dblclick natif
               couvre souris ET tactile (le double-tap déclenche déjà un
               vrai dblclick sur mobile, la zoom-au-double-tap par défaut du
               navigateur étant déjà neutralisée par le viewport meta de
               l'app). Ignoré sur les éléments interactifs de la carte
               (poignée, boutons, select) pour ne pas interférer avec leur
               propre double-clic éventuel. */
            div.addEventListener("dblclick",(e)=>{
                if(e.target.closest("button,select,.activity-drag-handle")) return;
                activity.done = !activity.done;
                savePlanning();
                renderActivities();
            });

            const dragHandle = document.createElement("span");
            dragHandle.className = "activity-drag-handle";
            dragHandle.setAttribute("aria-hidden","true");
            dragHandle.textContent = "⠿";
            bindActivityDragHandle(dragHandle,div,container);

            const infoDiv = document.createElement("div");

            let addressReservationSuffix = "";
            if(activity.address && activity.address.trim()) addressReservationSuffix += " 📍";
            if(activity.reservationLink) addressReservationSuffix += " 🎫";
            if(activityHasAttachments(currentDay,activity.id)) addressReservationSuffix += " 📎";

            const strong = document.createElement("strong");
            strong.textContent =
            activityIconPrefix(activity.type)
            + (activity.time ? `${activity.time} – ` : "")
            + activity.name
            + addressReservationSuffix;

            const editBtn = document.createElement("button");
            editBtn.className = "activity-edit-btn";
            editBtn.textContent = "✏️";
            editBtn.title = "Modifier l'activité";
            editBtn.setAttribute("aria-label","Modifier l'activité");
            editBtn.addEventListener("click",()=>{
                startEditActivity(section.key,index);
            });

            const titleRow = document.createElement("div");
            titleRow.className = "activity-title-row";
            titleRow.appendChild(strong);
            if(activity.done){
                const doneBadge = document.createElement("span");
                doneBadge.className = "activity-done-badge";
                doneBadge.textContent = "✓";
                doneBadge.title = "Fait";
                titleRow.appendChild(doneBadge);
            }
            titleRow.appendChild(editBtn);

            infoDiv.appendChild(titleRow);

            if(activity.type){
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
                infoDiv.appendChild(document.createElement("br"));
                infoDiv.appendChild(small);
            }

            const linkedTricountCount = tricountExpenses.filter(exp=>exp.activityId===activity.id).length;

            if(
                (activity.price!==null && activity.price!==undefined)
                ||
                (activity.travelTime!==null && activity.travelTime!==undefined)
                ||
                activity.duration
                ||
                linkedTricountCount>0
                ||
                (activity.tags && activity.tags.length>0)
            ){

                const badgeRow = document.createElement("div");
                badgeRow.className = "badge-row";

                if(activity.price!==null && activity.price!==undefined){
                    const priceSymbol = activityPriceSymbol(activity);
                    const priceBadge = document.createElement("span");
                    priceBadge.className = "price-badge";
                    priceBadge.textContent =
                    `${priceCurrencyIcon(priceSymbol)} ${activity.price.toFixed(2)} ${priceSymbol}`;
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

                if(linkedTricountCount>0){
                    const tricountBadge = document.createElement("button");
                    tricountBadge.type = "button";
                    tricountBadge.className = "tricount-link-badge";
                    tricountBadge.textContent =
                    linkedTricountCount===1 ? "🧾 1 dépense Tricount" : `🧾 ${linkedTricountCount} dépenses Tricount`;
                    tricountBadge.addEventListener("click",()=>{
                        setActiveMainTab("budget");
                        switchTricountTab("history");
                    });
                    badgeRow.appendChild(tricountBadge);
                }

                (activity.tags || []).forEach(tag=>{
                    const tagBadge = document.createElement("span");
                    tagBadge.className = "tag-badge";
                    tagBadge.textContent = `🏷️ ${tag}`;
                    badgeRow.appendChild(tagBadge);
                });

                infoDiv.appendChild(badgeRow);
            }

            if(activity.note){
                const noteP = document.createElement("p");
                noteP.className = "activity-note";
                noteP.textContent = `💡 ${activity.note}`;
                infoDiv.appendChild(noteP);
            }

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

            const btnGroup = document.createElement("div");
            btnGroup.className = "btn-group";
            btnGroup.appendChild(reorderGroup);
            btnGroup.appendChild(moveSelect);

            const photoBtn = document.createElement("button");
            photoBtn.type = "button";
            photoBtn.className = "activity-photo-btn";
            photoBtn.textContent = "📷";
            photoBtn.title = "Ajouter une photo ou vidéo";
            photoBtn.setAttribute("aria-label","Ajouter une photo ou vidéo à cette activité");
            photoBtn.addEventListener("click",()=>{
                openDayCameraView(currentDay,activity.id);
            });
            btnGroup.appendChild(photoBtn);

            const menuWrap = document.createElement("div");
            menuWrap.className = "activity-menu-wrap";

            const kebabBtn = document.createElement("button");
            kebabBtn.type = "button";
            kebabBtn.className = "activity-kebab-btn";
            kebabBtn.textContent = "⋮";
            kebabBtn.title = "Plus d'actions";
            kebabBtn.setAttribute("aria-label","Plus d'actions pour cette activité");
            kebabBtn.setAttribute("aria-haspopup","true");
            kebabBtn.setAttribute("aria-expanded","false");

            const popover = document.createElement("div");
            popover.className = "activity-popover";
            popover.hidden = true;
            popover.setAttribute("role","menu");

            if(activity.address && activity.address.trim()){
                const mapItem = document.createElement("button");
                mapItem.type = "button";
                mapItem.className = "activity-popover-item";
                mapItem.textContent = "📍 Ouvrir dans Maps";
                mapItem.addEventListener("click",()=>{
                    closeActivityMenus();
                    openAddressInMaps(activity.address);
                });
                popover.appendChild(mapItem);
            }

            if(activity.reservationLink){
                const reservationItem = document.createElement("button");
                reservationItem.type = "button";
                reservationItem.className = "activity-popover-item";
                reservationItem.textContent = "🎫 Réservation";
                reservationItem.addEventListener("click",()=>{
                    closeActivityMenus();
                    openReservationLink(activity.reservationLink);
                });
                popover.appendChild(reservationItem);
            }

            const attachmentsItem = document.createElement("button");
            attachmentsItem.type = "button";
            attachmentsItem.className = "activity-popover-item";
            attachmentsItem.textContent = "📎 Documents";
            attachmentsItem.addEventListener("click",()=>{
                closeActivityMenus();
                openAttachmentsModal(currentDay,activity);
            });
            popover.appendChild(attachmentsItem);

            const tricountItem = document.createElement("button");
            tricountItem.type = "button";
            tricountItem.className = "activity-popover-item";
            tricountItem.textContent = "🧾 Ajouter une dépense Tricount";
            tricountItem.addEventListener("click",()=>{
                closeActivityMenus();
                startTricountExpenseFromActivity(activity);
            });
            popover.appendChild(tricountItem);

            const deleteItem = document.createElement("button");
            deleteItem.type = "button";
            deleteItem.className = "activity-popover-item danger";
            deleteItem.textContent = "🗑️ Supprimer";
            deleteItem.addEventListener("click",()=>{
                closeActivityMenus();
                deleteActivity(section.key,index);
            });
            popover.appendChild(deleteItem);

            kebabBtn.addEventListener("click",(e)=>{
                e.stopPropagation();
                const isOpen = !popover.hidden;
                closeActivityMenus();
                if(!isOpen){
                    popover.classList.remove("flip-up");
                    popover.hidden = false;
                    kebabBtn.setAttribute("aria-expanded","true");

                    if(popover.getBoundingClientRect().bottom > window.innerHeight){
                        popover.classList.add("flip-up");
                    }
                }
            });

            menuWrap.appendChild(kebabBtn);
            menuWrap.appendChild(popover);
            btnGroup.appendChild(menuWrap);

            div.appendChild(dragHandle);
            div.appendChild(infoDiv);
            div.appendChild(btnGroup);

            slot.appendChild(div);
        });

        sectionDiv.appendChild(slot);
        container.appendChild(sectionDiv);

    });

    renderTabs();
}

function closeActivityMenus(){
    document.querySelectorAll(".activity-popover").forEach(p=>{
        p.hidden = true;
    });
    document.querySelectorAll(".activity-kebab-btn").forEach(b=>{
        b.setAttribute("aria-expanded","false");
    });
}

document.addEventListener("click",(e)=>{
    if(!e.target.closest(".activity-menu-wrap")) closeActivityMenus();
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape") closeActivityMenus();
});

const themeToggle =
document.getElementById("themeToggle");
const resetButton =
document.getElementById("resetPlanning");

function resetPlanning(){

    /* Capturé avant l'ouverture du modal (pas relu après clearSyncState()
       dans le callback, où syncCode serait déjà vidé) : sert à la fois au
       texte du modal et au message de fin. */
    const wasSynced = !!syncCode;

    showConfirmModal(
        "Veux-tu vraiment supprimer tout le planning ? "
        + (wasSynced
            ? "La synchronisation avec l'autre appareil sera d'abord coupée, pour ne pas effacer aussi son planning à lui. "
            : "")
        + "Cette action est irréversible.",
        ()=>{

            /* Couper la synchronisation AVANT de vider le planning : sinon
               savePlanning() ci-dessous pousse un planning vide vers
               l'autre appareil via pushToSync(), qui l'efface aussi chez
               lui — une réinitialisation locale ne doit jamais devenir une
               réinitialisation à distance. */
            if(wasSynced){
                clearSyncState();
                updateSyncPanelView();
            }

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

            showToast(
                wasSynced
                    ? "Planning réinitialisé — synchronisation coupée sur cet appareil."
                    : "Planning réinitialisé.",
                {type:"success"}
            );
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
        + "checklist, le budget partagé et les documents/photos seront "
        + "supprimés"
        + (syncCode ? " et la synchronisation avec l'autre appareil sera coupée" : "")
        + ". Cette action est irréversible.",
        async ()=>{

            /* Coupe la synchronisation avant de vider quoi que ce soit :
               même raison que resetPlanning() juste au-dessus — une
               suppression locale ne doit jamais devenir une suppression à
               distance. clearSyncState() (pas juste syncRef.off()) pour un
               nettoyage complet — sectionMeta/lastPushedPayload inclus. */
            if(syncCode) clearSyncState();

            localStorage.removeItem("vacationPlanning");
            localStorage.removeItem(TRIP_NAME_KEY);
            localStorage.removeItem(TRIP_CREATED_KEY);
            localStorage.removeItem(TRIP_COUNTRY_KEY);
            localStorage.removeItem("startDate");
            localStorage.removeItem("dayCount");
            localStorage.removeItem("appIconChoice");
            localStorage.removeItem(CHECKLIST_STORAGE_KEY);
            localStorage.removeItem(CHECKLIST_TEMPLATE_STATE_KEY);
            /* Manquaient ici (audit d'isolation entre voyages, 2026-09-01) :
               Tricount et devises n'existaient pas encore quand ce
               gestionnaire a été écrit, jamais mis à jour depuis — sans ça,
               "Supprimer le voyage" laissait le budget partagé et la devise
               de l'ancien voyage bien vivants pour le suivant. */
            localStorage.removeItem(TRICOUNT_PARTICIPANTS_KEY);
            localStorage.removeItem(TRICOUNT_EXPENSES_KEY);
            localStorage.removeItem("baseCurrency");
            localStorage.removeItem("targetCurrency");
            localStorage.removeItem(TRIP_TIMEZONE_KEY);

            /* Contrairement à restoreTrip()/finalizeTripCreation(), ce
               voyage n'est jamais archivé (suppression volontaire, pas un
               remplacement) — ses photos/documents IndexedDB deviendraient
               donc orphelins pour toujours (jamais rattachés à une entrée
               d'historique consultable) si on ne les supprime pas ici. */
            try{
                await deleteTripPhotos(currentTripId);
            }catch(err){
                console.error("Impossible de supprimer les photos/documents du voyage :",err);
            }

            location.reload();
        }
    );
});

/* --- Export PDF / Impression --- */

const printBtn = document.getElementById("printBtn");

function buildPrintView(){

    const printView = document.getElementById("printView");
    printView.innerHTML = "";
    printView.classList.remove("trip-book");

    const title = document.createElement("h1");
    title.textContent = "🌴 Tabi Go";
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
                activityIconPrefix(activity.type)
                + (activity.time ? activity.time + " – " : "")
                + activity.name;
                row.appendChild(nameLine);

                const metaParts = [];
                if(activity.address) metaParts.push(activity.address);
                if(activity.price!==null && activity.price!==undefined){
                    metaParts.push(`${activity.price.toFixed(2)} ${activityPriceSymbol(activity)}`);
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
    printOrExportPdfIfNative(`planning_${tripName || "vacances"}.pdf`.replace(/\s+/g,"_"));
});

/* Carnet de voyage (mockup A validé, 2026-09-02) : réutilise le même
   #printView / window.print() qu'"Exporter en PDF" — juste une mise en
   page bien plus riche (couverture, photos par jour, statistiques) au lieu
   du texte brut. Async (contrairement à buildPrintView()) : les photos
   vivent en IndexedDB, jamais accessibles de façon synchrone. */
let tripBookObjectUrls = [];

async function buildTripBookView(){

    tripBookObjectUrls.forEach(url=>URL.revokeObjectURL(url));
    tripBookObjectUrls = [];

    const printView = document.getElementById("printView");
    printView.innerHTML = "";
    printView.classList.add("trip-book");

    const cover = document.createElement("div");
    cover.className = "trip-book-cover";

    const coverIcon = document.createElement("div");
    coverIcon.className = "trip-book-cover-icon";
    coverIcon.textContent = appTitleEmoji();
    cover.appendChild(coverIcon);

    const coverTitle = document.createElement("h1");
    coverTitle.textContent = tripName || "Mon voyage";
    cover.appendChild(coverTitle);

    const coverSub = document.createElement("p");
    const subParts = [];
    if(dateForDay(1) && dateForDay(dayCount)){
        subParts.push(`${formatDayDateShort(1)} – ${formatDayDateShort(dayCount)}`);
    }
    subParts.push(`${dayCount} jour${dayCount>1 ? "s" : ""}`);
    coverSub.textContent = subParts.join(" · ");
    cover.appendChild(coverSub);

    printView.appendChild(cover);

    const sections = [
        {key:"matin",label:"🌅 Matin"},
        {key:"midi",label:"🍽️ Midi"},
        {key:"apresMidi",label:"☀️ Après-midi"},
        {key:"soir",label:"🌙 Soir"}
    ];

    for(let day=1;day<=dayCount;day++){

        const dayData = planning[day];
        if(!dayData) continue;

        const dateLabel = formatDayDate(day);
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
                activityIconPrefix(activity.type)
                + (activity.time ? activity.time + " – " : "")
                + activity.name;
                row.appendChild(nameLine);

                const metaParts = [];
                if(activity.address) metaParts.push(activity.address);
                if(activity.price!==null && activity.price!==undefined){
                    metaParts.push(`${activity.price.toFixed(2)} ${activityPriceSymbol(activity)}`);
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

                printView.appendChild(row);
            });
        });

        if(!dayHasActivity){
            const empty = document.createElement("div");
            empty.className = "print-activity-meta";
            empty.textContent = "Aucune activité planifiée.";
            printView.appendChild(empty);
        }

        try{
            const dayPhotos = await getDayPhotos(day);
            const printable = dayPhotos.filter(p=>mediaTypeFromBlob(p.blob)!=="video").slice(0,6);
            if(printable.length){
                const grid = document.createElement("div");
                grid.className = "trip-book-photo-grid";
                printable.forEach(photo=>{
                    const url = URL.createObjectURL(photo.blob);
                    tripBookObjectUrls.push(url);
                    const img = document.createElement("img");
                    img.src = url;
                    grid.appendChild(img);
                });
                printView.appendChild(grid);
            }
        }catch(err){
            // Photos indisponibles sur cet appareil (IndexedDB absent/plein) :
            // le carnet continue sans photos pour ce jour, pas une erreur
            // bloquante pour le reste de l'export.
        }
    }

    let totalPrice = 0;
    let activityCount = 0;
    Object.keys(planning).forEach(d=>{
        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[d][slot] || []).forEach(a=>{
                activityCount++;
                if(a.price!==null && a.price!==undefined) totalPrice += activityPriceInBase(a);
            });
        });
    });

    const statsHeading = document.createElement("h2");
    statsHeading.textContent = "📊 Statistiques du voyage";
    printView.appendChild(statsHeading);

    const statsGrid = document.createElement("div");
    statsGrid.className = "trip-book-stats-grid";
    [
        [`${totalPrice.toFixed(2)} ${CURRENCIES[baseCurrency].symbol}`,"Budget total"],
        [String(activityCount),"Activités"],
        [String(dayCount),"Jours de voyage"]
    ].forEach(([value,label])=>{
        const stat = document.createElement("div");
        stat.className = "trip-book-stat";
        const v = document.createElement("div");
        v.className = "v";
        v.textContent = value;
        const l = document.createElement("div");
        l.className = "l";
        l.textContent = label;
        stat.appendChild(v);
        stat.appendChild(l);
        statsGrid.appendChild(stat);
    });
    printView.appendChild(statsGrid);
}

document.getElementById("tripBookBtn").addEventListener("click",async ()=>{
    showToast("Génération du carnet de voyage…",{duration:2000});
    await buildTripBookView();
    printOrExportPdfIfNative(`carnet_${tripName || "voyage"}.pdf`.replace(/\s+/g,"_"));
});

/* --- Devise du prix d'une activité : "départ" ou "arrivée" du
   convertisseur (baseCurrency/targetCurrency), au cas par cas pour chaque
   activité — remplace l'ancienne devise de saisie unique et globale. Même
   patron que le bascule base/cible de Tricount
   (tricountCurrencyBaseBtn/TargetBtn, tricountExpenseCurrencyRole). --- */

const activityPriceInput = document.getElementById("activityPrice");
const activityPriceSuffix = document.getElementById("activityPriceSuffix");
const activityPriceCurrencyBaseBtn = document.getElementById("activityPriceCurrencyBaseBtn");
const activityPriceCurrencyTargetBtn = document.getElementById("activityPriceCurrencyTargetBtn");

let activityPriceCurrencyRole = "base";

function updateActivityPriceCurrencyToggle(){
    activityPriceCurrencyBaseBtn.textContent = baseCurrency;
    activityPriceCurrencyTargetBtn.textContent = targetCurrency;
    activityPriceCurrencyBaseBtn.classList.toggle("active",activityPriceCurrencyRole==="base");
    activityPriceCurrencyTargetBtn.classList.toggle("active",activityPriceCurrencyRole==="target");
    const symbol = CURRENCIES[activityPriceCurrencyRole==="target" ? targetCurrency : baseCurrency].symbol;
    activityPriceInput.placeholder = `Prix (${symbol})`;
    activityPriceSuffix.textContent = `Prix (${symbol})`;
}

activityPriceCurrencyBaseBtn.addEventListener("click",()=>{
    activityPriceCurrencyRole = "base";
    updateActivityPriceCurrencyToggle();
});

activityPriceCurrencyTargetBtn.addEventListener("click",()=>{
    activityPriceCurrencyRole = "target";
    updateActivityPriceCurrencyToggle();
});

updateActivityPriceCurrencyToggle();

/* --- Export / Import JSON (sauvegarde complète) ---
   CAPACITOR (2026-09-05) : le bouton manuel reste tel quel — mais son
   contenu (buildBackupPayload()) est maintenant réutilisé par une vraie
   sauvegarde automatique sur Google Drive, voir le bloc juste après
   updateBackupReminderHint(). À ne pas confondre avec la synchronisation
   Firebase existante (voir [[firebase_sync]]) : elle relie deux appareils
   entre eux, ce n'est pas une sauvegarde personnelle hors appairage. */

function buildBackupPayload(){
    return {
        version:2,
        exportedAt:new Date().toISOString(),
        tripName,
        tripCountry,
        planning,
        dayCount,
        startDate:localStorage.getItem("startDate") || "",
        baseCurrency:localStorage.getItem("baseCurrency") || "GBP",
        targetCurrency:localStorage.getItem("targetCurrency") || "",
        tripTimezone:localStorage.getItem(TRIP_TIMEZONE_KEY) || "",
        checklist,
        checklistTemplates:JSON.parse(localStorage.getItem(CHECKLIST_TEMPLATE_STATE_KEY) || "[]"),
        tricountParticipants,
        tricountExpenses
    };
}

const exportDataBtn = document.getElementById("exportDataBtn");
const backupReminderHint = document.getElementById("backupReminderHint");

/* Seule vraie copie de secours HORS de cet appareil et de Firebase (perte
   du téléphone, compte Firebase supprimé...) — voir
   [[sync_reliability_hardening]]. Purement passif (pas de notification
   intrusive) : juste rendu visible ici, à côté du bouton, plutôt que
   silencieux comme avant. */
const LAST_BACKUP_KEY = "lastBackupExportAt";
const BACKUP_REMINDER_WARNING_DAYS = 30;

function updateBackupReminderHint(){
    if(!backupReminderHint) return;
    const last = parseInt(localStorage.getItem(LAST_BACKUP_KEY),10);
    if(!last){
        backupReminderHint.textContent = "Aucune sauvegarde effectuée pour l'instant.";
        backupReminderHint.classList.remove("menu-hint-warning");
        return;
    }
    const days = Math.floor((Date.now()-last)/(24*60*60*1000));
    const when = days<=0 ? "aujourd'hui" : days===1 ? "il y a 1 jour" : `il y a ${days} jours`;
    const isStale = days>=BACKUP_REMINDER_WARNING_DAYS;
    backupReminderHint.textContent = isStale
        ? `⚠️ Dernière sauvegarde ${when} — pense à en refaire une.`
        : `Dernière sauvegarde : ${when}.`;
    backupReminderHint.classList.toggle("menu-hint-warning",isStale);
}

updateBackupReminderHint();

exportDataBtn.addEventListener("click",()=>{

    const blob = new Blob(
        [JSON.stringify(buildBackupPayload(),null,2)],
        {type:"application/json"}
    );

    // Réutilise downloadBlobToGallery() (déjà repérée pour le remplacement
    // Capacitor, voir plus bas) plutôt que de dupliquer le même
    // téléchargement — étend la préparation Android à cet export gratuitement.
    downloadBlobToGallery(blob,`planning_vacances_${new Date().toISOString().slice(0,10)}.json`);

    localStorage.setItem(LAST_BACKUP_KEY,Date.now());
    updateBackupReminderHint();

    showToast("Sauvegarde exportée.",{type:"success"});
});

/* --- Sauvegarde automatique sur Google Drive (2026-09-05) ---
   Voir le commentaire CAPACITOR "Sauvegarde automatique sur Google Drive"
   tout en haut du fichier pour l'architecture complète (deux identifiants
   OAuth Google Cloud, jeton qui expire ~7 jours en statut "Test", scope
   drive.appdata). Résumé : @capgo/capacitor-social-login pour l'OAuth,
   appels REST directs à l'API Drive v3 pour l'upload — buildBackupPayload()
   ci-dessus est la SEULE source de vérité du contenu sauvegardé, partagée
   avec l'export JSON manuel. */

// Client ID de type "Web application" (projet Google Cloud "Tabi Go",
// 2026-09-05) — PAS le Client ID Android, jamais utilisé ici.
const GOOGLE_WEB_CLIENT_ID = "56397126933-kpnf1i8h9i2b9cftv4of8olg3h98h5bs.apps.googleusercontent.com";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GOOGLE_DRIVE_BACKUP_FILENAME = "planning_vacances_backup.json";

const DRIVE_CONNECTED_KEY = "driveBackupConnected";
const DRIVE_LAST_BACKUP_KEY = "lastDriveBackupAt";
const DRIVE_AUTO_BACKUP_INTERVAL_MS = 24*60*60*1000;

const driveBackupHint = document.getElementById("driveBackupHint");

function isDriveConnected(){
    return localStorage.getItem(DRIVE_CONNECTED_KEY)==="1";
}

function nativeSocialLoginAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin);
}

let socialLoginInitPromise = null;

function ensureSocialLoginInitialized(){
    if(!socialLoginInitPromise){
        socialLoginInitPromise = window.Capacitor.Plugins.SocialLogin.initialize({
            google:{ webClientId:GOOGLE_WEB_CLIENT_ID }
        });
    }
    return socialLoginInitPromise;
}

function updateDriveBackupHint(){
    if(!driveBackupHint) return;

    driveBackupHint.hidden = !isNativeApp();
    if(!isNativeApp()) return;

    if(!isDriveConnected()){
        driveBackupHint.textContent = "Google Drive : non connecté.";
        driveBackupHint.classList.remove("menu-hint-warning");
        return;
    }

    const last = parseInt(localStorage.getItem(DRIVE_LAST_BACKUP_KEY),10);
    if(!last){
        driveBackupHint.textContent = "Google Drive connecté — première sauvegarde en attente.";
        driveBackupHint.classList.remove("menu-hint-warning");
        return;
    }
    const days = Math.floor((Date.now()-last)/(24*60*60*1000));
    const when = days<=0 ? "aujourd'hui" : days===1 ? "il y a 1 jour" : `il y a ${days} jours`;
    driveBackupHint.textContent = `Dernière sauvegarde Drive : ${when}.`;
    driveBackupHint.classList.remove("menu-hint-warning");
}

/* Jamais appelée automatiquement en tâche de fond avec une UI potentielle :
   seul le bouton "Connecter/Reconnecter" (geste utilisateur explicite)
   déclenche login() quand une vraie interaction Google peut être
   nécessaire. ensureDriveAccessToken() (plus bas) l'appelle aussi, mais
   uniquement au moment où l'appli redevient visible — jamais pendant
   qu'elle est en arrière-plan. */
async function connectGoogleDrive(){

    if(!nativeSocialLoginAvailable()){
        showToast("La sauvegarde Google Drive n'est disponible que dans l'appli Android.",{type:"error"});
        return;
    }

    if(!GOOGLE_WEB_CLIENT_ID){
        showToast("Google Drive n'est pas encore configuré (Client ID manquant).",{type:"error"});
        return;
    }

    try{
        await ensureSocialLoginInitialized();
        const { result } = await window.Capacitor.Plugins.SocialLogin.login({
            provider:"google",
            options:{ scopes:[GOOGLE_DRIVE_SCOPE] }
        });

        if(!result.accessToken || !result.accessToken.token){
            throw new Error("Aucun jeton d'accès reçu");
        }

        localStorage.setItem(DRIVE_CONNECTED_KEY,"1");
        updateDriveBackupHint();
        showToast("Connecté à Google Drive.",{type:"success"});

        await backupToGoogleDrive();
    }catch(err){
        if(err && err.code==="USER_CANCELLED") return;
        console.error("Connexion à Google Drive impossible :",err);
        showToast("Connexion à Google Drive impossible.",{type:"error"});
    }
}

/* Renouvelle silencieusement le jeton via login() : sur Android, le
   Credential Manager renvoie une session déjà valide sans redemander de
   consentement — une vraie boîte de dialogue ne réapparaît que si la
   session a expiré (~7 jours en statut "Test", voir le commentaire
   CAPACITOR tout en haut du fichier). C'est acceptable ici car cette
   fonction n'est appelée qu'au moment où l'appli redevient visible
   (voir scheduleGoogleDriveAutoBackupCheck), jamais pendant qu'elle est
   fermée ou masquée. */
async function ensureDriveAccessToken(){

    if(!isDriveConnected() || !nativeSocialLoginAvailable()) return null;

    try{
        await ensureSocialLoginInitialized();
        const { result } = await window.Capacitor.Plugins.SocialLogin.login({
            provider:"google",
            options:{ scopes:[GOOGLE_DRIVE_SCOPE] }
        });
        if(result.accessToken && result.accessToken.token) return result.accessToken.token;
        throw new Error("Aucun jeton d'accès reçu");
    }catch(err){
        console.error("Reconnexion à Google Drive nécessaire :",err);
        localStorage.setItem(DRIVE_CONNECTED_KEY,"0");
        updateDriveBackupHint();
        return null;
    }
}

async function findExistingDriveBackupFileId(accessToken){
    const url = "https://www.googleapis.com/drive/v3/files"
        + "?spaces=appDataFolder&q=" + encodeURIComponent(`name='${GOOGLE_DRIVE_BACKUP_FILENAME}'`)
        + "&fields=files(id)";
    const response = await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}});
    if(!response.ok) throw new Error("Recherche du fichier Drive impossible");
    const data = await response.json();
    return (data.files && data.files[0]) ? data.files[0].id : null;
}

async function backupToGoogleDrive(){

    const accessToken = await ensureDriveAccessToken();
    if(!accessToken) return false;

    try{
        const existingFileId = await findExistingDriveBackupFileId(accessToken);

        const metadata = existingFileId
            ? { name:GOOGLE_DRIVE_BACKUP_FILENAME }
            : { name:GOOGLE_DRIVE_BACKUP_FILENAME, parents:["appDataFolder"] };

        const boundary = "tabigo-drive-backup-boundary";
        const body =
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
            + `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(buildBackupPayload(),null,2)}\r\n`
            + `--${boundary}--`;

        const uploadUrl = existingFileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
            : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

        const response = await fetch(uploadUrl,{
            method: existingFileId ? "PATCH" : "POST",
            headers:{
                Authorization:`Bearer ${accessToken}`,
                "Content-Type":`multipart/related; boundary=${boundary}`
            },
            body
        });

        if(!response.ok) throw new Error(`Upload Drive refusé (${response.status})`);

        localStorage.setItem(DRIVE_LAST_BACKUP_KEY,Date.now());
        updateDriveBackupHint();
        return true;
    }catch(err){
        console.error("Sauvegarde sur Google Drive impossible :",err);
        return false;
    }
}

/* Même accroche que le podomètre (syncTripStepsOnce(), voir le bloc juste
   après le verrou par voyage) : appelée au boot ET à chaque retour au
   premier plan (visibilitychange). Basée sur le temps écoulé plutôt que
   sur chaque modification de donnée — une sauvegarde est un filet de
   sécurité périodique, pas une synchro temps réel (même esprit que
   BACKUP_REMINDER_WARNING_DAYS un peu plus haut). */
async function scheduleGoogleDriveAutoBackupCheck(){
    if(!isDriveConnected() || !nativeSocialLoginAvailable()) return;
    const last = parseInt(localStorage.getItem(DRIVE_LAST_BACKUP_KEY),10) || 0;
    if(Date.now()-last < DRIVE_AUTO_BACKUP_INTERVAL_MS) return;
    await backupToGoogleDrive();
}

updateDriveBackupHint();
if(isNativeApp()){
    scheduleGoogleDriveAutoBackupCheck();
    document.addEventListener("visibilitychange",()=>{
        if(document.visibilityState==="visible") scheduleGoogleDriveAutoBackupCheck();
    });
}

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
            "Importer cette sauvegarde remplacera tout le planning actuel "
            + "— le planning actuel sera d'abord archivé dans l'historique "
            + "des voyages, tu pourras le consulter (et le restaurer) plus "
            + "tard. Continuer ?",
            ()=>{

                archiveCurrentTrip();

                /* Manquait ici (audit 2026-09-01, signalé comme "le voyage en
                   cours apparaît aussi dans l'historique") : contrairement à
                   finalizeTripCreation()/replaceTripWithImportedRows()/
                   restoreTrip()/adoptRemoteTrip(), ce chemin archivait le
                   voyage courant SANS jamais lui donner une nouvelle identité
                   — le voyage importé continuait à vivre sous le même
                   currentTripId que celui qui venait d'être figé dans
                   l'historique. Résultat : le voyage "actuel" et son propre
                   instantané dans l'historique partageaient le même id (donc
                   les mêmes photos/documents IndexedDB, scopés par tripId). */
                currentTripId = generateId();
                localStorage.setItem(CURRENT_TRIP_ID_KEY,currentTripId);

                /* Le fichier de sauvegarde ne couvre pas forcément tous les
                   champs (ex. exports plus anciens) — sans ce nettoyage, un
                   champ absent du fichier laissait la valeur de l'ANCIEN
                   voyage (maintenant dans l'historique) attachée au nouveau
                   currentTripId : même classe de fuite que l'audit d'isolation
                   du 2026-09-01 sur replaceTripWithImportedRows()/
                   deleteTripBtn. */
                localStorage.removeItem(CHECKLIST_STORAGE_KEY);
                localStorage.removeItem(CHECKLIST_TEMPLATE_STATE_KEY);
                localStorage.removeItem(TRICOUNT_PARTICIPANTS_KEY);
                localStorage.removeItem(TRICOUNT_EXPENSES_KEY);
                localStorage.removeItem("baseCurrency");
                localStorage.removeItem("targetCurrency");
                localStorage.removeItem(TRIP_TIMEZONE_KEY);

                localStorage.setItem("vacationPlanning",JSON.stringify(data.planning || {}));

                if(data.dayCount) localStorage.setItem("dayCount",String(data.dayCount));
                if(data.startDate!==undefined) localStorage.setItem("startDate",data.startDate);
                if(data.tripName!==undefined) localStorage.setItem(TRIP_NAME_KEY,data.tripName);
                if(data.tripCountry!==undefined) localStorage.setItem(TRIP_COUNTRY_KEY,data.tripCountry);
                if(data.baseCurrency!==undefined) localStorage.setItem("baseCurrency",data.baseCurrency);
                if(data.targetCurrency!==undefined) localStorage.setItem("targetCurrency",data.targetCurrency);
                if(data.tripTimezone!==undefined) localStorage.setItem(TRIP_TIMEZONE_KEY,data.tripTimezone);
                if(Array.isArray(data.checklist)) localStorage.setItem(CHECKLIST_STORAGE_KEY,JSON.stringify(data.checklist));
                if(Array.isArray(data.checklistTemplates)) localStorage.setItem(CHECKLIST_TEMPLATE_STATE_KEY,JSON.stringify(data.checklistTemplates));
                if(Array.isArray(data.tricountParticipants)) localStorage.setItem(TRICOUNT_PARTICIPANTS_KEY,JSON.stringify(data.tricountParticipants));
                if(Array.isArray(data.tricountExpenses)) localStorage.setItem(TRICOUNT_EXPENSES_KEY,JSON.stringify(data.tricountExpenses));

                location.reload();
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

/* "Importer un fichier"/"Exporter" ouvrent chacun un petit popover de choix
   (même composant que openChoicePopover(), voir la section Réservations)
   plutôt que d'agir directement — regroupe 2026-09-02 ce qui étaient 3
   boutons (fichier/.ics/texte collé) et 4 boutons (PDF/carnet/.ics/JSON)
   distincts dans le menu ⋮. Chaque choix déclenche .click() sur le bouton
   d'origine (resté dans le DOM, juste caché) : réutilise sa logique
   existante telle quelle, zéro duplication. */
importBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    toggleChoicePopover(importBtn,[
        {icon:"📂",label:"Fichier (Excel, CSV, JSON…)",action:()=>importFile.click()},
        {icon:"📅",label:"Calendrier (.ics)",action:()=>importIcsBtn.click()},
        {icon:"📋",label:"Texte collé",action:()=>pasteImportBtn.click()}
    ]);
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

/* Un import Excel/CSV s'ajoutait toujours silencieusement au voyage en
   cours (photos, checklist, Tricount... jamais archivés), contrairement à
   la sauvegarde JSON qui archive avant de restaurer (handleImportBackupFile)
   et à "Nouveau voyage" (finalizeTripCreation) — d'où la confusion signalée.
   On demande maintenant explicitement à chaque import de fichier. */
const PENDING_IMPORT_ROWS_KEY = "pendingExcelImportRows";

function promptImportRowsDestination(rows){
    showConfirmModal(
        `${rows.length} ligne(s) trouvée(s) dans le fichier. Remplacer le voyage actuel (il sera archivé dans l'historique) ou ajouter ces activités au voyage en cours ?`,
        ()=>{ replaceTripWithImportedRows(rows); },
        {
            confirmLabel:"Remplacer le voyage actuel",
            cancelLabel:"Ajouter à ce voyage",
            onCancel:()=>{ importRows(rows); }
        }
    );
}

function replaceTripWithImportedRows(rows){
    archiveCurrentTrip();

    /* Le rechargement ci-dessous vide la mémoire JS (rows y compris) —
       comme finalizeTripCreation(), c'est le seul moyen fiable de repartir
       d'un état 100% propre (planning, checklist, Tricount, voyageur...)
       sans réécrire à la main chaque variable/rendu du chargement initial.
       Les lignes du fichier sont donc mises de côté pour être réimportées
       juste après le rechargement (voir juste après importRows()). */
    localStorage.setItem(PENDING_IMPORT_ROWS_KEY,JSON.stringify(rows));

    currentTripId = generateId();
    localStorage.setItem(CURRENT_TRIP_ID_KEY,currentTripId);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    localStorage.removeItem(CHECKLIST_TEMPLATE_STATE_KEY);
    localStorage.removeItem(TRICOUNT_PARTICIPANTS_KEY);
    localStorage.removeItem(TRICOUNT_EXPENSES_KEY);
    localStorage.removeItem("startDate");
    /* Manquait ici (audit d'isolation entre voyages, 2026-09-01) : sans ça,
       la devise et le fuseau horaire de l'ANCIEN voyage restaient actifs
       après un import "Remplacer" — pas juste un réglage résiduel affiché
       à tort, mais un vrai risque de contamination des données :
       importRows() tague chaque activité importée avec priceCurrency =
       baseCurrency AU MOMENT DE L'IMPORT (après ce rechargement), donc une
       devise pas remise à zéro ici se serait propagée dans les nouvelles
       activités elles-mêmes, pas juste dans un réglage d'affichage. */
    localStorage.removeItem("baseCurrency");
    localStorage.removeItem("targetCurrency");
    localStorage.removeItem(TRIP_TIMEZONE_KEY);
    localStorage.setItem("vacationPlanning",JSON.stringify({}));

    location.reload();
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

        const importedPrice = isNaN(price) ? null : price;

        planning[day][slot].push({
            name,
            type,
            address,
            price: importedPrice,
            /* Pas de colonne dédiée dans le modèle CSV — la devise de départ
               du convertisseur est l'hypothèse la plus raisonnable pour un
               prix importé sans contexte. */
            priceCurrency: importedPrice!==null ? baseCurrency : null,
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
            refreshEndDateDisplay();
            localStorage.setItem("dayCount",dayCount);
        }

        sanitizePlanningSlots();
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

const pendingImportRowsRaw = localStorage.getItem(PENDING_IMPORT_ROWS_KEY);
if(pendingImportRowsRaw){
    localStorage.removeItem(PENDING_IMPORT_ROWS_KEY);
    try{
        importRows(JSON.parse(pendingImportRowsRaw));
    }catch(err){
        showToast(
            "Le voyage précédent a été archivé, mais l'import du fichier a échoué après le rechargement.",
            {type:"error",duration:6000}
        );
    }
}

/* --- Import de calendrier .ics (Airbnb, etc.) ---
   Parseur minimal : gère le dépliage de lignes (RFC 5545), les valeurs
   DTSTART/DTEND en date seule (VALUE=DATE) ou date-heure, et échappe le
   texte SUMMARY/LOCATION/DESCRIPTION. Ne gère pas les évènements récurrents
   (RRULE) — un seul VEVENT par réservation dans les exports habituels. */

function unescapeICSText(value){
    return value
        .replace(/\\n/gi,"\n")
        .replace(/\\,/g,",")
        .replace(/\\;/g,";")
        .replace(/\\\\/g,"\\");
}

function parseICSDate(value){

    const match = value.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if(!match) return null;

    const [,y,mo,d,,h,mi] = match;

    return {
        year: parseInt(y,10),
        month: parseInt(mo,10),
        day: parseInt(d,10),
        hour: h!==undefined ? parseInt(h,10) : null,
        minute: mi!==undefined ? parseInt(mi,10) : null
    };
}

function parseICS(text){

    const lines = text.split(/\r\n|\n|\r/);

    const unfolded = [];
    lines.forEach(line=>{
        if((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length){
            unfolded[unfolded.length-1] += line.slice(1);
        }else{
            unfolded.push(line);
        }
    });

    const events = [];
    let current = null;

    unfolded.forEach(line=>{

        if(line==="BEGIN:VEVENT"){
            current = {};
            return;
        }

        if(line==="END:VEVENT"){
            if(current && current.start) events.push(current);
            current = null;
            return;
        }

        if(!current) return;

        const colonIdx = line.indexOf(":");
        if(colonIdx<0) return;

        const key = line.slice(0,colonIdx).split(";")[0];
        const value = line.slice(colonIdx+1).trim();

        if(key==="DTSTART") current.start = value;
        else if(key==="DTEND") current.end = value;
        else if(key==="SUMMARY") current.summary = unescapeICSText(value);
        else if(key==="LOCATION") current.location = unescapeICSText(value);
        else if(key==="URL") current.url = unescapeICSText(value);
        else if(key==="DESCRIPTION") current.description = unescapeICSText(value);
    });

    return events;
}

function icsDateToDayNumber(dateInfo){
    const eventDate = new Date(dateInfo.year,dateInfo.month-1,dateInfo.day);
    const base = new Date(startDate+"T00:00:00");
    return Math.round((eventDate-base)/86400000) + 1;
}

function importICSEvents(text){

    if(!startDate){
        showToast(
            "Ajoute une date de départ (Profil → Dates & devise) avant d'importer un calendrier .ics.",
            {type:"error",duration:6000}
        );
        return;
    }

    const events = parseICS(text);

    if(!events.length){
        showToast("Aucune réservation trouvée dans ce calendrier.",{type:"error"});
        return;
    }

    let imported = 0;
    let skipped = 0;
    let maxDay = dayCount;

    events.forEach(event=>{

        const startInfo = parseICSDate(event.start);
        if(!startInfo){ skipped++; return; }

        const dayNumber = icsDateToDayNumber(startInfo);
        if(dayNumber<1 || dayNumber>30){ skipped++; return; }

        if(!planning[dayNumber]){
            planning[dayNumber] = { matin:[], midi:[], apresMidi:[], soir:[], title:"" };
        }

        if(dayNumber > maxDay) maxDay = dayNumber;

        const time = startInfo.hour!==null
            ? `${String(startInfo.hour).padStart(2,"0")}:${String(startInfo.minute).padStart(2,"0")}`
            : null;

        let note = null;
        const endInfo = event.end ? parseICSDate(event.end) : null;
        if(endInfo){
            note = `Jusqu'au ${String(endInfo.day).padStart(2,"0")}/${String(endInfo.month).padStart(2,"0")}/${endInfo.year}`;
        }

        let reservationLink = event.url || null;
        if(!reservationLink && event.description){
            const urlMatch = event.description.match(/https?:\/\/\S+/i);
            if(urlMatch) reservationLink = urlMatch[0];
        }

        planning[dayNumber].matin.push({
            name: event.summary || "Réservation importée",
            type: "Logement",
            address: event.location || "",
            price: null,
            travelTime: null,
            time,
            duration: null,
            note,
            reservationLink
        });

        imported++;
    });

    if(imported>0){

        if(maxDay > dayCount){
            dayCount = maxDay;
            refreshEndDateDisplay();
            localStorage.setItem("dayCount",dayCount);
        }

        sanitizePlanningSlots();
        savePlanning();
        createTabs();
        renderActivities();
    }

    showToast(
        `${imported} réservation(s) importée(s).`
        + (skipped>0 ? ` ${skipped} ignorée(s) (date illisible).` : ""),
        {type: skipped>0 ? undefined : "success", duration:6000}
    );
}

/* --- Export du planning vers le calendrier (.ics) ---
   Symétrique de parseICS()/importICSEvents() ci-dessus : un VEVENT par
   activité, une heure de fin par défaut d'1h faute de pouvoir analyser
   fiablement le champ "Durée" (texte libre, ex. "2h", "45 min" — pas de
   format assez régulier pour en déduire des minutes sans risquer de mal
   l'interpréter).

   CAPACITOR : ce fichier .ics doit être téléchargé puis ouvert
   manuellement par l'utilisateur pour être importé dans son calendrier —
   c'est la seule option côté web. Un plugin natif d'écriture calendrier
   (ex. @capacitor-community/calendar) permettrait d'ajouter directement
   chaque activité au calendrier du téléphone, sans ce détour. */

function escapeICSText(text){
    return String(text)
        .replace(/\\/g,"\\\\")
        .replace(/;/g,"\\;")
        .replace(/,/g,"\\,")
        .replace(/\n/g,"\\n");
}

function formatICSDateTime(dateObj){
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth()+1).padStart(2,"0");
    const d = String(dateObj.getDate()).padStart(2,"0");
    const hh = String(dateObj.getHours()).padStart(2,"0");
    const mi = String(dateObj.getMinutes()).padStart(2,"0");
    return `${y}${m}${d}T${hh}${mi}00`;
}

const ICS_DEFAULT_SLOT_HOURS = { matin:9, midi:12, apresMidi:15, soir:19 };

/* Source de vérité unique pour un événement de calendrier — réutilisée par
   l'export .ics (buildPlanningICS()) ET l'ajout direct au calendrier natif
   du téléphone (addPlanningToNativeCalendar(), voir plus bas près de
   exportIcsBtn). */
function buildPlanningEventList(){

    const events = [];
    const sections = ["matin","midi","apresMidi","soir"];

    Object.keys(planning)
    .map(d=>parseInt(d,10))
    .sort((a,b)=>a-b)
    .forEach(day=>{

        const dayDate = dateForDay(day);
        if(!dayDate) return;

        sections.forEach(slot=>{
            (planning[day][slot] || []).forEach(activity=>{

                const start = new Date(dayDate);
                if(activity.time && /^\d{1,2}:\d{2}$/.test(activity.time)){
                    const [h,mi] = activity.time.split(":").map(Number);
                    start.setHours(h,mi,0,0);
                }else{
                    start.setHours(ICS_DEFAULT_SLOT_HOURS[slot] || 9,0,0,0);
                }

                const end = new Date(start);
                end.setHours(end.getHours()+1);

                events.push({
                    id: activity.id || null,
                    title: `${activityIconPrefix(activity.type)}${activity.name}`,
                    start,
                    end,
                    location: activity.address || "",
                    url: activity.reservationLink || "",
                    description: activity.note || ""
                });
            });
        });
    });

    return events;
}

function buildPlanningICS(){

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Tabi Go//FR",
        "CALSCALE:GREGORIAN"
    ];

    const events = buildPlanningEventList();

    events.forEach((event,i)=>{
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${event.id || `evt-${i}`}@planification-vacances`);
        lines.push(`DTSTAMP:${formatICSDateTime(new Date())}Z`);
        lines.push(`DTSTART:${formatICSDateTime(event.start)}`);
        lines.push(`DTEND:${formatICSDateTime(event.end)}`);
        lines.push(`SUMMARY:${escapeICSText(event.title)}`);
        if(event.location) lines.push(`LOCATION:${escapeICSText(event.location)}`);
        if(event.url) lines.push(`URL:${escapeICSText(event.url)}`);
        if(event.description) lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
        lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");
    return { ics: lines.join("\r\n"), eventCount: events.length };
}

/* --- Notifications locales (2026-09-05) ---
   @capacitor/local-notifications : rappel ACTIVITY_REMINDER_MINUTES_BEFORE
   avant une activité planifiée + une notification le matin du jour de
   départ. syncScheduledNotifications() annule TOUT ce qui est en attente
   puis reprogramme entièrement depuis l'état courant de buildPlanningEventList()
   plutôt que de suivre chaque ajout/suppression individuellement — plus
   simple et sans risque d'oubli (voyage restauré, jour supprimé, activité
   déplacée...), même esprit que backupToGoogleDrive()/syncTripStepsOnce()
   qui repartent toujours de zéro depuis l'état courant. Pas de demande
   d'alarme exacte (SCHEDULE_EXACT_ALARM, permission spéciale à accorder
   manuellement sur Android 12+) : le plugin retombe proprement sur une
   alarme approximative si l'exact n'est pas dispo, tolérable pour un
   simple rappel. */

const ACTIVITY_REMINDER_MINUTES_BEFORE = 30;
const DEPARTURE_NOTIFICATION_ID = 999999001;

function nativeNotificationsAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications);
}

// Identifiant 32 bits stable requis par le plugin (int Android) — dérivé
// de n'importe quelle chaîne (id d'activité, ou repli titre+horodatage
// pour les rares activités sans id stable).
function stableNotificationId(str){
    let hash = 0;
    for(let i=0;i<str.length;i++){
        hash = ((hash<<5)-hash+str.charCodeAt(i))|0;
    }
    return Math.abs(hash) || 1;
}

async function syncScheduledNotifications(){

    if(!nativeNotificationsAvailable()) return;

    const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;

    try{
        const { notifications: pending } = await LocalNotifications.getPending();
        if(pending.length>0){
            await LocalNotifications.cancel({notifications:pending.map(n=>({id:n.id}))});
        }

        const now = Date.now();
        const toSchedule = [];

        buildPlanningEventList().forEach(event=>{
            const notifyAt = new Date(event.start.getTime()-ACTIVITY_REMINDER_MINUTES_BEFORE*60000);
            if(notifyAt.getTime()<=now) return;
            toSchedule.push({
                id: stableNotificationId(event.id || (event.title+event.start.getTime())),
                title: `Dans ${ACTIVITY_REMINDER_MINUTES_BEFORE} min : ${event.title}`,
                body: event.location || "Ouvre Tabi Go pour voir les détails.",
                schedule: { at:notifyAt, allowWhileIdle:true }
            });
        });

        if(startDate){
            const departureAt = new Date(startDate+"T08:00:00");
            if(departureAt.getTime()>now){
                toSchedule.push({
                    id: DEPARTURE_NOTIFICATION_ID,
                    title: "🌴 C'est le grand départ !",
                    body: `${tripName || "Ton voyage"} commence aujourd'hui.`,
                    schedule: { at:departureAt, allowWhileIdle:true }
                });
            }
        }

        if(toSchedule.length>0){
            await LocalNotifications.schedule({notifications:toSchedule});
        }
    }catch(err){
        console.error("Programmation des notifications impossible :",err);
    }
}

/* Débouncée (comme pushToSync()) : savePlanning() peut être appelée en
   rafale (glisser-déposer, import en masse...) — pas besoin de recalculer
   tout le planning à chaque appel individuel. */
let notificationsSyncTimer = null;
function scheduleNotificationsSyncDebounced(){
    if(!nativeNotificationsAvailable()) return;
    clearTimeout(notificationsSyncTimer);
    notificationsSyncTimer = setTimeout(syncScheduledNotifications,2000);
}

/* --- Préparation widget écran d'accueil (2026-09-05) ---
   Voir le commentaire CAPACITOR "Widget écran d'accueil" tout en haut du
   fichier : aucun widget visuel construit ici (nécessiterait un vrai
   composant Android natif), seulement les données tenues à jour pour
   qu'un futur AppWidgetProvider n'ait qu'à les lire plutôt qu'à recalculer
   "prochaine activité"/"jours restants" une seconde fois côté Java. */
const HOME_WIDGET_DATA_KEY = "homeWidgetData";

function updateHomeWidgetData(){

    if(!isNativeApp()) return;

    /* Tout le corps dans un try : appelée dès le boot (voir plus bas), donc
       AVANT que startDate/tripName/TRIP_TIMEZONE_KEY (via getTripNow(),
       tous déclarés bien plus loin dans le fichier) n'existent au tout
       premier chargement — même famille de TDZ que syncTripStepsOnce()
       juste au-dessus. Échoue silencieusement une fois, se répare tout
       seul au prochain vrai appel (savePlanning(), visibilitychange). */
    try{
        const now = Date.now();
        const nextEvent = buildPlanningEventList()
            .filter(event=>event.start.getTime()>now)
            .sort((a,b)=>a.start-b.start)[0] || null;

        let daysRemaining = null;
        if(startDate){
            const today = getTripNow();
            today.setHours(0,0,0,0);
            const base = new Date(startDate+"T00:00:00");
            if(!isNaN(base.getTime())) daysRemaining = Math.round((base-today)/(1000*60*60*24));
        }

        localStorage.setItem(HOME_WIDGET_DATA_KEY,JSON.stringify({
            tripName: tripName || "",
            daysRemaining,
            nextActivityTitle: nextEvent ? nextEvent.title : null,
            nextActivityAt: nextEvent ? nextEvent.start.getTime() : null,
            updatedAt: now
        }));
    }catch(err){
        console.error("Mise à jour des données du widget impossible :",err);
    }
}

// Même accroche que le podomètre/Drive : boot + retour au premier plan.
if(isNativeApp()){
    syncScheduledNotifications();
    updateHomeWidgetData();
    document.addEventListener("visibilitychange",()=>{
        if(document.visibilityState==="visible"){
            syncScheduledNotifications();
            updateHomeWidgetData();
        }
    });
}

const exportIcsBtn = document.getElementById("exportIcsBtn");

exportIcsBtn.addEventListener("click",()=>{

    if(!startDate){
        showToast(
            "Ajoute une date de départ (Dates & devise) avant d'exporter vers le calendrier.",
            {type:"error",duration:6000}
        );
        return;
    }

    const { ics, eventCount } = buildPlanningICS();

    if(eventCount===0){
        showToast("Aucune activité à exporter.",{type:"error"});
        return;
    }

    const blob = new Blob([ics],{type:"text/calendar;charset=utf-8;"});
    downloadBlobToGallery(blob,`planning_${tripName || "vacances"}.ics`.replace(/\s+/g,"_"));

    showToast(`${eventCount} activité(s) exportée(s) vers le calendrier.`,{type:"success"});
});

/* CAPACITOR (2026-09-05, résolu) : @ebarooni/capacitor-calendar ajoute les
   activités DIRECTEMENT dans le calendrier du téléphone (createEvent(),
   pas de dialogue) au lieu de générer un .ics que l'utilisateur doit
   encore ouvrir manuellement. buildPlanningEventList() ci-dessus reste la
   SEULE source de vérité du contenu, partagée avec l'export .ics — les
   deux chemins restent proposés (voir le menu Exporter juste en dessous),
   .ics gardant son utilité (partage vers un autre calendrier/appareil). */
function nativeCalendarAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorCalendar);
}

let defaultCalendarIdPromise = null;

function getDefaultCalendarId(){
    if(!defaultCalendarIdPromise){
        defaultCalendarIdPromise = (async()=>{
            const { result } = await window.Capacitor.Plugins.CapacitorCalendar.getDefaultCalendar({useFallbackCalendar:true});
            return result ? result.id : null;
        })();
    }
    return defaultCalendarIdPromise;
}

async function addPlanningToNativeCalendar(){

    if(!startDate){
        showToast(
            "Ajoute une date de départ (Dates & devise) avant d'ajouter au calendrier.",
            {type:"error",duration:6000}
        );
        return;
    }

    const events = buildPlanningEventList();
    if(events.length===0){
        showToast("Aucune activité à ajouter.",{type:"error"});
        return;
    }

    showConfirmModal(
        `Ajouter ${events.length} activité(s) au calendrier du téléphone ? Les ajouts déjà faits précédemment ne sont pas retirés automatiquement — supprime-les à la main dans l'appli Calendrier si tu réessaies.`,
        async()=>{

            const Calendar = window.Capacitor.Plugins.CapacitorCalendar;

            try{
                const { result: permission } = await Calendar.requestFullCalendarAccess();
                if(permission!=="granted"){
                    showToast("Permission calendrier refusée.",{type:"error"});
                    return;
                }
            }catch(err){
                console.error("Permission calendrier impossible :",err);
                showToast("Permission calendrier impossible à demander.",{type:"error"});
                return;
            }

            const calendarId = await getDefaultCalendarId();
            let added = 0;

            for(const event of events){
                try{
                    await Calendar.createEvent({
                        title: event.title,
                        startDate: event.start.getTime(),
                        endDate: event.end.getTime(),
                        location: event.location || undefined,
                        description: event.description || undefined,
                        url: event.url || undefined,
                        calendarId: calendarId || undefined
                    });
                    added++;
                }catch(err){
                    console.error("Événement calendrier non ajouté :",err);
                }
            }

            if(added===0){
                showToast("Aucun événement n'a pu être ajouté au calendrier.",{type:"error"});
            }else if(added<events.length){
                showToast(`${added}/${events.length} activité(s) ajoutée(s) au calendrier (le reste a échoué).`,{type:"error",duration:6000});
            }else{
                showToast(`${added} activité(s) ajoutée(s) au calendrier du téléphone.`,{type:"success"});
            }
        }
    );
}

const exportBtn = document.getElementById("exportBtn");
const tripBookBtn = document.getElementById("tripBookBtn");

exportBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const items = [
        {icon:"🖨️",label:"PDF (planning)",action:()=>printBtn.click()},
        {icon:"📖",label:"Carnet de voyage (PDF)",action:()=>tripBookBtn.click()},
        {icon:"🗓️",label:"Calendrier (.ics)",action:()=>exportIcsBtn.click()},
        {icon:"💾",label:"Mes données (JSON)",action:()=>exportDataBtn.click()}
    ];
    // CAPACITOR (2026-09-05) : natif seulement, voir addPlanningToNativeCalendar()
    // juste au-dessus — pas de sens sur web/PWA (pas de plugin).
    if(nativeCalendarAvailable()){
        items.push({icon:"📅",label:"Ajouter au calendrier du téléphone",action:addPlanningToNativeCalendar});
    }
    // CAPACITOR (2026-09-05) : natif seulement, voir connectGoogleDrive()
    // près de exportDataBtn — pas de sens sur web/PWA (pas de plugin).
    if(isNativeApp()){
        items.push({
            icon:"☁️",
            label: isDriveConnected() ? "Sauvegarder sur Drive" : "Connecter Google Drive",
            action: ()=> isDriveConnected() ? backupToGoogleDrive() : connectGoogleDrive()
        });
    }
    toggleChoicePopover(exportBtn,items);
});

const importIcsBtn = document.getElementById("importIcsBtn");
const importIcsFile = document.getElementById("importIcsFile");

importIcsBtn.addEventListener("click",()=>{

    const url = prompt(
        "Colle le lien de ton calendrier .ics (Airbnb, etc.), ou laisse vide pour choisir un fichier à la place :"
    );

    if(url===null) return;

    if(url.trim()){
        fetchICSFromURL(url.trim());
    }else{
        importIcsFile.click();
    }
});

importIcsFile.addEventListener("change",()=>{

    const file = importIcsFile.files[0];
    if(!file) return;

    const reader = new FileReader();

    reader.onload = evt=>{
        importICSEvents(evt.target.result);
        importIcsFile.value = "";
    };

    reader.readAsText(file);
});

async function fetchICSFromURL(url){

    try{

        const response = await fetchWithTimeout(url,10000);

        if(!response.ok){
            throw new Error("Réponse HTTP "+response.status);
        }

        const text = await response.text();
        importICSEvents(text);

    }catch(err){
        console.error("Import .ics par lien impossible :",err);
        showToast(
            "Impossible de récupérer ce calendrier directement (le service peut bloquer l'accès). "
            + "Télécharge le fichier .ics puis réessaie en choisissant un fichier.",
            {type:"error",duration:7000}
        );
    }
}

/* --- Importer une réservation depuis un texte collé ---
   Pas un parseur universel fiable (le texte d'un email varie trop d'un
   service à l'autre) : extraction "au mieux" (nom, date, heure, lien),
   puis pré-remplissage du formulaire d'activité existant pour relecture/
   correction avant validation — jamais d'ajout silencieux sans passer par
   la review humaine du formulaire habituel. */

const pasteImportBtn = document.getElementById("pasteImportBtn");
const pasteImportModal = document.getElementById("pasteImportModal");
const pasteImportTextarea = document.getElementById("pasteImportTextarea");
const pasteImportCancelBtn = document.getElementById("pasteImportCancelBtn");
const pasteImportAnalyzeBtn = document.getElementById("pasteImportAnalyzeBtn");

const PASTE_IMPORT_MONTHS = {
    "janvier":0,"février":1,"fevrier":1,"mars":2,"avril":3,"mai":4,"juin":5,
    "juillet":6,"août":7,"aout":7,"septembre":8,"octobre":9,
    "novembre":10,"décembre":11,"decembre":11
};

function dayNumberForDate(dateObj){
    if(!startDate) return null;
    const start = new Date(startDate+"T00:00:00");
    if(isNaN(start)) return null;
    const diffDays = Math.round((dateObj - start) / 86400000) + 1;
    if(diffDays>=1 && diffDays<=dayCount) return diffDays;
    return null;
}

function parseReservationText(text){

    const result = { name:"", time:"", link:"", day:null };

    const urlMatch = text.match(/https?:\/\/[^\s)>\]]+/i);
    if(urlMatch) result.link = urlMatch[0];

    const timeMatch = text.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/);
    if(timeMatch) result.time = `${timeMatch[1].padStart(2,"0")}:${timeMatch[2]}`;

    let dateObj = null;

    let m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if(m) dateObj = new Date(+m[1], +m[2]-1, +m[3]);

    if(!dateObj){
        m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
        if(m) dateObj = new Date(+m[3], +m[2]-1, +m[1]);
    }

    if(!dateObj){
        const monthPattern = Object.keys(PASTE_IMPORT_MONTHS).join("|");
        const re = new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4})\\b`,"i");
        m = text.match(re);
        if(m) dateObj = new Date(+m[3], PASTE_IMPORT_MONTHS[m[2].toLowerCase()], +m[1]);
    }

    if(dateObj && !isNaN(dateObj)) result.day = dayNumberForDate(dateObj);

    const firstLine = text.split("\n").map(l=>l.trim()).find(Boolean);
    if(firstLine) result.name = firstLine.slice(0,80);

    return result;
}

pasteImportBtn.addEventListener("click",()=>{
    optionsMenuPanel.hidden = true;
    pasteImportTextarea.value = "";
    pasteImportModal.hidden = false;
    pasteImportTextarea.focus();
});

pasteImportCancelBtn.addEventListener("click",()=>{
    pasteImportModal.hidden = true;
});

/* Point d'entrée partagé pour tout flux qui produit du texte à analyser en
   réservation — le collage de texte ci-dessous, et le scan de QR code
   (voir plus bas) : même parsing, même pré-remplissage du formulaire. */
function applyParsedReservationToForm(parsed){

    closeAllFullscreenViews();
    setActiveMainTab("planning");

    if(parsed.day){
        currentDay = parsed.day;
        document.getElementById("daySelect").value = currentDay;
        renderTabs();
        renderActivities();
    }

    closeFormDrawer();

    document.getElementById("activityName").value = parsed.name;
    document.getElementById("activityTime").value = parsed.time;
    document.getElementById("activityReservationLink").value = parsed.link;

    openFormDrawer();

    showToast(
        parsed.day
            ? "Champs pré-remplis — vérifie avant d'ajouter."
            : "Champs pré-remplis, mais la date n'a pas été reconnue — vérifie le jour et les champs avant d'ajouter.",
        {duration:5000}
    );
}

pasteImportAnalyzeBtn.addEventListener("click",()=>{

    const text = pasteImportTextarea.value.trim();

    if(!text){
        showToast("Colle d'abord le texte de ta confirmation.",{type:"error"});
        return;
    }

    const parsed = parseReservationText(text);
    pasteImportModal.hidden = true;
    applyParsedReservationToForm(parsed);
});

/* --- Scanner de QR code ---
   jsQR vendorisé au curl (voir vendor/jsQR.js) plutôt que l'API web
   BarcodeDetector, dont le support navigateur est trop inégal pour s'y
   fier. Réutilise parseReservationText()/applyParsedReservationToForm() :
   un QR scanné suit exactement le même chemin qu'un texte collé, la
   plupart des QR de réservation encodant une URL ou un texte de
   confirmation.
   CAPACITOR (plugin réel ajouté 2026-09-05) : @capacitor-mlkit/barcode-
   scanning prend le relais quand disponible — sa méthode scan() ouvre une
   interface native complète prête à l'emploi (même famille que
   Camera.takePhoto()), plus rapide/fiable en conditions réelles (angle,
   distance, reflets) que la boucle jsQR ci-dessous. Sur Android, scan() ne
   demande pas la permission caméra mais nécessite le module Google
   Barcode Scanner (téléchargé à la demande, voir scanQrNative()). jsQR
   reste utilisé tel quel sur web/PWA, et en repli si le plugin natif
   échoue pour une raison quelconque. */
function handleScannedQrValue(value){

    /* Le QR de synchronisation encode maintenant une vraie URL
       (?sync=CODE, voir renderInlineSyncQr() plus bas) — pour que la
       caméra native du téléphone sache aussi quoi en faire (avant, un
       préfixe "planvac-sync:" arbitraire faisait échouer le scan natif
       avec "aucune application ne peut utiliser ce code"). new URL() lève
       sur du texte de réservation normal (pas une URL) : capturé, on
       retombe simplement sur le parsing habituel. */
    let scannedSyncCode = null;
    try{
        scannedSyncCode = new URL(value).searchParams.get("sync");
    }catch(err){}

    if(scannedSyncCode){
        syncCodeInput.value = scannedSyncCode.trim().toUpperCase();
        syncJoinBtn.click();
        return;
    }

    applyParsedReservationToForm(parseReservationText(value));
}

function nativeBarcodeScanAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner);
}

async function scanQrNative(){

    const BarcodeScanner = window.Capacitor.Plugins.BarcodeScanner;

    try{
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if(!available){
            showToast("Installation du module de scan…",{type:"success",duration:4000});
            await BarcodeScanner.installGoogleBarcodeScannerModule();
        }

        const { barcodes } = await BarcodeScanner.scan();

        if(!barcodes || barcodes.length===0) return; // annulation silencieuse, pas une erreur

        triggerHaptic(20);
        handleScannedQrValue(barcodes[0].rawValue || barcodes[0].displayValue || "");
    }catch(err){
        console.error("Scan natif indisponible, repli sur le scanner intégré :",err);
        await startQrScanFallback();
    }
}

const qrScanBtn = document.getElementById("qrScanBtn");
const qrScanView = document.getElementById("qrScanView");
const qrScanPreview = document.getElementById("qrScanPreview");
const qrScanCanvas = document.getElementById("qrScanCanvas");
const qrScanCloseBtn = document.getElementById("qrScanCloseBtn");

let qrScanStream = null;
let qrScanLoopId = null;

function stopQrScan(){
    if(qrScanLoopId){
        cancelAnimationFrame(qrScanLoopId);
        qrScanLoopId = null;
    }
    if(qrScanStream){
        qrScanStream.getTracks().forEach(track=>track.stop());
        qrScanStream = null;
    }
    qrScanView.hidden = true;
}

function qrScanFrame(){

    if(qrScanPreview.readyState===qrScanPreview.HAVE_ENOUGH_DATA){

        qrScanCanvas.width = qrScanPreview.videoWidth;
        qrScanCanvas.height = qrScanPreview.videoHeight;

        // willReadFrequently : getImageData() est appelé à chaque frame,
        // ce mode évite l'aller-retour GPU->CPU coûteux à chaque lecture.
        const ctx = qrScanCanvas.getContext("2d",{willReadFrequently:true});
        ctx.drawImage(qrScanPreview,0,0,qrScanCanvas.width,qrScanCanvas.height);

        const imageData = ctx.getImageData(0,0,qrScanCanvas.width,qrScanCanvas.height);
        const code = jsQR(imageData.data,imageData.width,imageData.height);

        if(code && code.data){
            triggerHaptic(20);
            stopQrScan();
            handleScannedQrValue(code.data);
            return;
        }
    }

    qrScanLoopId = requestAnimationFrame(qrScanFrame);
}

async function startQrScanFallback(){

    if(typeof jsQR!=="function"){
        showToast("Le module de scan n'a pas pu être chargé.",{type:"error"});
        return;
    }

    try{
        qrScanStream = await navigator.mediaDevices.getUserMedia({
            video:{ facingMode:"environment" }
        });
        qrScanPreview.srcObject = qrScanStream;
        qrScanView.hidden = false;
        qrScanLoopId = requestAnimationFrame(qrScanFrame);
    }catch(err){
        console.error("Caméra inaccessible pour le scan QR :",err);
        showToast(
            `Impossible d'accéder à la caméra pour scanner un QR code (${err.name || err.message || "erreur inconnue"}).`,
            {type:"error",duration:6000}
        );
    }
}

async function startQrScan(){
    if(nativeBarcodeScanAvailable()){
        await scanQrNative();
        return;
    }
    await startQrScanFallback();
}

qrScanBtn.addEventListener("click",()=>{
    optionsMenuPanel.hidden = true;
    startQrScan();
});

qrScanCloseBtn.addEventListener("click",stopQrScan);

/* --- Bascule Live Server (WiFi maison) ↔ version en ligne ---
   Simple lien de navigation entre les deux origines (chacune a son propre
   localStorage/service worker, la synchro Firebase existante réconcilie
   les données si le même code de synchro est actif des deux côtés). */

const LIVE_SERVER_URL = "http://192.168.1.118:5500/Planning_v1.0.html";
const GITHUB_PAGES_URL = "https://julienbruwaert1-sys.github.io/planning-vacances/";

const switchServerBtn = document.getElementById("switchServerBtn");
const switchServerLabel = document.getElementById("switchServerLabel");

const isOnLiveServer = location.hostname === "192.168.1.118";

/* Masqué à la demande de l'utilisateur (2026-08-30) — code et constantes
   conservés (utile pour le dev), juste retiré du menu. Toujours pertinent de
   le garder caché dans une appli empaquetée (Capacitor) : il n'y a qu'une
   seule origine, pas de Live Server/GitHub Pages à choisir. */
switchServerBtn.hidden = true;

switchServerLabel.textContent = isOnLiveServer
    ? "Passer à la version en ligne"
    : "Passer à Live Server (WiFi maison)";

switchServerBtn.addEventListener("click",()=>{
    location.href = isOnLiveServer ? GITHUB_PAGES_URL : LIVE_SERVER_URL;
});

document.getElementById("serverOriginBadge").textContent =
    isOnLiveServer ? "📡 Live Server (WiFi maison)" : "🌐 Version en ligne";

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
                promptImportRowsDestination(rows);
            }

        }catch(err){
            showToast(
                "Impossible de lire ce fichier. Vérifie qu'il "
                + "contient bien les colonnes : Jour, Créneau, "
                + "Nom, Type, Adresse.",
                {type:"error",duration:6000}
            );
        }

        }).catch(()=>{
            showToast(
                "Impossible de charger le module d'import "
                + "(vérifie ta connexion internet).",
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
    }else if(/\.ics$/i.test(file.name)){
        const reader = new FileReader();
        reader.onload = evt=>{
            importICSEvents(evt.target.result);
            importFile.value = "";
        };
        reader.readAsText(file);
    }else{
        handleImportFile(e);
    }
});

templateBtn.addEventListener("click",()=>{

    /* Une colonne par champ que importRows() sait vraiment lire (voir ses
       appels à getField() juste au-dessus) — le modèle avait pris du
       retard : Heure_conseillee/Duree/Note/Lien_reservation/Jour_titre
       existent depuis un moment côté import (l'import .ics/texte les
       remplit déjà) mais n'apparaissaient jamais dans ce fichier
       d'exemple, donc personne ne savait qu'on pouvait les remplir à la
       main. Jour_titre ne compte qu'une fois par jour (la première ligne
       non vide gagne, voir importRows()) — inutile de la répéter sur
       chaque ligne du même jour. */
    const csv =
    "Jour;Créneau;Nom;Type;Adresse;Prix;Trajet;Heure_conseillee;Duree;Note;Lien_reservation;Jour_titre\n"
    + "1;matin;Visite Tour Eiffel;Visite;Champ de Mars, Paris;28;15;09:00;2h;"
    + "Réserver le créneau à l'avance;https://tickets.toureiffel.paris;Arrivée à Paris\n"
    + "1;midi;Déjeuner Café de Paris;Restaurant;Champs-Élysées, Paris;35;10;12:30;1h30;;;\n"
    + "1;soir;Hôtel du Centre;Logement;;120;;20:00;;Check-in à partir de 15h;"
    + "https://booking.com/hotel-du-centre;\n"
    + "2;apresMidi;Musée du Louvre;Musée;Rue de Rivoli, Paris;22;20;14:00;3h;"
    + "Fermé le mardi;https://www.louvre.fr/billets;Journée musées\n";

    const blob = new Blob(
        ["\uFEFF"+csv],
        {type:"text/csv;charset=utf-8;"}
    );

    downloadBlobToGallery(blob,"modele_planning.csv");
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

/* Pays de destination, éditable après la création du voyage (Dates &
   devise → Destination) — décorrélé de appIconChoice (icône de l'app,
   réglable séparément dans Options) même si les deux partagent la même
   liste de pays et étaient liés au moment de la création du voyage. */
const tripCountrySelect = document.getElementById("tripCountrySelect");

const tripCountryPlaceholder = document.createElement("option");
tripCountryPlaceholder.value = "";
tripCountryPlaceholder.textContent = "Non précisé";
tripCountrySelect.appendChild(tripCountryPlaceholder);

Object.keys(APP_ICONS).forEach(key=>{
    if(key==="default") return;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = APP_ICONS[key].label;
    tripCountrySelect.appendChild(opt);
});

tripCountrySelect.value = tripCountry;

tripCountrySelect.addEventListener("change",()=>{
    tripCountry = tripCountrySelect.value;
    localStorage.setItem(TRIP_COUNTRY_KEY,tripCountry);
    pushToSync();
});

let welcomeIconChoice = "default";

let welcomeParticipants = [];

const welcomeParticipantsList = document.getElementById("welcomeParticipantsList");
const welcomeParticipantInput = document.getElementById("welcomeParticipantInput");
const welcomeAddParticipantBtn = document.getElementById("welcomeAddParticipantBtn");

function renderWelcomeParticipants(){

    welcomeParticipantsList.textContent = "";

    welcomeParticipants.forEach((name,index)=>{

        const row = document.createElement("div");
        row.className = "tricount-participant-row";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;
        row.appendChild(nameSpan);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "tricount-remove";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label",`Supprimer ${name}`);
        removeBtn.addEventListener("click",()=>{
            welcomeParticipants.splice(index,1);
            renderWelcomeParticipants();
        });
        row.appendChild(removeBtn);

        welcomeParticipantsList.appendChild(row);
    });
}

function addWelcomeParticipant(){
    const name = welcomeParticipantInput.value.trim();
    if(!name) return;
    welcomeParticipants.push(name);
    renderWelcomeParticipants();
    welcomeParticipantInput.value = "";
    welcomeParticipantInput.focus();
}

welcomeAddParticipantBtn.addEventListener("click",addWelcomeParticipant);

welcomeParticipantInput.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
        e.preventDefault();
        addWelcomeParticipant();
    }
});

welcomeCountrySelect.addEventListener("change",()=>{

    welcomeCountrySelect.classList.remove("welcome-select-placeholder");

    const newChoice = welcomeCountrySelect.value;
    const meta = APP_ICONS[newChoice];

    showConfirmModal(
        `Utiliser « ${meta.label} » comme logo de l'application ? Ta destination sera enregistrée dans les deux cas.`,
        ()=>{
            welcomeIconChoice = newChoice;
        },
        {
            previewSrc: meta.icon512,
            confirmLabel: "Oui",
            cancelLabel: "Non",
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

        if(endDateVal===startDateVal){
            showToast("La date de retour doit être différente de la date de départ.",{type:"error"});
            return;
        }

        const diffDays = Math.round(
            (new Date(endDateVal) - new Date(startDateVal)) / 86400000
        ) + 1;

        if(diffDays<1){
            showToast("La date de retour doit être après la date de départ.",{type:"error"});
            return;
        }

        dayCountVal = diffDays;
    }

    /* Des données réelles (planning, Tricount...) peuvent déjà avoir été
       entrées avant la création officielle du voyage, via "Plus tard" —
       sans ce garde-fou, welcomeSkipped=1 sans tripCreated laissait ces
       données se glisser silencieusement dans le voyage "nouvellement
       créé", puisque le bloc de nettoyage ci-dessous ne se déclenchait
       jusqu'ici que pour "Nouveau voyage" (replacingExistingTrip). */
    const hasPriorDraftData = !replacingExistingTrip && !!localStorage.getItem(WELCOME_LATER_KEY);

    function finalizeTripCreation(){

        if(replacingExistingTrip || hasPriorDraftData){
            archiveCurrentTrip();
            currentTripId = generateId();
            localStorage.setItem(CURRENT_TRIP_ID_KEY,currentTripId);
            localStorage.removeItem(CHECKLIST_STORAGE_KEY);
            localStorage.removeItem(CHECKLIST_TEMPLATE_STATE_KEY);
            localStorage.removeItem(TRICOUNT_PARTICIPANTS_KEY);
            localStorage.removeItem(TRICOUNT_EXPENSES_KEY);
            localStorage.removeItem("startDate");
            localStorage.removeItem(TRIP_TIMEZONE_KEY);
            localStorage.setItem("vacationPlanning",JSON.stringify({}));
            /* Deux champs par voyage découverts non réinitialisés ici en
               auditant ce même point pour le podomètre (2026-09-05) — le
               nouveau voyage héritait silencieusement du verrou ET du
               compteur de pas du précédent, même bug de fond que celui
               corrigé sur restoreTrip()/buildCurrentTripSnapshot(). */
            localStorage.removeItem(TRIP_STEP_COUNT_KEY);
            localStorage.removeItem(TRIP_STEP_LAST_RAW_KEY);
            currentTripLocked = false;
            localStorage.setItem(CURRENT_TRIP_LOCKED_KEY,"0");
        }

        localStorage.setItem(TRIP_NAME_KEY,name);
        localStorage.setItem("appIconChoice",welcomeIconChoice);
        localStorage.setItem(TRIP_COUNTRY_KEY,country);
        if(startDateVal) localStorage.setItem("startDate",startDateVal);
        localStorage.setItem("dayCount",String(Math.min(30,Math.max(1,dayCountVal))));

        localStorage.setItem("baseCurrency","GBP");
        localStorage.setItem("targetCurrency",localCurrency);
        localStorage.setItem(TRIP_CREATED_KEY,"1");

        if(welcomeParticipants.length){
            const existingTricountParticipants = JSON.parse(localStorage.getItem(TRICOUNT_PARTICIPANTS_KEY)) || [];
            const combinedParticipants = existingTricountParticipants.concat(
                welcomeParticipants.map(participantName=>({id:generateId(),name:participantName}))
            );
            localStorage.setItem(TRICOUNT_PARTICIPANTS_KEY,JSON.stringify(combinedParticipants));
        }

        location.reload();
    }

    if(hasPriorDraftData){
        showConfirmModal(
            "Des données ont déjà été ajoutées avant la création officielle de ce voyage (planning, Tricount...). Elles seront archivées dans l'historique des voyages avant de démarrer ce nouveau voyage. Continuer ?",
            finalizeTripCreation
        );
        return;
    }

    finalizeTripCreation();
});

document.getElementById("welcomeLaterBtn").addEventListener("click",()=>{

    localStorage.setItem(WELCOME_LATER_KEY,"1");

    if(!localStorage.getItem("dayCount")){
        localStorage.setItem("dayCount",String(dayCount));
    }

    if(!tripName){
        tripName = "Mon voyage";
        localStorage.setItem(TRIP_NAME_KEY,tripName);
        appTitle.textContent = appTitleEmoji()+" "+tripName;
    }

    if(welcomeParticipants.length){
        tricountParticipants = tricountParticipants.concat(
            welcomeParticipants.map(participantName=>({id:generateId(),name:participantName}))
        );
        saveTricountParticipants();
        renderTricount();
    }
    welcomeParticipants = [];
    renderWelcomeParticipants();

    document.getElementById("welcomeView").hidden = true;
});

const APP_ICON_KEY = "appIconChoice";
let appIconChoice = localStorage.getItem(APP_ICON_KEY) || "default";
appIconSelect.value = appIconChoice;

let lastManifestBlobUrl = null;

function absUrl(path){
    return new URL(path,document.baseURI).href;
}

/* CAPACITOR (2026-09-05, @capawesome/capacitor-app-icon) : sur le web/PWA,
   changer le logo ne fait que régénérer le manifest.json dynamique
   ci-dessous — le navigateur garde l'icône d'installation d'origine tant
   que la PWA n'est pas désinstallée/réinstallée (limitation connue,
   irréductible côté web). En natif, applique en plus le VRAI changement
   d'icône de lancement Android via un activity-alias dédié à chaque pays
   (voir AndroidManifest.xml — un alias .default + un par pays, un seul
   activé à la fois, le plugin gère lui-même le PackageManager). "default"
   utilise resetIcon() (revient à .default) plutôt que setIcon("default")
   : c'est littéralement l'alias qui porte ce nom ici, mais resetIcon()
   reste la voie officiellement documentée par le plugin pour l'icône
   d'origine. Ignoré silencieusement si le plugin est absent (web) ou
   échoue pour une raison quelconque — jamais bloquant pour le reste de
   la fonction (le manifest web continue de se mettre à jour dans tous
   les cas). */
async function applyNativeAppIcon(key){
    if(!isNativeApp() || !(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppIcon)) return;
    try{
        const AppIconPlugin = window.Capacitor.Plugins.AppIcon;
        if(key==="default"){
            await AppIconPlugin.resetIcon();
        }else{
            await AppIconPlugin.setIcon({icon:key});
        }
    }catch(err){
        console.error("Impossible de changer l'icône native :",err);
    }
}

function applyAppIcon(key){

    const meta = APP_ICONS[key] || APP_ICONS.default;

    applyNativeAppIcon(key);

    faviconLink.href = meta.icon192;
    appleTouchIconLink.href = meta.icon512;

    const manifest = {
        name:"Tabi Go",
        short_name:"Tabi Go",
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
                isNativeApp()
                    ? "Logo mis à jour — ça peut prendre quelques secondes à s'afficher sur l'écran d'accueil."
                    : "Logo mis à jour. Désinstalle puis réinstalle l'app pour le voir sur l'écran d'accueil.",
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

/* Interrupteur visuel (2026-09-02) : icône/libellé restent fixes ("Mode
   sombre"), l'état s'affiche uniquement via aria-pressed (voir
   .menu-item-switch-track dans style.css) — contrairement à l'ancienne
   convention où le texte lui-même changeait pour "Mode clair" une fois
   activé. */
function updateThemeButton(){
    const isDark = document.body.classList.contains("dark");
    themeToggle.setAttribute("aria-pressed",String(isDark));
}

if(localStorage.getItem("theme")==="dark"){
    document.body.classList.add("dark");
}

/* Thèmes saisonniers (Noël / Forêt enchantée) : indépendants du mode clair/
   sombre ci-dessus — les deux se combinent (body.theme-noel ou
   body.theme-ghibli ET body.dark peuvent être présents en même temps), voir
   les règles correspondantes dans style.css qui prévoient toutes les
   variantes. Les deux thèmes sont mutuellement exclusifs entre eux
   (un seul choisi à la fois dans le sélecteur). */
const APP_THEME_KEY = "appTheme";
const appThemeSelect = document.getElementById("appThemeSelect");
const noelSnow = document.getElementById("noelSnow");
const ghibliLeaves = document.getElementById("ghibliLeaves");
const ghibliFireflies = document.getElementById("ghibliFireflies");
const NOEL_SNOWFLAKE_COUNT = 24;
const NOEL_SNOWFLAKE_CHARS = ["❄","❅","❆"];
const GHIBLI_LEAF_COUNT = 18;
const GHIBLI_LEAF_CHARS = ["🍃","🌿"];
const GHIBLI_FIREFLY_COUNT = 12;
const halloweenLeaves = document.getElementById("halloweenLeaves");
const halloweenWisps = document.getElementById("halloweenWisps");
const HALLOWEEN_LEAF_COUNT = 18;
const HALLOWEEN_LEAF_CHARS = ["🍁","🍂"];
const HALLOWEEN_WISP_COUNT = 10;
const sakuraPetals = document.getElementById("sakuraPetals");
const SAKURA_PETAL_COUNT = 20;
const SAKURA_PETAL_CHARS = ["🌸","❁"];
const momijiLeaves = document.getElementById("momijiLeaves");
const MOMIJI_LEAF_COUNT = 18;
const MOMIJI_LEAF_CHARS = ["🍁"];

/* Le conteneur reste vide (donc invisible) tant que le thème n'est pas
   actif — voir la note dans style.css sur .noel-snow. Chaque flocon a sa
   propre durée/délai/position aléatoires pour ne pas avoir un motif de
   chute qui se répète visiblement. */
function startNoelSnow(){
    if(noelSnow.childElementCount) return;
    for(let i=0;i<NOEL_SNOWFLAKE_COUNT;i++){
        const flake = document.createElement("span");
        flake.textContent = NOEL_SNOWFLAKE_CHARS[i%NOEL_SNOWFLAKE_CHARS.length];
        flake.style.left = `${Math.random()*100}%`;
        flake.style.fontSize = `${8+Math.random()*10}px`;
        flake.style.setProperty("--drift",`${(Math.random()*40)-20}px`);
        flake.style.animationDuration = `${8+Math.random()*8}s`;
        flake.style.animationDelay = `${Math.random()*10}s`;
        noelSnow.appendChild(flake);
    }
}

function stopNoelSnow(){
    noelSnow.textContent = "";
}

/* Même principe que les flocons de neige pour les feuilles qui tombent. */
function startGhibliLeaves(){
    if(ghibliLeaves.childElementCount) return;
    for(let i=0;i<GHIBLI_LEAF_COUNT;i++){
        const leaf = document.createElement("span");
        leaf.textContent = GHIBLI_LEAF_CHARS[i%GHIBLI_LEAF_CHARS.length];
        leaf.style.left = `${Math.random()*100}%`;
        leaf.style.fontSize = `${10+Math.random()*8}px`;
        leaf.style.setProperty("--drift",`${(Math.random()*60)-30}px`);
        leaf.style.animationDuration = `${10+Math.random()*8}s`;
        leaf.style.animationDelay = `${Math.random()*10}s`;
        ghibliLeaves.appendChild(leaf);
    }
}

function stopGhibliLeaves(){
    ghibliLeaves.textContent = "";
}

/* Lucioles : uniquement au crépuscule, donc thème Forêt ET mode sombre tous
   les deux actifs en même temps — appelée à chaque fois que l'un des deux
   change (sélecteur de thème OU bascule clair/sombre), pas seulement au
   changement de thème. */
function updateGhibliFireflies(){
    const shouldShow = document.body.classList.contains("theme-ghibli") && document.body.classList.contains("dark");
    if(!shouldShow){
        ghibliFireflies.textContent = "";
        return;
    }
    if(ghibliFireflies.childElementCount) return;
    for(let i=0;i<GHIBLI_FIREFLY_COUNT;i++){
        const firefly = document.createElement("span");
        firefly.style.top = `${20+Math.random()*60}%`;
        firefly.style.left = `${Math.random()*90+5}%`;
        firefly.style.animationDuration = `${2+Math.random()*2}s`;
        firefly.style.animationDelay = `${Math.random()*3}s`;
        ghibliFireflies.appendChild(firefly);
    }
}

/* Même principe que les feuilles Ghibli, avec des feuilles d'automne. */
function startHalloweenLeaves(){
    if(halloweenLeaves.childElementCount) return;
    for(let i=0;i<HALLOWEEN_LEAF_COUNT;i++){
        const leaf = document.createElement("span");
        leaf.textContent = HALLOWEEN_LEAF_CHARS[i%HALLOWEEN_LEAF_CHARS.length];
        leaf.style.left = `${Math.random()*100}%`;
        leaf.style.fontSize = `${10+Math.random()*8}px`;
        leaf.style.setProperty("--drift",`${(Math.random()*60)-30}px`);
        leaf.style.animationDuration = `${10+Math.random()*8}s`;
        leaf.style.animationDelay = `${Math.random()*10}s`;
        halloweenLeaves.appendChild(leaf);
    }
}

function stopHalloweenLeaves(){
    halloweenLeaves.textContent = "";
}

/* Feux follets : uniquement thème Halloween + mode sombre combinés, même
   principe que les lucioles du thème Forêt enchantée. */
function updateHalloweenWisps(){
    const shouldShow = document.body.classList.contains("theme-halloween") && document.body.classList.contains("dark");
    if(!shouldShow){
        halloweenWisps.textContent = "";
        return;
    }
    if(halloweenWisps.childElementCount) return;
    for(let i=0;i<HALLOWEEN_WISP_COUNT;i++){
        const wisp = document.createElement("span");
        wisp.style.top = `${20+Math.random()*60}%`;
        wisp.style.left = `${Math.random()*90+5}%`;
        wisp.style.animationDuration = `${3+Math.random()*2}s`;
        wisp.style.animationDelay = `${Math.random()*3}s`;
        halloweenWisps.appendChild(wisp);
    }
}

/* Même principe que les flocons/feuilles ci-dessus, pour les pétales de
   cerisier du thème Sakura. */
function startSakuraPetals(){
    if(sakuraPetals.childElementCount) return;
    for(let i=0;i<SAKURA_PETAL_COUNT;i++){
        const petal = document.createElement("span");
        petal.textContent = SAKURA_PETAL_CHARS[i%SAKURA_PETAL_CHARS.length];
        petal.style.left = `${Math.random()*100}%`;
        petal.style.fontSize = `${8+Math.random()*8}px`;
        petal.style.setProperty("--drift",`${(Math.random()*50)-25}px`);
        petal.style.animationDuration = `${8+Math.random()*7}s`;
        petal.style.animationDelay = `${Math.random()*10}s`;
        sakuraPetals.appendChild(petal);
    }
}

function stopSakuraPetals(){
    sakuraPetals.textContent = "";
}

/* Même principe pour les feuilles d'érable du thème Momiji. */
function startMomijiLeaves(){
    if(momijiLeaves.childElementCount) return;
    for(let i=0;i<MOMIJI_LEAF_COUNT;i++){
        const leaf = document.createElement("span");
        leaf.textContent = MOMIJI_LEAF_CHARS[i%MOMIJI_LEAF_CHARS.length];
        leaf.style.left = `${Math.random()*100}%`;
        leaf.style.fontSize = `${10+Math.random()*8}px`;
        leaf.style.setProperty("--drift",`${(Math.random()*60)-30}px`);
        leaf.style.animationDuration = `${9+Math.random()*8}s`;
        leaf.style.animationDelay = `${Math.random()*10}s`;
        momijiLeaves.appendChild(leaf);
    }
}

function stopMomijiLeaves(){
    momijiLeaves.textContent = "";
}

/* Le thème Néon n'a pas de particules générées en JS (contrairement aux
   trois autres) : juste un scanner lumineux + une grille en filigrane,
   tous les deux du CSS pur sur #neonScan (voir style.css) — rien à
   démarrer/arrêter ici, la visibilité suit déjà body.theme-neon. */

/* Emoji du titre et de l'icône "Ajouter une activité" : lus dans les
   fonctions qui les affectent (appTitleEmoji() est appelée à chaque endroit
   qui construit déjà le titre) plutôt que codés en dur "🌴"/"➕" à 4+
   endroits différents — un seul endroit à vérifier si un thème change. */
function appTitleEmoji(){
    if(document.body.classList.contains("theme-noel")) return "⛄";
    if(document.body.classList.contains("theme-ghibli")) return "🌳";
    if(document.body.classList.contains("theme-halloween")) return "🎃";
    if(document.body.classList.contains("theme-sakura")) return "🌸";
    if(document.body.classList.contains("theme-momiji")) return "🍁";
    if(document.body.classList.contains("theme-neon")) return "🌆";
    return "🌴";
}

function currentThemeAddIcon(){
    if(document.body.classList.contains("theme-noel")) return "⛄";
    if(document.body.classList.contains("theme-ghibli")) return "🌳";
    if(document.body.classList.contains("theme-halloween")) return "🎃";
    if(document.body.classList.contains("theme-sakura")) return "🌸";
    if(document.body.classList.contains("theme-momiji")) return "🍁";
    if(document.body.classList.contains("theme-neon")) return "🌆";
    return "➕";
}

function refreshThemeIcons(){
    if(tripName) appTitle.textContent = appTitleEmoji()+" "+tripName;
    if(!formDrawer.classList.contains("open") && !editingActivity){
        formToggleIcon.textContent = currentThemeAddIcon();
    }
}

/* Ne touche jamais formDrawer/formToggleIcon/editingActivity ici (via
   refreshThemeIcons) : ces const/let sont déclarées bien plus bas dans le
   fichier, et cette fonction est appelée dès le chargement initial, avant
   qu'elles existent (TDZ). refreshThemeIcons() est appelée séparément,
   juste après leur déclaration — voir plus bas. */
function applySelectedTheme(choice){
    document.body.classList.toggle("theme-noel",choice==="noel");
    document.body.classList.toggle("theme-ghibli",choice==="ghibli");
    document.body.classList.toggle("theme-halloween",choice==="halloween");
    document.body.classList.toggle("theme-sakura",choice==="sakura");
    document.body.classList.toggle("theme-momiji",choice==="momiji");
    document.body.classList.toggle("theme-neon",choice==="neon");
    if(choice==="noel") startNoelSnow(); else stopNoelSnow();
    if(choice==="ghibli") startGhibliLeaves(); else stopGhibliLeaves();
    if(choice==="halloween") startHalloweenLeaves(); else stopHalloweenLeaves();
    if(choice==="sakura") startSakuraPetals(); else stopSakuraPetals();
    if(choice==="momiji") startMomijiLeaves(); else stopMomijiLeaves();
    updateGhibliFireflies();
    updateHalloweenWisps();
}

appThemeSelect.value = localStorage.getItem(APP_THEME_KEY) || "default";
applySelectedTheme(appThemeSelect.value);

appThemeSelect.addEventListener("change",()=>{
    const choice = appThemeSelect.value;
    localStorage.setItem(APP_THEME_KEY,choice);
    applySelectedTheme(choice);
    refreshThemeIcons();
});

themeToggle.addEventListener("click",()=>{

    document.body.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark")
            ? "dark"
            : "light"
    );

    updateThemeButton();
    updateGhibliFireflies();
    updateHalloweenWisps();
});

/* --- Retour haptique ---
   CAPACITOR : navigator.vibrate() ne fonctionne que sur Android (Chrome/
   WebView) — jamais sur iOS (Safari/WKWebView n'implémentent pas l'API
   Vibration, avec ou sans Capacitor). @capacitor/haptics couvrirait aussi
   iOS et donnerait des motifs plus riches (impact léger/moyen/fort,
   notification succès/erreur) au lieu d'un simple buzz minuté. */
const HAPTIC_ENABLED_KEY = "hapticEnabled";
const hapticToggle = document.getElementById("hapticToggle");
const hapticSupported = !!navigator.vibrate;

let hapticEnabled = localStorage.getItem(HAPTIC_ENABLED_KEY)!==null
    ? localStorage.getItem(HAPTIC_ENABLED_KEY)==="1"
    : true;

// Même convention "interrupteur visuel" que updateThemeButton() ci-dessus.
function updateHapticButton(){
    hapticToggle.setAttribute("aria-pressed",String(hapticEnabled));
}

function triggerHaptic(pattern){
    if(!hapticSupported || !hapticEnabled) return;
    navigator.vibrate(pattern);
}

if(!hapticSupported){
    hapticToggle.hidden = true;
}else{
    updateHapticButton();
    hapticToggle.addEventListener("click",()=>{
        hapticEnabled = !hapticEnabled;
        localStorage.setItem(HAPTIC_ENABLED_KEY,hapticEnabled ? "1" : "0");
        updateHapticButton();
        if(hapticEnabled) triggerHaptic(15);
    });
}

/* --- Verrou par voyage (mockup approuvé 2026-09-04) ---
   "Verrou simple" explicite, pas un vrai chiffrement : un seul code PIN
   PARTAGÉ (pas un par voyage) hashé en SHA-256 via Web Crypto, jamais
   stocké en clair — n'importe qui avec un accès direct au stockage de
   l'appareil contourne cette protection (dit explicitement dans le hint
   HTML). unlockedTripIds est SESSION UNIQUEMENT (jamais persisté) : se
   réinitialise à chaque rechargement, donc chaque lancement frais de
   l'app (ou réouverture d'un voyage archivé) redemande le code.
   Le volet biométrique existe déjà dans le DOM (#tripLockBiometricPanel)
   mais reste dormant tant qu'aucun plugin Capacitor de biométrie n'existe
   (isNativeApp() est toujours faux hors Android) — c'est la limite de
   scope explicite de "prepare ce que tu peux" : tout le reste (PIN,
   verrouillage par voyage, l'historique, l'UI) est réellement fonctionnel
   dès aujourd'hui, sur le web comme plus tard sur Android. */

const TRIP_LOCK_PIN_HASH_KEY = "tripLockPinHash";
const CURRENT_TRIP_LOCKED_KEY = "currentTripLocked";

let currentTripLocked = localStorage.getItem(CURRENT_TRIP_LOCKED_KEY)==="1";

const unlockedTripIds = new Set();

async function sha256Hex(text){
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256",data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function isTripLockPinSet(){
    return !!localStorage.getItem(TRIP_LOCK_PIN_HASH_KEY);
}

async function setTripLockPin(pin){
    localStorage.setItem(TRIP_LOCK_PIN_HASH_KEY, await sha256Hex(pin));
}

async function verifyTripLockPin(pin){
    const hash = localStorage.getItem(TRIP_LOCK_PIN_HASH_KEY);
    return !!hash && await sha256Hex(pin)===hash;
}

const tripLockView = document.getElementById("tripLockView");
const tripLockLabel = document.getElementById("tripLockLabel");
const tripLockBiometricPanel = document.getElementById("tripLockBiometricPanel");
const tripLockPinPanel = document.getElementById("tripLockPinPanel");
const tripLockPinTitle = document.getElementById("tripLockPinTitle");
const tripLockPinSub = document.getElementById("tripLockPinSub");
const tripLockPinDots = document.getElementById("tripLockPinDots");
const tripLockKeypad = document.getElementById("tripLockKeypad");
const tripLockPinBackspace = document.getElementById("tripLockPinBackspace");
const tripLockBiometricBtn = document.getElementById("tripLockBiometricBtn");
const tripLockUsePinBtn = document.getElementById("tripLockUsePinBtn");
const tripLockCancelBtn = document.getElementById("tripLockCancelBtn");

const TRIP_LOCK_PIN_LENGTH = 4;
const TRIP_LOCK_MAX_ATTEMPTS = 3;
const TRIP_LOCK_LOCKOUT_MS = 30000;

let tripLockEnteredDigits = "";
let tripLockMode = null; // "unlock" | "setup-create" | "setup-confirm" | "disable"
let tripLockFirstPin = "";
let tripLockFailedAttempts = 0;
let tripLockLockoutUntil = 0;
let tripLockOnSuccess = null;

function renderTripLockPinDots(){
    tripLockPinDots.textContent = "";
    for(let i=0;i<TRIP_LOCK_PIN_LENGTH;i++){
        const dot = document.createElement("span");
        dot.className = "pin-dot" + (i<tripLockEnteredDigits.length ? " filled" : "");
        tripLockPinDots.appendChild(dot);
    }
}

function shakeTripLockPinDots(){
    Array.from(tripLockPinDots.children).forEach(dot=>dot.classList.add("error"));
    setTimeout(()=>{
        Array.from(tripLockPinDots.children).forEach(dot=>dot.classList.remove("error"));
    },300);
}

function tripLockRemainingLockoutSeconds(){
    return Math.max(0,Math.ceil((tripLockLockoutUntil-Date.now())/1000));
}

function updateTripLockKeypadDisabled(){
    const locked = tripLockRemainingLockoutSeconds()>0;
    Array.from(tripLockKeypad.querySelectorAll(".pin-key[data-digit]")).forEach(btn=>{
        btn.disabled = locked;
    });
}

/* CAPACITOR (plugin réel ajouté 2026-09-04) : @aparajita/capacitor-
   biometric-auth — checkBiometry() fait un aller-retour natif, mis en
   cache dans cette promesse partagée (jamais relancé une fois résolu)
   pour qu'openTripLockView() puisse décider quel volet montrer sans
   redemander à chaque ouverture de l'écran. isAvailable tient compte à la
   fois du matériel ET de l'enrôlement (empreinte/visage vraiment
   configuré sur cet appareil) — un appareil natif sans biométrie
   configurée retombe donc correctement sur le PIN seul. */
let biometryCheckPromise = null;

function ensureBiometryChecked(){
    if(!isNativeApp() || !(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BiometricAuthNative)){
        return Promise.resolve(false);
    }
    if(!biometryCheckPromise){
        biometryCheckPromise = window.Capacitor.Plugins.BiometricAuthNative.checkBiometry()
            .then(result=>!!result.isAvailable)
            .catch(err=>{
                console.error("Vérification de la biométrie impossible :",err);
                return false;
            });
    }
    return biometryCheckPromise;
}

/* label : nom du voyage affiché au-dessus de l'écran. mode : "unlock"
   (ouvrir un voyage verrouillé), "setup-create"/"setup-confirm" (créer le
   PIN partagé la toute première fois), "disable" (vérifier le PIN avant de
   retirer un verrou — sinon le bouton de verrouillage lui-même
   contournerait la protection). options.cancellable=false masque le
   bouton Annuler (utilisé au démarrage pour le voyage actif : il n'y a
   nulle part où "annuler" vers). Devenue async (2026-09-04) pour attendre
   ensureBiometryChecked() — ses appelants existants n'attendaient déjà pas
   sa valeur de retour, donc rien à changer côté appel. */
async function openTripLockView(label,mode,onSuccess,options){
    options = options || {};
    tripLockLabel.textContent = label || "";
    tripLockMode = mode;
    tripLockOnSuccess = onSuccess;
    tripLockEnteredDigits = "";
    tripLockFirstPin = "";
    tripLockCancelBtn.hidden = options.cancellable===false;

    const canUseBiometric = mode==="unlock" && await ensureBiometryChecked();
    tripLockBiometricPanel.hidden = !canUseBiometric;
    tripLockPinPanel.hidden = canUseBiometric;

    if(mode==="setup-create"){
        tripLockPinTitle.textContent = "Créer un code PIN";
        tripLockPinSub.textContent = "Choisis un code à 4 chiffres pour verrouiller tes voyages.";
    }else if(mode==="setup-confirm"){
        tripLockPinTitle.textContent = "Confirme le code PIN";
        tripLockPinSub.textContent = "Retape le même code pour le confirmer.";
    }else if(mode==="disable"){
        tripLockPinTitle.textContent = "Code PIN requis";
        tripLockPinSub.textContent = "Entre le code PIN pour désactiver ce verrou.";
    }else{
        tripLockPinTitle.textContent = "Code PIN";
        tripLockPinSub.textContent = "Entre le code PIN pour ouvrir ce voyage.";
    }

    renderTripLockPinDots();
    updateTripLockKeypadDisabled();
    tripLockView.hidden = false;
}

function closeTripLockView(){
    tripLockView.hidden = true;
    tripLockMode = null;
    tripLockOnSuccess = null;
    tripLockEnteredDigits = "";
    tripLockFirstPin = "";
}

async function submitTripLockPin(){
    const pin = tripLockEnteredDigits;

    if(tripLockMode==="setup-create"){
        tripLockFirstPin = pin;
        tripLockEnteredDigits = "";
        tripLockMode = "setup-confirm";
        tripLockPinTitle.textContent = "Confirme le code PIN";
        tripLockPinSub.textContent = "Retape le même code pour le confirmer.";
        renderTripLockPinDots();
        return;
    }

    if(tripLockMode==="setup-confirm"){
        if(pin!==tripLockFirstPin){
            shakeTripLockPinDots();
            showToast("Les codes ne correspondent pas, recommence.",{type:"error"});
            tripLockEnteredDigits = "";
            tripLockFirstPin = "";
            tripLockMode = "setup-create";
            tripLockPinTitle.textContent = "Créer un code PIN";
            tripLockPinSub.textContent = "Choisis un code à 4 chiffres pour verrouiller tes voyages.";
            renderTripLockPinDots();
            return;
        }
        await setTripLockPin(pin);
        pushToSync();
        const onSuccess = tripLockOnSuccess;
        closeTripLockView();
        if(onSuccess) onSuccess();
        return;
    }

    const ok = await verifyTripLockPin(pin);
    if(ok){
        tripLockFailedAttempts = 0;
        const onSuccess = tripLockOnSuccess;
        closeTripLockView();
        if(onSuccess) onSuccess();
    }else{
        tripLockFailedAttempts++;
        shakeTripLockPinDots();
        tripLockEnteredDigits = "";
        renderTripLockPinDots();
        if(tripLockFailedAttempts>=TRIP_LOCK_MAX_ATTEMPTS){
            tripLockLockoutUntil = Date.now()+TRIP_LOCK_LOCKOUT_MS;
            tripLockFailedAttempts = 0;
            updateTripLockKeypadDisabled();
            showToast(`Trop d'essais — réessaie dans ${Math.round(TRIP_LOCK_LOCKOUT_MS/1000)} secondes.`,{type:"error",duration:4000});
            setTimeout(updateTripLockKeypadDisabled, TRIP_LOCK_LOCKOUT_MS + 100);
        }else{
            showToast("Code incorrect.",{type:"error",duration:2000});
        }
    }
}

tripLockKeypad.addEventListener("click",e=>{
    const btn = e.target.closest(".pin-key[data-digit]");
    if(!btn || btn.disabled) return;
    if(tripLockRemainingLockoutSeconds()>0) return;
    if(tripLockEnteredDigits.length>=TRIP_LOCK_PIN_LENGTH) return;
    tripLockEnteredDigits += btn.dataset.digit;
    renderTripLockPinDots();
    if(tripLockEnteredDigits.length===TRIP_LOCK_PIN_LENGTH){
        submitTripLockPin();
    }
});

tripLockPinBackspace.addEventListener("click",()=>{
    tripLockEnteredDigits = tripLockEnteredDigits.slice(0,-1);
    renderTripLockPinDots();
});

tripLockUsePinBtn.addEventListener("click",()=>{
    tripLockBiometricPanel.hidden = true;
    tripLockPinPanel.hidden = false;
});

tripLockCancelBtn.addEventListener("click",()=>{
    closeTripLockView();
});

/* CAPACITOR (plugin réel ajouté 2026-09-04, capacitor-native-biometric
   dépendait d'une trop vieille version de @capacitor/core — voir
   @aparajita/capacitor-biometric-auth, compatible Capacitor 8). Le repli
   affichant "pas encore disponible" reste en garde tout en bas : le
   volet lui-même n'est déjà montré que si ensureBiometryChecked() a
   confirmé une biométrie enrôlée (voir openTripLockView()), donc ce cas
   ne devrait normalement jamais se produire en pratique. */
tripLockBiometricBtn.addEventListener("click",async ()=>{

    if(!isNativeApp() || !(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BiometricAuthNative)){
        showToast("Déverrouillage biométrique pas encore disponible.",{type:"error"});
        return;
    }

    try{
        await window.Capacitor.Plugins.BiometricAuthNative.authenticate({
            reason: tripLockLabel.textContent ? `Déverrouiller « ${tripLockLabel.textContent} »` : "Déverrouiller ce voyage",
            cancelTitle: "Annuler",
            androidTitle: "Déverrouiller",
            androidSubtitle: "Utilise ton empreinte ou ton visage",
            // false, pas le repli PIN/schéma de l'APPAREIL : le code
            // partagé de l'appli (synchronisé entre appareils appairés)
            // doit rester le seul repli, via "Utiliser le code PIN à la
            // place" juste en dessous — pas le déverrouillage du téléphone
            // lui-même, qui n'a aucun rapport avec ce code-là.
            allowDeviceCredential: false
        });
        const onSuccess = tripLockOnSuccess;
        closeTripLockView();
        if(onSuccess) onSuccess();
    }catch(err){
        const code = (err && err.code) || "";
        // Annulation utilisateur (bouton "Annuler" du prompt système) :
        // pas une erreur, reste simplement sur l'écran.
        if(code==="userCancel" || code==="appCancel" || code==="systemCancel") return;
        console.error("Authentification biométrique échouée :",err);
        showToast("Empreinte/visage non reconnu — utilise le code PIN.",{type:"error",duration:4000});
        tripLockBiometricPanel.hidden = true;
        tripLockPinPanel.hidden = false;
        renderTripLockPinDots();
        updateTripLockKeypadDisabled();
    }
});

/* Point d'entrée unique pour demander le déverrouillage d'un voyage
   (historique OU voyage actif, via tripKey = son id ou "__current__").
   Une fois déverrouillé pendant cette session, ne redemande plus tant que
   l'app n'est pas rechargée (voir le commentaire sur unlockedTripIds). */
function requestTripUnlock(tripKey,label,onSuccess,options){
    if(unlockedTripIds.has(tripKey)){
        onSuccess();
        return;
    }
    if(!isTripLockPinSet()){
        // État incohérent (verrouillé sans PIN défini nulle part) : on
        // débloque plutôt que de piéger derrière un écran sans issue.
        unlockedTripIds.add(tripKey);
        onSuccess();
        return;
    }
    openTripLockView(label,"unlock",()=>{
        unlockedTripIds.add(tripKey);
        onSuccess();
    },options);
}

const currentTripLockToggle = document.getElementById("currentTripLockToggle");

function updateCurrentTripLockToggle(){
    currentTripLockToggle.setAttribute("aria-pressed",String(currentTripLocked));
}
updateCurrentTripLockToggle();

currentTripLockToggle.addEventListener("click",()=>{
    if(currentTripLocked){
        openTripLockView(tripName || "Ce voyage","disable",()=>{
            currentTripLocked = false;
            localStorage.setItem(CURRENT_TRIP_LOCKED_KEY,"0");
            updateCurrentTripLockToggle();
            pushToSync();
            showToast("Verrou désactivé pour ce voyage.");
        });
        return;
    }

    const activate = ()=>{
        currentTripLocked = true;
        localStorage.setItem(CURRENT_TRIP_LOCKED_KEY,"1");
        unlockedTripIds.add("__current__");
        updateCurrentTripLockToggle();
        pushToSync();
        showToast("Ce voyage est maintenant verrouillé.");
    };

    if(!isTripLockPinSet()){
        openTripLockView(tripName || "Ce voyage","setup-create",activate);
    }else{
        activate();
    }
});

/* --- Podomètre du voyage (2026-09-05, @capgo/capacitor-pedometer) ---
   CAPACITOR : le capteur natif Android (TYPE_STEP_COUNTER) tourne en
   continu au niveau du système, MÊME quand aucune appli n'écoute — mais
   l'API publique d'origine du plugin (startMeasurementUpdates()/
   addListener("measurement",...)) ne transmet qu'un compte RELATIF à
   l'instant où l'écoute démarre, remis à 0 à chaque redémarrage de
   l'appli : les pas faits pendant qu'elle est fermée ou juste en arrière-
   plan (handleOnPause() désinscrit le capteur) étaient donc perdus,
   signalé 2026-09-05 ("je veux que les pas soient comptés même lorsque
   l'appli n'est pas ouverte").

   Corrigé par un patch natif (patches/@capgo+capacitor-pedometer+*.patch,
   appliqué automatiquement après chaque npm install via patch-package —
   voir "postinstall" dans package.json) qui ajoute getRawStepCount() :
   une lecture ponctuelle de la valeur BRUTE cumulée depuis le démarrage
   du téléphone, indépendante de toute session d'écoute. En comparant
   deux lectures brutes successives (à chaque ouverture de l'app, pas
   besoin d'écouter en continu), on obtient le vrai nombre de pas entre
   les deux, QU'IMPORTE si l'appli était ouverte entre-temps — tant que
   le téléphone n'a pas redémarré (le compteur matériel repart alors de
   zéro ; détecté via newRaw < lastRaw, traité en ajoutant newRaw tel
   quel plutôt que de perdre ces pas silencieusement).

   syncTripStepsOnce() est donc appelée à chaque ouverture/reprise de
   l'appli (boot + visibilitychange), pas seulement une fois — voir plus
   bas. Distance/cadence/étages (Measurement.distance etc.) restent iOS
   uniquement (voir isAvailable()), jamais disponibles ici — pas exposés
   dans l'UI pour cette raison. */
const TRIP_STEP_COUNT_KEY = "tripStepCount";
const TRIP_STEP_LAST_RAW_KEY = "tripStepLastRaw";

let pedometerSyncInProgress = false;

/* Signalé 2026-09-05 : le décompte doit correspondre au VOYAGE (date de
   départ → dernier jour), pas juste "depuis que ce voyage est actif" —
   sans quoi une personne qui planifie deux semaines à l'avance verrait
   ses pas du quotidien comptés comme des pas de voyage. "before" avance
   quand même TRIP_STEP_LAST_RAW_KEY (sans jamais l'ajouter à
   tripStepCount) : le jour du départ ne compte donc pas non plus les pas
   faits juste avant de partir. "after" arrête tout net — le total reste
   figé tel quel une fois le voyage terminé (voir openTripHistoryDetail()
   pour le retrouver une fois archivé). */
function getTripDateWindowStatus(){
    const start = localStorage.getItem("startDate");
    if(!start) return "during"; // pas de date définie : aucune restriction possible
    const tripStart = new Date(start+"T00:00:00");
    if(isNaN(tripStart.getTime())) return "during";
    const dayCountValue = parseInt(localStorage.getItem("dayCount"),10) || 1;
    const tripEnd = new Date(tripStart);
    tripEnd.setDate(tripEnd.getDate() + dayCountValue - 1);
    tripEnd.setHours(23,59,59,999);
    const now = getTripNow();
    if(now < tripStart) return "before";
    if(now > tripEnd) return "after";
    return "during";
}

/* Estimation, pas une vraie mesure GPS — le capteur de pas ne donne que
   des pas, jamais de distance sur Android (voir isAvailable() plus haut,
   distance:false). ~0.75 m est la foulée moyenne couramment utilisée par
   les appareils de fitness qui n'ont pas de GPS dédié pour ça (≈1 330
   pas/km) — assez pour donner un ordre de grandeur, explicitement
   labellisé "estimée" partout où c'est affiché plutôt que présenté comme
   une mesure exacte. */
const AVERAGE_STRIDE_METERS = 0.75;

function estimateDistanceKm(steps){
    return (steps * AVERAGE_STRIDE_METERS) / 1000;
}

async function syncTripStepsOnce(){

    if(!isNativeApp() || !(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorPedometer)) return;
    if(pedometerSyncInProgress) return;
    if(localStorage.getItem(TRIP_CREATED_KEY)!=="1") return;

    const Pedometer = window.Capacitor.Plugins.CapacitorPedometer;
    pedometerSyncInProgress = true;

    try{
        /* getTripDateWindowStatus() appelle getTripNow(), qui référence
           TRIP_TIMEZONE_KEY (déclaré bien plus bas dans le fichier, section
           "Date de départ") — DANS le try, pas avant : au tout premier
           appel (déclenché en bas de ce même bloc, avant que ce const plus
           tardif n'existe), ça lève un vrai TDZ. Rester dans le try le
           fait échouer proprement une fois au démarrage (comme
           renderDayWeather()/renderDayPhotos(), voir weather_feature) —
           auto-guéri dès le prochain appel réel (visibilitychange,
           ouverture de Statistiques du voyage), qui a alors tout le
           script déjà exécuté. Signalé par un vrai rejet de promesse non
           géré découvert en testant, pas juste un risque théorique. */
        const dateStatus = getTripDateWindowStatus();
        if(dateStatus==="after") return; // voyage terminé : total figé, rien de plus à synchroniser

        const availability = await Pedometer.isAvailable();
        if(!availability.stepCounting) return;

        let permStatus = await Pedometer.checkPermissions();
        if(permStatus.activityRecognition!=="granted"){
            permStatus = await Pedometer.requestPermissions();
        }
        if(permStatus.activityRecognition!=="granted") return;

        const result = await Pedometer.getRawStepCount();
        const newRaw = result.rawStepsSinceBoot;
        const lastRawStr = localStorage.getItem(TRIP_STEP_LAST_RAW_KEY);

        if(dateStatus==="during" && lastRawStr!==null){
            const lastRaw = parseInt(lastRawStr,10) || 0;
            // newRaw < lastRaw : le téléphone a redémarré entre les deux
            // lectures (le capteur matériel repart de zéro) — impossible
            // de calculer un vrai delta, mais additionner newRaw tel quel
            // (pas depuis ce redémarrage) reste bien plus juste que de
            // perdre ces pas silencieusement.
            const delta = newRaw>=lastRaw ? (newRaw-lastRaw) : newRaw;
            if(delta>0){
                const current = parseInt(localStorage.getItem(TRIP_STEP_COUNT_KEY),10) || 0;
                localStorage.setItem(TRIP_STEP_COUNT_KEY,String(current+delta));
                const statsView = document.getElementById("tripStatsView");
                if(statsView && !statsView.hidden) renderProfileStats();
            }
        }
        // "before" (pas encore parti), ou "during" avec lastRawStr===null
        // (toute première synchro de ce voyage, ou après restoreTrip()/un
        // nouveau voyage, voir leurs resets de TRIP_STEP_LAST_RAW_KEY) :
        // rien à ajouter, juste avancer la référence pour la prochaine fois.
        localStorage.setItem(TRIP_STEP_LAST_RAW_KEY,String(newRaw));
    }catch(err){
        console.error("Podomètre indisponible :",err);
    }finally{
        pedometerSyncInProgress = false;
    }
}

syncTripStepsOnce();

// Reprise au premier plan (l'appli n'a pas été tuée, juste mise de côté) :
// re-synchronise à chaque fois plutôt qu'une seule fois au démarrage, pour
// que les pas faits pendant l'absence soient bien récupérés au retour.
document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") syncTripStepsOnce();
});

/* --- Réglages "Vue Planning" (Affichage → Vue Planning, 2026-09-02) ---
   Par défaut à true (comportement historique inchangé) : ce sont des
   réglages "opt-out", pas "opt-in", pour ne rien changer silencieusement
   chez qui utilise déjà l'app. Déclarés ici (avant le premier vrai appel
   à renderActivities()/renderDayPhotos() plus bas dans le fichier) pour
   éviter la même erreur TDZ déjà rencontrée plusieurs fois cette
   session. */
const SHOW_DAY_TOTALS_KEY = "showDayTotals";
const SHOW_DAY_PHOTOS_KEY = "showDayPhotos";

let showDayTotals = localStorage.getItem(SHOW_DAY_TOTALS_KEY) !== "0";
let showDayPhotos = localStorage.getItem(SHOW_DAY_PHOTOS_KEY) !== "0";

const dayTotalsToggle = document.getElementById("dayTotalsToggle");
const dayPhotosToggle = document.getElementById("dayPhotosToggle");

function updateDayTotalsToggle(){
    dayTotalsToggle.setAttribute("aria-pressed",String(showDayTotals));
}

function updateDayPhotosToggle(){
    dayPhotosToggle.setAttribute("aria-pressed",String(showDayPhotos));
}

updateDayTotalsToggle();
updateDayPhotosToggle();

dayTotalsToggle.addEventListener("click",()=>{
    showDayTotals = !showDayTotals;
    localStorage.setItem(SHOW_DAY_TOTALS_KEY,showDayTotals ? "1" : "0");
    updateDayTotalsToggle();
    renderActivities();
});

dayPhotosToggle.addEventListener("click",()=>{
    showDayPhotos = !showDayPhotos;
    localStorage.setItem(SHOW_DAY_PHOTOS_KEY,showDayPhotos ? "1" : "0");
    updateDayPhotosToggle();
    renderDayPhotos();
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
    updateGhibliFireflies();
    updateHalloweenWisps();
});

/* Même logique que appThemeSelect (menu Options) — reflète juste la valeur
   déjà enregistrée à l'ouverture de cet écran, pas de synchronisation live
   entre les deux car ils ne sont jamais visibles en même temps. Applique le
   thème immédiatement (comme welcomeThemeToggle ci-dessus) pour un aperçu
   pendant la création du voyage. */
const welcomeThemeSelect = document.getElementById("welcomeThemeSelect");
welcomeThemeSelect.value = localStorage.getItem(APP_THEME_KEY) || "default";

welcomeThemeSelect.addEventListener("change",()=>{
    const choice = welcomeThemeSelect.value;
    localStorage.setItem(APP_THEME_KEY,choice);
    appThemeSelect.value = choice;
    applySelectedTheme(choice);
    refreshThemeIcons();
});

/* Le nombre de jours n'a plus de champ de saisie dédié — il se déduit de
   Date de départ / Date de fin (voir refreshEndDateDisplay ci-dessous),
   comme à la création du voyage (welcomeCreateBtn). applyDayCountChange()
   reste le point d'entrée unique pour toute modification de dayCount,
   qu'elle vienne d'ici ou d'un import/sync qui dépasse le nombre de jours
   actuel. */
function applyDayCountChange(val){

    val = Math.min(30,Math.max(1,val));
    dayCount = val;

    localStorage.setItem("dayCount",dayCount);
    pushToSync();

    ensureDaysExist();

    if(currentDay > dayCount){
        currentDay = dayCount;
    }

    createTabs();
    renderActivities();
}

/* --- Date de départ / date de fin / compte à rebours / "Aujourd'hui" --- */

const startDateInput = document.getElementById("startDate");
const countdownBanner = document.getElementById("countdownBanner");
const jumpTodayBtn = document.getElementById("jumpTodayBtn");

const TRIP_TIMEZONE_KEY = "tripTimezone";
const tripTimezoneSelect = document.getElementById("tripTimezoneSelect");
tripTimezoneSelect.value = localStorage.getItem(TRIP_TIMEZONE_KEY) || "";
tripTimezoneSelect.addEventListener("change",()=>{
    localStorage.setItem(TRIP_TIMEZONE_KEY,tripTimezoneSelect.value);
    pushToSync();
    updateCountdownBanner();
});

/* "Maintenant" dans le fuseau du voyage plutôt que celui, potentiellement
   différent, de l'appareil — cas concret : le téléphone reste à l'heure
   de la maison pendant tout le séjour (beaucoup de gens ne le rebasculent
   jamais). "" ("Fuseau automatique (appareil)", valeur par défaut) ne
   change rien : new Date() lit déjà l'heure de l'appareil, exactement ce
   qui est demandé comme comportement par défaut. Construit une Date dont
   les getters locaux (getHours/getDate/...) lisent directement les champs
   de la zone choisie — même logique que le reste du fichier
   (today.setHours(0,0,0,0), new Date(startDate+"T00:00:00")) : ces
   comparaisons ne portent que sur des jours/heures civils, jamais sur un
   instant UTC précis à la seconde près, donc pas besoin d'un vrai calcul
   d'offset. */
function getTripNow(){
    const tz = localStorage.getItem(TRIP_TIMEZONE_KEY);
    if(!tz) return new Date();
    try{
        const parts = new Intl.DateTimeFormat("en-US",{
            timeZone:tz,
            year:"numeric",month:"2-digit",day:"2-digit",
            hour:"2-digit",minute:"2-digit",second:"2-digit",
            hour12:false
        }).formatToParts(new Date());
        const v = {};
        parts.forEach(p=>{ if(p.type!=="literal") v[p.type]=p.value; });
        const hour = v.hour==="24" ? "00" : v.hour;
        return new Date(`${v.year}-${v.month}-${v.day}T${hour}:${v.minute}:${v.second}`);
    }catch(err){
        return new Date();
    }
}

const COUNTDOWN_THRESHOLD_KEY = "countdownThresholdDays";
let countdownThresholdDays = parseInt(localStorage.getItem(COUNTDOWN_THRESHOLD_KEY),10) || 0;
const countdownThresholdSelect = document.getElementById("countdownThresholdSelect");
countdownThresholdSelect.value = String(countdownThresholdDays);
countdownThresholdSelect.addEventListener("change",()=>{
    countdownThresholdDays = parseInt(countdownThresholdSelect.value,10) || 0;
    localStorage.setItem(COUNTDOWN_THRESHOLD_KEY,countdownThresholdDays);
    pushToSync();
    updateCountdownBanner();
});

const dateWrap = document.getElementById("dateWrap");
const dateProfileSlot = document.getElementById("dateProfileSlot");
const dateTabs = document.getElementById("dateTabs");
const dateTabButtons = dateTabs.querySelectorAll(".date-tab");
const dateWrapRows = dateWrap.querySelectorAll(".date-wrap-row");

let startDate = localStorage.getItem("startDate") || "";
startDateInput.value = startDate;

const endDateInput = document.getElementById("endDate");
const tripDurationHint = document.getElementById("tripDurationHint");

/* toISOString() convertit en UTC : avec un fuseau local en avance sur UTC
   (Asie, Australie…), minuit local peut retomber sur la veille en UTC et
   décaler la date affichée d'un jour. On formate donc les composants
   locaux à la main plutôt que de passer par toISOString(). */
function formatDateInputValue(dateObj){
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth()+1).padStart(2,"0");
    const d = String(dateObj.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
}

/* Affiche la date de fin déduite de startDate+dayCount (jamais stockée
   séparément — startDate+dayCount restent la seule source de vérité, pour
   éviter qu'une date de fin mémorisée à part ne se désynchronise si
   dayCount change ailleurs, ex. import Excel dépassant la durée actuelle). */
function refreshEndDateDisplay(){

    const base = new Date(startDate+"T00:00:00");

    if(!startDate || isNaN(base.getTime())){
        endDateInput.value = "";
        tripDurationHint.textContent = "";
        return;
    }

    const end = new Date(base);
    end.setDate(end.getDate() + dayCount - 1);

    endDateInput.value = formatDateInputValue(end);
    tripDurationHint.textContent = `Durée : ${dayCount} jour${dayCount>1 ? "s" : ""}`;
}

endDateInput.addEventListener("change",()=>{

    if(!startDate){
        showToast("Définis d'abord une date de départ.",{type:"error"});
        refreshEndDateDisplay();
        return;
    }

    const base = new Date(startDate+"T00:00:00");
    const end = new Date(endDateInput.value+"T00:00:00");

    if(isNaN(end.getTime())){
        refreshEndDateDisplay();
        return;
    }

    const diffDays = Math.round((end-base)/86400000) + 1;

    if(diffDays<1){
        showToast("La date de fin doit être après la date de départ.",{type:"error"});
        refreshEndDateDisplay();
        return;
    }

    applyDayCountChange(diffDays);
    refreshEndDateDisplay();
});

let activeDateTab = "dates";

function isDesktopContext(){
    if(document.body.classList.contains("desktop-mode")) return true;
    if(document.body.classList.contains("mobile-mode")) return false;
    /* matchMedia (2026-09-02) plutôt qu'un window.innerWidth brut : reflète
       exactement le même seuil que la media query CSS (@media (max-width:
       600px)) censée décider du même choix, et ne dépend pas d'une lecture
       de dimension qui peut être prise avant que le viewport ait fini de se
       stabiliser (signalé après une arrivée via lien QR ouvert depuis
       l'appareil photo natif, qui affichait la mise en page PC sur
       téléphone). */
    return window.matchMedia("(min-width: 601px)").matches;
}

/* Onglets toujours visibles (mobile et desktop) depuis l'ajout de
   Destination — avant, ils n'apparaissaient que sur desktop et tout
   s'empilait sans onglet sur mobile, ce qui masquait la vue à onglets
   validée en mockup (variante 2) sur téléphone, là où elle compte le plus. */
function updateDateTabs(){

    dateTabs.hidden = false;

    dateWrapRows.forEach(row=>{
        row.hidden = row.dataset.tab!==activeDateTab;
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

    dateProfileSlot.appendChild(dateTabs);
    dateProfileSlot.appendChild(dateWrap);

    updateDateTabs();
    updateBottomNavVisibility();
}

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

/* fr-FR met les jours/mois en minuscules par défaut ("dim. 18 oct.") — mis
   en majuscule sur demande explicite (2026-09-03), partout où une date est
   affichée. Majuscule après le début de la chaîne ET après chaque espace
   (pas seulement au tout début) pour couvrir jour ET mois en un passage. */
function capitalizeFrenchDate(str){
    return str.replace(/(^|\s)\p{L}/gu,m=>m.toUpperCase());
}

function formatDayDate(dayNumber){

    const d = dateForDay(dayNumber);
    if(!d) return "";

    return capitalizeFrenchDate(d.toLocaleDateString("fr-FR",{
        weekday:"long",
        day:"numeric",
        month:"long"
    }));
}

/* Réservé au titre du jour au-dessus des activités (renderTabs()) — mockup
   C validé. Ne remplace PAS formatDayDate() partout : la vue Réservations
   et l'export PDF gardent le format long existant (le menu déroulant de
   sélection du jour n'affiche plus de date du tout depuis 2026-09-03),
   donc une fonction séparée plutôt qu'un paramètre optionnel sur
   formatDayDate() qui aurait risqué d'être oublié à l'un des autres
   appels. */
function formatDayDateShort(dayNumber){

    const d = dateForDay(dayNumber);
    if(!d) return "";

    return capitalizeFrenchDate(d.toLocaleDateString("fr-FR",{
        weekday:"short",
        day:"numeric",
        month:"short"
    }));
}

function formatDateForTripDay(startDateStr,dayNumber){

    if(!startDateStr) return "";

    const base = new Date(startDateStr+"T00:00:00");
    if(isNaN(base.getTime())) return "";

    const d = new Date(base);
    d.setDate(d.getDate() + (dayNumber - 1));

    return capitalizeFrenchDate(d.toLocaleDateString("fr-FR",{
        weekday:"long",
        day:"numeric",
        month:"long"
    }));
}

/* Calendrier mensuel (mockup A validé, 2026-09-02) : un aperçu du mois
   entier avec un point coloré par type d'activité présent ce jour-là,
   en plus de la vue par jour existante. Nécessite une vraie date de
   départ (dateForDay() renvoie null sans ça) — sans quoi "Jour 3" n'a
   aucune date calendaire à laquelle s'accrocher. */
function renderMonthCalendarView(){

    const container = document.getElementById("monthCalendarContent");
    container.innerHTML = "";

    const first = dateForDay(1);
    const last = dateForDay(dayCount);

    if(!first || !last){
        const msg = document.createElement("p");
        msg.className = "profile-hint";
        msg.textContent = "Définis une date de départ (Profil → Dates & devise) pour voir le calendrier mensuel.";
        container.appendChild(msg);
        return;
    }

    // Date (clé YYYY-MM-DD, fuseau local) -> numéro de jour du voyage.
    const dateToDay = {};
    for(let i=1;i<=dayCount;i++){
        const d = dateForDay(i);
        if(d) dateToDay[toISODateLocal(d)] = i;
    }

    const todayKey = toISODateLocal(getTripNow());

    const legendTypes = new Set();

    let monthCursor = new Date(first.getFullYear(),first.getMonth(),1);
    const endCursor = new Date(last.getFullYear(),last.getMonth(),1);

    while(monthCursor<=endCursor){
        container.appendChild(buildMonthCalendarGrid(monthCursor,dateToDay,todayKey,legendTypes));
        monthCursor = new Date(monthCursor.getFullYear(),monthCursor.getMonth()+1,1);
    }

    if(legendTypes.size){
        const legend = document.createElement("div");
        legend.className = "cal-legend";
        legendTypes.forEach(type=>{
            const item = document.createElement("span");
            const dot = document.createElement("i");
            dot.style.background = typeColors[type] || "#999";
            item.appendChild(dot);
            item.appendChild(document.createTextNode(type));
            legend.appendChild(item);
        });
        container.appendChild(legend);
    }
}

function buildMonthCalendarGrid(monthDate,dateToDay,todayKey,legendTypes){

    const wrap = document.createElement("div");
    wrap.className = "cal-month";

    const heading = document.createElement("div");
    heading.className = "cal-month-heading";
    heading.textContent = capitalizeFrenchDate(monthDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}));
    wrap.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "cal-grid";

    ["L","M","M","J","V","S","D"].forEach(d=>{
        const dow = document.createElement("div");
        dow.className = "cal-dow";
        dow.textContent = d;
        grid.appendChild(dow);
    });

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year,month+1,0).getDate();
    const firstWeekday = (new Date(year,month,1).getDay()+6)%7; // 0=lundi

    for(let i=0;i<firstWeekday;i++){
        const empty = document.createElement("div");
        empty.className = "cal-cell empty";
        grid.appendChild(empty);
    }

    for(let day=1;day<=daysInMonth;day++){
        const cellDate = new Date(year,month,day);
        const key = toISODateLocal(cellDate);
        const tripDay = dateToDay[key];

        const cell = document.createElement("div");
        cell.className = "cal-cell";
        if(key===todayKey) cell.classList.add("today");
        if(!tripDay) cell.classList.add("outside-trip");

        const num = document.createElement("span");
        num.textContent = day;
        cell.appendChild(num);

        if(tripDay){
            const types = new Set();
            ["matin","midi","apresMidi","soir"].forEach(slot=>{
                (planning[tripDay] && planning[tripDay][slot] || []).forEach(a=>{
                    types.add(a.type);
                    legendTypes.add(a.type);
                });
            });

            if(types.size){
                const dots = document.createElement("span");
                dots.className = "cal-dots";
                Array.from(types).slice(0,4).forEach(type=>{
                    const dot = document.createElement("i");
                    dot.className = "cal-dot";
                    dot.style.background = typeColors[type] || "#999";
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);
            }

            cell.setAttribute("role","button");
            cell.tabIndex = 0;
            cell.setAttribute("aria-label",`Aller au jour ${tripDay}`);
            const jumpToDay = ()=>{
                currentDay = tripDay;
                renderTabs();
                renderActivities();
                document.getElementById("monthCalendarView").hidden = true;
                localStorage.removeItem(LAST_FULLSCREEN_VIEW_KEY);
                setActiveMainTab("planning");
                updateCountdownBanner();
            };
            cell.addEventListener("click",jumpToDay);
            cell.addEventListener("keydown",(e)=>{
                if(e.key==="Enter" || e.key===" "){
                    e.preventDefault();
                    jumpToDay();
                }
            });
        }

        grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    return wrap;
}

function isAnyFullscreenViewOpen(){
    return !!document.querySelector(".fullscreen-view:not([hidden])");
}

/* Réservations/Album sont maintenant de vrais onglets (activeMainTab) sur
   mobile, comme planning/budget/profile — un simple comparaison suffit
   (elle ne l'aurait pas fait quand ces deux-là étaient des .fullscreen-view
   ouvertes par-dessus le Planning sans changer activeMainTab ; voir
   planning_only_ui_visibility_rule en mémoire pour cet historique). Appelée
   depuis updateCountdownBanner(), déjà le point central appelé à chaque
   navigation. Met aussi à jour la sidebar PC (2026-09-02, réorganisation
   affichage PC) — desktop a maintenant les mêmes 5 onglets que mobile,
   plus besoin d'ignorer ce cas comme avant l'ajout de la sidebar. */
function updateBottomNavActiveState(){
    bottomNavTabs.forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.mainTab===activeMainTab);
    });
    desktopSidebarItems.forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.mainTab===activeMainTab);
    });
}

function updateCountdownBanner(){

    updateBottomNavActiveState();

    appTitleRow.hidden = activeMainTab!=="planning" || isAnyFullscreenViewOpen();

    /* Le contournement "!isDesktopContext()" a disparu (2026-09-02) : avant
       la sidebar PC, desktop restait toujours sur activeMainTab==="planning"
       en pratique (rien d'autre ne pouvait le faire changer), donc masquer
       le compte à rebours en dehors de Planning n'était utile que sur
       mobile. Maintenant que desktop change aussi réellement d'onglet, la
       même règle doit s'appliquer partout — sinon le bandeau resterait
       affiché par-dessus Réservations/Convertisseur/Album/Profil sur PC. */
    if(activeMainTab!=="planning" || isAnyFullscreenViewOpen()){
        countdownBanner.hidden = true;
        jumpTodayBtn.hidden = true;
        return;
    }

    if(!startDate){
        countdownBanner.hidden = true;
        jumpTodayBtn.hidden = true;
        return;
    }

    const today = getTripNow();
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

    /* Le seuil ne s'applique qu'au compte à rebours "avant le départ" —
       jamais aux états "en voyage"/"voyage terminé", qui restent toujours
       pertinents une fois le départ passé, quel que soit le seuil choisi. */
    if(diffDays > countdownThresholdDays && countdownThresholdDays>0){
        countdownBanner.hidden = true;
        jumpTodayBtn.hidden = true;
        return;
    }

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
            `📍 Tu es en voyage — Jour ${tripDay}`;
        }else{
            countdownBanner.textContent =
            "🏠 Voyage terminé, bon retour !";
        }
    }

    jumpTodayBtn.hidden = (diffDays > 0);
}

function jumpToToday(){

    if(!startDate) return;

    const today = getTripNow();
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
    pushToSync();

    updateCountdownBanner();
    updateDatePlacement();
    refreshEndDateDisplay();
    createTabs();
    renderTabs();
});

jumpTodayBtn.addEventListener("click",jumpToToday);

updateCountdownBanner();
updateDatePlacement();
refreshEndDateDisplay();

/* Filet de sécurité (2026-09-02) : signalé qu'arriver via un lien de
   sync QR (caméra native → navigateur, pas le scanner interne) pouvait
   afficher la mise en page "PC" sur téléphone au tout premier chargement
   — plus rien n'y était cliquable (les contrôles mobile, comme le
   bandeau du bas, restent masqués tant que isDesktopContext() répond
   "desktop"). Un second passage de updateDatePlacement() une fois que le
   navigateur a réellement peint au moins une fois (double
   requestAnimationFrame, pattern standard pour "après que la mise en
   page se soit stabilisée") corrige le calcul si le premier s'est trompé
   — inoffensif si le premier était déjà correct. */
requestAnimationFrame(()=>{
    requestAnimationFrame(updateDatePlacement);
});

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
            `${activityIconPrefix(m.activity.type)}${m.activity.name}`;

            const dayDiv = document.createElement("div");
            dayDiv.className = "search-result-day";
            dayDiv.textContent =
            `Jour ${m.day}`
            + (m.activity.address ? ` · ${m.activity.address}` : "");

            item.appendChild(nameDiv);
            item.appendChild(dayDiv);

            item.addEventListener("click",()=>{
                currentDay = m.day;
                if(activityTypeFilter){
                    activityTypeFilter = "";
                    renderCategoryTabs();
                }
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
    closeCategoryFilterDropdown();
}

function toggleSearchPanel(){
    const isOpen = !searchPanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        /* Reconstruit la liste des types (2026-09-04) : renderCategoryTabs()
           n'est pas ré-appelée à chaque ajout/suppression d'activité, donc
           sans ce rafraîchissement à l'ouverture, un type ajouté/retiré
           depuis la dernière fois n'apparaîtrait/disparaîtrait pas tant que
           la page n'est pas rechargée. */
        renderCategoryTabs();
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

/* CAPACITOR (2026-09-05, résolu) : @capacitor/browser prend le relais pour
   tout lien externe quand disponible — window.open() n'a pas de
   comportement garanti dans une WebView Capacitor (navigue parfois la
   WebView elle-même au lieu d'ouvrir un onglet/navigateur externe, ce qui
   ferait perdre l'état de l'appli). Point d'entrée unique pour les 3
   endroits qui ouvrent une URL externe (openAddressInMaps,
   openReservationLink, openNearbyToilets juste en dessous). */
function nativeBrowserAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser);
}

function openExternalUrl(url){
    if(nativeBrowserAvailable()){
        window.Capacitor.Plugins.Browser.open({url});
        return;
    }
    window.open(url,"_blank","noopener,noreferrer");
}

const nearbyToiletsBtn = document.getElementById("nearbyToiletsBtn");

// CAPACITOR : navigator.geolocation (permission Android peu fiable hors
// plugin natif) — voir la note "Géolocalisation" en tête du fichier.
function openNearbyToilets(){

    const fallbackUrl =
    "https://www.google.com/maps/search/?api=1&query="
    + encodeURIComponent("toilettes publiques");

    if(!navigator.geolocation){
        openExternalUrl(fallbackUrl);
        return;
    }

    /* @capacitor/browser n'a pas de blocage de popup à contourner (contrairement
       à window.open() sur le web) : pas besoin d'ouvrir un onglet vide à
       l'avance puis de le rediriger une fois la position connue, on ouvre
       directement une fois la géolocalisation résolue. Le repli web garde
       lui l'ancienne technique (onglet ouvert dans le geste utilisateur
       synchrone, puis .location.href une fois la position connue), toujours
       nécessaire là où les popups peuvent être bloqués. */
    if(nativeBrowserAvailable()){
        getCurrentPositionAsync({timeout:8000})
        .then(pos=>{
            const { latitude, longitude } = pos.coords;
            openExternalUrl(`https://www.google.com/maps/search/toilettes+publiques/@${latitude},${longitude},16z`);
        })
        .catch(()=>openExternalUrl(fallbackUrl));
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

/* Applique l'icône ⛄ dès le chargement si le thème Noël était déjà actif
   lors d'une session précédente — sans ça, elle ne se mettait à jour qu'à
   la prochaine ouverture/fermeture du volet. Doit venir après les const
   ci-dessus (formDrawer/formToggleIcon), pas avant, sinon TDZ. */
refreshThemeIcons();

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
    formToggleIcon.textContent = currentThemeAddIcon();
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
                triggerHaptic(12);
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

    /* Vérif générale 2026-09-03 : checklist est appelé sans condition au
       chargement (renderChecklist() plus bas dans le fichier) — un item
       malformé (sync/import ancien format, edge case non prévu) faisait
       planter .toLowerCase() ici, ce qui interrompait l'exécution du
       script à ce point précis et laissait tout ce qui est déclaré plus
       loin dans app.js (const/let après cette ligne) en TDZ pour le reste
       de la session. Un seul item cassé ne doit jamais pouvoir invalider
       la moitié de l'appli. */
    const existingLabels =
    checklist.filter(i=>i && typeof i.label==="string").map(i=>i.label.toLowerCase());

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
    checklistView.hidden = false;
    checklistToggle.setAttribute("aria-expanded","true");
    checklistBackBtn.focus();
    updateCountdownBanner();
    localStorage.setItem(LAST_FULLSCREEN_VIEW_KEY,"checklistView");
}

function closeChecklistView(){
    checklistView.hidden = true;
    checklistToggle.setAttribute("aria-expanded","false");
    checklistToggle.focus();
    updateCountdownBanner();
    localStorage.removeItem(LAST_FULLSCREEN_VIEW_KEY);
}

checklistToggle.addEventListener("click",openChecklistView);
checklistBackBtn.addEventListener("click",closeChecklistView);

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !checklistView.hidden){
        closeChecklistView();
    }
});

renderChecklist();

/* --- Bandeau de navigation (bas, mobile uniquement) ---
   Se souvenir de la vue active (onglet + éventuelle vue plein écran
   ouverte par-dessus) pour que rafraîchir la page ne ramène plus
   systématiquement au Planning — écrit à chaque navigation plutôt que sur
   beforeunload, cet évènement n'étant pas fiable sur mobile/PWA installée
   (peut ne jamais se déclencher si l'appli est juste mise en arrière-plan
   plutôt que vraiment rechargée). LAST_MAIN_TAB_KEY/LAST_FULLSCREEN_VIEW_KEY
   sont déclarées tout en haut du fichier, pas ici : voir le commentaire
   près de leur déclaration. */

/* Purement visuel, sans effet de bord (pas d'écriture localStorage, pas de
   sélection d'onglet Tricount par défaut) : utilisée par updateBottomNavVisibility()
   pour resynchroniser l'affichage sur activeMainTab après un changement de
   layout (rotation, redimensionnement), sans re-déclencher tout ce que fait
   setActiveMainTab() ci-dessous. Appeler setActiveMainTab(activeMainTab) à la
   place ici écrasait silencieusement LAST_MAIN_TAB_KEY avec la valeur
   courante dès le chargement initial (avant que restoreLastMainView(), plus
   bas, ait pu lire la vraie valeur mémorisée) — la restauration de l'onglet
   principal après rafraîchissement ne fonctionnait donc jamais en pratique
   (bug pré-existant, repéré en vérifiant le nouveau comportement Tricount
   sur l'onglet budget). */
function applyActiveMainTabDisplay(tab){
    /* Le surlignage .active du bandeau du bas est calculé dans
       updateCountdownBanner() (via updateBottomNavActiveState()), appelée
       juste en dessous — pas ici directement, puisque Réservations/Album
       doivent parfois s'allumer elles-mêmes plutôt que "planning". */
    planningTabContent.hidden = tab!=="planning";
    budgetTabContent.hidden = tab!=="budget";
    profileTabContent.hidden = tab!=="profile";
    reservationsView.hidden = tab!=="reservations";
    albumView.hidden = tab!=="album";
    /* checklistToggle n'est PAS un enfant DOM de planningTabContent (c'est
       un sibling de niveau racine, voir HTML) — sur mobile ça ne se
       remarquait pas (toujours display:none via body.has-bottom-nav,
       l'accès passe par Profil), mais depuis la sidebar desktop (2026-09-02)
       Réservations/Convertisseur/Album/Profil sont de vrais onglets
       desktop eux aussi : sans ce masquage explicite, le bouton restait
       affiché par-dessus ces onglets. Sans effet sur mobile (déjà masqué
       par CSS quoi qu'il arrive). */
    checklistToggle.hidden = tab!=="planning";
    updateCountdownBanner();
    if(tab==="profile") renderProfileStats();
    if(tab==="reservations") renderReservations();
    if(tab==="album") renderAlbumView();
}

function setActiveMainTab(tab){
    /* Seulement à l'ENTRÉE sur l'onglet budget (pas à chaque appui si on y
       est déjà) : sinon rappuyer sur l'icône Convertisseur du bandeau du bas
       ramènerait sans arrêt sur l'onglet Tricount par défaut, écrasant un
       onglet choisi à la main (Historique, Soldes...). Les appelants qui
       veulent un onglet précis (ex. startTricountExpenseFromActivity)
       appellent switchTricountTab() juste après — cette valeur par défaut
       est alors immédiatement remplacée, sans effet visible. */
    const enteringBudget = tab==="budget" && activeMainTab!=="budget";

    activeMainTab = tab;
    localStorage.setItem(LAST_MAIN_TAB_KEY,tab);
    applyActiveMainTabDisplay(tab);
    if(enteringBudget){
        switchTricountTab(tricountParticipants.length===0 ? "participants" : "new");
    }
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
        // Ordre d'appendChild = ordre d'affichage dans le popup ⋮ : Affichage
        // avant Données/Voyage, comme dans le HTML d'origine avant la
        // séparation en deux noeuds (voir profile_page_display_split).
        optionsMenuPanel.appendChild(displaySettingsContent);
        optionsMenuPanel.appendChild(dataSettingsContent);
        syncPanel.appendChild(syncPanelContent);
        // Réorganisation affichage PC (2026-09-02) : les deux déclencheurs
        // (⋮ et synchro) rejoignent le bas de la sidebar au lieu du popup en
        // coin, qui n'existe plus sur desktop. desktopProfileMenuItem reste
        // masqué (retiré, pas supprimé) : la sidebar donne un accès direct à
        // Profil, ce popover séparé n'a plus de raison d'être.
        desktopSidebarBottom.appendChild(optionsMenuItem);
        desktopSidebarBottom.appendChild(syncMenuItem);
        optionsMenuItem.hidden = false;
        syncMenuItem.hidden = false;
        desktopProfileMenuItem.hidden = true;
    }else{
        displaySettingsSlot.appendChild(displaySettingsContent);
        dataSettingsSlot.appendChild(dataSettingsContent);
        syncPanelSlot.appendChild(syncPanelContent);
        cornerMenu.appendChild(optionsMenuItem);
        cornerMenu.appendChild(syncMenuItem);
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
    desktopSidebar.hidden = !desktop;
    document.body.classList.toggle("has-sidebar",desktop);
    updateProfileConsolidation(desktop);

    // Réorganisation affichage PC (2026-09-02) : desktop utilise maintenant
    // la même logique d'affichage d'onglet que mobile (applyActiveMainTabDisplay
    // est déjà générique sur les 5 sections), au lieu d'empiler
    // Planning+Convertisseur en permanence — voir desktop_sidebar_pc_layout
    // en mémoire.
    applyActiveMainTabDisplay(activeMainTab);

    syncBottomNavHeight();
}

window.addEventListener("resize",syncBottomNavHeight);

if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(syncBottomNavHeight);
}

if(window.ResizeObserver){
    new ResizeObserver(syncBottomNavHeight).observe(bottomNav);
}

/* Tout menu/popover ANCRÉ (par opposition aux vues plein écran ci-dessous) :
   optionsMenuPanel, syncPanel, desktopProfilePanel, searchPanel (+ son
   categoryFilterDropdown), mapMorePanel, choicePopover. Chacun se ferme déjà
   tout seul sur un clic à l'extérieur (listeners document dédiés), MAIS les
   boutons qui changent de vue (onglets du bas, sidebar PC,
   [data-profile-view], .profile-back) appellent stopPropagation() pour leur
   propre logique — le clic n'atteint donc jamais ces listeners "extérieur",
   et un menu resté ouvert restait visuellement coincé par-dessus la
   nouvelle vue (signalé 2026-09-03, y compris depuis Réservations).
   Fonction séparée de closeAllFullscreenViews() (appelée par elle) pour
   pouvoir aussi être appelée seule depuis .profile-back, qui ne passe pas
   par closeAllFullscreenViews(). */
function closeAllMenus(){
    closeOptionsMenu();
    closeSearchPanel();
    if(!syncPanel.hidden) syncPanel.hidden = true;
    if(!desktopProfilePanel.hidden) desktopProfilePanel.hidden = true;
    if(!mapMorePanel.hidden) mapMorePanel.hidden = true;
    closeChoicePopover();
    /* Menu "⋮" par activité (repéré lors de la vérif générale, 2026-09-03) :
       même famille de bug que les autres — fermé seulement par un clic
       document en dehors de .activity-menu-wrap, donc lui aussi bypassé
       par un e.stopPropagation() ailleurs (changement d'onglet). */
    closeActivityMenus();
}

function closeAllFullscreenViews(){
    closeAllMenus();
    if(!checklistView.hidden) closeChecklistView();
    document.querySelectorAll(".profile-sub-view").forEach(view=>{
        if(!view.hidden) view.hidden = true;
    });
    if(!cameraView.hidden) closeCameraView();
    if(!qrScanView.hidden) stopQrScan();
    if(wakeLockWanted) releaseMapWakeLock();
    detachDevicesPresenceListener();
    localStorage.removeItem(LAST_FULLSCREEN_VIEW_KEY);
}

/* --- Bouton retour Android / geste retour navigateur ---
   Signalé lors de l'audit de préparation Android (2026-09-03) : rien
   n'interceptait le retour, qui fermerait l'appli entière depuis
   n'importe quel écran au lieu de fermer la vue/le menu/la fenêtre
   ouverte. Solution testable dès maintenant en web (history.pushState +
   popstate, pattern standard pour "piéger" le retour dans une SPA) — un
   seul point d'ancrage plutôt que d'instrumenter chaque bouton qui ouvre
   quelque chose : à chaque retour, handleBackNavigation() vérifie l'état
   RÉEL du DOM à cet instant (rien à suivre en amont, donc rien à oublier
   de câbler pour une future vue/un futur menu qui suit déjà les patrons
   .hidden/isAnyFullscreenViewOpen() existants).

   CAPACITOR : le bouton matériel Android, tant qu'aucun listener
   App.addListener('backButton',...) n'est enregistré, déclenche déjà PAR
   DÉFAUT history.back() dans la WebView — ce mécanisme fonctionnera donc
   tel quel une fois empaqueté, SANS ajouter @capacitor/app. L'installer
   plus tard resterait une amélioration de robustesse (ce comportement par
   défaut n'est pas officiellement garanti par la documentation Capacitor),
   pas un prérequis bloquant. */
function handleBackNavigation(){

    /* Le verrou par voyage (z-index:3900, au-dessus de tout le reste, voir
       style.css) n'était vérifié par AUCUNE des branches ci-dessous —
       repéré lors de l'audit de préparation Android : le retour matériel
       tombait dans le cas générique (fermeture d'autres panneaux/onglets
       invisibles SOUS l'écran de verrouillage, voire sortie de l'appli),
       sans jamais fermer ni faire progresser l'écran PIN lui-même. Doit
       rester la toute première branche : rien ne doit répondre au retour
       tant que ce voile opaque est affiché. Annulable → équivaut à un clic
       sur "Annuler" ; pas annulable (voyage actif au démarrage) → absorbe
       le retour sans rien faire, plutôt que de laisser sortir de l'appli. */
    if(!tripLockView.hidden){
        if(!tripLockCancelBtn.hidden) tripLockCancelBtn.click();
        return true;
    }

    if(!modalOverlay.hidden){ modalCancel.click(); return true; }
    if(!attachmentLightbox.hidden){ closeAttachmentLightbox(); return true; }
    if(!photoLightbox.hidden){ closePhotoLightbox(); return true; }
    if(!attachmentsModal.hidden){ closeAttachmentsModal(); return true; }

    if(
        isAnyFullscreenViewOpen() ||
        !optionsMenuPanel.hidden || !searchPanel.hidden || !syncPanel.hidden ||
        !desktopProfilePanel.hidden || !mapMorePanel.hidden || !choicePopover.hidden
    ){
        closeAllFullscreenViews();
        return true;
    }

    if(activeMainTab!=="planning"){
        closeAllFullscreenViews();
        setActiveMainTab("planning");
        return true;
    }

    // Rien à fermer : laisse le comportement par défaut se produire (sortir
    // de l'appli / quitter la page), voir le ré-armement conditionnel plus
    // bas — pas de history.pushState() ici.
    return false;
}

history.pushState({planningBackTrap:true},"",location.href);

window.addEventListener("popstate",()=>{
    if(handleBackNavigation()){
        history.pushState({planningBackTrap:true},"",location.href);
    }
});

[...bottomNavTabs,...desktopSidebarItems].forEach(btn=>{
    btn.addEventListener("click",(e)=>{

        e.stopPropagation();

        const tab = btn.dataset.mainTab;

        closeAllFullscreenViews();
        setActiveMainTab(tab);
    });
});


/* --- Profil : Aide et support (notes locales, aucun backend) --- */

const HELP_NOTES_KEY = "helpSupportNotes";
const helpNotesInput = document.getElementById("helpNotesInput");

helpNotesInput.value = localStorage.getItem(HELP_NOTES_KEY) || "";

helpNotesInput.addEventListener("input",()=>{
    localStorage.setItem(HELP_NOTES_KEY,helpNotesInput.value);
    pushToSync();
});

// CAPACITOR : navigator.clipboard — voir la note en haut du fichier,
// devrait fonctionner tel quel dans une WebView Capacitor.
async function copyTextToClipboard(text){
    try{
        await navigator.clipboard.writeText(text);
        showToast("Texte copié dans le presse-papier.",{type:"success"});
    }catch(err){
        showToast("Impossible de copier automatiquement.",{type:"error"});
    }
}

/* --- Aide et support : historique des rapports envoyés --- */

const HELP_REPORTS_KEY = "helpReportsHistory";
let helpReportsHistory = JSON.parse(localStorage.getItem(HELP_REPORTS_KEY) || "[]");

function saveHelpReportsHistory(){
    localStorage.setItem(HELP_REPORTS_KEY,JSON.stringify(helpReportsHistory));
    pushToSync();
}

function renderHelpReportsHistory(){

    const container = document.getElementById("helpReportsHistory");
    container.innerHTML = "";

    if(!helpReportsHistory.length){
        const empty = document.createElement("p");
        empty.className = "profile-hint";
        empty.textContent = "Aucun rapport envoyé pour l'instant.";
        container.appendChild(empty);
        return;
    }

    for(let index=helpReportsHistory.length-1; index>=0; index--){

        const report = helpReportsHistory[index];

        const item = document.createElement("div");
        item.className = "help-report-item";

        const dateEl = document.createElement("div");
        dateEl.className = "help-report-date";
        dateEl.textContent = formatTimestamp(report.timestamp);

        const textEl = document.createElement("div");
        textEl.className = "help-report-text";
        textEl.textContent = report.text;

        const deviceEl = document.createElement("div");
        deviceEl.className = "help-report-device";
        deviceEl.textContent = report.device || "";

        const iconsWrap = document.createElement("div");
        iconsWrap.className = "help-report-icons";

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "help-report-icon help-report-icon-copy";
        copyBtn.textContent = "📋";
        copyBtn.title = "Copier ce rapport";
        copyBtn.addEventListener("click",()=>{
            const fullText = report.device ? `${report.text}\n\n${report.device}` : report.text;
            copyTextToClipboard(fullText);
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "help-report-icon help-report-icon-delete";
        removeBtn.textContent = "✕";
        removeBtn.title = "Supprimer ce rapport";
        removeBtn.addEventListener("click",()=>{
            helpReportsHistory.splice(index,1);
            saveHelpReportsHistory();
            renderHelpReportsHistory();
        });

        iconsWrap.appendChild(copyBtn);
        iconsWrap.appendChild(removeBtn);

        item.appendChild(iconsWrap);
        item.appendChild(dateEl);
        item.appendChild(textEl);
        item.appendChild(deviceEl);
        container.appendChild(item);
    }
}

const helpNotesSendBtn = document.getElementById("helpNotesSendBtn");

helpNotesSendBtn.addEventListener("click",()=>{

    const text = helpNotesInput.value.trim();

    if(!text){
        showToast("Rien à envoyer pour l'instant.",{type:"error"});
        return;
    }

    helpReportsHistory.push({text,timestamp:Date.now(),device:navigator.userAgent});
    saveHelpReportsHistory();
    renderHelpReportsHistory();

    helpNotesInput.value = "";
    localStorage.setItem(HELP_NOTES_KEY,"");
    pushToSync();

    showToast("Rapport envoyé et ajouté à l'historique.",{type:"success"});
});

document.querySelectorAll("[data-help-tab]").forEach(tabBtn=>{
    tabBtn.addEventListener("click",()=>{

        document.querySelectorAll("[data-help-tab]").forEach(b=>{
            b.classList.toggle("active",b===tabBtn);
        });

        document.querySelectorAll("[data-help-panel]").forEach(panel=>{
            panel.hidden = panel.dataset.helpPanel!==tabBtn.dataset.helpTab;
        });

        if(tabBtn.dataset.helpTab==="historique") renderHelpReportsHistory();
    });
});

/* --- Profil : statistiques du voyage --- */

const profileStatsEl = document.getElementById("profileStats");

function renderProfileStats(){

    // Fire-and-forget : re-synchronise au passage sur cette page plutôt
    // que de compter uniquement sur le démarrage/visibilitychange — voir
    // syncTripStepsOnce(). Sans effet si déjà en cours (pedometerSyncInProgress)
    // ou hors contexte natif ; ne redéclenche renderProfileStats() que si
    // de nouveaux pas sont réellement trouvés, jamais de boucle.
    syncTripStepsOnce();

    let totalPrice = 0;
    let activityCount = 0;

    Object.keys(planning).forEach(day=>{
        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[day][slot] || []).forEach(a=>{
                activityCount++;
                if(a.price!==null && a.price!==undefined){
                    totalPrice += activityPriceInBase(a);
                }
            });
        });
    });

    let daysRemainingText = "Date de départ non définie";

    if(startDate){
        const today = getTripNow();
        today.setHours(0,0,0,0);
        const base = new Date(startDate+"T00:00:00");

        if(!isNaN(base.getTime())){
            const diffDays = Math.round((base-today)/(1000*60*60*24));
            if(diffDays>0){
                daysRemainingText = `🧳 J-${diffDays} avant le départ !`;
            }else if(diffDays===0){
                daysRemainingText = "✈️ C'est le grand départ aujourd'hui !";
            }else{
                daysRemainingText = "🏠 Voyage en cours ou terminé";
            }
        }
    }

    /* Distance/cadence/étages ne sont jamais mesurés directement sur
       Android via @capgo/capacitor-pedometer (iOS uniquement, voir
       isAvailable()) — la distance affichée ici est donc une ESTIMATION
       à partir des pas (voir estimateDistanceKm()), jamais une vraie
       mesure GPS, explicitement labellisée comme telle. Le hint diffère
       web/natif : sur le web, aucun capteur n'existe pour de vrai ; sur
       Android, les pas comptent même appli fermée (patch natif
       getRawStepCount(), voir le commentaire CAPACITOR en tête de
       fichier), mais seulement entre la date de départ et la fin du
       voyage (voir getTripDateWindowStatus()), et se synchronisent à
       l'ouverture/la reprise de l'appli, pas en temps réel en arrière-plan. */
    const tripStepCount = parseInt(localStorage.getItem(TRIP_STEP_COUNT_KEY),10) || 0;
    const stepCountDisplay = tripStepCount.toLocaleString("fr-FR");
    const distanceDisplay = estimateDistanceKm(tripStepCount).toLocaleString("fr-FR",{maximumFractionDigits:1,minimumFractionDigits:1});
    const stepsHint = isNativeApp()
        ? "🚶 Comptés entre le départ et la fin du voyage, même appli fermée — distance estimée à partir des pas, pas une vraie mesure GPS."
        : "🚶 Comptage des pas disponible uniquement dans l'appli Android.";

    profileStatsEl.innerHTML = `
        <div class="profile-stat">
            <span class="profile-stat-value">${totalPrice.toFixed(2)} ${CURRENCIES[baseCurrency].symbol}</span>
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
            <span class="profile-stat-value">${stepCountDisplay}</span>
            <span class="profile-stat-label">Pas</span>
        </div>
        <div class="profile-stat">
            <span class="profile-stat-value">${distanceDisplay} km</span>
            <span class="profile-stat-label">Distance (estimée)</span>
        </div>
        <div class="profile-stat-full">${daysRemainingText}</div>
        <div class="profile-stat-full profile-stat-hint">${stepsHint}</div>
    `;
}

/* --- Profil : réservations (vue consolidée des liens par activité) --- */

// Partagé entre le popover d'activité (Planning) et la vue Réservations,
// plutôt que dupliqué à chaque endroit qui doit ouvrir une adresse. Voir
// openExternalUrl()/nativeBrowserAvailable() près de nearbyToiletsBtn.
function openAddressInMaps(address){
    openExternalUrl(
        "https://www.google.com/maps/search/?api=1&query="
        + encodeURIComponent(address.trim())
    );
}

function openReservationLink(link){
    if(/^https?:\/\//i.test(link)){
        openExternalUrl(link);
    }else{
        showToast("Lien de réservation invalide (doit commencer par http:// ou https://).",{type:"error"});
    }
}

/* Catégories réellement ouvrables pour une activité donnée (adresse/
   réservation/documents), dans cet ordre d'affichage — utilisé à la fois
   pour décider "ouvrir direct" (1 seule) vs "demander" (2+), voir
   renderReservations(). */
function buildReservationCategories(day,activity,hasAttachments){
    const categories = [];
    if(activity.address && activity.address.trim()){
        categories.push({icon:"📍",label:"Ouvrir l'adresse",action:()=>openAddressInMaps(activity.address)});
    }
    if(activity.reservationLink){
        categories.push({icon:"🎫",label:"Voir la réservation",action:()=>openReservationLink(activity.reservationLink)});
    }
    if(hasAttachments){
        categories.push({icon:"📎",label:"Voir les documents",action:()=>openAttachmentsModal(day,activity)});
    }
    return categories;
}

// choicePopover déclaré tôt près d'optionsMenuPanel (voir le commentaire
// TDZ à cet endroit) — pas ici.
let choicePopoverAnchor = null;

function closeChoicePopover(){
    choicePopover.hidden = true;
    choicePopover.innerHTML = "";
    choicePopoverAnchor = null;
}

/* Comme openChoicePopover(), mais reappuyer sur le MÊME déclencheur pendant
   qu'il est déjà ouvert referme le popover au lieu de le repeupler à
   l'identique — Réservations n'en a pas besoin (une ligne à la fois,
   fermée par un clic à l'extérieur), mais Importer/Exporter dans le menu ⋮
   sont assez proches pour qu'un second appui accidentel sur le même bouton
   attende visiblement une fermeture (2026-09-03). */
function toggleChoicePopover(anchorEl,categories){
    if(!choicePopover.hidden && choicePopoverAnchor===anchorEl){
        closeChoicePopover();
        return;
    }
    openChoicePopover(anchorEl,categories);
    choicePopoverAnchor = anchorEl;
}

/* Ancré sur l'élément cliqué (position:fixed, calculée depuis son
   getBoundingClientRect() — utile pour un élément qui défile dans son
   propre conteneur, un positionnement CSS relatif classique serait coupé
   par son overflow). Un seul noeud réutilisé/repeuplé à chaque clic plutôt
   qu'un popover par appelant : au plus un choix est ouvert à la fois.
   Partagé par Réservations (choix adresse/réservation/documents) et les
   boutons Importer/Exporter du menu ⋮ (2026-09-02). */
function openChoicePopover(anchorEl,categories){

    choicePopover.innerHTML = "";

    categories.forEach(cat=>{
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "menu-item";
        btn.setAttribute("role","menuitem");
        const icon = document.createElement("span");
        icon.className = "menu-item-icon";
        icon.textContent = cat.icon;
        const label = document.createElement("span");
        label.className = "menu-item-label";
        label.textContent = cat.label;
        btn.appendChild(icon);
        btn.appendChild(label);
        btn.addEventListener("click",(e)=>{
            e.stopPropagation();
            closeChoicePopover();
            cat.action();
        });
        choicePopover.appendChild(btn);
    });

    const rect = anchorEl.getBoundingClientRect();
    choicePopover.style.top = (rect.bottom + 6) + "px";
    choicePopover.style.left = rect.left + "px";
    choicePopover.style.width = rect.width + "px";
    choicePopover.hidden = false;
}

document.addEventListener("click",(e)=>{
    if(!choicePopover.hidden && !e.target.closest("#choicePopover")){
        closeChoicePopover();
    }
});

/* Vue "jours repliables" — mêmes classes/interaction que l'Album
   (.album-day-group/-heading/-toggle/-body, voir renderPhotoGroups()) pour
   rester cohérent visuellement, mais avec sa propre clé de repli
   (RESERVATIONS_COLLAPSE_KEY) : un jour replié ici ne doit pas replier le
   même jour dans l'Album, et inversement. */
function renderReservations(){

    const reservationsList = document.getElementById("reservationsList");
    reservationsList.innerHTML = "";

    const sections = ["matin","midi","apresMidi","soir"];
    const byDay = {};

    Object.keys(planning)
    .map(d=>parseInt(d,10))
    .sort((a,b)=>a-b)
    .forEach(day=>{
        sections.forEach(slot=>{
            (planning[day][slot] || []).forEach(activity=>{
                if(activity.reservationLink || activityHasAttachments(day,activity.id)){
                    if(!byDay[day]) byDay[day] = [];
                    byDay[day].push(activity);
                }
            });
        });
    });

    const days = Object.keys(byDay).map(d=>parseInt(d,10)).sort((a,b)=>a-b);

    const dateChipsRow = document.getElementById("reservationsDateChips");
    dateChipsRow.innerHTML = "";

    if(days.length===0){
        dateChipsRow.hidden = true;
        const empty = document.createElement("div");
        empty.className = "search-result-item";
        empty.textContent = "Aucune réservation enregistrée pour l'instant.";
        reservationsList.appendChild(empty);
        return;
    }

    /* Frise de dates (mockup B validé, 2026-09-02) : un raccourci pour
       sauter directement à un jour au lieu de défiler toute la liste — la
       liste elle-même était déjà triée chronologiquement (days.sort), pas
       besoin d'y toucher. */
    dateChipsRow.hidden = days.length<2;
    days.forEach(day=>{
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "resv-datechip";
        chip.textContent = formatDayDateShort(day) || `Jour ${day}`;
        chip.addEventListener("click",()=>{
            dateChipsRow.querySelectorAll(".resv-datechip").forEach(c=>c.classList.remove("active"));
            chip.classList.add("active");
            const target = document.getElementById("resv-day-"+day);
            if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
        });
        dateChipsRow.appendChild(chip);
    });

    days.forEach(day=>{

        const dayGroup = document.createElement("div");
        dayGroup.className = "album-day-group";
        dayGroup.id = "resv-day-"+day;
        if(isDayCollapsed(RESERVATIONS_COLLAPSE_KEY,currentTripId,day)) dayGroup.classList.add("collapsed");

        const dayHeading = document.createElement("div");
        dayHeading.className = "album-day-heading";
        const dateLabel = formatDayDate(day);
        let heading = `Jour ${day}`;
        if(dateLabel) heading += ` — ${dateLabel}`;

        const headingText = document.createElement("span");
        headingText.className = "album-day-heading-text";
        headingText.textContent = heading;
        const countSpan = document.createElement("span");
        countSpan.className = "album-day-count";
        countSpan.textContent = `· ${byDay[day].length} réservation${byDay[day].length>1 ? "s" : ""}`;
        headingText.appendChild(countSpan);
        dayHeading.appendChild(headingText);

        const toggleBtn = document.createElement("span");
        toggleBtn.className = "album-day-toggle";
        const svgNS = "http://www.w3.org/2000/svg";
        const chevronSvg = document.createElementNS(svgNS,"svg");
        chevronSvg.setAttribute("width","15");
        chevronSvg.setAttribute("height","15");
        chevronSvg.setAttribute("viewBox","0 0 20 20");
        chevronSvg.setAttribute("fill","none");
        chevronSvg.setAttribute("stroke","currentColor");
        chevronSvg.setAttribute("stroke-width","2");
        chevronSvg.setAttribute("stroke-linecap","round");
        chevronSvg.setAttribute("stroke-linejoin","round");
        const chevronPath = document.createElementNS(svgNS,"path");
        chevronPath.setAttribute("d","M5 8l5 5 5-5");
        chevronSvg.appendChild(chevronPath);
        toggleBtn.appendChild(chevronSvg);
        dayHeading.appendChild(toggleBtn);

        dayHeading.addEventListener("click",()=>{
            dayGroup.classList.toggle("collapsed");
            toggleDayCollapsed(RESERVATIONS_COLLAPSE_KEY,currentTripId,day);
        });

        dayGroup.appendChild(dayHeading);

        const dayBody = document.createElement("div");
        dayBody.className = "album-day-body";

        byDay[day].forEach(activity=>{

            const item = document.createElement("div");
            item.className = "search-result-item";

            const hasAttachments = activityHasAttachments(day,activity.id);
            const categories = buildReservationCategories(day,activity,hasAttachments);

            const nameDiv = document.createElement("div");
            let suffix = "";
            if(activity.address && activity.address.trim()) suffix += " 📍";
            if(activity.reservationLink) suffix += " 🎫";
            if(hasAttachments) suffix += " 📎";
            nameDiv.textContent = `${activityIconPrefix(activity.type)}${activity.name}${suffix}`;

            const dayDiv = document.createElement("div");
            dayDiv.className = "search-result-day";
            dayDiv.textContent = activity.time || "";

            item.appendChild(nameDiv);
            item.appendChild(dayDiv);

            /* Une seule catégorie applicable (adresse/réservation/documents)
               → ouverte directement, sans étape en plus. Deux ou plus →
               petit menu ancré sur la ligne pour choisir (mockup B validé,
               2026-09-02) — avant ça, la réservation gagnait toujours
               contre les documents, sans aucun moyen d'accéder à l'autre.
               stopPropagation() : sinon ce même clic remonte jusqu'au
               listener document "clic à l'extérieur" (voir plus haut) qui
               referme le popover à l'instant même où il vient de s'ouvrir. */
            item.addEventListener("click",(e)=>{
                e.stopPropagation();
                closeChoicePopover();
                if(categories.length===1){
                    categories[0].action();
                }else if(categories.length>1){
                    openChoicePopover(item,categories);
                }
            });

            dayBody.appendChild(item);
        });

        dayGroup.appendChild(dayBody);
        reservationsList.appendChild(dayGroup);
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

/* Ne liste que les types réellement présents dans le voyage (avec une
   adresse, donc potentiellement localisables) — évite de proposer "Bar"/
   "Spectacle"/etc. dans le filtre si aucune activité de ce type n'existe,
   ce qui viderait systématiquement la carte. Object.keys(icons) donne
   l'ordre canonique déjà utilisé ailleurs plutôt qu'un ordre arbitraire. */
function populateMapTypeSelect(){

    const previousValue = mapTypeSelect.value;
    const presentTypes = new Set();

    Object.keys(planning).forEach(day=>{
        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            (planning[day][slot] || []).forEach(activity=>{
                if(activity.type && activity.address && activity.address.trim()){
                    presentTypes.add(activity.type);
                }
            });
        });
    });

    mapTypeSelect.innerHTML = "";

    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "Tous les types";
    mapTypeSelect.appendChild(allOpt);

    Object.keys(icons).forEach(type=>{
        if(!presentTypes.has(type)) return;
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = `${icons[type]} ${type}`;
        mapTypeSelect.appendChild(opt);
    });

    mapTypeSelect.value = presentTypes.has(previousValue) ? previousValue : "";
}

mapDaySelect.addEventListener("change",renderMapView);
mapTypeSelect.addEventListener("change",renderMapView);

/* --- Vue carte : volet "Jour" flottant (mockup C approuvé) — liste les
   activités localisées du filtre courant sous la carte, en plus des
   punaises ; toucher une ligne recentre la carte dessus. Remplace
   l'ancienne barre de filtres empilée qui prenait ~45% de l'écran sur
   mobile. Les options moins fréquentes (pays/recherche/offline/écran
   allumé) ont migré dans le menu "⋯" de l'en-tête (mapMoreBtn). --- */
const mapDaySheet = document.getElementById("mapDaySheet");
const mapDaySheetToggle = document.getElementById("mapDaySheetToggle");
const mapDaySheetList = document.getElementById("mapDaySheetList");
const mapDaySheetCount = document.getElementById("mapDaySheetCount");
const mapDaySheetDate = document.getElementById("mapDaySheetDate");
let mapMarkersByKey = {};

mapDaySheetToggle.addEventListener("click",(e)=>{
    if(e.target.closest("select")) return;
    mapDaySheet.classList.toggle("expanded");
});

function buildMapDaySheetRow(day,activity,showDayBadge,key){

    const row = document.createElement("button");
    row.type = "button";
    row.className = "map-day-sheet-row-item";

    const icon = document.createElement("span");
    icon.className = "map-day-sheet-row-icon";
    icon.textContent = icons[activity.type] || "📍";

    const info = document.createElement("span");
    info.className = "map-day-sheet-row-info";

    const name = document.createElement("span");
    name.className = "map-day-sheet-row-name";
    name.textContent = (showDayBadge ? `J${day} · ` : "") + activity.name;

    const time = document.createElement("span");
    time.className = "map-day-sheet-row-time";
    time.textContent = activity.time || "";

    info.appendChild(name);
    info.appendChild(time);
    row.appendChild(icon);
    row.appendChild(info);

    row.addEventListener("click",()=>{

        const marker = mapMarkersByKey[key];
        if(!marker) return;

        mapDaySheet.classList.remove("expanded");

        document.querySelectorAll("#mapDaySheetList .map-day-sheet-row-item.hl")
        .forEach(r=>r.classList.remove("hl"));
        row.classList.add("hl");

        mapInstance.setView(marker.getLatLng(),Math.max(mapInstance.getZoom(),15));
        marker.openPopup();
    });

    return row;
}

/* --- Vue carte : menu "⋯" (options moins fréquentes) — même schéma
   ouverture/fermeture que le menu options du coin (optionsMenuBtn), en
   instance séparée puisque c'est un bouton différent dans un autre
   en-tête plein écran. --- */
const mapMoreBtn = document.getElementById("mapMoreBtn");
// mapMorePanel déclaré tôt près d'optionsMenuPanel (voir le commentaire TDZ
// à cet endroit) — pas ici.

function closeMapMoreMenu(){
    mapMorePanel.hidden = true;
    mapMoreBtn.setAttribute("aria-expanded","false");
}

mapMoreBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isOpen = !mapMorePanel.hidden;
    mapMorePanel.hidden = isOpen;
    mapMoreBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
});

mapMorePanel.addEventListener("click",(e)=>{
    const item = e.target.closest(".menu-item");
    if(item && !item.hasAttribute("data-keep-menu-open")){
        closeMapMoreMenu();
    }
});

document.addEventListener("click",(e)=>{
    if(!mapMorePanel.hidden && !e.target.closest(".map-more-menu")){
        closeMapMoreMenu();
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape" && !mapMorePanel.hidden){
        closeMapMoreMenu();
        mapMoreBtn.focus();
    }
});

/* --- Filtre "pays de vacances" (réutilise le pays du logo choisi) --- */

const mapCountryToggle = document.getElementById("mapCountryToggle");
let mapCountryFilterActive = false;

function updateMapCountryToggleLabel(){
    const country = COUNTRIES[tripCountry];
    mapCountryToggle.textContent = country
        ? `🌍 ${country.fr} uniquement`
        : "🌍 Pays du voyage uniquement";
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

/* --- Météo du jour (Open-Meteo, gratuit, sans clé) ---
   Nécessite une date de départ (pour associer "Jour N" à une date réelle) ;
   sans elle, la carte reste masquée plutôt que d'afficher une donnée fausse. */

/* Un seul store partagé (WEATHER_CACHE_KEY) pour la météo à un jour
   (fetchAndShowWeather(), clé "lat,lon_YYYY-MM-DD") ET les prévisions à 7
   jours (fetchMultiDayWeather(), clé "lat,lon_forecast7") — sans collision
   possible tant que le suffixe d'un type ne peut pas ressembler à une date
   ISO. Toute NOUVELLE clé ajoutée ici (ex. un futur "forecast14") doit
   suivre la même règle : un suffixe qui ne peut jamais matcher
   YYYY-MM-DD, sinon un type de cache pourrait silencieusement écraser
   l'autre. */
const WEATHER_CACHE_KEY = "weatherCache";
const WEATHER_CACHE_TTL_MS = 3*60*60*1000;

const WEATHER_CODES = {
    0:{icon:"☀️",label:"Ciel dégagé"},
    1:{icon:"🌤️",label:"Plutôt dégagé"},
    2:{icon:"⛅",label:"Partiellement nuageux"},
    3:{icon:"☁️",label:"Couvert"},
    45:{icon:"🌫️",label:"Brouillard"},
    48:{icon:"🌫️",label:"Brouillard givrant"},
    51:{icon:"🌦️",label:"Bruine légère"},
    53:{icon:"🌦️",label:"Bruine"},
    55:{icon:"🌦️",label:"Bruine dense"},
    61:{icon:"🌧️",label:"Pluie légère"},
    63:{icon:"🌧️",label:"Pluie"},
    65:{icon:"🌧️",label:"Forte pluie"},
    71:{icon:"🌨️",label:"Neige légère"},
    73:{icon:"🌨️",label:"Neige"},
    75:{icon:"❄️",label:"Forte neige"},
    80:{icon:"🌦️",label:"Averses"},
    81:{icon:"🌧️",label:"Fortes averses"},
    82:{icon:"⛈️",label:"Averses violentes"},
    95:{icon:"⛈️",label:"Orage"},
    96:{icon:"⛈️",label:"Orage avec grêle"},
    99:{icon:"⛈️",label:"Orage violent"}
};

function weatherInfoFor(code){
    return WEATHER_CODES[code] || {icon:"🌡️",label:"Météo"};
}

function loadWeatherCache(){
    return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "{}");
}

function saveWeatherCache(cache){
    localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify(cache));
}

function toISODateLocal(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

const USER_LOCATION_TTL_MS = 15*60*1000;
let lastKnownPosition = null;
let geolocationRequestPending = false;

const REVERSE_GEOCODE_CACHE_KEY = "reverseGeocodeCache";

function loadReverseGeocodeCache(){
    return JSON.parse(localStorage.getItem(REVERSE_GEOCODE_CACHE_KEY) || "{}");
}

function saveReverseGeocodeCache(cache){
    localStorage.setItem(REVERSE_GEOCODE_CACHE_KEY,JSON.stringify(cache));
}

async function reverseGeocodeCity(lat,lon){

    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cache = loadReverseGeocodeCache();
    if(cache[key]) return cache[key];

    const response = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
        8000
    );

    await wait(1100);

    if(!response.ok) return "";

    const data = await response.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";

    if(city){
        cache[key] = city;
        saveReverseGeocodeCache(cache);
    }

    return city;
}

let geolocationForWeatherFailed = false;

async function requestUserLocationForWeather(){

    if((!navigator.geolocation && !nativeGeolocationAvailable()) || geolocationRequestPending || geolocationForWeatherFailed) return;
    geolocationRequestPending = true;

    try{
        /* enableHighAccuracy (2026-09-04, signalé "météo pas précise") :
           sans ça, le navigateur privilégie une position rapide via Wi-Fi/
           antennes-relais (souvent correcte à quelques centaines de mètres
           voire quelques km près) plutôt que le GPS — suffisant pour situer
           une ville, pas pour garantir la météo exacte du bon quartier.
           Coût : une position peut prendre un peu plus de temps à arriver
           (d'où timeout relevé en même temps), pas de changement si
           l'appareil n'a pas de puce GPS (il retombe sur sa meilleure
           source disponible). */
        const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:10000 });

        geolocationRequestPending = false;

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let city = "Ma position actuelle";

        try{
            const resolved = await reverseGeocodeCity(lat,lon);
            if(resolved) city = resolved;
        }catch(err){
            console.error("Géocodage inverse impossible :",err);
        }

        lastKnownPosition = { lat, lon, city, timestamp: Date.now() };
        renderDayWeather();
    }catch(err){
        geolocationRequestPending = false;
        geolocationForWeatherFailed = true;
        console.error("Géolocalisation pour la météo impossible :",err);
        renderDayWeather();
    }
}

const dayWeatherCard = document.getElementById("dayWeatherCard");
const weatherIcon = document.getElementById("weatherIcon");
const weatherCondition = document.getElementById("weatherCondition");
const weatherTemps = document.getElementById("weatherTemps");
const weatherDayDate = document.getElementById("weatherDayDate");
const weatherPlace = document.getElementById("weatherPlace");

function showWeatherCard(dayData,dateObj,label){
    dayWeatherCard.hidden = false;
    dayWeatherCard.classList.remove("weather-offline","weather-location-unavailable");
    weatherIcon.classList.remove("weather-spin");
    const info = weatherInfoFor(dayData.code);
    weatherIcon.textContent = info.icon;
    weatherCondition.textContent = info.label;

    const maxSpan = document.createElement("b");
    maxSpan.textContent = `${dayData.max}°`;
    weatherTemps.textContent = "";
    weatherTemps.appendChild(maxSpan);
    weatherTemps.appendChild(document.createTextNode(` / ${dayData.min}°`));

    weatherDayDate.textContent = capitalizeFrenchDate(dateObj.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}));
    weatherPlace.textContent = label || "";
}

function showWeatherOffline(){
    dayWeatherCard.hidden = false;
    dayWeatherCard.classList.remove("weather-location-unavailable");
    dayWeatherCard.classList.add("weather-offline");
    weatherIcon.classList.remove("weather-spin");
    weatherIcon.textContent = "📡";
    weatherCondition.textContent = "Météo indisponible pour le moment";
    weatherTemps.textContent = "";
    weatherDayDate.textContent = "";
    weatherPlace.textContent = "";
}

function showWeatherLoading(){
    dayWeatherCard.hidden = false;
    dayWeatherCard.classList.remove("weather-offline","weather-location-unavailable");
    weatherIcon.classList.add("weather-spin");
    weatherIcon.textContent = "";
    weatherCondition.textContent = "Localisation…";
    weatherTemps.textContent = "";
    weatherDayDate.textContent = "";
    weatherPlace.textContent = "";
}

function showWeatherLocationUnavailable(){
    dayWeatherCard.hidden = false;
    dayWeatherCard.classList.remove("weather-offline");
    dayWeatherCard.classList.add("weather-location-unavailable");
    weatherIcon.classList.remove("weather-spin");
    weatherIcon.textContent = "🧭";
    weatherCondition.textContent = "Localisation désactivée";
    weatherTemps.textContent = "";
    weatherDayDate.textContent = "";
    weatherPlace.textContent = "";
}

async function fetchAndShowWeather(lat,lon,dateObj,label){

    const dateStr = toISODateLocal(dateObj);
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}_${dateStr}`;
    const cache = loadWeatherCache();
    const cached = cache[cacheKey];

    if(cached && (Date.now()-cached.timestamp) < WEATHER_CACHE_TTL_MS){
        showWeatherCard(cached.data,dateObj,label);
        return;
    }

    /* navigator.onLine n'est pas fiable (peut être faux même avec une vraie
       connexion, selon le réseau/le pilote) — on tente toujours la requête
       et on ne bascule sur "hors ligne" qu'en cas d'échec réel. */
    try{

        const url =
            "https://api.open-meteo.com/v1/forecast?latitude="+lat
            + "&longitude="+lon
            + "&daily=weathercode,temperature_2m_max,temperature_2m_min"
            + "&timezone=auto&start_date="+dateStr+"&end_date="+dateStr;

        const response = await fetchWithTimeout(url,8000);

        if(!response.ok){
            throw new Error("Open-Meteo: réponse HTTP "+response.status);
        }

        const data = await response.json();

        if(!data.daily || !data.daily.time || !data.daily.time.length){
            throw new Error("Open-Meteo: pas de données pour cette date");
        }

        const dayWeather = {
            code: data.daily.weathercode[0],
            max: Math.round(data.daily.temperature_2m_max[0]),
            min: Math.round(data.daily.temperature_2m_min[0])
        };

        cache[cacheKey] = {data:dayWeather,timestamp:Date.now()};
        saveWeatherCache(cache);

        showWeatherCard(dayWeather,dateObj,label);

    }catch(err){
        console.error("Météo indisponible :",err);
        showWeatherOffline();
    }
}

async function renderDayWeather(){

    /* Météo en temps réel à la position actuelle : toujours prioritaire,
       quel que soit le jour affiché dans le planning (demande explicite de
       l'utilisateur — pas seulement pour "aujourd'hui"). */
    if(lastKnownPosition && (Date.now()-lastKnownPosition.timestamp) < USER_LOCATION_TTL_MS){
        await fetchAndShowWeather(lastKnownPosition.lat,lastKnownPosition.lon,new Date(),lastKnownPosition.city);
        return;
    }

    /* Pas de géolocalisation possible : plus de repli sur la météo du pays du
       voyage — état dédié, visuellement et textuellement différent de l'état
       hors-ligne. */
    if(geolocationForWeatherFailed || !navigator.geolocation){
        showWeatherLocationUnavailable();
        return;
    }

    /* Position pas encore connue mais pas encore tentée non plus : affiche un
       état de chargement et attend la réponse de la géolocalisation (succès
       ou échec) avant d'afficher quoi que ce soit d'autre. */
    if(!geolocationRequestPending){
        showWeatherLoading();
        requestUserLocationForWeather();
    }
}

/* --- Vue "Météo des prochains jours" (mockup B validé, voir la mémoire du
   projet) : ouverte en tapant la carte météo du Planning, dayWeatherCard
   porte data-profile-view="weatherForecastView" (voir la boucle générique
   [data-profile-view] plus bas, qui l'attache donc automatiquement — pas de
   gestionnaire de clic ni de fermeture spécifique nécessaires ici, cette
   vue est une .fullscreen-view.profile-sub-view standard comme Carte/
   Checklist). Même position que la carte météo du jour (lastKnownPosition,
   jamais la destination du voyage — voir renderDayWeather() ci-dessus). */

const WEATHER_FORECAST_DAYS = 7;
const weatherForecastPlace = document.getElementById("weatherForecastPlace");
const weatherForecastContent = document.getElementById("weatherForecastContent");
let weatherForecastDays = null;
let weatherForecastSelectedIndex = 0;
/* Heure dont les valeurs "à Xh" (précipitations/humidité/ressenti) sont
   affichées dans le résumé — mockup A validé, 2026-09-02. Remise à null au
   changement de jour pour retomber sur le défaut (première heure
   pertinente) au lieu de garder une heure qui n'existe pas forcément sur
   le nouveau jour. */
let weatherForecastSelectedHour = null;

async function fetchMultiDayWeather(lat,lon){

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}_forecast${WEATHER_FORECAST_DAYS}`;
    const cache = loadWeatherCache();
    const cached = cache[cacheKey];

    /* "sunrise" sert de marqueur de forme : une entrée déjà en cache (TTL
       3h) écrite par une version d'AVANT l'ajout de sunrise/humidity/
       feelsLike n'a pas cette clé du tout. Sans ce contrôle, humidité et
       ressenti resteraient invisibles (pas "undefined", juste absents,
       voir plus bas) jusqu'à l'expiration naturelle du cache — jusqu'à 3h
       après le déploiement. Signalé 2026-09-03 : re-fetch immédiat plutôt
       que d'attendre. */
    const cacheHasCurrentShape =
        cached && cached.data && cached.data.days &&
        cached.data.days[0] && cached.data.days[0].sunrise!==undefined;

    if(cacheHasCurrentShape && (Date.now()-cached.timestamp) < WEATHER_CACHE_TTL_MS){
        return cached.data;
    }

    const url =
        "https://api.open-meteo.com/v1/forecast?latitude="+lat
        + "&longitude="+lon
        + "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,sunrise,sunset"
        + "&hourly=temperature_2m,weathercode,precipitation_probability,relative_humidity_2m,apparent_temperature"
        + "&timezone=auto&forecast_days="+WEATHER_FORECAST_DAYS;

    const response = await fetchWithTimeout(url,8000);

    if(!response.ok){
        throw new Error("Open-Meteo: réponse HTTP "+response.status);
    }

    const data = await response.json();

    if(!data.daily || !data.daily.time || !data.daily.time.length){
        throw new Error("Open-Meteo: pas de données");
    }

    /* Regroupe les entrées horaires (un tableau plat sur les 7 jours, ex.
       "2026-09-10T14:00") par date — mockup B (vue Météo, 2026-09-02) : liste
       par heure sous le jour sélectionné. */
    const hoursByDate = {};
    if(data.hourly && data.hourly.time){
        data.hourly.time.forEach((t,i)=>{
            const date = t.slice(0,10);
            if(!hoursByDate[date]) hoursByDate[date] = [];
            hoursByDate[date].push({
                hour: parseInt(t.slice(11,13),10),
                code: data.hourly.weathercode[i],
                temp: Math.round(data.hourly.temperature_2m[i]),
                precipitation: data.hourly.precipitation_probability ? data.hourly.precipitation_probability[i] : null,
                humidity: data.hourly.relative_humidity_2m ? data.hourly.relative_humidity_2m[i] : null,
                feelsLike: data.hourly.apparent_temperature ? Math.round(data.hourly.apparent_temperature[i]) : null
            });
        });
    }

    // "HH:MM" en fuseau local (timezone=auto ci-dessus) — Open-Meteo renvoie
    // sunrise/sunset au format "2026-09-10T06:52", on ne garde que l'heure.
    const days = data.daily.time.map((dateStr,i)=>({
        date: dateStr,
        code: data.daily.weathercode[i],
        max: Math.round(data.daily.temperature_2m_max[i]),
        min: Math.round(data.daily.temperature_2m_min[i]),
        precipitation: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[i] : null,
        wind: data.daily.windspeed_10m_max ? Math.round(data.daily.windspeed_10m_max[i]) : null,
        sunrise: data.daily.sunrise ? data.daily.sunrise[i].slice(11,16) : null,
        sunset: data.daily.sunset ? data.daily.sunset[i].slice(11,16) : null,
        hours: hoursByDate[dateStr] || []
    }));

    cache[cacheKey] = {data:days,timestamp:Date.now()};
    saveWeatherCache(cache);

    return days;
}

function weatherForecastEmptyState(message){
    weatherForecastContent.textContent = "";
    const msg = document.createElement("p");
    msg.className = "weather-forecast-empty";
    msg.textContent = message;
    weatherForecastContent.appendChild(msg);
}

function drawWeatherForecast(){

    weatherForecastContent.textContent = "";
    if(!weatherForecastDays || !weatherForecastDays.length) return;

    const stripWrap = document.createElement("div");
    stripWrap.className = "weather-strip-wrap";
    const strip = document.createElement("div");
    strip.className = "weather-strip";

    weatherForecastDays.forEach((day,i)=>{

        const dateObj = new Date(day.date+"T00:00:00");
        const info = weatherInfoFor(day.code);

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "weather-chip";
        chip.classList.toggle("selected",i===weatherForecastSelectedIndex);
        chip.setAttribute("aria-pressed",String(i===weatherForecastSelectedIndex));

        const dayLabel = document.createElement("div");
        dayLabel.className = "weather-chip-day";
        dayLabel.textContent = i===0 ? "Auj." : capitalizeFrenchDate(dateObj.toLocaleDateString("fr-FR",{weekday:"short"}));
        chip.appendChild(dayLabel);

        const icon = document.createElement("div");
        icon.className = "weather-chip-icon";
        icon.textContent = info.icon;
        chip.appendChild(icon);

        const max = document.createElement("div");
        max.className = "weather-chip-max";
        max.textContent = `${day.max}°`;
        chip.appendChild(max);

        const min = document.createElement("div");
        min.className = "weather-chip-min";
        min.textContent = `${day.min}°`;
        chip.appendChild(min);

        chip.addEventListener("click",()=>{
            weatherForecastSelectedIndex = i;
            weatherForecastSelectedHour = null;
            drawWeatherForecast();
        });

        strip.appendChild(chip);
    });

    stripWrap.appendChild(strip);
    weatherForecastContent.appendChild(stripWrap);

    const selected = weatherForecastDays[weatherForecastSelectedIndex];
    const selectedDate = new Date(selected.date+"T00:00:00");
    const info = weatherInfoFor(selected.code);

    const summary = document.createElement("div");
    summary.className = "weather-summary-card";

    const top = document.createElement("div");
    top.className = "weather-summary-top";

    const summaryIcon = document.createElement("div");
    summaryIcon.className = "weather-summary-icon";
    summaryIcon.textContent = info.icon;
    top.appendChild(summaryIcon);

    const summaryText = document.createElement("div");
    summaryText.className = "weather-summary-text";

    const cond = document.createElement("div");
    cond.className = "weather-summary-cond";
    cond.textContent = info.label;
    summaryText.appendChild(cond);

    const dayLine = document.createElement("div");
    dayLine.className = "weather-summary-day";
    dayLine.textContent =
        (weatherForecastSelectedIndex===0 ? "Aujourd'hui — " : "")
        + capitalizeFrenchDate(selectedDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}));
    summaryText.appendChild(dayLine);

    top.appendChild(summaryText);

    const summaryTemps = document.createElement("div");
    summaryTemps.className = "weather-summary-temps";
    const maxB = document.createElement("b");
    maxB.textContent = `${selected.max}°`;
    summaryTemps.appendChild(maxB);
    summaryTemps.appendChild(document.createTextNode(` / ${selected.min}°`));
    top.appendChild(summaryTemps);

    summary.appendChild(top);

    /* Vent/lever/coucher : infos du jour entier, toujours affichées telles
       quelles (mockup A validé, 2026-09-02). L'indice UV envisagé un temps
       n'a finalement pas été retenu dans cette ligne. */
    if(selected.wind!=null || selected.sunrise || selected.sunset){
        const detailRow = document.createElement("div");
        detailRow.className = "weather-detail-row";
        if(selected.wind!=null){
            const wind = document.createElement("span");
            const windB = document.createElement("b");
            windB.textContent = `${selected.wind} km/h`;
            wind.append("Vent ",windB);
            detailRow.appendChild(wind);
        }
        if(selected.sunrise){
            const sunrise = document.createElement("span");
            const sunriseB = document.createElement("b");
            sunriseB.textContent = selected.sunrise;
            sunrise.append("Lever ",sunriseB);
            detailRow.appendChild(sunrise);
        }
        if(selected.sunset){
            const sunset = document.createElement("span");
            const sunsetB = document.createElement("b");
            sunsetB.textContent = selected.sunset;
            sunset.append("Coucher ",sunsetB);
            detailRow.appendChild(sunset);
        }
        summary.appendChild(detailRow);
    }

    /* Liste par heure (mockup B validé, 2026-09-02) : "|| []" au cas où une
       entrée déjà en cache (avant cet ajout, TTL 3h) n'a pas encore
       .hours — dégrade juste en "rien à afficher", pas de plantage. Pour
       AUJOURD'HUI, ne montre que les heures à venir (une heure déjà passée
       n'a aucun intérêt) ; pour un autre jour, les 24h au complet. */
    const hours = selected.hours || [];
    const isToday = weatherForecastSelectedIndex===0;
    const nowHour = getTripNow().getHours();

    const relevantHours = hours.filter(h=>!isToday || h.hour>=nowHour);

    /* Précipitations/humidité/ressenti varient dans la journée, contrairement
       à vent/lever/coucher — affichés "à Xh", Xh étant l'heure sélectionnée
       dans la liste plus bas (défaut : la première heure pertinente, donc
       l'heure actuelle ou la plus proche). Mockup A validé, 2026-09-02. */
    if(weatherForecastSelectedHour===null && relevantHours.length){
        weatherForecastSelectedHour = relevantHours[0].hour;
    }
    const hourData = relevantHours.find(h=>h.hour===weatherForecastSelectedHour) || relevantHours[0] || null;

    /* "!= null" (comparaison large, pas "!==") volontaire ci-dessous : une
       entrée déjà en cache (TTL 3h) écrite par la version d'AVANT l'ajout
       de humidity/feelsLike a des .hours sans ces deux clés du tout —
       hourData.humidity y vaut alors undefined, pas null. "!==null" les
       laissait passer (undefined!==null est vrai) et affichait
       littéralement "Humidité undefined %". Bug signalé 2026-09-02. */
    if(hourData && (hourData.precipitation!=null || hourData.humidity!=null || hourData.feelsLike!=null)){
        const hourlyRow = document.createElement("div");
        hourlyRow.className = "weather-detail-row weather-detail-row-hourly";

        const label = document.createElement("span");
        label.className = "weather-detail-hourly-label";
        const labelB = document.createElement("b");
        labelB.textContent = `${hourData.hour}h`;
        /* Espace insécable avant les ":" (2026-09-03) : un espace normal
           laissait le navigateur couper la ligne juste avant, isolant le
           ":" tout seul sous "À 14h" dans ce span étroit. */
        label.append("À ",labelB," :");
        hourlyRow.appendChild(label);

        if(hourData.precipitation!=null){
            const precip = document.createElement("span");
            const precipB = document.createElement("b");
            precipB.textContent = `${hourData.precipitation} %`;
            precip.append("Précipitations ",precipB);
            hourlyRow.appendChild(precip);
        }
        if(hourData.humidity!=null){
            const humidity = document.createElement("span");
            const humidityB = document.createElement("b");
            humidityB.textContent = `${hourData.humidity} %`;
            humidity.append("Humidité ",humidityB);
            hourlyRow.appendChild(humidity);
        }
        if(hourData.feelsLike!=null){
            const feels = document.createElement("span");
            const feelsB = document.createElement("b");
            feelsB.textContent = `${hourData.feelsLike}°`;
            feels.append("Ressenti ",feelsB);
            hourlyRow.appendChild(feels);
        }
        summary.appendChild(hourlyRow);
    }

    weatherForecastContent.appendChild(summary);

    if(relevantHours.length){
        const hourList = document.createElement("div");
        hourList.className = "weather-hour-list";

        relevantHours.forEach(h=>{
            const info = weatherInfoFor(h.code);

            const row = document.createElement("div");
            row.className = "weather-hour-row";
            if(isToday && h.hour===nowHour) row.classList.add("now");
            if(h.hour===weatherForecastSelectedHour) row.classList.add("selected");
            row.setAttribute("role","button");
            row.tabIndex = 0;
            row.setAttribute("aria-label",`Voir précipitations, humidité et ressenti à ${h.hour}h`);
            const selectThisHour = ()=>{
                weatherForecastSelectedHour = h.hour;
                drawWeatherForecast();
            };
            row.addEventListener("click",selectThisHour);
            row.addEventListener("keydown",(e)=>{
                if(e.key==="Enter" || e.key===" "){
                    e.preventDefault();
                    selectThisHour();
                }
            });

            const hourEl = document.createElement("span");
            hourEl.className = "weather-hour-time";
            hourEl.textContent = `${h.hour}h`;

            const iconEl = document.createElement("span");
            iconEl.className = "weather-hour-icon";
            iconEl.textContent = info.icon;

            const condEl = document.createElement("span");
            condEl.className = "weather-hour-cond";
            condEl.textContent = info.label;

            const precipEl = document.createElement("span");
            precipEl.className = "weather-hour-precip";
            /* Affiché même à 0% (2026-09-02) — cohérent avec le résumé du
               jour juste au-dessus, qui lui l'a toujours affiché sans
               condition de seuil. Le cacher à 0% donnait l'impression d'une
               donnée manquante par moments plutôt que d'un vrai 0%. */
            precipEl.textContent = h.precipitation!=null ? `💧${h.precipitation}%` : "";

            const tempEl = document.createElement("span");
            tempEl.className = "weather-hour-temp";
            tempEl.textContent = `${h.temp}°`;

            row.appendChild(hourEl);
            row.appendChild(iconEl);
            row.appendChild(condEl);
            row.appendChild(precipEl);
            row.appendChild(tempEl);
            hourList.appendChild(row);
        });

        weatherForecastContent.appendChild(hourList);
    }
}

async function renderWeatherForecast(){

    weatherForecastSelectedIndex = 0;
    weatherForecastSelectedHour = null;

    if(!lastKnownPosition || (Date.now()-lastKnownPosition.timestamp) >= USER_LOCATION_TTL_MS){
        weatherForecastPlace.textContent = "";
        weatherForecastEmptyState(
            navigator.geolocation
                ? "Localisation indisponible pour l'instant — réessaie depuis la carte météo du Planning."
                : "La géolocalisation n'est pas disponible sur cet appareil."
        );
        return;
    }

    weatherForecastPlace.textContent = lastKnownPosition.city;
    weatherForecastEmptyState("Chargement des prévisions…");

    try{
        weatherForecastDays = await fetchMultiDayWeather(lastKnownPosition.lat,lastKnownPosition.lon);
        drawWeatherForecast();
    }catch(err){
        console.error("Prévisions indisponibles :",err);
        weatherForecastEmptyState("Prévisions indisponibles pour le moment.");
    }
}

/* --- Photos du jour (stockage 100% local, IndexedDB — pas de synchro
   entre appareils, voir la mémoire du projet pour le pourquoi) --- */

/* CAPACITOR (2026-09-05) : nom de l'album dédié créé sur le téléphone via
   @capacitor-community/media (voir ensureNativePhotoAlbum() plus bas,
   près de nativeCameraAvailable()) — remplace le dossier Téléchargements
   générique utilisé jusque-là (downloadBlobToGallery/saveBlobToGallery). */
const NATIVE_PHOTO_ALBUM_NAME = "Tabi Go";

const PHOTO_DB_NAME = "planningPhotosDB";
const PHOTO_STORE_NAME = "photos";
let photoDBPromise = null;

/* Documents partagés (2026-09-03) : garde-fou de taille avant tentative
   d'upload cloud — évite qu'une sélection accidentelle (vidéo, etc.) ne
   génère un coût Storage récurrent. La sauvegarde locale, elle, n'est
   jamais bloquée par cette limite. */
const ATTACHMENT_MAX_UPLOAD_BYTES = 20*1024*1024;

function openPhotoDB(){
    if(photoDBPromise) return photoDBPromise;
    photoDBPromise = new Promise((resolve,reject)=>{
        if(!window.indexedDB){
            reject(new Error("IndexedDB indisponible"));
            return;
        }
        const req = indexedDB.open(PHOTO_DB_NAME,1);
        req.onupgradeneeded = ()=>{
            const db = req.result;
            if(!db.objectStoreNames.contains(PHOTO_STORE_NAME)){
                const store = db.createObjectStore(PHOTO_STORE_NAME,{keyPath:"id",autoIncrement:true});
                store.createIndex("day","day",{unique:false});
            }
        };
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>reject(req.error);
    });
    return photoDBPromise;
}

async function addDayPhoto(day,activityId,blob){
    const db = await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
        tx.objectStore(PHOTO_STORE_NAME).add({day,activityId:activityId||null,tripId:currentTripId,blob,timestamp:Date.now()});
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
    });
}

async function getDayPhotos(day){
    const db = await openPhotoDB();
    const dayPhotos = await new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readonly");
        const req = tx.objectStore(PHOTO_STORE_NAME).index("day").getAll(IDBKeyRange.only(day));
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>reject(req.error);
    });
    /* kind==="attachment" exclu : les documents d'activité (PDF, billets...)
       vivent dans le même store IndexedDB (voir plus bas, comme les reçus
       Tricount) mais n'ont rien à faire dans la pellicule photo du jour. */
    return dayPhotos.filter(photo=>photo.tripId===currentTripId && photo.kind!=="attachment");
}

async function getTripPhotos(tripId){
    const all = await getAllPhotos();
    /* !photo.expenseId : exclut aussi les reçus Tricount, qui vivent dans
       ce même store (day:null, activityId:null) et se seraient sinon
       retrouvés dans l'Album sous "Jour 0" (Number(null)===0) — jamais
       remarqué jusqu'ici faute de reçu existant au moment du test, corrigé
       au passage en ajoutant kind==="attachment" pour les documents. */
    return all.filter(photo=>photo.tripId===tripId && photo.kind!=="attachment" && !photo.expenseId);
}

async function getAllPhotos(){
    const db = await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readonly");
        const req = tx.objectStore(PHOTO_STORE_NAME).getAll();
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>reject(req.error);
    });
}

function mediaTypeFromBlob(blob){
    return (blob && blob.type && blob.type.startsWith("video/")) ? "video" : "image";
}

function extensionForBlob(blob){
    const type = (blob && blob.type) || "";
    if(type.includes("mp4")) return ".mp4";
    if(type.includes("webm")) return ".webm";
    if(type.includes("quicktime")) return ".mov";
    if(type.startsWith("video/")) return ".mp4";
    if(type.includes("png")) return ".png";
    if(type.includes("webp")) return ".webp";
    return ".jpg";
}

function createMediaThumbElement(url,type){
    if(type==="video"){
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        const badge = document.createElement("span");
        badge.className = "day-photo-video-badge";
        badge.textContent = "▶";
        return { media: video, badge };
    }
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    return { media: img, badge: null };
}

async function getPhotoById(id){
    const db = await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readonly");
        const req = tx.objectStore(PHOTO_STORE_NAME).get(id);
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>reject(req.error);
    });
}

/* Reçus Tricount : même store IndexedDB que les photos de journée (pas de
   day/activityId, un expenseId à la place). Pas de nouvel index — un scan
   complet via getAllPhotos() suffit, le nombre de reçus reste minime. */
async function addExpensePhoto(expenseId,blob){
    const db = await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
        tx.objectStore(PHOTO_STORE_NAME).add({day:null,activityId:null,expenseId,tripId:currentTripId,blob,timestamp:Date.now()});
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
    });
}

async function getExpensePhoto(expenseId){
    const all = await getAllPhotos();
    return all.find(photo=>photo.expenseId===expenseId && photo.tripId===currentTripId) || null;
}

async function getAllExpensePhotos(){
    const all = await getAllPhotos();
    return all.filter(photo=>photo.expenseId && photo.tripId===currentTripId);
}

/* getAllPhotos() + filtre manuel, pas getTripPhotos(tripId) : celle-ci
   exclut désormais exprès les reçus Tricount et les documents d'activité
   (kind:"attachment") pour ne pas polluer l'Album — mais une suppression
   de voyage doit au contraire tout effacer, ces deux types inclus. */
async function deleteTripPhotos(tripId){
    const all = await getAllPhotos();
    const records = all.filter(r=>r.tripId===tripId);
    for(const record of records){
        await deleteDayPhoto(record.id);
    }

    /* Nettoyage cloud best-effort (2026-09-03) : sans ça, des documents
       partagés supprimés localement resteraient orphelins dans Firebase
       Storage + l'index RTDB, invisibles et inatteignables depuis l'appli.
       Ne doit jamais bloquer/faire échouer la suppression du voyage
       elle-même (try/catch englobant). */
    if(syncDb && syncStorage && syncCode){
        try{
            await syncAuthReady;
            if(syncCode){
                const dirRef = syncStorage.ref(`attachments/${syncCode}/${tripId}`);
                const listing = await dirRef.listAll();
                await Promise.all(listing.items.map(item=>item.delete()));
                await syncDb.ref(`trips/${syncCode}/attachmentsIndex/${tripId}`).remove();
            }
        }catch(err){
            console.error("Nettoyage cloud des documents du voyage impossible :",err);
        }
    }
}

async function deleteDayPhoto(id){
    const db = await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
        tx.objectStore(PHOTO_STORE_NAME).delete(id);
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
    });
}

/* --- Documents d'activité (PDF, billets, réservations...) ---
   Même store IndexedDB que les photos (kind:"attachment" les distingue,
   voir getDayPhotos()/getTripPhotos() plus haut). Contrairement aux
   PHOTOS (qui restent volontairement 100% locales), les documents SE
   partagent entre appareils appairés depuis 2026-09-03 : le fichier lui-
   même est uploadé vers Firebase Storage (attachments/{syncCode}/{tripId}/
   {cloudId}) et son existence annoncée aux autres appareils via un index
   léger RTDB (trips/{syncCode}/attachmentsIndex/{tripId}), voir
   uploadAttachmentToCloud()/attachTripAttachmentsListener() plus bas.
   Téléchargement paresseux : un autre appareil ne récupère le fichier
   qu'au moment où son utilisateur tape dessus (downloadAndOpenAttachment()),
   jamais automatiquement en arrière-plan. fileName conservé (contrairement
   aux photos, où le nom n'a jamais d'importance) pour l'afficher dans la
   liste et le retrouver après un window.open() de l'URL objet. */
async function addActivityAttachment(day,activityId,file){

    const record = {
        day, activityId, tripId:currentTripId,
        kind:"attachment", fileName:file.name || "document",
        blob:file, timestamp:Date.now(),
        /* cloudId : identifiant STABLE inter-appareils, généré ici et
           jamais réutilisé — distinct de "id" (auto-increment IndexedDB
           local à CET appareil, inutilisable comme clé Storage/RTDB). */
        cloudId: generateId(),
        cloudSynced: false
    };

    const db = await openPhotoDB();
    const localId = await new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
        const addReq = tx.objectStore(PHOTO_STORE_NAME).add(record);
        tx.oncomplete = ()=>resolve(addReq.result);
        tx.onerror = ()=>reject(tx.error);
    });
    record.id = localId;

    if(file.size > ATTACHMENT_MAX_UPLOAD_BYTES){
        showToast(
            "Document trop volumineux pour être partagé (max 20 Mo) — conservé localement uniquement.",
            {type:"error"}
        );
        return;
    }

    /* Fire-and-forget : la sauvegarde locale ci-dessus a déjà réussi et ne
       doit JAMAIS dépendre du réseau. uploadAttachmentToCloud() gère déjà
       ses propres erreurs en interne, ce .catch() est juste un filet pour
       ne jamais laisser une rejection non gérée si un cas imprévu lui
       échappait. */
    uploadAttachmentToCloud(record).catch(err=>{
        console.error("Upload du document vers le cloud impossible :",err);
    });
}

async function getActivityAttachments(day,activityId){
    const db = await openPhotoDB();
    const dayRecords = await new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readonly");
        const req = tx.objectStore(PHOTO_STORE_NAME).index("day").getAll(IDBKeyRange.only(day));
        req.onsuccess = ()=>resolve(req.result);
        req.onerror = ()=>reject(req.error);
    });
    const localAttachments = dayRecords.filter(r=>
        r.tripId===currentTripId && r.kind==="attachment" && r.activityId===activityId
    );

    /* Fusion local ∪ distant, dédupliquée par cloudId (2026-09-03) : sans
       ce filtre, un document déjà téléchargé sur cet appareil apparaîtrait
       deux fois (une fois comme enregistrement local normal, une fois
       comme "stub" venu de l'index distant qui, lui, ne disparaît jamais
       juste parce qu'UN appareil a téléchargé le fichier). */
    const localCloudIds = new Set(localAttachments.filter(r=>r.cloudId).map(r=>r.cloudId));
    const remoteStubs = Object.entries(remoteAttachmentsIndex)
        .filter(([cloudId,meta])=>meta.day===day && meta.activityId===activityId && !localCloudIds.has(cloudId))
        .map(([cloudId,meta])=>({
            cloudId, day, activityId, fileName:meta.fileName, kind:"attachment",
            timestamp:meta.timestamp, size:meta.size, contentType:meta.contentType,
            pending:true
        }));

    return localAttachments.concat(remoteStubs);
}

/* --- Documents partagés : upload/téléchargement/suppression cloud ---
   Tout ce qui suit est spécifique aux documents (jamais les photos, qui
   restent 100% locales par choix explicite) : upload réel du fichier vers
   Firebase Storage + annonce légère de son existence via RTDB, pour que
   les autres appareils appairés puissent le voir puis le télécharger à la
   demande. Chaque fonction reste best-effort et n'empêche jamais l'action
   locale correspondante de réussir (ajout/suppression marchent toujours
   hors ligne ou sans appairage — seul le partage cloud est optionnel). */

async function markAttachmentCloudSynced(id){
    const db = await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
        const store = tx.objectStore(PHOTO_STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = ()=>{
            const record = getReq.result;
            if(record){
                record.cloudSynced = true;
                store.put(record);
            }
        };
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
    });
}

async function uploadAttachmentToCloud(record){
    if(!syncDb || !syncStorage || !syncCode || !currentTripId) return;

    await syncAuthReady;
    if(!syncCode) return; // délié pendant l'attente

    const path = `attachments/${syncCode}/${currentTripId}/${record.cloudId}`;
    await syncStorage.ref(path).put(record.blob,{contentType:record.blob.type || "application/octet-stream"});

    await syncDb.ref(`trips/${syncCode}/attachmentsIndex/${currentTripId}/${record.cloudId}`).set({
        day: record.day, activityId: record.activityId, fileName: record.fileName,
        kind: "attachment", size: record.blob.size, contentType: record.blob.type || "",
        timestamp: record.timestamp, deviceId: syncDeviceId
    });

    if(record.id!==undefined) await markAttachmentCloudSynced(record.id);
}

/* Filet de sécurité pour un ajout fait hors-ligne (ou pendant une coupure
   momentanée) : le fichier reste local-only indéfiniment tant que rien ne
   retente l'upload. Appelée au retour de connexion (.info/connected, voir
   plus bas) et à chaque (ré)attachement du listener d'index. */
async function retryPendingAttachmentUploads(){
    if(!syncDb || !syncStorage || !syncCode || !currentTripId) return;

    let records;
    try{
        records = await getAllPhotos();
    }catch(err){
        console.error("Impossible de lister les documents en attente d'envoi :",err);
        return;
    }

    const pending = records.filter(r=>
        r.tripId===currentTripId && r.kind==="attachment" && r.cloudId && !r.cloudSynced
    );

    for(const record of pending){
        try{
            await uploadAttachmentToCloud(record);
        }catch(err){
            console.error("Reprise d'envoi du document impossible :",err);
        }
    }
}

async function deleteCloudAttachment(cloudId){
    if(!syncDb || !syncStorage || !syncCode || !currentTripId) return;
    await syncAuthReady;
    if(!syncCode) return;
    await syncStorage.ref(`attachments/${syncCode}/${currentTripId}/${cloudId}`).delete();
    await syncDb.ref(`trips/${syncCode}/attachmentsIndex/${currentTripId}/${cloudId}`).remove();
}

/* Supprime une ligne "☁️ pas encore téléchargée" — aucun enregistrement
   local à effacer, seulement le fichier distant + son entrée d'index. */
async function deleteCloudOnlyAttachment(cloudId,day,activityId){
    try{
        await deleteCloudAttachment(cloudId);
    }catch(err){
        console.error("Suppression du document distant impossible :",err);
        showToast("Suppression impossible — réessaie plus tard.",{type:"error"});
        return;
    }
    delete remoteAttachmentsIndex[cloudId];
    await refreshActivityAttachmentCounts();
    renderActivities();
    if(!reservationsView.hidden) renderReservations();
    if(attachmentsModalDay===day && attachmentsModalActivityId===activityId) renderAttachmentsList();
}

/* Un document supprimé par un autre appareil doit aussi disparaître d'ici
   s'il avait déjà été téléchargé — sinon il resterait indéfiniment
   "présent" localement alors qu'il n'existe plus nulle part ailleurs.
   N'efface jamais un document ajouté localement sans cloudId (jamais
   partagé, donc jamais concerné). */
async function cascadeDeleteLocalByCloudIds(cloudIds){
    const cloudIdSet = new Set(cloudIds);
    let records;
    try{
        records = await getAllPhotos();
    }catch(err){
        console.error("Impossible de nettoyer les documents supprimés à distance :",err);
        return;
    }
    const toRemove = records.filter(r=>
        r.tripId===currentTripId && r.kind==="attachment" && r.cloudId && cloudIdSet.has(r.cloudId)
    );
    for(const record of toRemove){
        await deleteDayPhoto(record.id);
    }
}

/* Téléchargement paresseux : appelé uniquement quand l'utilisateur tape
   sur une ligne "☁️" dans la liste des documents d'une activité (jamais
   automatiquement). Une fois le fichier récupéré, il devient un
   enregistrement local normal (cloudId conservé pour la déduplication),
   mis en cache définitivement — pas de re-téléchargement au prochain
   affichage. */
async function downloadAndOpenAttachment(cloudId,day,activityId){

    if(!syncStorage){
        showToast("Téléchargement impossible : synchronisation indisponible.",{type:"error"});
        if(attachmentsModalDay===day && attachmentsModalActivityId===activityId) renderAttachmentsList();
        return;
    }

    const meta = remoteAttachmentsIndex[cloudId];
    if(!meta){
        showToast("Ce document n'est plus disponible.",{type:"error"});
        if(attachmentsModalDay===day && attachmentsModalActivityId===activityId) renderAttachmentsList();
        return;
    }

    /* Étape courante (2026-09-04) : "Failed to fetch" seul ne dit pas SI
       c'est getDownloadURL() (l'appel réseau du SDK vers l'API Firebase)
       ou le fetch() du fichier lui-même qui échoue — deux causes très
       différentes à diagnostiquer. Inclus dans le message d'erreur. */
    let step = "authentification";
    try{
        await syncAuthReady;
        const path = `attachments/${syncCode}/${currentTripId}/${cloudId}`;
        step = "obtention du lien";
        const url = await syncStorage.ref(path).getDownloadURL();
        step = "récupération du fichier";
        const resp = await fetch(url);
        if(!resp.ok) throw new Error("HTTP "+resp.status);
        const blob = await resp.blob();
        const file = new File([blob],meta.fileName,{type:meta.contentType || blob.type});

        step = "sauvegarde locale";
        const db = await openPhotoDB();
        await new Promise((resolve,reject)=>{
            const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
            tx.objectStore(PHOTO_STORE_NAME).add({
                day, activityId, tripId:currentTripId, kind:"attachment",
                fileName:meta.fileName, blob:file, timestamp:meta.timestamp,
                cloudId, cloudSynced:true
            });
            tx.oncomplete = resolve;
            tx.onerror = ()=>reject(tx.error);
        });

        await refreshActivityAttachmentCounts();
        renderActivities();
        if(!reservationsView.hidden) renderReservations();

        if(attachmentsModalDay===day && attachmentsModalActivityId===activityId){
            await renderAttachmentsList();
            const entry = lastAttachmentsGroup.find(g=>g.cloudId===cloudId);
            if(entry) openAttachmentLightbox(entry.id,lastAttachmentsGroup);
        }
    }catch(err){
        console.error("Téléchargement du document impossible :",err);
        /* Message détaillé (2026-09-04) : le générique précédent ne donnait
           aucune piste pour diagnostiquer un vrai échec (règles Storage pas
           encore propagées, objet introuvable, CORS...) sans ouvrir les
           outils de dev — hors de portée sur téléphone. */
        const detail = (err && (err.code || err.message)) || "erreur inconnue";
        showToast(`Téléchargement du document impossible — étape « ${step} » (${detail}).`,{type:"error",duration:8000});
        if(attachmentsModalDay===day && attachmentsModalActivityId===activityId) renderAttachmentsList();
    }
}

function detachTripAttachmentsListener(){
    if(attachmentsIndexRef){
        attachmentsIndexRef.off();
        attachmentsIndexRef = null;
    }
}

/* Miroir de attachTripHistoryListener() (plus bas dans ce fichier), mais
   pour l'index léger des documents partagés — jamais les fichiers
   eux-mêmes. Indépendant de syncAutoEnabled comme la présence/l'historique :
   recevoir un nouveau document est un événement ponctuel, pas un flux
   continu qu'on voudrait couper séparément. Doit être ré-appelée si
   currentTripId change SANS rechargement de page — seul adoptRemoteTrip()
   est dans ce cas (voir son propre commentaire). */
async function attachTripAttachmentsListener(){

    detachTripAttachmentsListener();
    if(!syncDb || !syncCode || !currentTripId) return;

    await syncAuthReady;
    if(!syncCode) return; // délié pendant l'attente

    attachmentsIndexRef = syncDb.ref(`trips/${syncCode}/attachmentsIndex/${currentTripId}`);

    attachmentsIndexRef.on("value",async (snapshot)=>{

        const previous = remoteAttachmentsIndex;
        const next = snapshot.val() || {};
        remoteAttachmentsIndex = next;

        const removedCloudIds = Object.keys(previous).filter(id=>!(id in next));
        if(removedCloudIds.length){
            await cascadeDeleteLocalByCloudIds(removedCloudIds);
        }

        await refreshActivityAttachmentCounts();
        renderActivities();
        if(!reservationsView.hidden) renderReservations();
        if(!attachmentsModal.hidden) renderAttachmentsList();

    },(err)=>{
        console.error("Erreur d'écoute des documents partagés :",err);
    });

    retryPendingAttachmentUploads();
}

/* Photos prises avant l'introduction de currentTripId (voyage multiple) :
   elles n'ont pas de tripId, donc les requêtes filtrées par voyage les
   ignoreraient silencieusement. Comme elles appartenaient forcément au
   voyage actif au moment où elles ont été prises, on les rattache une
   fois pour toutes au tripId courant au premier chargement après la mise
   à jour. Sans effet (aucune ligne à mettre à jour) pour un compte déjà
   migré ou qui n'a jamais eu de photo. */
const PHOTO_MIGRATION_DONE_KEY = "photoMigrationDone";

/* Ne doit tourner qu'une seule fois, jamais. Sans ce garde-fou, chaque
   rechargement retenterait la migration et pourrait rattacher au voyage
   *actif à ce moment-là* une photo qui se retrouverait un jour sans tripId
   pour une tout autre raison (bug futur, écriture interrompue) — exactement
   le genre de fuite "les données du brouillon suivent le nouveau voyage"
   déjà rencontré avec le planning/Tricount (voir welcomeCreateBtn). */
async function migrateLegacyPhotos(){
    if(localStorage.getItem(PHOTO_MIGRATION_DONE_KEY)) return;
    try{
        const db = await openPhotoDB();
        await new Promise((resolve,reject)=>{
            const tx = db.transaction(PHOTO_STORE_NAME,"readwrite");
            const req = tx.objectStore(PHOTO_STORE_NAME).openCursor();
            req.onsuccess = ()=>{
                const cursor = req.result;
                if(!cursor){ resolve(); return; }
                if(!cursor.value.tripId){
                    const record = cursor.value;
                    record.tripId = currentTripId;
                    cursor.update(record);
                }
                cursor.continue();
            };
            req.onerror = ()=>reject(req.error);
        });
        localStorage.setItem(PHOTO_MIGRATION_DONE_KEY,"1");
    }catch(err){
        console.error("Migration des photos existantes impossible :",err);
    }
}

const dayPhotoGallery = document.getElementById("dayPhotoGallery");
const dayPhotoInput = document.getElementById("dayPhotoInput");
const photoLightbox = document.getElementById("photoLightbox");
const photoLightboxImage = document.getElementById("photoLightboxImage");
const photoLightboxVideo = document.getElementById("photoLightboxVideo");
const photoLightboxClose = document.getElementById("photoLightboxClose");
const photoLightboxDelete = document.getElementById("photoLightboxDelete");
const photoLightboxSave = document.getElementById("photoLightboxSave");
const photoLightboxCounter = document.getElementById("photoLightboxCounter");
const photoLightboxCaption = document.getElementById("photoLightboxCaption");
const photoLightboxProgress = document.getElementById("photoLightboxProgress");
const photoLightboxPlayToggle = document.getElementById("photoLightboxPlayToggle");

let pendingPhotoDay = null;
let pendingPhotoActivityId = null;
let dayPhotoObjectUrls = [];
let openLightboxPhotoId = null;
let lightboxGroup = [];
let lightboxIndex = 0;
let lightboxAutoplayTimer = null;
const LIGHTBOX_AUTOPLAY_MS = 4000;
let lightboxOwnObjectUrls = [];

function openDayPhotoPicker(day,activityId){
    pendingPhotoDay = day;
    pendingPhotoActivityId = activityId || null;
    dayPhotoInput.click();
}

function refreshOpenPhotoViews(){
    renderDayPhotos();
    if(!albumView.hidden) renderAlbumView();
    renderTricountExpenses();
}

/* Sans fenêtre de partage : téléchargement direct (dossier Téléchargements),
   que la plupart des galeries Android (Google Photos y compris) indexent
   aussi bien que l'appareil photo/DCIM. Utilisée pour la caméra maison, où
   ouvrir la fenêtre de partage après CHAQUE prise casse le flux tap/hold.

   CAPACITOR (2026-09-05, résolu) : voir saveBlobToNativeGalleryAlbum() plus
   bas (près de nativeCameraAvailable()) — @capacitor-community/media écrit
   maintenant vraiment dans un album "Tabi Go" dédié en natif. Cette
   fonction reste le repli web/PWA (impossible d'y écrire dans un album
   choisi depuis un navigateur normal, voir [[photo_storage_feature]]). */
function downloadBlobToGallery(blob,fileName){
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return "downloaded";
}

/* Repli générique (fenêtre de partage puis téléchargement) — partagé entre
   les photos (saveBlobToGallery(), quand l'album natif dédié est
   indisponible/échoue) et les PDF natifs (exportPrintViewAsPdf() plus bas,
   qui n'a jamais de sens dans un album photo). */
async function shareOrDownloadFile(blob,fileName){

    const file = new File([blob],fileName,{type:blob.type || "application/octet-stream"});

    if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
            await navigator.share({files:[file]});
            return "shared";
        }catch(err){
            if(err && err.name==="AbortError") return "cancelled";
            console.error("Partage impossible :",err);
        }
    }

    return downloadBlobToGallery(file,fileName);
}

async function saveBlobToGallery(blob,fileName){
    if(await saveBlobToNativeGalleryAlbum(blob,fileName)) return "saved-native-album";
    return shareOrDownloadFile(blob,fileName);
}

dayPhotoInput.addEventListener("change",async ()=>{

    const file = dayPhotoInput.files[0];
    dayPhotoInput.value = "";

    if(!file || pendingPhotoDay===null) return;

    /* Déclenché en premier, avant tout await, pour profiter du geste
       utilisateur encore "frais" issu du sélecteur photo — navigator.share()
       exige une interaction récente, et attendre l'écriture IndexedDB
       d'abord risquerait de la perdre. */
    const galleryFileName = `photo_jour${pendingPhotoDay}_${Date.now()}${extensionForBlob(file)}`;
    saveBlobToGallery(file,galleryFileName).catch(err=>{
        console.error("Enregistrement dans la galerie impossible :",err);
    });

    try{
        await addDayPhoto(pendingPhotoDay,pendingPhotoActivityId,file);
        refreshOpenPhotoViews();
        showToast("Photo ajoutée.",{type:"success",duration:2500});
    }catch(err){
        console.error("Impossible d'enregistrer la photo :",err);
        showToast("Impossible d'enregistrer la photo sur cet appareil.",{type:"error"});
    }

    pendingPhotoDay = null;
    pendingPhotoActivityId = null;
});

/* --- Vue caméra maison : appui court = photo, rester appuyé = vidéo ---
   `<input type=file capture>` ne permet pas ce geste (c'est l'appli caméra
   native de l'OS qui décide de son interface, pas la page web) : il faut
   son propre aperçu live (getUserMedia) + son propre bouton obturateur.

   CAPACITOR : toute cette vue (openDayCameraView → cameraShutterBtn →
   capturePhotoFromCamera/startCameraRecording) est le point à remplacer par
   @capacitor/camera si l'app devient une appli native — Camera.getPhoto()
   donne la pleine résolution du capteur là où getUserMedia() plafonne. Le
   plus simple sera un nouveau chemin dans openDayCameraView() qui appelle le
   plugin natif quand isNativeApp() est vrai, et ne touche à rien d'autre
   (addDayPhoto/refreshOpenPhotoViews restent les mêmes derrière). */

const cameraView = document.getElementById("cameraView");
const cameraPreview = document.getElementById("cameraPreview");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCloseBtn = document.getElementById("cameraCloseBtn");
const cameraTorchBtn = document.getElementById("cameraTorchBtn");
const cameraSwitchBtn = document.getElementById("cameraSwitchBtn");
const cameraGalleryBtn = document.getElementById("cameraGalleryBtn");
const cameraShutterBtn = document.getElementById("cameraShutterBtn");
const cameraRecordingIndicator = document.getElementById("cameraRecordingIndicator");
const cameraRecordingTimer = document.getElementById("cameraRecordingTimer");
const cameraReview = document.getElementById("cameraReview");
const cameraReviewImage = document.getElementById("cameraReviewImage");
const cameraReviewVideo = document.getElementById("cameraReviewVideo");
const cameraRetakeBtn = document.getElementById("cameraRetakeBtn");
const cameraKeepBtn = document.getElementById("cameraKeepBtn");

const CAMERA_HOLD_THRESHOLD_MS = 350;

let cameraStream = null;
let cameraFacingMode = "environment";
let cameraMediaRecorder = null;
let cameraRecordedChunks = [];
let cameraHoldTimer = null;
let cameraIsRecording = false;
let cameraRecordingCancelled = false;
let cameraRecordingStartTime = 0;
let cameraRecordingTimerInterval = null;

/* Flash/torche : capacité expérimentale de MediaStreamTrack, surtout Chrome
   Android — absente sur la plupart des navigateurs iOS. Le bouton reste
   caché (voir startCameraStream) tant que getCapabilities().torch n'existe
   pas, plutôt que d'afficher un bouton qui ne ferait rien. */
let cameraTorchTrack = null;
let cameraTorchOn = false;

/* Zoom pincé : même capacité expérimentale (getCapabilities().zoom), pas de
   repli CSS "faux zoom" volontairement — un zoom visuel sur l'aperçu qui ne
   changerait rien à la vraie capture serait trompeur (photo/vidéo cadrée
   différemment de ce qui était affiché). Zoom réel ou pas de zoom du tout. */
let cameraZoomTrack = null;
let cameraZoomCapabilities = null;
let cameraActivePointers = new Map();
let cameraZoomStartDistance = 0;
let cameraZoomStartValue = 1;

let pendingCapturedBlob = null;
let pendingCapturedType = null;
let cameraReviewObjectUrl = null;

/* "day" (par défaut) : la prise part vers addDayPhoto()/l'Album, comme
   avant. "expense" : la prise part vers le reçu Tricount en cours de saisie
   à la place — même vue caméra, juste une destination différente une fois
   la photo gardée (voir handleCapturedCameraMedia). */
let cameraCaptureMode = "day";

/* CAPACITOR (plugin réel ajouté 2026-09-04, après un premier test sur
   téléphone où la qualité/vitesse de la caméra maison — getUserMedia,
   plafonnée bien en dessous du capteur réel — a été jugée insuffisante) :
   @capacitor/camera prend le relais pour la PHOTO quand disponible —
   pipeline natif (rapide, pleine résolution), enregistrement direct dans
   la galerie (saveToGallery:true). Décision explicite acceptée par
   l'utilisateur : ce chemin perd le geste "rester appuyé = vidéo" (l'appli
   caméra native ne le permet pas) — la caméra maison (avec ce geste)
   reste utilisée telle quelle sur le web/PWA, où ce plugin n'existe pas.
   Repli automatique vers la caméra maison si le plugin natif échoue pour
   une raison quelconque (pas seulement l'annulation) : jamais de cul-de-sac
   silencieux. */
function nativeCameraAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera);
}

/* CAPACITOR (2026-09-05) : album galerie dédié ("Tabi Go") plutôt que le
   dossier Téléchargements générique. @capacitor-community/media identifie
   les albums Android par un identifiant (pas juste un nom, changement de
   comportement de la lib) — on le récupère une seule fois via getAlbums()/
   createAlbum() puis on le garde en mémoire pour le reste de la session
   (pas besoin de le refaire à chaque photo). */
let nativePhotoAlbumIdPromise = null;

function nativePhotoAlbumAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Media);
}

async function ensureNativePhotoAlbum(){

    if(!nativePhotoAlbumAvailable()) return null;

    if(!nativePhotoAlbumIdPromise){
        nativePhotoAlbumIdPromise = (async()=>{
            const Media = window.Capacitor.Plugins.Media;
            try{
                const { albums } = await Media.getAlbums();
                const existing = (albums || []).find(a=>a.name===NATIVE_PHOTO_ALBUM_NAME);
                if(existing) return existing.identifier;
                const created = await Media.createAlbum({name:NATIVE_PHOTO_ALBUM_NAME});
                return created.identifier;
            }catch(err){
                console.error("Album photo natif indisponible :",err);
                return null;
            }
        })();
    }

    return nativePhotoAlbumIdPromise;
}

async function blobToDataUrl(blob){
    return new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload = ()=>resolve(reader.result);
        reader.onerror = ()=>reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

/* Retourne true seulement si la photo a vraiment été écrite dans l'album
   natif — false (jamais une exception) pour laisser l'appelant retomber
   sur le repli web habituel (partage/téléchargement), jamais de
   cul-de-sac silencieux. */
async function saveBlobToNativeGalleryAlbum(blob,fileName){

    if(!nativePhotoAlbumAvailable()) return false;

    try{
        const albumIdentifier = await ensureNativePhotoAlbum();
        if(!albumIdentifier) return false;

        const path = await blobToDataUrl(blob);
        await window.Capacitor.Plugins.Media.savePhoto({path,albumIdentifier,fileName});
        return true;
    }catch(err){
        console.error("Écriture dans l'album photo natif impossible :",err);
        return false;
    }
}

async function fetchMediaResultBlob(result){
    const src = result.webPath || (window.Capacitor && window.Capacitor.convertFileSrc ? window.Capacitor.convertFileSrc(result.uri) : result.uri);
    const response = await fetch(src);
    return await response.blob();
}

async function captureNativePhotoOrFallback(){
    try{
        const result = await window.Capacitor.Plugins.Camera.takePhoto({
            quality: 100,
            saveToGallery: false, // écriture dans l'album "Tabi Go" gérée juste en dessous, pas l'album générique
            correctOrientation: true
        });
        const blob = await fetchMediaResultBlob(result);
        const savedToAlbum = await saveBlobToNativeGalleryAlbum(blob,`photo_jour${pendingPhotoDay}_${Date.now()}.jpg`);
        await handleCapturedCameraMedia(blob,savedToAlbum);
    }catch(err){
        // L'utilisateur a annulé depuis l'appli caméra native (retour, croix...)
        // — pas une vraie erreur, pas de repli, juste remettre l'état à zéro.
        if(err && (err.message || err.code || "").toLowerCase().includes("cancel")){
            pendingPhotoDay = null;
            pendingPhotoActivityId = null;
            cameraCaptureMode = "day";
            return;
        }
        console.error("Caméra native indisponible, repli sur la caméra intégrée :",err);
        showToast("Caméra native indisponible — utilise la caméra intégrée.",{type:"error"});
        cameraView.hidden = false;
        await startCameraStream();
    }
}

/* --- Traduction par appareil photo (2026-09-05) ---
   100% natif (@capacitor-mlkit/text-recognition + language-identification
   + translation — gratuit, hors-ligne une fois le modèle téléchargé, basé
   sur Google ML Kit) : aucun équivalent web, bouton masqué hors
   isNativeApp(). Capture une photo (Camera.takePhoto, resultType:"uri" —
   processImage() a besoin d'un vrai chemin de fichier, contrairement au
   reste de l'appli qui travaille en blob), détecte le texte + sa langue,
   traduit vers le français (TRANSLATE_TARGET_LANGUAGE), puis superpose la
   traduction par-dessus l'image à la position de chaque bloc détecté
   (boundingBox de processImage(), mis à l'échelle sur la taille RÉELLEMENT
   affichée de l'image — pas sa résolution native). */

const TRANSLATE_TARGET_LANGUAGE = "fr";

function nativeTranslationAvailable(){
    return isNativeApp() && !!(window.Capacitor && window.Capacitor.Plugins
        && window.Capacitor.Plugins.TextRecognition
        && window.Capacitor.Plugins.LanguageIdentification
        && window.Capacitor.Plugins.Translation);
}

const translateBtn = document.getElementById("translateBtn");
const translateView = document.getElementById("translateView");
const translateImage = document.getElementById("translateImage");
const translateOverlay = document.getElementById("translateOverlay");
const translateStatus = document.getElementById("translateStatus");
const translateCloseBtn = document.getElementById("translateCloseBtn");

translateBtn.hidden = !nativeTranslationAvailable();

function closeTranslateView(){
    translateView.hidden = true;
    translateOverlay.innerHTML = "";
    if(translateImage.src) URL.revokeObjectURL(translateImage.src);
    translateImage.src = "";
    translateImage.onload = null;
}

translateCloseBtn.addEventListener("click",closeTranslateView);

function setTranslateStatus(message){
    if(!message){
        translateStatus.hidden = true;
        return;
    }
    translateStatus.hidden = false;
    translateStatus.textContent = message;
}

/* Depuis Capacitor 8, le flux caméra Android par défaut (IonCameraFlow) ne
   renvoie plus jamais de champ "path" — seulement "webPath", au format
   <serveur webview>/_capacitor_file_<chemin réel absolu>. TextRecognition.
   processImage() a besoin du vrai chemin natif (pas de l'URL webview), donc
   on le reconstruit en retirant ce préfixe (même logique que native-bridge.js
   côté Capacitor). Sans ça, photo.path est undefined et ML Kit échoue avec
   "path must be provided." — confirmé via adb logcat sur appareil réel.
   Le plugin fait ensuite Uri.parse(path) : un chemin absolu nu ("/data/...")
   n'a pas de scheme et Android échoue avec "No content provider" — il faut
   le préfixer en "file://" (photo.path, lui, contient déjà ce scheme car il
   vient directement d'un Uri.toString() côté plugin caméra). Confirmé lui
   aussi via adb logcat sur appareil réel après le premier correctif. */
function nativeFilePathFromCameraResult(photo){
    if(photo.path) return photo.path;
    const marker = "/_capacitor_file_";
    const idx = photo.webPath ? photo.webPath.indexOf(marker) : -1;
    return idx!==-1 ? "file://"+photo.webPath.slice(idx+marker.length) : null;
}

/* Le français traduit est presque toujours plus long que le texte source.
   Sur une étiquette étroite au texte dense, certaines phrases traduites
   restent trop longues pour tenir sur une seule ligne même à une taille de
   police minimale lisible — les forcer sur une ligne (essayé d'abord)
   déclenchait le filet de sécurité "…" et coupait des mots entiers.
   fitTranslateBoxText répartit donc le texte sur plusieurs lignes si besoin,
   en réduisant la police jusqu'à ce que TOUT le texte tienne dans la
   hauteur réellement disponible (l'espace jusqu'à la ligne détectée
   suivante) — l'ellipsis CSS ne sert alors plus que de filet de sécurité
   pour les cas vraiment extrêmes (texte énorme dans un espace minuscule). */
function fitTranslateBoxText(text,maxWidth,maxHeight,initialFontSize){
    const canvas = fitTranslateBoxText._canvas || (fitTranslateBoxText._canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    // Doit mesurer avec la police RÉELLEMENT affichée (Inter, pas un
    // "sans-serif" générique) — l'écart entre les deux faisait déborder le
    // texte réel de la largeur calculée de quelques px, juste assez pour
    // que le filet de sécurité CSS (text-overflow:ellipsis) coupe des
    // caractères. Confirmé en direct sur appareil réel (débogage WebView).
    const fontFamily = fitTranslateBoxText._fontFamily || (fitTranslateBoxText._fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif");
    // Marge de sécurité : measureText (canvas) et le rendu DOM réel peuvent
    // encore différer de quelques px (arrondis, kerning) à police identique.
    const safeMaxWidth = maxWidth*0.94;
    const lineHeightRatio = 1.15;

    function wrap(fontSize){
        ctx.font = fontSize+"px "+fontFamily;
        const words = text.split(" ");
        const wrapped = [];
        let current = "";
        for(const word of words){
            const test = current ? current+" "+word : word;
            if(current==="" || ctx.measureText(test).width<=safeMaxWidth){
                current = test;
            }else{
                wrapped.push(current);
                current = word;
            }
        }
        if(current) wrapped.push(current);
        return wrapped;
    }

    let fontSize = initialFontSize;
    let wrappedLines = wrap(fontSize);
    while(wrappedLines.length*fontSize*lineHeightRatio > maxHeight && fontSize > 5){
        fontSize -= 0.5;
        wrappedLines = wrap(fontSize);
    }

    ctx.font = fontSize+"px "+fontFamily;
    const width = Math.min(safeMaxWidth, Math.max(0,...wrappedLines.map(l=>ctx.measureText(l).width)));
    return { fontSize, lines: wrappedLines, lineHeight: fontSize*lineHeightRatio, width };
}

async function startPhotoTranslation(){

    if(!nativeTranslationAvailable()) return;
    optionsMenuPanel.hidden = true;

    const Camera = window.Capacitor.Plugins.Camera;

    let photo;
    try{
        photo = await Camera.takePhoto({quality:90,resultType:"uri",correctOrientation:true});
    }catch(err){
        if(err && (err.message || err.code || "").toLowerCase().includes("cancel")) return;
        console.error("Caméra indisponible pour la traduction :",err);
        showToast("Caméra indisponible.",{type:"error"});
        return;
    }

    translateView.hidden = false;
    translateOverlay.innerHTML = "";
    setTranslateStatus("Analyse du texte…");

    try{
        const blob = await fetchMediaResultBlob(photo);
        translateImage.src = URL.createObjectURL(blob);
        // Attend le vrai rendu (naturalWidth/clientWidth) avant de calculer
        // l'échelle des blocs traduits — sans ça, un chargement plus lent
        // que d'habitude donnerait des positions fausses (0x0).
        await new Promise(resolve=>{ translateImage.onload = resolve; });

        const filePath = nativeFilePathFromCameraResult(photo);
        if(!filePath){
            setTranslateStatus("Traduction impossible sur cet appareil.");
            return;
        }

        const { text, blocks } = await window.Capacitor.Plugins.TextRecognition.processImage({path:filePath});

        if(!text.trim()){
            setTranslateStatus("Aucun texte détecté sur cette photo.");
            return;
        }

        const { language: detectedLanguage } = await window.Capacitor.Plugins.LanguageIdentification.identifyLanguage({text});
        const sourceLanguage = detectedLanguage!=="und" ? detectedLanguage : "en";

        if(sourceLanguage===TRANSLATE_TARGET_LANGUAGE){
            setTranslateStatus("Ce texte semble déjà être en français.");
            return;
        }

        setTranslateStatus("Traduction en cours (peut prendre un instant la première fois)…");

        const scaleX = translateImage.clientWidth / translateImage.naturalWidth;
        const scaleY = translateImage.clientHeight / translateImage.naturalHeight;
        let translatedAny = false;

        // Traduit ligne par ligne plutôt que bloc par bloc : un bloc ML Kit
        // regroupe plusieurs lignes (souvent sans rapport entre elles, avec
        // des retours à la ligne bruts dans le texte), ce que le petit modèle
        // de traduction embarqué (hors-ligne) gère mal — il donne de bien
        // meilleurs résultats sur une phrase courte et isolée. En prime, le
        // cadre de chaque ligne colle mieux au texte que celui du bloc entier.
        // Triées par position verticale : sur du texte dense, les boundingBox
        // de lignes voisines renvoyées par ML Kit se touchent ou se
        // chevauchent parfois nativement de quelques px (constaté en direct
        // sur appareil réel via débogage WebView) — on limite donc la hauteur
        // de chaque bloc à l'espace réel disponible jusqu'à la ligne
        // suivante plutôt que de faire confiance telle quelle à sa propre
        // boundingBox.
        const lines = blocks.flatMap(block=>block.lines || [])
            .filter(line=>line.text.trim() && line.boundingBox)
            .sort((a,b)=>a.boundingBox.top-b.boundingBox.top);

        for(let i=0;i<lines.length;i++){
            const line = lines[i];
            try{
                const { text: translated } = await window.Capacitor.Plugins.Translation.translate({
                    text: line.text,
                    sourceLanguage,
                    targetLanguage: TRANSLATE_TARGET_LANGUAGE
                });

                const thisTop = line.boundingBox.top*scaleY;
                const rawLineHeight = (line.boundingBox.bottom-line.boundingBox.top)*scaleY;

                // Budget de hauteur disponible : jusqu'à la ligne détectée
                // suivante (avec une petite marge), ou jusqu'au bas de
                // l'image pour la toute dernière ligne. Sert à autoriser le
                // texte à passer sur 2 lignes quand une seule ne suffit pas,
                // sans jamais empiéter sur le bloc voisin.
                let availableHeight;
                if(i+1 < lines.length){
                    availableHeight = Math.max(4, lines[i+1].boundingBox.top*scaleY - thisTop - 1);
                }else{
                    availableHeight = Math.max(rawLineHeight, translateImage.clientHeight - thisTop - 4);
                }

                const centerX = (line.boundingBox.left+line.boundingBox.right)/2*scaleX;
                const baseFontSize = Math.max(7,Math.min(13,rawLineHeight*0.72));

                // Largeur d'origine de la ligne détectée : point de départ,
                // pas une limite — le bloc peut s'élargir jusqu'aux bords de
                // l'image (centré sur la ligne d'origine) pour laisser la
                // traduction, plus longue, tenir sans réduire la police plus
                // que nécessaire. Si même ça ne suffit pas (phrase très
                // longue sur une étiquette étroite), le texte passe sur
                // plusieurs lignes plutôt que d'être tronqué.
                const maxAvailableWidth = translateImage.clientWidth - 8;
                const { fontSize, lines: wrappedLines, lineHeight, width: textWidth } =
                    fitTranslateBoxText(translated,maxAvailableWidth,availableHeight,baseFontSize);
                const boxWidth = Math.min(maxAvailableWidth, textWidth + 8);
                const boxHeight = wrappedLines.length*lineHeight;
                const boxLeft = Math.max(0, Math.min(centerX - boxWidth/2, translateImage.clientWidth - boxWidth));

                const overlayEl = document.createElement("div");
                overlayEl.className = "translate-block";
                overlayEl.style.left = boxLeft+"px";
                overlayEl.style.top = thisTop+"px";
                overlayEl.style.width = boxWidth+"px";
                overlayEl.style.height = boxHeight+"px";
                overlayEl.style.fontSize = fontSize+"px";
                overlayEl.style.lineHeight = lineHeight+"px";
                if(wrappedLines.length>1){
                    // Plusieurs lignes calculées par fitTranslateBoxText :
                    // pre-line respecte les retours à la ligne qu'on a nous-
                    // mêmes choisis (contrairement à nowrap, la valeur par
                    // défaut de .translate-block pour le cas à une ligne).
                    overlayEl.style.whiteSpace = "pre-line";
                    overlayEl.textContent = wrappedLines.join("\n");
                }else{
                    overlayEl.textContent = wrappedLines[0] || translated;
                }
                translateOverlay.appendChild(overlayEl);
                translatedAny = true;
            }catch(err){
                console.error("Traduction d'une ligne impossible :",err);
            }
        }

        setTranslateStatus(translatedAny ? "" : "Traduction impossible sur cet appareil.");
    }catch(err){
        console.error("Traduction par photo impossible :",err);
        setTranslateStatus("Traduction impossible sur cet appareil.");
    }
}

translateBtn.addEventListener("click",startPhotoTranslation);

async function openDayCameraView(day,activityId){
    cameraCaptureMode = "day";
    pendingPhotoDay = day;
    pendingPhotoActivityId = activityId || null;

    if(nativeCameraAvailable()){
        await captureNativePhotoOrFallback();
        return;
    }

    cameraView.hidden = false;
    await startCameraStream();
}

async function openExpenseCameraView(){
    cameraCaptureMode = "expense";

    if(nativeCameraAvailable()){
        await captureNativePhotoOrFallback();
        return;
    }

    cameraView.hidden = false;
    await startCameraStream();
}

async function startCameraStream(){
    stopCameraStream();

    /* Signalé 2026-09-04 (premier vrai test sur appareil Android) : "le
       bouton pour prendre une photo ne fonctionne pas toujours" — en
       réalité capturePhotoFromCamera() refusait silencieusement (juste un
       toast) tant que cameraPreview.videoWidth n'était pas encore rempli,
       ce qui pouvait prendre un vrai instant après l'ouverture de la vue
       (négociation de la résolution avec la caméra, encore plus long
       depuis le repli audio→vidéo-seule ajouté juste au-dessus). Désactivé
       ici, réactivé par le listener "loadedmetadata" plus bas : impossible
       de taper dans le vide pendant que la caméra démarre encore. */
    cameraShutterBtn.disabled = true;

    /* width/height "ideal" (pas "exact") : le navigateur vise cette
       résolution mais retombe sur ce que la caméra sait faire si elle
       ne suit pas — sans ça, getUserMedia() choisit par défaut une
       résolution pensée pour de la visio (souvent ~720p), bien en
       dessous de ce que le capteur photo du téléphone peut vraiment
       donner. */
    const videoConstraints = {
        facingMode: cameraFacingMode,
        width: { ideal: 3840 },
        height: { ideal: 2160 }
    };

    try{
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: true
        });
    }catch(errWithAudio){
        /* CAPACITOR (signalé 2026-09-04, premier vrai test sur appareil
           Android) : audio+video demandés ensemble échouent EN BLOC si
           SEULE la permission micro pose problème (refusée, ou la boîte de
           dialogue Android ne s'affiche pas correctement pour cette
           ressource précise) — la photo (l'usage principal) se retrouvait
           bloquée par un problème qui ne concerne que l'enregistrement
           vidéo avec son. Repli video-only : MediaRecorder() fonctionne
           déjà très bien sans piste audio (vidéo muette), rien à changer
           côté enregistrement. */
        console.error("Caméra+micro inaccessibles, nouvelle tentative vidéo seule :",errWithAudio);
        try{
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false
            });
            showToast("Micro indisponible — la vidéo sera enregistrée sans son.",{type:"error",duration:4000});
        }catch(errVideoOnly){
            console.error("Caméra inaccessible :",errVideoOnly);
            showToast(
                `Impossible d'accéder à la caméra sur cet appareil (${errVideoOnly.name || errVideoOnly.message || "erreur inconnue"}).`,
                {type:"error",duration:6000}
            );
            closeCameraView();
            return;
        }
    }

    cameraPreview.srcObject = cameraStream;
    setupCameraTorch();
    setupCameraZoom();
}

function setupCameraTorch(){
    cameraTorchTrack = null;
    cameraTorchOn = false;
    cameraTorchBtn.hidden = true;
    cameraTorchBtn.classList.remove("active");
    const track = cameraStream && cameraStream.getVideoTracks()[0];
    if(!track || !track.getCapabilities) return;
    const caps = track.getCapabilities();
    if(!caps.torch) return;
    cameraTorchTrack = track;
    cameraTorchBtn.hidden = false;
}

cameraTorchBtn.addEventListener("click",()=>{
    if(!cameraTorchTrack) return;
    cameraTorchOn = !cameraTorchOn;
    cameraTorchTrack.applyConstraints({advanced:[{torch:cameraTorchOn}]}).catch(err=>{
        console.error("Torche indisponible :",err);
        showToast("Impossible d'activer le flash sur cet appareil.",{type:"error"});
        cameraTorchOn = !cameraTorchOn;
    });
    cameraTorchBtn.classList.toggle("active",cameraTorchOn);
});

function setupCameraZoom(){
    cameraZoomTrack = null;
    cameraZoomCapabilities = null;
    const track = cameraStream && cameraStream.getVideoTracks()[0];
    if(!track || !track.getCapabilities) return;
    const caps = track.getCapabilities();
    if(!caps.zoom) return;
    cameraZoomTrack = track;
    cameraZoomCapabilities = caps;
}

function getCameraPointerDistance(){
    const pts = Array.from(cameraActivePointers.values());
    if(pts.length<2) return 0;
    const dx = pts[0].x-pts[1].x, dy = pts[0].y-pts[1].y;
    return Math.sqrt(dx*dx + dy*dy);
}

cameraPreview.addEventListener("pointerdown",e=>{
    if(!cameraZoomTrack) return;
    cameraActivePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cameraActivePointers.size===2){
        cameraZoomStartDistance = getCameraPointerDistance();
        cameraZoomStartValue = cameraZoomTrack.getSettings().zoom || cameraZoomCapabilities.min;
    }
});

cameraPreview.addEventListener("pointermove",e=>{
    if(!cameraZoomTrack || !cameraActivePointers.has(e.pointerId)) return;
    cameraActivePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cameraActivePointers.size!==2 || cameraZoomStartDistance<=0) return;
    const distance = getCameraPointerDistance();
    const scale = distance / cameraZoomStartDistance;
    const zoom = Math.min(cameraZoomCapabilities.max, Math.max(cameraZoomCapabilities.min, cameraZoomStartValue*scale));
    cameraZoomTrack.applyConstraints({advanced:[{zoom}]}).catch(()=>{});
});

["pointerup","pointercancel","pointerleave"].forEach(evt=>{
    cameraPreview.addEventListener(evt,e=>{
        cameraActivePointers.delete(e.pointerId);
        cameraZoomStartDistance = 0;
    });
});

// Voir le commentaire sur cameraShutterBtn.disabled dans startCameraStream().
cameraPreview.addEventListener("loadedmetadata",()=>{
    cameraShutterBtn.disabled = false;
});

function stopCameraStream(){
    if(cameraStream){
        cameraStream.getTracks().forEach(track=>track.stop());
        cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraTorchTrack = null;
    cameraTorchOn = false;
    cameraZoomTrack = null;
    cameraZoomCapabilities = null;
    cameraActivePointers.clear();
}

function closeCameraView(){
    if(cameraIsRecording) cancelCameraRecording();
    hideCameraReview();
    stopCameraStream();
    cameraView.hidden = true;
    pendingPhotoDay = null;
    pendingPhotoActivityId = null;
    cameraCaptureMode = "day";
}

cameraCloseBtn.addEventListener("click",closeCameraView);

cameraSwitchBtn.addEventListener("click",()=>{
    cameraFacingMode = cameraFacingMode==="environment" ? "user" : "environment";
    startCameraStream();
});

cameraGalleryBtn.addEventListener("click",()=>{
    const day = pendingPhotoDay, activityId = pendingPhotoActivityId;
    const mode = cameraCaptureMode;
    closeCameraView();
    if(mode==="expense") tricountReceiptInput.click();
    else openDayPhotoPicker(day,activityId);
});

function updateCameraRecordingTimer(){
    const elapsed = Math.floor((Date.now()-cameraRecordingStartTime)/1000);
    const m = Math.floor(elapsed/60), s = elapsed%60;
    cameraRecordingTimer.textContent = `${m}:${String(s).padStart(2,"0")}`;
}

function startCameraRecording(){
    if(!cameraStream) return;
    cameraRecordedChunks = [];
    cameraRecordingCancelled = false;
    const mimeType = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"]
        .find(type=>window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
    try{
        cameraMediaRecorder = mimeType ? new MediaRecorder(cameraStream,{mimeType}) : new MediaRecorder(cameraStream);
    }catch(err){
        console.error("Enregistrement vidéo impossible :",err);
        showToast("L'enregistrement vidéo n'est pas pris en charge sur cet appareil.",{type:"error"});
        return;
    }

    cameraIsRecording = true;
    cameraShutterBtn.classList.add("recording");
    cameraRecordingIndicator.hidden = false;
    cameraRecordingStartTime = Date.now();
    updateCameraRecordingTimer();
    cameraRecordingTimerInterval = setInterval(updateCameraRecordingTimer,500);

    cameraMediaRecorder.addEventListener("dataavailable",e=>{
        if(e.data && e.data.size) cameraRecordedChunks.push(e.data);
    });
    cameraMediaRecorder.addEventListener("stop",()=>{
        clearInterval(cameraRecordingTimerInterval);
        cameraRecordingIndicator.hidden = true;
        cameraShutterBtn.classList.remove("recording");
        cameraIsRecording = false;
        /* Vérifié sur cameraRecordingCancelled, pas seulement sur la longueur
           de cameraRecordedChunks : stop() déclenche un dernier
           "dataavailable" (donc un dernier chunk poussé dans le tableau)
           APRÈS que cancelCameraRecording() l'a vidé, donc le vider seul ne
           suffit pas à empêcher l'enregistrement d'une vidéo qu'on a annulée. */
        if(cameraRecordedChunks.length && !cameraRecordingCancelled){
            const blob = new Blob(cameraRecordedChunks,{type:cameraMediaRecorder.mimeType || "video/webm"});
            showCameraReview(blob,"video");
        }
        cameraRecordedChunks = [];
    });

    cameraMediaRecorder.start();
}

function stopCameraRecording(){
    if(cameraMediaRecorder && cameraMediaRecorder.state!=="inactive") cameraMediaRecorder.stop();
}

function cancelCameraRecording(){
    cameraRecordingCancelled = true;
    cameraRecordedChunks = [];
    if(cameraMediaRecorder && cameraMediaRecorder.state!=="inactive") cameraMediaRecorder.stop();
    clearInterval(cameraRecordingTimerInterval);
    cameraRecordingIndicator.hidden = true;
    cameraShutterBtn.classList.remove("recording");
    cameraIsRecording = false;
}

function capturePhotoFromCamera(){
    if(!cameraPreview.videoWidth){
        showToast("Caméra pas encore prête, réessaie dans un instant.",{type:"error"});
        return;
    }
    triggerHaptic(20);
    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    cameraCanvas.getContext("2d").drawImage(cameraPreview,0,0);
    cameraCanvas.toBlob(blob=>{
        if(blob) showCameraReview(blob,"image");
    },"image/jpeg",0.92);
}

function showCameraReview(blob,type){
    pendingCapturedBlob = blob;
    pendingCapturedType = type;
    if(cameraReviewObjectUrl) URL.revokeObjectURL(cameraReviewObjectUrl);
    cameraReviewObjectUrl = URL.createObjectURL(blob);
    if(type==="video"){
        cameraReviewVideo.src = cameraReviewObjectUrl;
        cameraReviewVideo.hidden = false;
        cameraReviewImage.hidden = true;
    }else{
        cameraReviewImage.src = cameraReviewObjectUrl;
        cameraReviewImage.hidden = false;
        cameraReviewVideo.hidden = true;
    }
    cameraReview.hidden = false;
}

function hideCameraReview(){
    cameraReview.hidden = true;
    cameraReviewVideo.pause();
    cameraReviewVideo.removeAttribute("src");
    cameraReviewImage.removeAttribute("src");
    if(cameraReviewObjectUrl){
        URL.revokeObjectURL(cameraReviewObjectUrl);
        cameraReviewObjectUrl = null;
    }
    pendingCapturedBlob = null;
    pendingCapturedType = null;
}

cameraRetakeBtn.addEventListener("click",hideCameraReview);

cameraKeepBtn.addEventListener("click",()=>{
    const blob = pendingCapturedBlob;
    hideCameraReview();
    if(blob) handleCapturedCameraMedia(blob);
});

async function handleCapturedCameraMedia(blob,alreadySavedToGallery){

    const mode = cameraCaptureMode;
    const day = pendingPhotoDay, activityId = pendingPhotoActivityId;
    closeCameraView();

    if(mode==="expense"){
        pendingReceiptFile = blob;
        pendingReceiptRemoved = false;
        showTricountReceiptPreview(blob);
        return;
    }

    if(day===null) return;

    /* alreadySavedToGallery : la capture native (captureNativePhotoOrFallback,
       saveToGallery:true côté plugin) a déjà écrit le fichier dans la
       galerie — un second téléchargement ici créerait un doublon. Sinon
       (caméra maison), téléchargement direct plutôt que saveBlobToGallery :
       on évite navigator.share(), qui ouvrirait la fenêtre de partage du
       téléphone après CHAQUE prise et casserait le flux rapide "appui,
       appui, appui" attendu d'une caméra maison. */
    if(!alreadySavedToGallery){
        const galleryFileName = `photo_jour${day}_${Date.now()}${extensionForBlob(blob)}`;
        downloadBlobToGallery(blob,galleryFileName);
    }

    try{
        await addDayPhoto(day,activityId,blob);
        refreshOpenPhotoViews();
        showToast("Photo ajoutée.",{type:"success",duration:2500});
    }catch(err){
        console.error("Impossible d'enregistrer la photo :",err);
        showToast("Impossible d'enregistrer la photo sur cet appareil.",{type:"error"});
    }
}

cameraShutterBtn.addEventListener("pointerdown",e=>{
    e.preventDefault();
    cameraShutterBtn.setPointerCapture(e.pointerId);
    cameraHoldTimer = setTimeout(()=>{
        cameraHoldTimer = null;
        startCameraRecording();
    },CAMERA_HOLD_THRESHOLD_MS);
});

function releaseCameraShutter(){
    if(cameraHoldTimer){
        clearTimeout(cameraHoldTimer);
        cameraHoldTimer = null;
        capturePhotoFromCamera();
    }else if(cameraIsRecording){
        stopCameraRecording();
    }
}

cameraShutterBtn.addEventListener("pointerup",releaseCameraShutter);
cameraShutterBtn.addEventListener("pointercancel",()=>{
    if(cameraHoldTimer){
        clearTimeout(cameraHoldTimer);
        cameraHoldTimer = null;
    }else if(cameraIsRecording){
        cancelCameraRecording();
    }
});

async function renderDayPhotos(){

    // Réglage "Photos sur le Planning" (Affichage → Vue Planning, 2026-09-02).
    if(!showDayPhotos){
        dayPhotoObjectUrls.forEach(url=>URL.revokeObjectURL(url));
        dayPhotoObjectUrls = [];
        dayPhotoGallery.hidden = true;
        return;
    }

    dayPhotoObjectUrls.forEach(url=>URL.revokeObjectURL(url));
    dayPhotoObjectUrls = [];

    let photos;
    try{
        photos = await getDayPhotos(currentDay);
    }catch(err){
        dayPhotoGallery.hidden = true;
        return;
    }

    dayPhotoGallery.textContent = "";

    if(!photos.length){
        dayPhotoGallery.hidden = true;
        return;
    }

    dayPhotoGallery.hidden = false;

    const dayDateLabel = formatDayDateShort(currentDay) || `Jour ${currentDay}`;
    const group = photos.map(photo=>{
        const url = URL.createObjectURL(photo.blob);
        dayPhotoObjectUrls.push(url);
        const activity = photo.activityId ? findActivityById(currentDay,photo.activityId,planning) : null;
        return {
            id:photo.id, url, type:mediaTypeFromBlob(photo.blob),
            caption: activity ? `${icons[activity.type] || ""} ${activity.name}`.trim() : "",
            dateLabel: dayDateLabel
        };
    });

    photos.forEach((photo,i)=>{

        const { url, type } = group[i];

        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "day-photo-thumb";

        const { media, badge } = createMediaThumbElement(url,type);
        thumb.appendChild(media);
        if(badge) thumb.appendChild(badge);

        thumb.addEventListener("click",()=>openPhotoLightbox(photo.id,url,group));

        dayPhotoGallery.appendChild(thumb);
    });
}

/* --- Documents d'activité (billets, réservations, PDF...) ---
   Volontairement pas de badge synchrone sur la carte d'activité comme pour
   reservationLink (🔗) : le nombre de documents vit en IndexedDB (async,
   local à l'appareil), alors que renderActivities() reconstruit toutes les
   cartes de façon synchrone à chaque rendu — l'accès se fait uniquement
   via "📎 Documents" dans le menu ⋮, qui ouvre cette modale et va chercher
   la vraie liste à ce moment-là seulement. */
const attachmentsModal = document.getElementById("attachmentsModal");
const attachmentsModalTitle = document.getElementById("attachmentsModalTitle");
const attachmentsList = document.getElementById("attachmentsList");
const attachmentFileInput = document.getElementById("attachmentFileInput");
const attachmentAddBtn = document.getElementById("attachmentAddBtn");
const attachmentsModalCloseBtn = document.getElementById("attachmentsModalCloseBtn");

let attachmentsModalDay = null;
let attachmentsModalActivityId = null;
let attachmentsObjectUrls = [];
/* Dernier groupe (documents déjà locaux uniquement, voir plus bas) construit
   par renderAttachmentsList() — réutilisé par downloadAndOpenAttachment()
   pour ouvrir la visionneuse sur l'entrée qui vient d'être téléchargée
   sans reconstruire un second jeu d'URL objet en double. */
let lastAttachmentsGroup = [];

async function renderAttachmentsList(){

    attachmentsObjectUrls.forEach(url=>URL.revokeObjectURL(url));
    attachmentsObjectUrls.length = 0;
    attachmentsList.textContent = "";

    let attachments;
    try{
        attachments = await getActivityAttachments(attachmentsModalDay,attachmentsModalActivityId);
    }catch(err){
        console.error("Documents indisponibles :",err);
        const msg = document.createElement("p");
        msg.className = "attachments-empty";
        msg.textContent = "Impossible de charger les documents sur cet appareil.";
        attachmentsList.appendChild(msg);
        return;
    }

    if(!attachments.length){
        const msg = document.createElement("p");
        msg.className = "attachments-empty";
        msg.textContent = "Aucun document ajouté pour l'instant.";
        attachmentsList.appendChild(msg);
        return;
    }

    /* Un seul groupe construit ici (pas re-dérivé au clic) : les URL objet
       et les entrées de groupe doivent rester en phase — reconstruire le
       groupe séparément au clic risquerait de désynchroniser l'URL d'une
       entrée avec son blob si l'ordre de attachments changeait entre-temps.
       Les entrées "pending" (pas encore téléchargées sur CET appareil, voir
       getActivityAttachments()) n'ont pas de blob : exclues de ce groupe,
       qui ne doit alimenter la visionneuse qu'avec des documents réellement
       présents localement. */
    const group = attachments
        .filter(att=>!att.pending)
        .map(att=>{
            const url = URL.createObjectURL(att.blob);
            attachmentsObjectUrls.push(url);
            return { id:att.id, url, type:attachmentFileType(att.blob), fileName:att.fileName, cloudId:att.cloudId };
        });
    lastAttachmentsGroup = group;

    attachments.forEach(att=>{

        const row = document.createElement("div");
        row.className = "attachment-row";

        if(att.pending){

            /* Document annoncé par un autre appareil (index RTDB) mais pas
               encore téléchargé ici — téléchargement paresseux au clic,
               voir downloadAndOpenAttachment(). */
            const openBtn = document.createElement("button");
            openBtn.type = "button";
            openBtn.className = "attachment-open-btn attachment-pending";
            openBtn.textContent = `☁️ ${att.fileName}`;
            openBtn.addEventListener("click",async ()=>{
                if(openBtn.classList.contains("attachment-downloading")) return;
                openBtn.classList.add("attachment-downloading");
                openBtn.textContent = `⏳ ${att.fileName}`;
                await downloadAndOpenAttachment(att.cloudId,attachmentsModalDay,attachmentsModalActivityId);
            });
            row.appendChild(openBtn);

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "attachment-remove";
            removeBtn.textContent = "✕";
            removeBtn.setAttribute("aria-label",`Supprimer ${att.fileName}`);
            removeBtn.addEventListener("click",()=>{
                showConfirmModal(
                    `Supprimer « ${att.fileName} » ?`,
                    ()=>deleteCloudOnlyAttachment(att.cloudId,attachmentsModalDay,attachmentsModalActivityId)
                );
            });
            row.appendChild(removeBtn);

            attachmentsList.appendChild(row);
            return;
        }

        const entry = group.find(g=>g.id===att.id);

        /* Bouton (pas <a target="_blank">) : ouvre le nouveau visualiseur
           avec navigation gauche/droite entre les documents de CETTE
           activité (mêmes patrons que openPhotoLightbox()/showLightboxAt()
           de l'Album) au lieu de déléguer à un nouvel onglet du navigateur. */
        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "attachment-open-btn";
        openBtn.textContent = `📎 ${att.fileName}`;
        openBtn.addEventListener("click",()=>openAttachmentLightbox(entry.id,group));
        row.appendChild(openBtn);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "attachment-remove";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label",`Supprimer ${att.fileName}`);
        removeBtn.addEventListener("click",()=>{
            showConfirmModal(
                `Supprimer « ${att.fileName} » ?`,
                async ()=>{
                    await deleteDayPhoto(att.id);
                    if(att.cloudId){
                        deleteCloudAttachment(att.cloudId).catch(err=>{
                            console.error("Suppression cloud du document impossible :",err);
                        });
                    }
                    renderAttachmentsList();
                    await refreshActivityAttachmentCounts();
                    renderActivities();
                    if(!reservationsView.hidden) renderReservations();
                }
            );
        });
        row.appendChild(removeBtn);

        attachmentsList.appendChild(row);
    });
}

function attachmentFileType(blob){
    if(!blob || !blob.type) return "other";
    if(blob.type.startsWith("image/")) return "image";
    if(blob.type==="application/pdf") return "pdf";
    return "other";
}

/* Un seul scan complet du store (pas d'index dédié : "day" existe déjà pour
   getActivityAttachments(), pas "activityId" ni "kind") reconstruit tout
   activityAttachmentCounts d'un coup — appelé au chargement puis chaque
   fois qu'un document est ajouté/supprimé, jamais à chaque rendu (coûterait
   un aller-retour IndexedDB par frappe). Alimente à la fois le badge sur la
   carte d'activité (renderActivities()) et l'inclusion dans Réservations
   (renderReservations()) via activityHasAttachments(). */
async function refreshActivityAttachmentCounts(){
    let records;
    try{
        const db = await openPhotoDB();
        records = await new Promise((resolve,reject)=>{
            const tx = db.transaction(PHOTO_STORE_NAME,"readonly");
            const req = tx.objectStore(PHOTO_STORE_NAME).getAll();
            req.onsuccess = ()=>resolve(req.result);
            req.onerror = ()=>reject(req.error);
        });
    }catch(err){
        console.error("Impossible de recenser les documents :",err);
        return;
    }
    const counts = {};
    const localCloudIds = new Set();
    records.forEach(r=>{
        if(r.tripId===currentTripId && r.kind==="attachment"){
            const key = r.day+":"+r.activityId;
            counts[key] = (counts[key]||0)+1;
            if(r.cloudId) localCloudIds.add(r.cloudId);
        }
    });

    /* Fusion local ∪ distant, dédupliquée par cloudId — même règle que dans
       getActivityAttachments() : un document déjà téléchargé ici ne doit
       pas être compté deux fois (une fois via le scan local ci-dessus, une
       fois via l'index distant, qui ne disparaît pas juste parce qu'UN
       appareil a téléchargé le fichier). */
    Object.entries(remoteAttachmentsIndex).forEach(([cloudId,meta])=>{
        if(localCloudIds.has(cloudId)) return;
        const key = meta.day+":"+meta.activityId;
        counts[key] = (counts[key]||0)+1;
    });

    activityAttachmentCounts = counts;
}

/* --- Visualiseur de documents avec swipe gauche/droite ---
   Même patron que openPhotoLightbox()/showLightboxAt() de l'Album (voir
   plus bas dans le fichier) : un groupe (tous les documents de l'activité
   ouverte), un index courant, navigation clavier/tactile identique. La
   différence est le TYPE de contenu affiché — image, PDF (iframe, un
   blob: s'affiche nativement) ou "autre" (aucun aperçu fiable en navigateur,
   juste un lien pour l'ouvrir dans un nouvel onglet). */
const attachmentLightbox = document.getElementById("attachmentLightbox");
const attachmentLightboxClose = document.getElementById("attachmentLightboxClose");
const attachmentLightboxCounter = document.getElementById("attachmentLightboxCounter");
const attachmentLightboxImage = document.getElementById("attachmentLightboxImage");
const attachmentLightboxFrame = document.getElementById("attachmentLightboxFrame");
const attachmentLightboxFallback = document.getElementById("attachmentLightboxFallback");
const attachmentLightboxFallbackName = document.getElementById("attachmentLightboxFallbackName");
const attachmentLightboxOpenExternal = document.getElementById("attachmentLightboxOpenExternal");
const attachmentLightboxDelete = document.getElementById("attachmentLightboxDelete");

let attachmentLightboxGroup = [];
let attachmentLightboxIndex = 0;
let openAttachmentLightboxId = null;

function showAttachmentLightboxAt(index){

    if(!attachmentLightboxGroup.length) return;

    attachmentLightboxIndex = (index + attachmentLightboxGroup.length) % attachmentLightboxGroup.length;
    const entry = attachmentLightboxGroup[attachmentLightboxIndex];
    openAttachmentLightboxId = entry.id;

    attachmentLightboxImage.hidden = true;
    attachmentLightboxFrame.hidden = true;
    attachmentLightboxFrame.src = "about:blank";
    attachmentLightboxFallback.hidden = true;

    if(entry.type==="image"){
        attachmentLightboxImage.hidden = false;
        attachmentLightboxImage.src = entry.url;
    }else if(entry.type==="pdf"){
        attachmentLightboxFrame.hidden = false;
        attachmentLightboxFrame.src = entry.url;
    }else{
        attachmentLightboxFallback.hidden = false;
        attachmentLightboxFallbackName.textContent = entry.fileName;
        attachmentLightboxOpenExternal.href = entry.url;
    }

    attachmentLightboxCounter.hidden = attachmentLightboxGroup.length<=1;
    attachmentLightboxCounter.textContent = `${attachmentLightboxIndex+1} / ${attachmentLightboxGroup.length}`;
}

function openAttachmentLightbox(id,group){
    attachmentLightboxGroup = group;
    const startIndex = attachmentLightboxGroup.findIndex(a=>a.id===id);
    showAttachmentLightboxAt(startIndex===-1 ? 0 : startIndex);
    attachmentLightbox.hidden = false;
}

function closeAttachmentLightbox(){
    attachmentLightbox.hidden = true;
    attachmentLightboxFrame.src = "about:blank";
    openAttachmentLightboxId = null;
    attachmentLightboxGroup = [];
}

attachmentLightboxClose.addEventListener("click",closeAttachmentLightbox);

attachmentLightbox.addEventListener("click",(e)=>{
    if(e.target===attachmentLightbox) closeAttachmentLightbox();
});

document.addEventListener("keydown",(e)=>{
    if(attachmentLightbox.hidden) return;
    if(e.key==="Escape") closeAttachmentLightbox();
    if(e.key==="ArrowLeft") showAttachmentLightboxAt(attachmentLightboxIndex-1);
    if(e.key==="ArrowRight") showAttachmentLightboxAt(attachmentLightboxIndex+1);
});

let attachmentLightboxTouchStartX = null;
let attachmentLightboxTouchStartY = null;

function handleAttachmentLightboxTouchStart(e){
    const t = e.touches[0];
    attachmentLightboxTouchStartX = t.clientX;
    attachmentLightboxTouchStartY = t.clientY;
}

function handleAttachmentLightboxTouchEnd(e){
    if(attachmentLightboxTouchStartX===null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - attachmentLightboxTouchStartX;
    const dy = t.clientY - attachmentLightboxTouchStartY;
    attachmentLightboxTouchStartX = null;
    attachmentLightboxTouchStartY = null;

    if(attachmentLightboxGroup.length<=1) return;
    if(Math.abs(dx)<40 || Math.abs(dx)<Math.abs(dy)) return;

    if(dx<0) showAttachmentLightboxAt(attachmentLightboxIndex+1);
    else showAttachmentLightboxAt(attachmentLightboxIndex-1);
}

/* Écouteurs sur le CONTENEUR (pas chaque élément de contenu comme pour la
   lightbox photo) : un <iframe> ne laisse jamais remonter les événements
   tactiles déclenchés sur SON contenu jusqu'au document parent (contexte de
   navigation séparé) — les attacher sur attachmentLightbox lui-même capte
   au moins les swipes sur la zone/le fond autour du PDF, plutôt que de ne
   jamais fonctionner du tout pour ce type de document. */
attachmentLightbox.addEventListener("touchstart",handleAttachmentLightboxTouchStart,{passive:true});
attachmentLightbox.addEventListener("touchend",handleAttachmentLightboxTouchEnd);

attachmentLightboxDelete.addEventListener("click",()=>{

    if(openAttachmentLightboxId===null) return;

    const idToDelete = openAttachmentLightboxId;
    const { fileName, cloudId } = attachmentLightboxGroup[attachmentLightboxIndex];

    showConfirmModal(
        `Supprimer « ${fileName} » ?`,
        async ()=>{
            try{
                await deleteDayPhoto(idToDelete);
                if(cloudId){
                    deleteCloudAttachment(cloudId).catch(err=>{
                        console.error("Suppression cloud du document impossible :",err);
                    });
                }
                closeAttachmentLightbox();
                renderAttachmentsList();
                await refreshActivityAttachmentCounts();
                renderActivities();
                if(!reservationsView.hidden) renderReservations();
                showToast("Document supprimé.",{type:"success"});
            }catch(err){
                console.error("Impossible de supprimer le document :",err);
                showToast("Impossible de supprimer le document.",{type:"error"});
            }
        }
    );
});

function openAttachmentsModal(day,activity){
    attachmentsModalDay = day;
    attachmentsModalActivityId = activity.id;
    attachmentsModalTitle.textContent = `📎 Documents — ${activity.name}`;
    attachmentsModal.hidden = false;
    renderAttachmentsList();
}

function closeAttachmentsModal(){
    attachmentsModal.hidden = true;
    /* Garde-fou : ne devrait normalement plus se produire une fois le
       z-index corrigé (le visualiseur couvre entièrement cette modale tant
       qu'il est ouvert, "Fermer" n'est alors plus cliquable) — mais si
       jamais cette fonction est appelée pendant que le visualiseur affiche
       encore un document sourcé depuis ces mêmes URL objet, les révoquer
       ici casserait son image/PDF en cours d'affichage. */
    if(attachmentLightbox.hidden){
        attachmentsObjectUrls.forEach(url=>URL.revokeObjectURL(url));
        attachmentsObjectUrls.length = 0;
    }
    attachmentsModalDay = null;
    attachmentsModalActivityId = null;
}

attachmentsModalCloseBtn.addEventListener("click",closeAttachmentsModal);

attachmentAddBtn.addEventListener("click",()=>{
    attachmentFileInput.click();
});

attachmentFileInput.addEventListener("change",async ()=>{

    const file = attachmentFileInput.files[0];
    attachmentFileInput.value = "";
    if(!file || attachmentsModalDay===null) return;

    try{
        await addActivityAttachment(attachmentsModalDay,attachmentsModalActivityId,file);
        showToast("Document ajouté.",{type:"success"});
        renderAttachmentsList();
        await refreshActivityAttachmentCounts();
        renderActivities();
        if(!reservationsView.hidden) renderReservations();
    }catch(err){
        console.error("Impossible d'ajouter le document :",err);
        showToast("Impossible d'ajouter le document sur cet appareil.",{type:"error"});
    }
});

/* --- Album photos (toutes les journées, rangées par activité) --- */

const albumContent = document.getElementById("albumContent");
const albumTypeFilter = document.getElementById("albumTypeFilter");
const albumGridToggle = document.getElementById("albumGridToggle");
let albumObjectUrls = [];
let albumGridModeActive = false;

function findActivityById(day,activityId,planningSource){
    const dayData = (planningSource || planning)[day];
    if(!dayData) return null;
    const sections = ["matin","midi","apresMidi","soir"];
    for(const slot of sections){
        for(const activity of (dayData[slot] || [])){
            if(activity.id===activityId) return activity;
        }
    }
    return null;
}

function findActivityByIdAnywhere(activityId){
    for(const day of Object.keys(planning)){
        const activity = findActivityById(day,activityId);
        if(activity) return { activity, day };
    }
    return null;
}

/* Jours repliés dans l'Album / le détail d'un voyage archivé — mémorisé par
   voyage (un "Jour 1" replié dans un voyage ne doit pas replier le "Jour 1"
   d'un autre voyage). Tous les jours sont dépliés par défaut : un jour
   n'apparaît dans cet ensemble qu'après avoir été explicitement replié. */
const ALBUM_COLLAPSE_KEY = "albumCollapsedDays";
const RESERVATIONS_COLLAPSE_KEY = "reservationsCollapsedDays";

/* storageKey paramétré (pas juste ALBUM_COLLAPSE_KEY en dur) : réutilisé
   tel quel pour la vue Réservations (RESERVATIONS_COLLAPSE_KEY) — un jour
   replié dans l'un ne doit pas replier le même jour dans l'autre, d'où deux
   clés localStorage séparées plutôt qu'une seule partagée. */
function loadCollapsedDaysMap(storageKey){
    try{
        return JSON.parse(localStorage.getItem(storageKey)) || {};
    }catch(err){
        return {};
    }
}

function isDayCollapsed(storageKey,tripId,day){
    const map = loadCollapsedDaysMap(storageKey);
    return !!(map[tripId] && map[tripId].includes(day));
}

function toggleDayCollapsed(storageKey,tripId,day){
    const map = loadCollapsedDaysMap(storageKey);
    const days = map[tripId] || [];
    const index = days.indexOf(day);
    if(index===-1) days.push(day); else days.splice(index,1);
    map[tripId] = days;
    localStorage.setItem(storageKey,JSON.stringify(map));
}

/* Regroupe et affiche une liste de photos (jour -> activité) dans un
   conteneur donné — partagé entre l'Album (voyage actif, planning en
   mémoire) et le détail d'un voyage archivé (planning figé du moment
   de l'archivage), pour ne pas dupliquer cette logique deux fois. */
/* Partagé entre renderPhotoGroups() et renderCompactPhotoGrid() — même
   état vide dans les deux modes d'affichage de l'Album. */
function buildAlbumEmptyState(message){
    const empty = document.createElement("div");
    empty.className = "album-empty";

    const icon = document.createElement("div");
    icon.className = "album-empty-icon";
    icon.textContent = "🖼️";
    empty.appendChild(icon);

    const title = document.createElement("div");
    title.className = "album-empty-title";
    title.textContent = "Aucune photo pour l'instant";
    empty.appendChild(title);

    const text = document.createElement("p");
    text.className = "album-empty-text";
    text.textContent = message;
    empty.appendChild(text);

    return empty;
}

function renderPhotoGroups(container,photos,planningSource,objectUrls,emptyMessage,dateLabelFn,tripIdForCollapse){

    objectUrls.forEach(url=>URL.revokeObjectURL(url));
    objectUrls.length = 0;
    container.textContent = "";

    if(!photos.length){
        container.appendChild(buildAlbumEmptyState(emptyMessage));
        return;
    }

    const byDay = {};
    photos.forEach(photo=>{
        if(!byDay[photo.day]) byDay[photo.day] = [];
        byDay[photo.day].push(photo);
    });

    const days = Object.keys(byDay).map(Number).sort((a,b)=>a-b);

    days.forEach(day=>{

        const byActivity = {};
        byDay[day].forEach(photo=>{
            const key = photo.activityId || "_none";
            if(!byActivity[key]) byActivity[key] = [];
            byActivity[key].push(photo);
        });

        const dayGroup = document.createElement("div");
        dayGroup.className = "album-day-group";
        if(isDayCollapsed(ALBUM_COLLAPSE_KEY,tripIdForCollapse,day)) dayGroup.classList.add("collapsed");

        const dayHeading = document.createElement("div");
        dayHeading.className = "album-day-heading";
        const dayData = planningSource[day];
        const customTitle = dayData && dayData.title;
        const dateLabel = dateLabelFn ? dateLabelFn(day) : "";
        let heading = `Jour ${day}`;
        if(dateLabel) heading += ` — ${dateLabel}`;
        else if(customTitle) heading += ` — ${customTitle}`;

        const headingText = document.createElement("span");
        headingText.className = "album-day-heading-text";
        headingText.textContent = heading;
        const countSpan = document.createElement("span");
        countSpan.className = "album-day-count";
        countSpan.textContent = `· ${byDay[day].length} photo${byDay[day].length>1 ? "s" : ""}`;
        headingText.appendChild(countSpan);
        dayHeading.appendChild(headingText);

        const toggleBtn = document.createElement("span");
        toggleBtn.className = "album-day-toggle";
        const svgNS = "http://www.w3.org/2000/svg";
        const chevronSvg = document.createElementNS(svgNS,"svg");
        chevronSvg.setAttribute("width","15");
        chevronSvg.setAttribute("height","15");
        chevronSvg.setAttribute("viewBox","0 0 20 20");
        chevronSvg.setAttribute("fill","none");
        chevronSvg.setAttribute("stroke","currentColor");
        chevronSvg.setAttribute("stroke-width","2");
        chevronSvg.setAttribute("stroke-linecap","round");
        chevronSvg.setAttribute("stroke-linejoin","round");
        const chevronPath = document.createElementNS(svgNS,"path");
        chevronPath.setAttribute("d","M5 8l5 5 5-5");
        chevronSvg.appendChild(chevronPath);
        toggleBtn.appendChild(chevronSvg);
        dayHeading.appendChild(toggleBtn);

        dayHeading.addEventListener("click",()=>{
            dayGroup.classList.toggle("collapsed");
            toggleDayCollapsed(ALBUM_COLLAPSE_KEY,tripIdForCollapse,day);
        });

        dayGroup.appendChild(dayHeading);

        const dayBody = document.createElement("div");
        dayBody.className = "album-day-body";

        Object.keys(byActivity).forEach(key=>{

            const groupPhotos = byActivity[key];
            const activity = key==="_none" ? null : findActivityById(day,key,planningSource);

            const actWrap = document.createElement("div");
            actWrap.className = "album-activity-group";

            const actHeader = document.createElement("div");
            actHeader.className = "album-activity-header";

            const dot = document.createElement("span");
            dot.className = "album-activity-dot";
            dot.style.background = activity ? (typeColors[activity.type] || "#9AAAB4") : "#9AAAB4";
            actHeader.appendChild(dot);

            const label = document.createElement("span");
            label.className = "album-activity-label";
            label.textContent = activity
                ? `${icons[activity.type] || ""} ${activity.name}`.trim()
                : "Sans activité";
            actHeader.appendChild(label);

            actWrap.appendChild(actHeader);

            const row = document.createElement("div");
            row.className = "album-thumb-row";

            const groupCaption = activity ? `${icons[activity.type] || ""} ${activity.name}`.trim() : "";
            const groupDateLabel = formatDayDateShort(day) || `Jour ${day}`;
            const groupUrls = groupPhotos.map(photo=>{
                const url = URL.createObjectURL(photo.blob);
                objectUrls.push(url);
                return {id:photo.id, url, type:mediaTypeFromBlob(photo.blob), caption:groupCaption, dateLabel:groupDateLabel};
            });

            const visible = groupPhotos.slice(0,4);
            const extra = groupPhotos.length - visible.length;

            visible.forEach((photo,i)=>{

                const { url, type } = groupUrls[i];

                const thumb = document.createElement("button");
                thumb.type = "button";
                thumb.className = "day-photo-thumb";

                const { media, badge } = createMediaThumbElement(url,type);
                thumb.appendChild(media);
                if(badge) thumb.appendChild(badge);

                if(i===visible.length-1 && extra>0){
                    const overlay = document.createElement("div");
                    overlay.className = "album-thumb-more";
                    overlay.textContent = `+${extra}`;
                    thumb.appendChild(overlay);
                }

                thumb.addEventListener("click",()=>openPhotoLightbox(photo.id,url,groupUrls));

                row.appendChild(thumb);
            });

            actWrap.appendChild(row);
            dayBody.appendChild(actWrap);
        });

        dayGroup.appendChild(dayBody);
        container.appendChild(dayGroup);
    });
}

/* Vue grille compacte de l'Album — mêmes vignettes que renderPhotoGroups()
   (.day-photo-thumb) mais toutes ensemble, triées par date décroissante,
   sans le regroupement par jour/activité. Uniquement pour l'Album (pas
   l'historique des voyages), donc pas de paramètre tripIdForCollapse. */
function renderCompactPhotoGrid(container,photos,objectUrls,emptyMessage){

    objectUrls.forEach(url=>URL.revokeObjectURL(url));
    objectUrls.length = 0;
    container.textContent = "";

    if(!photos.length){
        container.appendChild(buildAlbumEmptyState(emptyMessage));
        return;
    }

    const sorted = photos.slice().sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));

    const grid = document.createElement("div");
    grid.className = "album-compact-grid";

    const urls = sorted.map(photo=>{
        const url = URL.createObjectURL(photo.blob);
        objectUrls.push(url);
        const activity = (photo.day && photo.activityId) ? findActivityById(photo.day,photo.activityId,planning) : null;
        return {
            id:photo.id, url, type:mediaTypeFromBlob(photo.blob),
            caption: activity ? `${icons[activity.type] || ""} ${activity.name}`.trim() : "",
            dateLabel: photo.day ? (formatDayDateShort(photo.day) || `Jour ${photo.day}`) : ""
        };
    });

    sorted.forEach((photo,i)=>{
        const { url, type } = urls[i];

        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "day-photo-thumb";

        const { media, badge } = createMediaThumbElement(url,type);
        thumb.appendChild(media);
        if(badge) thumb.appendChild(badge);

        thumb.addEventListener("click",()=>openPhotoLightbox(photo.id,url,urls));

        grid.appendChild(thumb);
    });

    container.appendChild(grid);
}

async function renderAlbumView(){

    let photos;
    try{
        photos = await getTripPhotos(currentTripId);
    }catch(err){
        console.error("Album indisponible :",err);
        albumObjectUrls.forEach(url=>URL.revokeObjectURL(url));
        albumObjectUrls.length = 0;
        albumContent.textContent = "";
        const msg = document.createElement("p");
        msg.className = "album-empty-text";
        msg.textContent = "Impossible de charger l'album sur cet appareil.";
        albumContent.appendChild(msg);
        return;
    }

    const typeFilter = albumTypeFilter.value || null;
    if(typeFilter){
        photos = photos.filter(photo=>{
            const activity = photo.activityId ? findActivityById(photo.day,photo.activityId,planning) : null;
            return activity && activity.type===typeFilter;
        });
    }

    const emptyMessage = typeFilter
        ? "Aucune photo pour ce type d'activité."
        : "Ajoute une photo depuis une activité dans le Planning avec l'icône 📷 — elle apparaîtra ici, rangée par activité.";

    if(albumGridModeActive){
        renderCompactPhotoGrid(albumContent,photos,albumObjectUrls,emptyMessage);
    }else{
        renderPhotoGroups(
            albumContent,
            photos,
            planning,
            albumObjectUrls,
            emptyMessage,
            formatDayDate,
            currentTripId
        );
    }
}

albumTypeFilter.addEventListener("change",renderAlbumView);

albumGridToggle.addEventListener("click",()=>{
    albumGridModeActive = !albumGridModeActive;
    albumGridToggle.classList.toggle("active",albumGridModeActive);
    albumGridToggle.setAttribute("aria-pressed",String(albumGridModeActive));
    renderAlbumView();
});

document.getElementById("albumSlideshowBtn").addEventListener("click",async ()=>{

    let photos;
    try{
        photos = await getTripPhotos(currentTripId);
    }catch(err){
        showToast("Impossible de charger l'album sur cet appareil.",{type:"error"});
        return;
    }

    const typeFilter = albumTypeFilter.value || null;
    if(typeFilter){
        photos = photos.filter(photo=>{
            const activity = photo.activityId ? findActivityById(photo.day,photo.activityId,planning) : null;
            return activity && activity.type===typeFilter;
        });
    }

    if(!photos.length){
        showToast("Aucune photo à afficher pour l'instant.",{type:"error"});
        return;
    }

    const ownObjectUrls = [];
    const group = photos.map(photo=>{
        const url = URL.createObjectURL(photo.blob);
        ownObjectUrls.push(url);
        const activity = photo.activityId ? findActivityById(photo.day,photo.activityId,planning) : null;
        return {
            id:photo.id, url, type:mediaTypeFromBlob(photo.blob),
            caption: activity ? `${icons[activity.type] || ""} ${activity.name}`.trim() : "",
            dateLabel: photo.day ? (formatDayDateShort(photo.day) || `Jour ${photo.day}`) : ""
        };
    });

    openPhotoLightbox(group[0].id,group[0].url,group,{autoplay:true,ownObjectUrls});
});

/* --- Historique des voyages --- */

const tripHistoryList = document.getElementById("tripHistoryList");
const tripHistoryView = document.getElementById("tripHistoryView");
const tripHistoryDetailView = document.getElementById("tripHistoryDetailView");
const tripHistoryDetailTitle = document.getElementById("tripHistoryDetailTitle");
const tripHistoryDetailInfo = document.getElementById("tripHistoryDetailInfo");
const tripHistoryDetailContent = document.getElementById("tripHistoryDetailContent");
const tripHistoryRestoreBtn = document.getElementById("tripHistoryRestoreBtn");
let tripHistoryDetailObjectUrls = [];
let openTripHistoryEntry = null;

function renderTripHistoryView(){

    tripHistoryList.textContent = "";

    const history = loadTripHistory();

    if(!history.length){
        const empty = document.createElement("div");
        empty.className = "album-empty";

        const icon = document.createElement("div");
        icon.className = "album-empty-icon";
        icon.textContent = "🗂️";
        empty.appendChild(icon);

        const title = document.createElement("div");
        title.className = "album-empty-title";
        title.textContent = "Aucun voyage archivé pour l'instant";
        empty.appendChild(title);

        const text = document.createElement("p");
        text.className = "album-empty-text";
        text.textContent = "Les anciens voyages apparaîtront ici quand tu en créeras un nouveau depuis Réglages & données → Nouveau voyage.";
        empty.appendChild(text);

        tripHistoryList.appendChild(empty);
        return;
    }

    history.forEach(trip=>{

        const card = document.createElement("button");
        card.type = "button";
        card.className = "profile-row trip-history-card";

        const info = document.createElement("div");
        info.className = "trip-history-card-info";

        const name = document.createElement("div");
        name.className = "trip-history-card-name";
        name.textContent = trip.name || "Voyage sans nom";
        info.appendChild(name);

        const meta = document.createElement("div");
        meta.className = "trip-history-card-meta";
        const countryLabel = COUNTRIES[trip.country] ? COUNTRIES[trip.country].fr : "";
        const metaParts = [];
        if(countryLabel) metaParts.push(countryLabel);
        metaParts.push(`${trip.dayCount || 0} jour(s)`);
        meta.textContent = metaParts.join(" · ");

        if(trip.shared){
            const badge = document.createElement("span");
            badge.className = "trip-history-card-badge";
            badge.textContent = "🔗 Partagé";
            meta.appendChild(badge);
        }

        info.appendChild(meta);

        card.appendChild(info);

        const lockBtn = document.createElement("button");
        lockBtn.type = "button";
        lockBtn.className = "trip-history-card-lock" + (trip.locked ? " locked" : "");
        lockBtn.setAttribute("aria-pressed",String(!!trip.locked));
        lockBtn.setAttribute("aria-label",trip.locked ? "Déverrouiller ce voyage archivé" : "Verrouiller ce voyage archivé");
        lockBtn.textContent = trip.locked ? "🔒" : "🔓";
        lockBtn.addEventListener("click",e=>{
            e.stopPropagation();
            toggleTripHistoryLock(trip);
        });
        card.appendChild(lockBtn);

        const chevron = document.createElement("span");
        chevron.className = "profile-row-chevron";
        chevron.textContent = "›";
        card.appendChild(chevron);

        card.addEventListener("click",()=>{
            if(trip.locked){
                requestTripUnlock(trip.id,trip.name || "Ce voyage",()=>openTripHistoryDetail(trip));
            }else{
                openTripHistoryDetail(trip);
            }
        });

        tripHistoryList.appendChild(card);
    });
}

/* Verrouiller/déverrouiller un voyage ARCHIVÉ (distinct de
   #currentTripLockToggle, qui verrouille le voyage actif) — même code PIN
   partagé, même règle "désactiver exige le PIN" pour éviter que le bouton
   lui-même contourne la protection. Sauvegarde en relisant loadTripHistory()
   plutôt qu'en réutilisant history directement, même précaution que
   shareTripToHistory()/unshareTripFromHistory() plus bas dans le fichier. */
function toggleTripHistoryLock(trip){

    if(trip.locked){
        openTripLockView(trip.name || "Ce voyage","disable",()=>{
            trip.locked = false;
            saveTripHistory(loadTripHistory().map(t=>t.id===trip.id ? {...t,locked:false} : t));
            renderTripHistoryView();
            showToast("Verrou retiré pour ce voyage archivé.");
        });
        return;
    }

    const activate = ()=>{
        trip.locked = true;
        saveTripHistory(loadTripHistory().map(t=>t.id===trip.id ? {...t,locked:true} : t));
        renderTripHistoryView();
        showToast("Voyage archivé verrouillé.");
    };

    if(!isTripLockPinSet()){
        openTripLockView(trip.name || "Ce voyage","setup-create",activate);
    }else{
        activate();
    }
}

async function openTripHistoryDetail(trip){

    openTripHistoryEntry = trip;

    tripHistoryDetailTitle.textContent = `🧳 ${trip.name || "Voyage sans nom"}`;

    tripHistoryDetailInfo.textContent = "";
    const countryLabel = COUNTRIES[trip.country] ? COUNTRIES[trip.country].fr : "";
    /* trip.stepCount : absent (undefined/0) sur les voyages archivés avant
       l'existence du podomètre (2026-09-05) ou jamais synchronisé pendant
       le voyage (jamais ouvert l'appli entre le départ et la fin) — pas de
       ligne du tout dans ce cas, plutôt qu'un "0 pas" qui laisserait
       croire que le voyage a bien été suivi. */
    [
        countryLabel,
        trip.startDate ? `Départ le ${new Date(trip.startDate+"T00:00:00").toLocaleDateString("fr-FR")}` : "",
        `${trip.dayCount || 0} jour(s)`,
        trip.stepCount ? `🚶 ${trip.stepCount.toLocaleString("fr-FR")} pas · ${estimateDistanceKm(trip.stepCount).toLocaleString("fr-FR",{maximumFractionDigits:1,minimumFractionDigits:1})} km (estimée)` : "",
        `Archivé le ${new Date(trip.archivedAt).toLocaleDateString("fr-FR")}`
    ].filter(Boolean).forEach(line=>{
        const p = document.createElement("p");
        p.className = "trip-history-detail-line";
        p.textContent = line;
        tripHistoryDetailInfo.appendChild(p);
    });

    updateTripHistoryShareBtn(trip);

    tripHistoryView.hidden = true;
    tripHistoryDetailView.hidden = false;

    const tripPlanning = trip.planning || {};

    let photos;
    try{
        photos = await getTripPhotos(trip.id);
    }catch(err){
        console.error("Photos du voyage indisponibles :",err);
        photos = [];
    }

    renderPhotoGroups(
        tripHistoryDetailContent,
        photos,
        tripPlanning,
        tripHistoryDetailObjectUrls,
        "Ce voyage n'a aucune photo enregistrée.",
        day=>formatDateForTripDay(trip.startDate,day),
        trip.id
    );
}

document.getElementById("tripHistoryDetailBack").addEventListener("click",()=>{
    tripHistoryDetailView.hidden = true;
    tripHistoryView.hidden = false;
});

const tripHistoryShareBtn = document.getElementById("tripHistoryShareBtn");

function updateTripHistoryShareBtn(trip){
    tripHistoryShareBtn.hidden = !syncCode;
    tripHistoryShareBtn.setAttribute("aria-pressed",String(!!trip.shared));
    if(trip.receivedShare){
        tripHistoryShareBtn.textContent = "🔗 Reçu par partage — Retirer de mon historique";
    }else if(trip.shared){
        tripHistoryShareBtn.textContent = "✅ Partagé — Ne plus partager";
    }else{
        tripHistoryShareBtn.textContent = "🔗 Partager avec l'autre appareil";
    }
}

tripHistoryShareBtn.addEventListener("click",async ()=>{

    if(!openTripHistoryEntry) return;
    const trip = openTripHistoryEntry;

    tripHistoryShareBtn.disabled = true;

    if(trip.receivedShare){
        // Retire seulement MA copie — ne doit jamais toucher au voyage chez
        // celui qui l'a partagé (voir unshareTripFromHistory()).
        await unshareTripFromHistory(trip);
        openTripHistoryEntry = null;
        tripHistoryDetailView.hidden = true;
        tripHistoryView.hidden = false;
        renderTripHistoryView();
        showToast("Retiré de ton historique.");
        return;
    }else if(trip.shared){
        await unshareTripFromHistory(trip);
        showToast("Ce voyage n'est plus partagé.");
    }else{
        await shareTripToHistory(trip);
    }

    tripHistoryShareBtn.disabled = false;
    updateTripHistoryShareBtn(trip);
    renderTripHistoryView();
});

tripHistoryRestoreBtn.addEventListener("click",()=>{

    if(!openTripHistoryEntry) return;
    const trip = openTripHistoryEntry;

    showConfirmModal(
        `Restaurer « ${trip.name || "ce voyage"} » ? Le voyage actuellement actif sera archivé à sa place.`,
        ()=>restoreTrip(trip)
    );
});

const tripHistoryDeleteBtn = document.getElementById("tripHistoryDeleteBtn");

tripHistoryDeleteBtn.addEventListener("click",()=>{

    if(!openTripHistoryEntry) return;
    const trip = openTripHistoryEntry;

    showConfirmModal(
        trip.shared && !trip.receivedShare
            ? `Supprimer définitivement « ${trip.name || "ce voyage"} » ? Ce voyage est partagé — il sera aussi retiré de l'autre appareil. Cette action est irréversible et supprimera aussi ses photos.`
            : `Supprimer définitivement « ${trip.name || "ce voyage"} » ? Cette action est irréversible et supprimera aussi ses photos.`,
        async ()=>{

            const history = loadTripHistory().filter(t=>t.id!==trip.id);
            saveTripHistory(history);

            // Un voyage partagé doit disparaître de l'autre appareil aussi,
            // pas seulement de celui-ci — voir shareTripToHistory(). Le
            // filtre juste au-dessus l'a déjà retiré de l'historique local,
            // donc la remise à jour locale que fait unshareTripFromHistory()
            // ne trouve plus rien à changer ici (no-op inoffensif).
            if(trip.shared) await unshareTripFromHistory(trip);

            try{
                await deleteTripPhotos(trip.id);
            }catch(err){
                console.error("Suppression des photos du voyage impossible :",err);
            }

            openTripHistoryEntry = null;
            tripHistoryDetailView.hidden = true;
            tripHistoryView.hidden = false;
            renderTripHistoryView();

            showToast("Voyage supprimé.",{type:"success"});
        }
    );
});

async function restoreTrip(trip){

    archiveCurrentTrip();

    /* Bug réel signalé 2026-09-04 ("les autres voyages disparaissent") :
       loadTripHistory() retire toujours du localStorage toute entrée dont
       l'id === currentTripId (voir son commentaire "le voyage actif ne
       doit jamais apparaître dans son propre historique") — mais
       currentTripId (variable en mémoire) pointait encore vers l'ANCIEN
       voyage qu'on vient tout juste d'archiver une ligne plus haut. Le
       prochain loadTripHistory() ci-dessous confondait donc ce voyage
       fraîchement archivé avec le voyage "actif", et le supprimait
       silencieusement de l'historique qu'il venait à peine d'intégrer —
       reproductible à chaque restauration, avec n'importe quel nombre
       d'autres voyages archivés. currentTripId doit refléter le NOUVEAU
       voyage actif AVANT le moindre autre appel à loadTripHistory(). */
    currentTripId = trip.id;

    const history = loadTripHistory().filter(t=>t.id!==trip.id);
    saveTripHistory(history);

    /* Le voyage restauré redevient le voyage ACTIF : il n'a plus sa place
       dans l'historique partagé sur Firebase (bug signalé 2026-09-02,
       "restaurer un voyage partagé crée une copie") — sans cette
       révocation, l'entrée restait sur Firebase et le listener continu
       (attachTripHistoryListener()) la réinjectait comme un doublon
       fantôme au prochain rechargement/évènement, malgré le garde
       id!==currentTripId ajouté au même endroit (qui protège CET appareil
       une fois le voyage actif, mais pas les autres appareils appairés
       tant que l'entrée traîne sur Firebase). Même raisonnement
       d'asymétrie que unshareTripFromHistory() : seul le partageur
       d'origine (trip.shared && !trip.receivedShare) révoque — un voyage
       REÇU ne doit jamais toucher à Firebase, la copie de l'autre
       appareil doit rester intacte. */
    if(trip.shared && !trip.receivedShare && syncDb && syncCode){
        await syncAuthReady;
        try{
            await syncDb.ref("trips/"+syncCode+"/historique/"+trip.id).remove();
        }catch(err){
            console.error("Impossible de retirer le partage du voyage restauré :",err);
        }
    }

    localStorage.setItem("vacationPlanning",JSON.stringify(trip.planning || {}));
    localStorage.setItem("startDate",trip.startDate || "");
    localStorage.setItem("dayCount",String(trip.dayCount || 7));
    localStorage.setItem(TRIP_NAME_KEY,trip.name || "");
    localStorage.setItem(TRIP_COUNTRY_KEY,trip.country || "");
    localStorage.setItem("baseCurrency",trip.baseCurrency || "GBP");
    localStorage.setItem("targetCurrency",trip.targetCurrency || "");
    /* Absent des voyages déjà archivés avant ce correctif (trip.tripTimezone
       alors undefined) : "" retombe simplement sur le comportement neutre
       déjà en place pour un voyage sans fuseau choisi, pas une régression. */
    localStorage.setItem(TRIP_TIMEZONE_KEY,trip.tripTimezone || "");
    localStorage.setItem(CHECKLIST_STORAGE_KEY,JSON.stringify(trip.checklist || []));
    localStorage.setItem(TRICOUNT_PARTICIPANTS_KEY,JSON.stringify(trip.tricountParticipants || []));
    localStorage.setItem(TRICOUNT_EXPENSES_KEY,JSON.stringify(trip.tricountExpenses || []));
    localStorage.setItem(CHECKLIST_TEMPLATE_STATE_KEY,JSON.stringify(trip.checklistTemplates || []));
    localStorage.setItem(CURRENT_TRIP_ID_KEY,trip.id);
    localStorage.setItem(TRIP_CREATED_KEY,"1");
    /* Même précaution que pour le verrou juste en dessous — trip.stepCount
       absent (undefined) sur les voyages archivés avant l'existence du
       podomètre retombe sur 0, pas une régression. TRIP_STEP_LAST_RAW_KEY
       n'est PAS repris de l'archive (ce n'est pas une donnée du voyage,
       juste un repère technique de la dernière lecture du capteur) — le
       supprimer force syncTripStepsOnce() à repartir d'une référence
       fraîche au prochain démarrage plutôt que de compter à tort les pas
       faits pendant que ce voyage était archivé. */
    localStorage.setItem(TRIP_STEP_COUNT_KEY,String(trip.stepCount || 0));
    localStorage.removeItem(TRIP_STEP_LAST_RAW_KEY);
    /* Bug signalé 2026-09-04 ("un voyage verrouillé restauré ne reste pas
       verrouillé") : trip.locked n'était jamais reporté sur
       currentTripLocked/CURRENT_TRIP_LOCKED_KEY, qui restait donc sur
       l'état du PRÉCÉDENT voyage actif. trip.locked est absent (undefined)
       sur les voyages archivés avant l'existence du verrou — !! le
       ramène proprement à false, pas une régression. */
    currentTripLocked = !!trip.locked;
    localStorage.setItem(CURRENT_TRIP_LOCKED_KEY,currentTripLocked ? "1" : "0");

    location.reload();
}

/* Diaporama (mockup B validé, 2026-09-02) : légende (nom d'activité + date,
   si connus — voir les appelants d'openPhotoLightbox()) + barres de
   progression façon "Stories" + lecture automatique optionnelle. Toujours
   le même lightbox qu'avant (pas une vue séparée), juste enrichi — ouvrir
   une seule photo continue de fonctionner à l'identique, ces éléments
   restent simplement masqués quand lightboxGroup.length<=1. */
function stopLightboxAutoplay(){
    if(lightboxAutoplayTimer){
        clearInterval(lightboxAutoplayTimer);
        lightboxAutoplayTimer = null;
    }
    photoLightboxPlayToggle.textContent = "▶️";
    photoLightboxPlayToggle.setAttribute("aria-label","Lancer la lecture automatique");
}

function startLightboxAutoplay(){
    if(lightboxGroup.length<=1) return;
    stopLightboxAutoplay();
    lightboxAutoplayTimer = setInterval(()=>{
        showLightboxAt(lightboxIndex+1);
    },LIGHTBOX_AUTOPLAY_MS);
    photoLightboxPlayToggle.textContent = "⏸️";
    photoLightboxPlayToggle.setAttribute("aria-label","Mettre en pause la lecture automatique");
}

function renderLightboxProgress(){
    photoLightboxProgress.innerHTML = "";
    if(lightboxGroup.length<=1){
        photoLightboxProgress.hidden = true;
        return;
    }
    photoLightboxProgress.hidden = false;
    lightboxGroup.forEach((entry,i)=>{
        const bar = document.createElement("i");
        if(i<lightboxIndex) bar.className = "done";
        else if(i===lightboxIndex) bar.className = "current";
        photoLightboxProgress.appendChild(bar);
    });
}

function showLightboxAt(index){
    if(!lightboxGroup.length) return;
    lightboxIndex = (index + lightboxGroup.length) % lightboxGroup.length;
    const entry = lightboxGroup[lightboxIndex];
    openLightboxPhotoId = entry.id;

    photoLightboxVideo.pause();
    photoLightboxVideo.removeAttribute("src");

    if(entry.type==="video"){
        photoLightboxImage.hidden = true;
        photoLightboxVideo.hidden = false;
        photoLightboxVideo.src = entry.url;
    }else{
        photoLightboxVideo.hidden = true;
        photoLightboxImage.hidden = false;
        photoLightboxImage.src = entry.url;
    }

    photoLightboxCounter.hidden = lightboxGroup.length<=1;
    photoLightboxCounter.textContent = `${lightboxIndex+1} / ${lightboxGroup.length}`;

    if(entry.caption || entry.dateLabel){
        photoLightboxCaption.hidden = false;
        photoLightboxCaption.querySelector(".name").textContent = entry.caption || "";
        photoLightboxCaption.querySelector(".meta").textContent = entry.dateLabel || "";
    }else{
        photoLightboxCaption.hidden = true;
    }

    photoLightboxPlayToggle.hidden = lightboxGroup.length<=1;
    renderLightboxProgress();
}

function openPhotoLightbox(id,url,group,options){
    lightboxGroup = (group && group.length) ? group : [{id,url,type:"image"}];
    const startIndex = lightboxGroup.findIndex(p=>p.id===id);
    showLightboxAt(startIndex===-1 ? 0 : startIndex);
    photoLightbox.hidden = false;
    /* "Lancer le diaporama" (bouton Album) crée son propre lot d'URL
       blob:, indépendant de celles déjà affichées comme vignettes — évite
       de coupler leur durée de vie à albumObjectUrls, dont le prochain
       renderAlbumView() pourrait révoquer les URLs alors même que le
       diaporama les affiche encore. Révoquées à la fermeture ci-dessous. */
    lightboxOwnObjectUrls = (options && options.ownObjectUrls) || [];
    if(options && options.autoplay) startLightboxAutoplay();
}

function closePhotoLightbox(){
    photoLightbox.hidden = true;
    photoLightboxVideo.pause();
    photoLightboxVideo.removeAttribute("src");
    openLightboxPhotoId = null;
    lightboxGroup = [];
    stopLightboxAutoplay();
    lightboxOwnObjectUrls.forEach(url=>URL.revokeObjectURL(url));
    lightboxOwnObjectUrls = [];
}

photoLightboxClose.addEventListener("click",closePhotoLightbox);

photoLightboxPlayToggle.addEventListener("click",()=>{
    if(lightboxAutoplayTimer) stopLightboxAutoplay();
    else startLightboxAutoplay();
});

photoLightbox.addEventListener("click",(e)=>{
    if(e.target===photoLightbox) closePhotoLightbox();
});

document.addEventListener("keydown",(e)=>{
    if(photoLightbox.hidden) return;
    if(e.key==="Escape") closePhotoLightbox();
    if(e.key==="ArrowLeft"){ stopLightboxAutoplay(); showLightboxAt(lightboxIndex-1); }
    if(e.key==="ArrowRight"){ stopLightboxAutoplay(); showLightboxAt(lightboxIndex+1); }
});

let lightboxTouchStartX = null;
let lightboxTouchStartY = null;

function handleLightboxTouchStart(e){
    const t = e.touches[0];
    lightboxTouchStartX = t.clientX;
    lightboxTouchStartY = t.clientY;
}

function handleLightboxTouchEnd(e){
    if(lightboxTouchStartX===null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - lightboxTouchStartX;
    const dy = t.clientY - lightboxTouchStartY;
    lightboxTouchStartX = null;
    lightboxTouchStartY = null;

    if(lightboxGroup.length<=1) return;
    if(Math.abs(dx)<40 || Math.abs(dx)<Math.abs(dy)) return;

    stopLightboxAutoplay();
    if(dx<0) showLightboxAt(lightboxIndex+1);
    else showLightboxAt(lightboxIndex-1);
}

/* Sur les deux éléments (photo ET vidéo) — sans ça, swiper fonctionnait
   uniquement sur les photos : <video> n'hérite d'aucun geste tant qu'on ne
   lui attache pas les mêmes écouteurs que <img>. */
[photoLightboxImage,photoLightboxVideo].forEach(el=>{
    el.addEventListener("touchstart",handleLightboxTouchStart,{passive:true});
    el.addEventListener("touchend",handleLightboxTouchEnd);
});

photoLightboxDelete.addEventListener("click",()=>{

    if(openLightboxPhotoId===null) return;
    const idToDelete = openLightboxPhotoId;

    showConfirmModal(
        "Supprimer cette photo ? Cette action est irréversible.",
        async ()=>{
            try{
                await deleteDayPhoto(idToDelete);
                closePhotoLightbox();
                refreshOpenPhotoViews();
                showToast("Photo supprimée.",{type:"success"});
            }catch(err){
                console.error("Impossible de supprimer la photo :",err);
                showToast("Impossible de supprimer la photo.",{type:"error"});
            }
        }
    );
});

photoLightboxSave.addEventListener("click",async ()=>{

    if(openLightboxPhotoId===null) return;

    let photo;
    try{
        photo = await getPhotoById(openLightboxPhotoId);
    }catch(err){
        console.error("Photo introuvable :",err);
    }

    if(!photo || !photo.blob){
        showToast("Impossible de récupérer la photo.",{type:"error"});
        return;
    }

    const fileName = `photo_jour${photo.day || ""}_${photo.timestamp || Date.now()}${extensionForBlob(photo.blob)}`;
    const result = await saveBlobToGallery(photo.blob,fileName);
    if(result==="downloaded") showToast("Photo enregistrée.",{type:"success"});
});

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

// CAPACITOR : navigator.geolocation — voir "Géolocalisation" en haut du
// fichier (@capacitor/geolocation pour une permission Android fiable).
function showUserLocationOnMap(){

    if((!navigator.geolocation && !nativeGeolocationAvailable()) || !mapUserLocationLayer) return;

    getCurrentPositionAsync({timeout:8000})
    .then(pos=>{
        const { latitude, longitude } = pos.coords;

        const youIcon = L.divIcon({
            className:"map-you-icon",
            html:"",
            iconSize:[22,22],
            iconAnchor:[11,11]
        });

        L.marker([latitude,longitude],{icon:youIcon,zIndexOffset:1000})
        .addTo(mapUserLocationLayer)
        .bindPopup("Tu es ici");
    })
    .catch(()=>{});
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
    populateMapTypeSelect();

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
    mapMarkersByKey = {};
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
    const sheetRows = document.createDocumentFragment();

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

            const marker = L.marker([coords.lat,coords.lon],{icon})
            .addTo(mapMarkersLayer)
            .bindPopup(popup);

            const markerKey = `${day}:${activity.id}`;
            mapMarkersByKey[markerKey] = marker;
            sheetRows.appendChild(buildMapDaySheetRow(day,activity,!dayFilter,markerKey));

            points.push([coords.lat,coords.lon]);

        }catch(err){
            console.error("Géocodage impossible :",err);
        }
    }

    mapDaySheetList.innerHTML = "";
    if(points.length){
        mapDaySheetList.appendChild(sheetRows);
    }else{
        const empty = document.createElement("p");
        empty.className = "map-day-sheet-empty";
        empty.textContent = "Aucune activité localisée pour ce filtre.";
        mapDaySheetList.appendChild(empty);
    }

    mapDaySheetCount.textContent =
        `${points.length} activité${points.length>1?"s":""} localisée${points.length>1?"s":""}`;
    mapDaySheetDate.textContent = dayFilter ? (formatDayDateShort(dayFilter) || "") : "";

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

/* --- Téléchargement hors-ligne d'une zone de carte ---
   Le service worker met déjà en cache (TILE_CACHE_NAME, jamais purgé) toute
   tuile OpenStreetMap consultée — voir cacheFirstTiles() dans
   service-worker.js. Il suffit donc de déclencher nous-mêmes des fetch()
   vers les tuiles de la zone visible, à plusieurs niveaux de zoom, AVANT le
   départ : le SW les interceptera et les gardera exactement comme s'il
   s'agissait d'un vrai déplacement sur la carte. Aucun nouveau mécanisme de
   cache à écrire côté page. */

const mapDownloadAreaBtn = document.getElementById("mapDownloadAreaBtn");
const MAP_OFFLINE_TILE_CAP = 1500;
const MAP_OFFLINE_ZOOM_BEFORE = 1;
const MAP_OFFLINE_ZOOM_AFTER = 2;
const MAP_OFFLINE_MAX_ZOOM = 17;

function mapTileRangeForZoom(bounds,zoom){
    const scale = Math.pow(2,zoom);
    const xForLon = lon => Math.floor((lon+180)/360*scale);
    const yForLat = lat => {
        const rad = lat*Math.PI/180;
        return Math.floor((1-Math.log(Math.tan(rad)+1/Math.cos(rad))/Math.PI)/2*scale);
    };
    return {
        xMin: xForLon(bounds.getWest()),
        xMax: xForLon(bounds.getEast()),
        yMin: yForLat(bounds.getNorth()),
        yMax: yForLat(bounds.getSouth())
    };
}

function mapOfflineTileList(bounds,minZoom,maxZoom){
    const tiles = [];
    for(let z=minZoom; z<=maxZoom; z++){
        const {xMin,xMax,yMin,yMax} = mapTileRangeForZoom(bounds,z);
        for(let x=xMin; x<=xMax; x++){
            for(let y=yMin; y<=yMax; y++){
                tiles.push({x,y,z});
            }
        }
    }
    return tiles;
}

async function downloadMapAreaOffline(){

    if(!mapInstance){
        showToast("Ouvre d'abord la carte.",{type:"error"});
        return;
    }

    if(!navigator.onLine){
        showToast("Connecte-toi à internet pour télécharger cette zone avant de partir.",{type:"error"});
        return;
    }

    if(!navigator.serviceWorker || !navigator.serviceWorker.controller){
        showToast("Le mode hors-ligne n'est pas encore actif sur cet appareil — recharge la page et réessaie.",{type:"error"});
        return;
    }

    const bounds = mapInstance.getBounds();
    const currentZoom = Math.round(mapInstance.getZoom());
    const minZoom = Math.max(0,currentZoom-MAP_OFFLINE_ZOOM_BEFORE);
    const maxZoom = Math.min(MAP_OFFLINE_MAX_ZOOM,currentZoom+MAP_OFFLINE_ZOOM_AFTER);
    const tiles = mapOfflineTileList(bounds,minZoom,maxZoom);

    if(!tiles.length) return;

    if(tiles.length>MAP_OFFLINE_TILE_CAP){
        showToast(
            `Zone trop grande pour un téléchargement raisonnable (${tiles.length} tuiles) — dézoome un peu moins large et réessaie.`,
            {type:"error",duration:4000}
        );
        return;
    }

    const originalLabel = mapDownloadAreaBtn.textContent;
    mapDownloadAreaBtn.disabled = true;
    showToast(`Téléchargement de ${tiles.length} tuiles pour un usage hors-ligne…`,{duration:3000});

    const subdomains = ["a","b","c"];
    let done = 0;
    let failed = 0;
    let index = 0;

    async function worker(){
        while(index<tiles.length){
            const tile = tiles[index++];
            const s = subdomains[(tile.x+tile.y)%subdomains.length];
            const url = `https://${s}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
            try{
                await fetch(url);
            }catch(err){
                failed++;
            }
            done++;
            mapDownloadAreaBtn.textContent = `⬇️ ${done}/${tiles.length}`;
        }
    }

    await Promise.all(Array.from({length:6},worker));

    mapDownloadAreaBtn.disabled = false;
    mapDownloadAreaBtn.textContent = originalLabel;

    if(failed){
        showToast(`Zone téléchargée avec ${failed} tuile(s) manquante(s) (réseau instable).`,{type:"error",duration:4000});
    }else{
        showToast("Zone téléchargée pour un usage hors-ligne.",{type:"success"});
    }
}

mapDownloadAreaBtn.addEventListener("click",downloadMapAreaOffline);

/* --- Écran toujours allumé pendant la navigation sur la carte ---
   CAPACITOR : l'API web Screen Wake Lock (utilisée ici) fonctionne déjà
   dans une WebView Capacitor sans plugin — @capacitor/keep-awake ne
   serait utile que si ça s'avère faux sur un vrai appareil/émulateur. */
const mapWakeLockToggle = document.getElementById("mapWakeLockToggle");
const wakeLockSupported = "wakeLock" in navigator;
let wakeLockSentinel = null;
let wakeLockWanted = false;

async function requestMapWakeLock(){
    if(!wakeLockSupported) return;
    try{
        wakeLockSentinel = await navigator.wakeLock.request("screen");
        wakeLockSentinel.addEventListener("release",()=>{
            wakeLockSentinel = null;
        });
    }catch(err){
        console.error("Écran allumé : impossible d'obtenir le verrou :",err);
    }
}

function releaseMapWakeLock(){
    wakeLockWanted = false;
    if(mapWakeLockToggle){
        mapWakeLockToggle.classList.remove("active");
        mapWakeLockToggle.setAttribute("aria-pressed","false");
    }
    if(wakeLockSentinel){
        wakeLockSentinel.release();
        wakeLockSentinel = null;
    }
}

if(wakeLockSupported){

    mapWakeLockToggle.hidden = false;

    mapWakeLockToggle.addEventListener("click",async ()=>{
        wakeLockWanted = !wakeLockWanted;
        mapWakeLockToggle.classList.toggle("active",wakeLockWanted);
        mapWakeLockToggle.setAttribute("aria-pressed",String(wakeLockWanted));
        if(wakeLockWanted){
            await requestMapWakeLock();
        }else if(wakeLockSentinel){
            wakeLockSentinel.release();
            wakeLockSentinel = null;
        }
    });

    /* Le navigateur relâche automatiquement le verrou quand l'onglet passe
       en arrière-plan (changement d'appli, écran éteint) — on le redemande
       au retour si l'utilisateur le voulait toujours actif. */
    document.addEventListener("visibilitychange",()=>{
        if(wakeLockWanted && document.visibilityState==="visible" && !wakeLockSentinel){
            requestMapWakeLock();
        }
    });
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
const mapPoiSearchBar = document.getElementById("mapPoiSearchBar");
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

        const popup = document.createElement("div");
        popup.textContent = place.name;

        L.marker([place.lat,place.lon],{icon})
        .addTo(mapPoiLayer)
        .bindPopup(popup);
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
    mapPoiSearchBar.hidden = !mapPoiActive;

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

/* Malgré le nom de la section ci-dessus, [data-profile-view] n'est plus
   réservé à des .profile-row du Profil : dayWeatherCard (carte météo du
   Planning) porte aussi cet attribut pour réutiliser ce déclenchement
   générique (ouverture/fermeture/restauration après rafraîchissement)
   plutôt que d'en écrire un second. Ne pas ajouter ici de logique qui
   suppose que "row" est forcément un .profile-row (classe CSS, contexte
   .profile-cat-group, etc.) sans vérifier — ça casserait silencieusement
   pour ce déclencheur-là. */
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
        localStorage.setItem(LAST_FULLSCREEN_VIEW_KEY,row.dataset.profileView);
        if(row.dataset.profileView==="reservationsView") renderReservations();
        if(row.dataset.profileView==="tripStatsView") renderProfileStats();
        if(row.dataset.profileView==="mapView") renderMapView();
        if(row.dataset.profileView==="albumView") renderAlbumView();
        if(row.dataset.profileView==="tripHistoryView") renderTripHistoryView();
        if(row.dataset.profileView==="weatherForecastView") renderWeatherForecast();
        if(row.dataset.profileView==="monthCalendarView") renderMonthCalendarView();
        if(row.dataset.profileView==="devicesView") attachDevicesPresenceListener();
        updateCountdownBanner();
    });
});

/* dayWeatherCard porte data-profile-view="weatherForecastView" (voir la
   boucle juste au-dessus, qui l'attache donc automatiquement) mais ce n'est
   pas un <button> comme les autres déclencheurs [data-profile-view] — même
   patron que .activity (div rendue focusable/cliquable au clavier) pour ne
   pas perdre l'accessibilité clavier en gardant le style .weather-card
   existant plutôt que de basculer vers un vrai bouton. */
dayWeatherCard.addEventListener("keydown",(e)=>{
    if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        dayWeatherCard.click();
    }
});

const profileSearchInput = document.getElementById("profileSearchInput");
const profileGroupedList = document.getElementById("profileGroupedList");
const profileSearchEmpty = document.getElementById("profileSearchEmpty");

function filterProfileList(){
    const q = profileSearchInput.value.trim().toLowerCase();
    let anyVisible = false;
    profileGroupedList.querySelectorAll(".profile-cat-group").forEach(group=>{
        let groupHasMatch = false;
        group.querySelectorAll(".profile-row").forEach(row=>{
            const label = row.querySelector(".profile-row-label").textContent.toLowerCase();
            const match = !q || label.includes(q);
            row.hidden = !match;
            if(match) groupHasMatch = true;
        });
        group.hidden = !groupHasMatch;
        if(groupHasMatch) anyVisible = true;
    });
    profileSearchEmpty.hidden = anyVisible;
}

profileSearchInput.addEventListener("input",filterProfileList);

/* Réservations/Album sont dans .profile-sub-view (voir plus haut) pour
   rester ouvrables depuis le menu du coin sur desktop, mais sur mobile ce
   sont maintenant de vrais onglets (activeMainTab) — leur bouton "←" doit
   donc repasser par setActiveMainTab("planning"), pas juste se cacher,
   sinon activeMainTab resterait bloqué sur "reservations"/"album" alors que
   la vue est masquée (Planning ne se réafficherait jamais). Sur desktop,
   où ni le bandeau du bas ni activeMainTab ne pilotent ces deux vues,
   l'ancien comportement (juste se cacher) reste correct et inchangé. */
document.querySelectorAll(".profile-back").forEach(btn=>{
    btn.addEventListener("click",()=>{
        closeAllMenus();
        const view = btn.closest(".profile-sub-view");
        if(!isDesktopContext() && (view===reservationsView || view===albumView)){
            setActiveMainTab("planning");
            return;
        }
        view.hidden = true;
        if(view.id==="mapView" && wakeLockWanted) releaseMapWakeLock();
        if(view.id==="devicesView") detachDevicesPresenceListener();
        localStorage.removeItem(LAST_FULLSCREEN_VIEW_KEY);
        updateCountdownBanner();
    });
});

/* Restaure la vue active mémorisée (voir LAST_MAIN_TAB_KEY/
   LAST_FULLSCREEN_VIEW_KEY plus haut) — doit s'exécuter après que tous
   les gestionnaires de clic ci-dessus soient attachés, puisqu'elle
   réutilise le déclencheur [data-profile-view] existant (.click()) au
   lieu de dupliquer sa logique d'ouverture (render() associé compris).

   setTimeout(...,0) (2026-09-05, root cause d'un vrai bug trouvé en testant
   une fonctionnalité sans rapport) : trigger.click() déclenche en cascade
   closeAllFullscreenViews()/closeAllMenus(), qui référencent une bonne
   dizaine de const/let déclarées PLUS LOIN dans ce fichier (cameraView,
   wakeLockWanted, devicesPresenceRef, desktopProfilePanel...) — appelées ici
   de façon SYNCHRONE avant que le reste du script n'ait fini de s'exécuter,
   n'importe laquelle d'entre elles pouvait lever une vraie TDZ et stopper
   NET toute exécution du script au-delà de ce point (pas juste cet appel-ci
   qui échoue : plus RIEN après ne s'exécute, y compris des déclarations
   normalement sans rapport). Se reproduisait dès qu'une vue plein écran
   était ouverte à la dernière fermeture de l'appli — donc probablement à
   chaque ouverture pour un usage réel. Plutôt que de traquer une à une
   toutes les variables tardives transitivement atteignables (fragile, il
   pourrait en rester), reporter tout ce bloc à la prochaine tâche macro
   (après la fin de l'exécution synchrone complète du script, donc après
   TOUTES les déclarations) élimine la classe de bug entière d'un coup —
   invisible pour l'utilisateur (avant le premier rendu à l'écran). */
(function restoreLastMainView(){
    setTimeout(()=>{

        const savedTab = localStorage.getItem(LAST_MAIN_TAB_KEY);
        if(savedTab && savedTab!=="planning"){
            setActiveMainTab(savedTab);
        }

        /* reservationsView/albumView exclues ici sur mobile : gérées par
           LAST_MAIN_TAB_KEY ci-dessus maintenant, comme budget/profile — ce
           bloc ne doit plus les rouvrir en vue plein écran par-dessus. Sur
           desktop, où LAST_MAIN_TAB_KEY ne pilote pas ces deux vues, ce
           chemin reste le seul mécanisme de restauration et doit continuer à
           fonctionner tel quel. */
        const savedView = localStorage.getItem(LAST_FULLSCREEN_VIEW_KEY);
        if(savedView && (isDesktopContext() || (savedView!=="reservationsView" && savedView!=="albumView"))){
            const trigger = document.querySelector(`[data-profile-view="${savedView}"]`);
            if(trigger) trigger.click();
        }
    },0);
})();

document.addEventListener("keydown",(e)=>{
    if(e.key!=="Escape") return;
    if(!isDesktopContext() && (activeMainTab==="reservations" || activeMainTab==="album")){
        setActiveMainTab("planning");
    }
    document.querySelectorAll(".profile-sub-view").forEach(view=>{
        if(!isDesktopContext() && (view===reservationsView || view===albumView)) return;
        if(!view.hidden){
            view.hidden = true;
            if(view.id==="mapView" && wakeLockWanted) releaseMapWakeLock();
            if(view.id==="devicesView") detachDevicesPresenceListener();
            localStorage.removeItem(LAST_FULLSCREEN_VIEW_KEY);
        }
    });
    updateCountdownBanner();
});

/* --- Convertisseur de devises GBP ↔ (JPY / EUR) ---
   CURRENCIES/baseCurrency/targetCurrency/currentRate sont déclarées tout en
   haut du fichier, pas ici : voir le commentaire près de leur déclaration. */

const CONVERSION_DECIMALS_KEY = "conversionDecimals";
const conversionDecimalsStored = localStorage.getItem(CONVERSION_DECIMALS_KEY);
let conversionDecimalsOverride = conversionDecimalsStored!==null ? parseInt(conversionDecimalsStored,10) : null;

/* null = "Automatique" : garde le nombre de décimales propre à chaque
   devise (CURRENCIES[x].decimals, ex. 0 pour le yen) comme avant ce
   réglage. Une valeur choisie l'emporte sur toutes les devises. */
function decimalsFor(currencyCode){
    return conversionDecimalsOverride!==null ? conversionDecimalsOverride : CURRENCIES[currencyCode].decimals;
}

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

const conversionDecimalsSelect = document.getElementById("conversionDecimalsSelect");
conversionDecimalsSelect.value = conversionDecimalsOverride!==null ? String(conversionDecimalsOverride) : "";
conversionDecimalsSelect.addEventListener("change",()=>{
    conversionDecimalsOverride = conversionDecimalsSelect.value==="" ? null : parseInt(conversionDecimalsSelect.value,10);
    if(conversionDecimalsOverride===null){
        localStorage.removeItem(CONVERSION_DECIMALS_KEY);
    }else{
        localStorage.setItem(CONVERSION_DECIMALS_KEY,conversionDecimalsOverride);
    }
    pushToSync();
    convertFromBase();
    updateRateDisplay();
});

[converterBaseCurrencySelect,targetCurrencySelect].forEach(select=>{
    select.innerHTML = "";
    Object.keys(CURRENCIES).forEach(code=>{
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code} (${CURRENCIES[code].symbol})`;
        select.appendChild(opt);
    });
});

converterBaseCurrencySelect.value = baseCurrency;
targetCurrencySelect.value = targetCurrency;

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
    updateActivityPriceCurrencyToggle();
    renderActivities();
});

targetCurrencySelect.addEventListener("change",()=>{

    targetCurrency = targetCurrencySelect.value;
    localStorage.setItem("targetCurrency",targetCurrency);

    applyCurrencyMeta();
    targetInput.value = "";
    currentRate = null;

    fetchExchangeRate();
    updateActivityPriceCurrencyToggle();
    renderActivities();
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
    `1 ${baseCurrency} = ${currentRate.toFixed(decimalsFor(targetCurrency))} ${targetCurrency}`;

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
    (val * currentRate).toFixed(decimalsFor(targetCurrency));
}

function convertFromTarget(){

    if(currentRate===null) return;

    const val = parseFloat(targetInput.value);

    if(isNaN(val)){
        baseInput.value = "";
        return;
    }

    baseInput.value = (val / currentRate).toFixed(decimalsFor(baseCurrency));
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

    renderTricount();
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

/* --- Tricount (dépenses partagées) ---
   TRICOUNT_PARTICIPANTS_KEY/TRICOUNT_EXPENSES_KEY et le chargement initial de
   tricountParticipants/tricountExpenses sont tout en haut du fichier, pas
   ici : voir le commentaire près de leur déclaration. */

const TRICOUNT_EPS = 0.01;

renderActivities();

const tricountParticipantsList = document.getElementById("tricountParticipantsList");
const tricountAddRow = document.getElementById("tricountAddRow");
const tricountParticipantInput = document.getElementById("tricountParticipantInput");
const tricountAddParticipantBtn = document.getElementById("tricountAddParticipantBtn");
const tricountHint = document.getElementById("tricountHint");
const tricountExpenseForm = document.getElementById("tricountExpenseForm");
const tricountExpenseDesc = document.getElementById("tricountExpenseDesc");
const tricountExpenseAmount = document.getElementById("tricountExpenseAmount");
const tricountCurrencyBaseBtn = document.getElementById("tricountCurrencyBaseBtn");
const tricountCurrencyTargetBtn = document.getElementById("tricountCurrencyTargetBtn");
let tricountExpenseCurrencyRole = "base";
const tricountPayerSelect = document.getElementById("tricountPayerSelect");
const tricountSplitCheckboxes = document.getElementById("tricountSplitCheckboxes");
const tricountAddExpenseBtn = document.getElementById("tricountAddExpenseBtn");
const tricountCancelEditBtn = document.getElementById("tricountCancelEditBtn");
let editingTricountExpenseId = null;
let pendingTricountActivityLink = null;

/* --- Reçu attaché à une dépense --- */
const tricountReceiptBtn = document.getElementById("tricountReceiptBtn");
const tricountReceiptInput = document.getElementById("tricountReceiptInput");
const tricountReceiptPreview = document.getElementById("tricountReceiptPreview");
const tricountReceiptThumb = document.getElementById("tricountReceiptThumb");
const tricountReceiptRemoveBtn = document.getElementById("tricountReceiptRemoveBtn");

let pendingReceiptFile = null;
let pendingReceiptRemoved = false;
let editingExpenseExistingReceiptId = null;
let tricountReceiptPreviewUrl = null;

function showTricountReceiptPreview(blob){
    if(tricountReceiptPreviewUrl) URL.revokeObjectURL(tricountReceiptPreviewUrl);
    tricountReceiptPreviewUrl = URL.createObjectURL(blob);
    tricountReceiptThumb.src = tricountReceiptPreviewUrl;
    tricountReceiptPreview.hidden = false;
    tricountReceiptBtn.hidden = true;
}

function hideTricountReceiptPreview(){
    if(tricountReceiptPreviewUrl){
        URL.revokeObjectURL(tricountReceiptPreviewUrl);
        tricountReceiptPreviewUrl = null;
    }
    tricountReceiptThumb.removeAttribute("src");
    tricountReceiptPreview.hidden = true;
    tricountReceiptBtn.hidden = false;
}

function resetTricountReceiptState(){
    pendingReceiptFile = null;
    pendingReceiptRemoved = false;
    editingExpenseExistingReceiptId = null;
    hideTricountReceiptPreview();
}

tricountReceiptBtn.addEventListener("click",()=>openExpenseCameraView());

tricountReceiptInput.addEventListener("change",()=>{
    const file = tricountReceiptInput.files[0];
    tricountReceiptInput.value = "";
    if(!file) return;
    pendingReceiptFile = file;
    pendingReceiptRemoved = false;
    showTricountReceiptPreview(file);
});

tricountReceiptRemoveBtn.addEventListener("click",()=>{
    pendingReceiptFile = null;
    pendingReceiptRemoved = true;
    hideTricountReceiptPreview();
});

function startTricountExpenseFromActivity(activity){

    if(tricountParticipants.length<2){
        showToast("Ajoute au moins 2 participants dans Tricount avant d'associer une dépense.",{type:"error"});
        setActiveMainTab("budget");
        switchTricountTab("participants");
        return;
    }

    cancelTricountExpenseEdit();
    pendingTricountActivityLink = activity.id;

    tricountExpenseDesc.value = activity.name;
    if(activity.price!==null && activity.price!==undefined){
        tricountExpenseAmount.value = activity.price;
        tricountExpenseCurrencyRole =
            (activity.priceCurrency===targetCurrency && targetCurrency!==baseCurrency) ? "target" : "base";
        updateTricountCurrencyToggle();
    }

    setActiveMainTab("budget");
    switchTricountTab("new");
    tricountExpenseAmount.focus();
}
const tricountExpensesList = document.getElementById("tricountExpensesList");
const tricountBalancesList = document.getElementById("tricountBalancesList");
const tricountConversionWarning = document.getElementById("tricountConversionWarning");
const tricountSettleList = document.getElementById("tricountSettleList");

/* tricountTabButtons/tricountTabPanels déclarées tout en haut du fichier,
   pas ici : voir le commentaire près de leur déclaration. */

function switchTricountTab(tabName){
    tricountTabButtons.forEach(b=>b.classList.toggle("active",b.dataset.tricountTab===tabName));
    tricountTabPanels.forEach(p=>{
        p.hidden = p.dataset.tricountPanel!==tabName;
    });
}

tricountTabButtons.forEach(btn=>{
    btn.addEventListener("click",()=>switchTricountTab(btn.dataset.tricountTab));
});

function saveTricountParticipants(){
    localStorage.setItem(TRICOUNT_PARTICIPANTS_KEY,JSON.stringify(tricountParticipants));
    pushToSync();
}

function saveTricountExpenses(){
    localStorage.setItem(TRICOUNT_EXPENSES_KEY,JSON.stringify(tricountExpenses));
    pushToSync();
}

function tricountAmountInBase(exp){
    const currency = exp.currency || baseCurrency;
    if(currency===baseCurrency) return exp.amount;
    if(currency===targetCurrency && currentRate) return exp.amount / currentRate;
    return exp.amount;
}

/* Vrai quand tricountAmountInBase() ne peut pas réellement convertir ce
   montant (devise différente de la devise de base, mais pas de taux
   disponible pour la convertir) — il est alors traité tel quel dans les
   soldes, ce qui les fausse silencieusement si on ne le signale pas. */
function tricountExpenseNeedsConversionWarning(exp){
    const currency = exp.currency || baseCurrency;
    if(currency===baseCurrency) return false;
    if(currency===targetCurrency && currentRate) return false;
    return true;
}

function computeTricountBalances(){
    const paid = {}, owed = {};
    tricountParticipants.forEach(p=>{ paid[p.id]=0; owed[p.id]=0; });
    tricountExpenses.forEach(exp=>{
        const amount = tricountAmountInBase(exp);
        if(paid[exp.paidBy]!==undefined) paid[exp.paidBy] += amount;
        const n = exp.splitBetween.length;
        if(n===0) return;
        const share = amount / n;
        exp.splitBetween.forEach(pid=>{
            if(owed[pid]!==undefined) owed[pid] += share;
        });
    });
    return tricountParticipants.map(p=>({
        id: p.id,
        name: p.name,
        amount: Math.round((paid[p.id]-owed[p.id])*100)/100
    }));
}

function computeTricountSettlePlan(balances){

    const creditors = balances.filter(b=>b.amount>TRICOUNT_EPS)
        .map(b=>({...b})).sort((a,b)=>b.amount-a.amount);
    const debtors = balances.filter(b=>b.amount<-TRICOUNT_EPS)
        .map(b=>({...b,amount:-b.amount})).sort((a,b)=>b.amount-a.amount);

    const transfers = [];
    let i=0, j=0;

    while(i<creditors.length && j<debtors.length){

        const c = creditors[i], d = debtors[j];
        const amt = Math.round(Math.min(c.amount,d.amount)*100)/100;

        if(amt>TRICOUNT_EPS){
            transfers.push({fromId:d.id,fromName:d.name,toId:c.id,toName:c.name,amount:amt});
        }

        c.amount -= amt;
        d.amount -= amt;

        if(c.amount<=TRICOUNT_EPS) i++;
        if(d.amount<=TRICOUNT_EPS) j++;
    }

    return transfers;
}

function tricountIsParticipantReferenced(id){
    return tricountExpenses.some(exp=>exp.paidBy===id || exp.splitBetween.includes(id));
}

const TRICOUNT_AVATAR_COLORS = ["#D2503B","#3D7CFF","#2F8F5B","#00ACC1","#FFB300","#78909C","#EF5350"];

function tricountAvatarColor(id){
    let hash = 0;
    for(let i=0;i<id.length;i++){
        hash = (hash*31 + id.charCodeAt(i)) >>> 0;
    }
    return TRICOUNT_AVATAR_COLORS[hash % TRICOUNT_AVATAR_COLORS.length];
}

function renderTricountParticipants(){

    tricountParticipantsList.textContent = "";

    tricountParticipants.forEach(p=>{

        const row = document.createElement("div");
        row.className = "tricount-participant-row";

        const avatar = document.createElement("span");
        avatar.className = "tricount-avatar";
        avatar.style.background = tricountAvatarColor(p.id);
        avatar.textContent = (p.name.trim().charAt(0) || "?").toUpperCase();
        row.appendChild(avatar);

        const info = document.createElement("span");
        info.className = "tricount-participant-info";

        const name = document.createElement("span");
        name.textContent = p.name;
        info.appendChild(name);

        const paidCount = tricountExpenses.filter(exp=>exp.paidBy===p.id).length;
        const sub = document.createElement("small");
        sub.textContent =
            paidCount===0 ? "Aucune dépense payée" :
            paidCount===1 ? "A payé 1 dépense" :
            `A payé ${paidCount} dépenses`;
        info.appendChild(sub);

        row.appendChild(info);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "tricount-remove";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label",`Supprimer ${p.name}`);
        removeBtn.addEventListener("click",()=>{
            deleteTricountParticipant(p.id);
        });
        row.appendChild(removeBtn);

        tricountParticipantsList.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "tricount-add-participant-btn";
    addBtn.textContent = "＋ Ajouter un participant";
    addBtn.setAttribute("aria-expanded",String(!tricountAddRow.hidden));
    addBtn.addEventListener("click",()=>{
        tricountAddRow.hidden = !tricountAddRow.hidden;
        addBtn.setAttribute("aria-expanded",String(!tricountAddRow.hidden));
        if(!tricountAddRow.hidden) tricountParticipantInput.focus();
    });
    tricountParticipantsList.appendChild(addBtn);

    const enough = tricountParticipants.length>=2;
    tricountHint.hidden = enough;
    tricountExpenseForm.hidden = !enough;

    renderTricountExpenseForm();
}

function updateTricountCurrencyToggle(){
    tricountCurrencyBaseBtn.textContent = baseCurrency;
    tricountCurrencyTargetBtn.textContent = targetCurrency;
    tricountCurrencyBaseBtn.classList.toggle("active",tricountExpenseCurrencyRole==="base");
    tricountCurrencyTargetBtn.classList.toggle("active",tricountExpenseCurrencyRole==="target");
}

tricountCurrencyBaseBtn.addEventListener("click",()=>{
    tricountExpenseCurrencyRole = "base";
    updateTricountCurrencyToggle();
});

tricountCurrencyTargetBtn.addEventListener("click",()=>{
    tricountExpenseCurrencyRole = "target";
    updateTricountCurrencyToggle();
});

function renderTricountExpenseForm(){

    updateTricountCurrencyToggle();

    const editingExpense = editingTricountExpenseId
        ? tricountExpenses.find(e=>e.id===editingTricountExpenseId)
        : null;

    const previousPayer = editingExpense ? editingExpense.paidBy : tricountPayerSelect.value;

    tricountPayerSelect.textContent = "";
    tricountParticipants.forEach(p=>{
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        tricountPayerSelect.appendChild(opt);
    });

    if(tricountParticipants.some(p=>p.id===previousPayer)){
        tricountPayerSelect.value = previousPayer;
    }else if(tricountParticipants.length){
        tricountPayerSelect.value = tricountParticipants[0].id;
    }

    tricountSplitCheckboxes.textContent = "";
    tricountParticipants.forEach(p=>{

        const label = document.createElement("label");
        label.className = "tricount-split-check";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = p.id;
        checkbox.checked = editingExpense ? editingExpense.splitBetween.includes(p.id) : true;
        label.appendChild(checkbox);

        label.appendChild(document.createTextNode(p.name));

        tricountSplitCheckboxes.appendChild(label);
    });
}

async function startEditTricountExpense(id){

    const exp = tricountExpenses.find(e=>e.id===id);
    if(!exp) return;

    editingTricountExpenseId = id;
    resetTricountReceiptState();

    switchTricountTab("new");

    tricountExpenseDesc.value = exp.description;
    tricountExpenseAmount.value = exp.amount;
    tricountExpenseCurrencyRole =
    (exp.currency===targetCurrency && targetCurrency!==baseCurrency) ? "target" : "base";

    renderTricountExpenseForm();

    tricountAddExpenseBtn.textContent = "Enregistrer les modifications";
    tricountCancelEditBtn.hidden = false;

    tricountExpenseDesc.focus();

    try{
        const receipt = await getExpensePhoto(id);
        if(receipt){
            editingExpenseExistingReceiptId = receipt.id;
            showTricountReceiptPreview(receipt.blob);
        }
    }catch(err){
        console.error("Reçu introuvable :",err);
    }
}

function cancelTricountExpenseEdit(){

    editingTricountExpenseId = null;
    pendingTricountActivityLink = null;
    resetTricountReceiptState();

    tricountExpenseDesc.value = "";
    tricountExpenseAmount.value = "";
    tricountExpenseCurrencyRole = "base";

    tricountAddExpenseBtn.textContent = "Ajouter la dépense";
    tricountCancelEditBtn.hidden = true;

    renderTricountExpenseForm();
}

let tricountReceiptObjectUrls = [];

/* L'appel async getAllExpensePhotos() vient AVANT tout vidage/reconstruction
   du DOM, jamais entre les deux : cette fonction est appelée deux fois par
   addTricountExpense() (une fois via renderTricount(), une fois via
   refreshOpenPhotoViews() une fois le reçu écrit) et si le vidage et l'ajout
   des lignes étaient séparés par un await, les deux appels pouvaient se
   chevaucher — chacun vidant puis rajoutant PAR-DESSUS ce que l'autre venait
   d'ajouter, doublant chaque ligne. Une fois l'await passé, tout le reste
   (vidage + reconstruction) est synchrone d'un bloc, donc jamais entrelacé. */
async function renderTricountExpenses(){

    let receiptsByExpenseId = {};
    try{
        (await getAllExpensePhotos()).forEach(photo=>{ receiptsByExpenseId[photo.expenseId] = photo; });
    }catch(err){
        console.error("Impossible de charger les reçus :",err);
    }

    tricountExpensesList.textContent = "";

    tricountReceiptObjectUrls.forEach(url=>URL.revokeObjectURL(url));
    tricountReceiptObjectUrls = [];

    const sorted = [...tricountExpenses].sort((a,b)=>b.timestamp-a.timestamp);

    sorted.forEach(exp=>{

        const row = document.createElement("div");
        row.className = "tricount-expense-row";

        const payer = tricountParticipants.find(p=>p.id===exp.paidBy);
        const splitNames = exp.splitBetween
            .map(id=>{
                const p = tricountParticipants.find(pp=>pp.id===id);
                return p ? p.name : null;
            })
            .filter(Boolean)
            .join(", ");

        const info = document.createElement("div");
        const title = document.createElement("div");
        const expCurrency = exp.currency || baseCurrency;
        const needsWarning = tricountExpenseNeedsConversionWarning(exp);
        let amountText = `${exp.amount.toFixed(2)} ${expCurrency}`;
        if(expCurrency!==baseCurrency && !needsWarning){
            amountText += ` (≈ ${tricountAmountInBase(exp).toFixed(2)} ${baseCurrency})`;
        }
        title.textContent = `${exp.description} — ${amountText}`;
        info.appendChild(title);

        const meta = document.createElement("small");
        meta.textContent = `Payé par ${payer ? payer.name : "?"} · Pour ${splitNames || "personne"}`;
        if(exp.activityId){
            const linked = findActivityByIdAnywhere(exp.activityId);
            if(linked) meta.textContent += ` · 🔗 ${linked.activity.name} (Jour ${linked.day})`;
        }
        info.appendChild(meta);

        if(needsWarning){
            const warning = document.createElement("small");
            warning.className = "tricount-warning";
            warning.textContent = `⚠️ Non convertible en ${baseCurrency} pour l'instant — compté tel quel dans les soldes.`;
            info.appendChild(warning);
        }

        row.appendChild(info);

        const actions = document.createElement("span");
        actions.className = "tricount-row-actions";

        const receipt = receiptsByExpenseId[exp.id];
        if(receipt){
            const receiptUrl = URL.createObjectURL(receipt.blob);
            tricountReceiptObjectUrls.push(receiptUrl);
            const receiptBtn = document.createElement("button");
            receiptBtn.type = "button";
            receiptBtn.className = "tricount-receipt-view-btn";
            receiptBtn.textContent = "📎";
            receiptBtn.title = "Voir le reçu";
            receiptBtn.setAttribute("aria-label",`Voir le reçu de ${exp.description}`);
            receiptBtn.addEventListener("click",()=>{
                openPhotoLightbox(receipt.id,receiptUrl,[{id:receipt.id,url:receiptUrl,type:mediaTypeFromBlob(receipt.blob)}]);
            });
            actions.appendChild(receiptBtn);
        }

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "tricount-edit";
        editBtn.textContent = "✏️";
        editBtn.setAttribute("aria-label",`Modifier la dépense ${exp.description}`);
        editBtn.addEventListener("click",()=>{
            startEditTricountExpense(exp.id);
        });
        actions.appendChild(editBtn);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "tricount-remove";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label",`Supprimer la dépense ${exp.description}`);
        removeBtn.addEventListener("click",()=>{
            deleteTricountExpense(exp.id);
        });
        actions.appendChild(removeBtn);

        row.appendChild(actions);

        tricountExpensesList.appendChild(row);
    });
}

function renderTricountBalances(){

    tricountBalancesList.textContent = "";

    tricountConversionWarning.hidden = !tricountExpenses.some(tricountExpenseNeedsConversionWarning);

    const balances = computeTricountBalances();

    balances.forEach(b=>{

        const row = document.createElement("div");
        row.className = "tricount-balance-row" + (b.amount>TRICOUNT_EPS ? " positive" : b.amount<-TRICOUNT_EPS ? " negative" : "");

        const name = document.createElement("span");
        name.textContent = b.name;
        row.appendChild(name);

        const amount = document.createElement("span");
        amount.textContent = `${b.amount>0 ? "+" : ""}${b.amount.toFixed(2)} ${baseCurrency}`;
        row.appendChild(amount);

        tricountBalancesList.appendChild(row);
    });
}

function renderTricountSettleUp(){

    tricountSettleList.textContent = "";

    const transfers = computeTricountSettlePlan(computeTricountBalances());

    if(!transfers.length){
        const row = document.createElement("div");
        row.className = "tricount-settle-row";
        row.textContent = tricountExpenses.length ? "Tout est équilibré ✅" : "Aucune dépense pour l'instant.";
        tricountSettleList.appendChild(row);
        return;
    }

    transfers.forEach(t=>{
        const row = document.createElement("div");
        row.className = "tricount-settle-row";
        row.textContent = `${t.fromName} doit ${t.amount.toFixed(2)} ${baseCurrency} à ${t.toName}`;
        tricountSettleList.appendChild(row);
    });
}

function renderTricount(){
    renderTricountParticipants();
    renderTricountExpenses();
    renderTricountBalances();
    renderTricountSettleUp();
}

function addTricountParticipant(){

    const name = tricountParticipantInput.value.trim();
    if(!name) return;

    tricountParticipants.push({id:generateId(),name});
    saveTricountParticipants();
    renderTricount();

    tricountParticipantInput.value = "";
    tricountParticipantInput.focus();
}

function deleteTricountParticipant(id){

    if(tricountIsParticipantReferenced(id)){
        const count = tricountExpenses.filter(exp=>exp.paidBy===id || exp.splitBetween.includes(id)).length;
        showToast(
            `Ce participant est lié à ${count} dépense(s) — supprime-les d'abord.`,
            {type:"error"}
        );
        return;
    }

    const participant = tricountParticipants.find(p=>p.id===id);

    showConfirmModal(
        `Supprimer ${participant ? participant.name : "ce participant"} ?`,
        ()=>{
            tricountParticipants = tricountParticipants.filter(p=>p.id!==id);
            saveTricountParticipants();
            renderTricount();
        }
    );
}

function addTricountExpense(){

    const description = tricountExpenseDesc.value.trim();
    const amount = parseFloat(tricountExpenseAmount.value);
    const payerId = tricountPayerSelect.value;
    const splitBetween = [...tricountSplitCheckboxes.querySelectorAll("input:checked")].map(c=>c.value);

    if(!description){
        showToast("Donne une description à la dépense.",{type:"error"});
        return;
    }

    if(isNaN(amount) || amount<=0){
        showToast("Indique un montant valide.",{type:"error"});
        return;
    }

    if(!payerId){
        showToast("Choisis qui a payé.",{type:"error"});
        return;
    }

    if(!splitBetween.length){
        showToast("Sélectionne au moins un participant.",{type:"error"});
        return;
    }

    const currency = tricountExpenseCurrencyRole==="target" ? targetCurrency : baseCurrency;

    if(currency!==baseCurrency && currentRate===null){
        showToast(
            "Taux de change indisponible pour convertir cette devise — réessaie plus tard ou choisis la devise de départ.",
            {type:"error"}
        );
        return;
    }

    const isEditing = !!editingTricountExpenseId;
    let expenseId;

    if(isEditing){

        expenseId = editingTricountExpenseId;
        const exp = tricountExpenses.find(e=>e.id===expenseId);
        if(exp){
            exp.description = description;
            exp.amount = amount;
            exp.currency = currency;
            exp.paidBy = payerId;
            exp.splitBetween = splitBetween;
        }

        editingTricountExpenseId = null;
        tricountAddExpenseBtn.textContent = "Ajouter la dépense";
        tricountCancelEditBtn.hidden = true;

    }else{

        expenseId = generateId();
        tricountExpenses.push({
            id: expenseId,
            description,
            amount,
            currency,
            paidBy: payerId,
            splitBetween,
            activityId: pendingTricountActivityLink,
            timestamp: Date.now()
        });
    }

    const cameFromActivity = !!pendingTricountActivityLink;
    pendingTricountActivityLink = null;

    /* Reçu : supprime l'ancien d'abord si on en remplace un ou qu'on le
       retire, puis ajoute le nouveau s'il y en a un — jamais les deux en
       même temps pour éviter deux reçus sur la même dépense. */
    const receiptToDelete = editingExpenseExistingReceiptId;
    const receiptToAdd = pendingReceiptFile;
    const receiptWasRemoved = pendingReceiptRemoved;
    resetTricountReceiptState();

    (async ()=>{
        try{
            if(receiptToDelete && (receiptWasRemoved || receiptToAdd)) await deleteDayPhoto(receiptToDelete);
            if(receiptToAdd) await addExpensePhoto(expenseId,receiptToAdd);
            refreshOpenPhotoViews();
        }catch(err){
            console.error("Impossible d'enregistrer le reçu :",err);
            showToast("Dépense enregistrée, mais le reçu n'a pas pu être sauvegardé.",{type:"error"});
        }
    })();

    saveTricountExpenses();
    renderTricount();

    tricountExpenseDesc.value = "";
    tricountExpenseAmount.value = "";

    if(cameFromActivity){
        showToast(`Dépense « ${description} » ajoutée.`,{type:"success",duration:2500});
        renderActivities();
        setActiveMainTab("planning");
    }else{
        showToast(
            isEditing ? `Dépense « ${description} » modifiée.` : `Dépense « ${description} » ajoutée.`,
            {type:"success",duration:2000}
        );
    }
}

function deleteTricountExpense(id){
    const expense = tricountExpenses.find(e=>e.id===id);
    showConfirmModal(
        `Supprimer la dépense « ${expense ? expense.description : ""} » ?`,
        async ()=>{
            tricountExpenses = tricountExpenses.filter(e=>e.id!==id);
            saveTricountExpenses();
            if(editingTricountExpenseId===id) cancelTricountExpenseEdit();
            renderTricount();
            try{
                const receipt = await getExpensePhoto(id);
                if(receipt){
                    await deleteDayPhoto(receipt.id);
                    refreshOpenPhotoViews();
                }
            }catch(err){
                console.error("Impossible de supprimer le reçu :",err);
            }
        }
    );
}

tricountAddParticipantBtn.addEventListener("click",addTricountParticipant);

tricountParticipantInput.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
        e.preventDefault();
        addTricountParticipant();
    }
});

tricountAddExpenseBtn.addEventListener("click",addTricountExpense);
tricountCancelEditBtn.addEventListener("click",cancelTricountExpenseEdit);

renderTricount();

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

/* Audit 2026-09-01 : ces deux appels tournaient sans filet, en haut de
   fichier — si le SDK Firebase n'avait pas fini de charger (ex. tout
   premier lancement hors-ligne, avant que le service worker ait eu la
   moindre chance de mettre vendor/firebase-*.js en cache), l'erreur
   synchrone levée ici plantait le SCRIPT ENTIER à partir de ce point :
   tout ce qui est déclaré plus bas (historique des voyages,
   enregistrement du service worker, badge de version…) ne s'exécutait
   simplement jamais, sans le moindre message. syncDb=null dégrade
   maintenant la synchronisation vers son état "non disponible" déjà
   prévu par ailleurs (mêmes chemins que "hors ligne"/"pas encore
   appairé"), au lieu de tout arrêter. */
let syncDb = null;

/* Stockage cloud des pièces jointes (documents partagés, 2026-09-03) — voir
   uploadAttachmentToCloud()/attachTripAttachmentsListener() plus bas dans
   ce fichier. null tant que firebase.storage() n'a pas réussi (dégrade
   comme syncDb=null : chaque appelant garde sur sa présence). */
let syncStorage = null;

/* Cache plat {cloudId: {day,activityId,fileName,kind,size,contentType,
   timestamp,deviceId}} des documents partagés par d'autres appareils —
   jamais le fichier lui-même, juste ses métadonnées. Remplacé en bloc à
   chaque "value" du listener attachTripAttachmentsListener(). */
let remoteAttachmentsIndex = {};
let attachmentsIndexRef = null;

/* Se règle sur la promesse de connexion anonyme ci-dessous — résolue (pas
   rejetée) une fois la TENTATIVE de connexion terminée, qu'elle ait
   réussi ou non. Chaque fonction qui écrit/lit réellement sur Firebase
   fait "await syncAuthReady;" avant son premier syncDb.ref(...) (2026-
   09-02, voir plus bas) : sans ça, un clic assez rapide après le
   chargement de la page pouvait lancer une écriture AVANT que le SDK
   n'ait fini de s'authentifier, et les règles ("auth != null") la
   rejetaient alors même que la connexion aurait fini par réussir une
   fraction de seconde plus tard — confirmé en test (lastPushedPayload
   jamais renseigné après un clic "Générer un code" trop rapide). Reste
   une promesse déjà résolue par défaut si l'auth échoue à s'initialiser
   plus bas, pour ne jamais bloquer indéfiniment un "await" en aval. */
let syncAuthReady = Promise.resolve();

try{
    firebase.initializeApp(firebaseConfig);
    syncDb = firebase.database();

    /* Documents partagés (2026-09-03) : upload réel des pièces jointes vers
       Firebase Storage, cf. storage.rules — dans son propre try imbriqué
       comme l'auth juste en dessous, pour la même raison : vendor/firebase-
       storage-compat.js pourrait manquer/échouer sans que ça invalide syncDb
       (planning/checklist/tricount... continuent de fonctionner sans). */
    try{
        syncStorage = firebase.storage();
    }catch(err){
        console.error("Module de stockage Firebase indisponible :",err);
    }

    /* Connexion anonyme (2026-09-02) : aucun écran de connexion, aucun mot
       de passe — juste une identité par appareil que le SDK crée et
       persiste tout seul, pour que les règles Firebase puissent exiger
       "auth != null" en plus de connaître le code à 10 caractères (ferme
       l'accès direct par script/curl à la base, démontré possible sans
       ça — voir le commentaire "auth != null" plus bas près de
       database.rules.json). Ne bloque rien si ça échoue : la base reste
       lisible/inscriptible sous les règles ACTUELLES tant que
       l'authentification anonyme n'a pas été activée dans la console
       Firebase — voir ce fichier. */
    try{
        syncAuthReady = firebase.auth().signInAnonymously().catch(err=>{
            console.error("Connexion anonyme Firebase impossible (l'authentification n'est peut-être pas encore activée dans la console) :",err);
        });
    }catch(err){
        // vendor/firebase-auth-compat.js absent/pas chargé : syncDb reste
        // valable, seule l'identité anonyme manque — pas une raison de
        // considérer toute la synchronisation indisponible (voir le catch
        // englobant juste en dessous, qui aurait ce message trompeur).
        console.error("Module d'authentification Firebase indisponible :",err);
    }
}catch(err){
    console.error("Synchronisation indisponible (Firebase n'a pas pu s'initialiser) :",err);
}

/* --- Robustesse hors-ligne ---
   ".info/connected" est un chemin spécial du SDK Realtime Database :
   reflète l'état réel de connexion au serveur (pas juste navigator.onLine,
   qui ne détecte qu'une coupure réseau totale, pas un serveur injoignable
   ou une appli en veille). Le SDK met déjà en file d'attente les écritures
   faites hors-ligne et les rejoue tout seul à la reconnexion — inutile de
   coder une logique de nouvelle tentative ; il suffit de refléter l'état
   correctement pour que l'utilisateur ne pense pas que "rien ne se passe". */
let firebaseConnected = true;

function updateSyncConnectionStatus(){
    if(!syncCode || !syncStatus) return;
    if(!firebaseConnected){
        syncStatus.textContent = "🔴 Hors ligne — en attente de connexion";
        syncStatus.classList.add("offline");
    }else{
        syncStatus.classList.remove("offline");
        if(syncStatus.textContent.startsWith("🔴")){
            syncStatus.textContent = "🟢 Connecté";
        }
    }
}

const SYNC_CODE_KEY = "syncCode";
const SYNC_DEVICE_ID_KEY = "syncDeviceId";
const SYNC_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* Appairer (QR/code) et synchroniser le planning en continu sont maintenant
   deux choses séparées (mockup B validé) : par défaut activée (comportement
   historique inchangé pour qui est déjà appairé), désactivable pour ne
   transférer le planning qu'à la demande via syncPullBtn/syncPushBtn. Voir
   startSyncListener() plus bas — c'est ELLE qui décide si le listener
   Firebase continu (syncRef) s'attache ou non ; pushToSync() n'a rien à
   savoir de ce réglage, il no-op déjà tout seul quand syncRef est null. */
const SYNC_AUTO_KEY = "syncAutoEnabled";
let syncAutoEnabled = localStorage.getItem(SYNC_AUTO_KEY);
syncAutoEnabled = syncAutoEnabled===null ? true : syncAutoEnabled==="1";

let syncDeviceId = localStorage.getItem(SYNC_DEVICE_ID_KEY);
if(!syncDeviceId){
    syncDeviceId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b=>b.toString(16).padStart(2,"0"))
        .join("");
    localStorage.setItem(SYNC_DEVICE_ID_KEY,syncDeviceId);
}

const SYNC_DEVICE_NAME_KEY = "syncDeviceName";
let syncDeviceName = localStorage.getItem(SYNC_DEVICE_NAME_KEY) || "";

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
const syncRegenerateBtn = document.getElementById("syncRegenerateBtn");
const syncSectionMetaList = document.getElementById("syncSectionMetaList");
const syncQrContainer = document.getElementById("syncQrContainer");
const syncHistoryRow = document.getElementById("syncHistoryRow");
const deviceNameInput = document.getElementById("deviceNameInput");
const deviceNameSaveBtn = document.getElementById("deviceNameSaveBtn");
const devicesView = document.getElementById("devicesView");
const devicesSummary = document.getElementById("devicesSummary");
const devicesList = document.getElementById("devicesList");
const syncPendingInfo = document.getElementById("syncPendingInfo");
const syncConflictBackup = document.getElementById("syncConflictBackup");
const syncConflictBackupWhen = document.getElementById("syncConflictBackupWhen");
const syncConflictRestoreBtn = document.getElementById("syncConflictRestoreBtn");
const syncConflictDismissBtn = document.getElementById("syncConflictDismissBtn");
const syncAutoToggle = document.getElementById("syncAutoToggle");
const syncManualActions = document.getElementById("syncManualActions");
const syncPullBtn = document.getElementById("syncPullBtn");
const syncPushBtn = document.getElementById("syncPushBtn");

deviceNameInput.value = syncDeviceName;

/* Rendu une seule fois par code (pas à chaque updateSyncPanelView(), qui est
   appelé très souvent) : syncQrRenderedFor garde trace du dernier code déjà
   dessiné, et se remet naturellement à jour quand syncCode change (régénéré
   ou nouvelle liaison) puisque la comparaison échoue alors. */
let syncQrRenderedFor = null;

function renderInlineSyncQr(){
    if(!syncCode || !syncQrContainer) return;
    if(syncQrRenderedFor===syncCode) return;
    syncQrContainer.textContent = "";
    if(typeof QRCode!=="function") return;

    /* Une vraie URL (pas un texte arbitraire préfixé) : la caméra native du
       téléphone sait l'ouvrir directement, au lieu d'afficher "aucune
       application ne peut utiliser ce code" faute de savoir quoi faire d'un
       schéma inconnu. location.origin+pathname s'adapte tout seul, que
       l'appli tourne sur GitHub Pages ou sur le Live Server local. Le
       chargement de la page lit ce paramètre plus bas (juste après
       updateSyncPanelView() initial) et déclenche la même liaison que
       qrScanFrame(). */
    new QRCode(syncQrContainer,{
        text: location.origin+location.pathname+"?sync="+syncCode,
        width:180,
        height:180,
        colorDark:"#33404A",
        colorLight:"#FFFFFF"
    });
    syncQrRenderedFor = syncCode;
}

syncHistoryRow.addEventListener("click",()=>{
    syncHistoryRow.classList.toggle("open");
    syncSectionMetaList.classList.toggle("open");
});

/* --- Présence des appareils (#devicesView, mockup C validé) ---
   trips/{code}/presence/{deviceId} = {online, lastSeen, name} — nœud séparé
   des données de voyage elles-mêmes (trips/{code}/planning etc.), écrit par
   CHAQUE appareil pour lui-même uniquement (jamais pour un autre : renommer
   un autre appareil depuis ici n'est pas supporté, seulement le sien). */

function saveDeviceName(name){
    syncDeviceName = name.trim().slice(0,40);
    localStorage.setItem(SYNC_DEVICE_NAME_KEY,syncDeviceName);
    deviceNameInput.value = syncDeviceName;
    if(syncCode) updateDevicePresence();
}

deviceNameSaveBtn.addEventListener("click",()=>{
    saveDeviceName(deviceNameInput.value);
    showToast("Nom de l'appareil enregistré.",{type:"success"});
});

deviceNameInput.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
        e.preventDefault();
        deviceNameSaveBtn.click();
    }
});

/* onDisconnect() doit être ré-armé à chaque (re)connexion — Firebase l'efface
   après chaque coupure, il ne survit pas tout seul à travers une perte de
   réseau. Appelé à la fois ici (pairage/régénération) et dans le listener
   ".info/connected" plus bas (reconnexion après une coupure), pour couvrir
   les deux façons dont une session peut (re)devenir active. */
async function updateDevicePresence(){
    if(!syncCode || !syncDb) return;
    await syncAuthReady;
    const presenceRef = syncDb.ref("trips/"+syncCode+"/presence/"+syncDeviceId);
    presenceRef.onDisconnect().update({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP});
    presenceRef.update({online:true,lastSeen:firebase.database.ServerValue.TIMESTAMP,name:syncDeviceName});
}

/* Retire l'entrée de CET appareil sous un code donné — appelé avec l'ANCIEN
   code juste avant de s'en détacher (déconnexion ou régénération), sinon il
   resterait affiché "en ligne" pour toujours sous un code que plus personne
   n'utilise. */
async function removeOwnPresence(code){
    if(!code || !syncDb) return;
    await syncAuthReady;
    syncDb.ref("trips/"+code+"/presence/"+syncDeviceId).remove();
}

let devicesPresenceRef = null;

function renderDevicesList(presenceData){
    if(!devicesList) return;
    devicesList.innerHTML = "";

    const entries = Object.keys(presenceData||{}).map(id=>({id,...presenceData[id]}));
    if(!entries.find(e=>e.id===syncDeviceId)){
        /* "online" volontairement absent : le statut de cet appareil se lit
           toujours sur firebaseConnected plus bas, jamais sur ce champ. */
        entries.push({id:syncDeviceId,lastSeen:Date.now(),name:syncDeviceName});
    }
    entries.sort((a,b)=>{
        if(a.id===syncDeviceId) return -1;
        if(b.id===syncDeviceId) return 1;
        return (b.lastSeen||0)-(a.lastSeen||0);
    });

    /* Le statut de CET appareil vient de firebaseConnected (déjà su avec
       certitude par l'appli elle-même via .info/connected), pas de
       entry.online — cette dernière peut être momentanément périmée (valeur
       encore "true" d'une session précédente fermée brutalement, avant que
       ce chargement-ci ait eu le temps de la rafraîchir via
       updateDevicePresence()). Pour les AUTRES appareils, entry.online reste
       la seule source possible : c'est justement ce que la présence sert à
       connaître. */
    const onlineCount = entries.filter(e=> e.id===syncDeviceId ? firebaseConnected : e.online).length;
    devicesSummary.innerHTML = onlineCount>0
        ? `<b>${onlineCount}</b> appareil${onlineCount>1?"s":""} connecté${onlineCount>1?"s":""} maintenant`
        : "Aucun appareil connecté pour l'instant";

    let otherIndex = 1;

    entries.forEach(entry=>{

        const isSelf = entry.id===syncDeviceId;
        const isOnline = isSelf ? firebaseConnected : !!entry.online;

        const row = document.createElement("div");
        row.className = "device-row";

        const icon = document.createElement("div");
        icon.className = "device-icon";
        icon.textContent = "📱";
        row.appendChild(icon);

        const info = document.createElement("div");
        info.className = "device-info";

        if(isSelf){

            const editRow = document.createElement("div");
            editRow.className = "device-edit-row";

            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 40;
            input.placeholder = "Nom de cet appareil";
            input.value = syncDeviceName;
            input.addEventListener("keydown",(e)=>{
                if(e.key==="Enter"){
                    e.preventDefault();
                    saveDeviceName(input.value);
                    showToast("Nom enregistré.",{type:"success"});
                }
            });

            const okBtn = document.createElement("button");
            okBtn.type = "button";
            okBtn.className = "add";
            okBtn.textContent = "OK";
            okBtn.addEventListener("click",()=>{
                saveDeviceName(input.value);
                showToast("Nom enregistré.",{type:"success"});
            });

            editRow.appendChild(input);
            editRow.appendChild(okBtn);
            info.appendChild(editRow);

            const meta = document.createElement("div");
            meta.className = "device-meta";
            meta.textContent = isOnline ? "En ligne" : "Hors ligne — en attente de connexion";
            info.appendChild(meta);

        }else{

            const nameLine = document.createElement("div");
            nameLine.className = "device-name-line";
            nameLine.textContent = entry.name || `Appareil ${++otherIndex}`;
            info.appendChild(nameLine);

            const meta = document.createElement("div");
            meta.className = "device-meta";
            meta.textContent = isOnline
                ? "En ligne"
                : "Hors ligne · vu "+new Date(entry.lastSeen||0).toLocaleString("fr-FR",{
                    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
                });
            info.appendChild(meta);
        }

        row.appendChild(info);

        const dot = document.createElement("span");
        dot.className = "device-dot "+(isOnline ? "on" : "off");
        row.appendChild(dot);

        devicesList.appendChild(row);
    });
}

async function attachDevicesPresenceListener(){
    if(!syncCode || !syncDb) return;
    detachDevicesPresenceListener();
    await syncAuthReady;
    devicesPresenceRef = syncDb.ref("trips/"+syncCode+"/presence");
    devicesPresenceRef.on("value",(snap)=>{
        renderDevicesList(snap.val());
    });
}

function detachDevicesPresenceListener(){
    if(devicesPresenceRef){
        devicesPresenceRef.off();
        devicesPresenceRef = null;
    }
}

/* Ferme le panneau de sync (desktop) quand on ouvre les appareils par-dessus
   — sinon il reste ouvert sous la nouvelle vue plein écran. Sans effet sur
   mobile (syncPanel y est déjà vide/masqué, voir updateProfileConsolidation). */
syncStatus.addEventListener("click",()=>{
    syncPanel.hidden = true;
    syncToggleBtn.setAttribute("aria-expanded","false");
});

/* Enregistré seulement une fois syncCode/syncStatus déclarés plus haut :
   ce callback est asynchrone (déclenché par Firebase, pas par le script
   lui-même) mais s'exécutait avant que "let syncCode" ait pu s'initialiser
   dans certains cas, ce qui levait un ReferenceError (TDZ) qui bloquait
   ensuite toute la synchronisation (bug du 2026-08-31). */
if(syncDb){
    syncDb.ref(".info/connected").on("value",(snap)=>{
        firebaseConnected = snap.val()===true;
        updateSyncConnectionStatus();
        if(firebaseConnected && syncCode){
            updateDevicePresence();
            retryPendingAttachmentUploads();
        }
    });
}else{
    /* Firebase indisponible dès l'init (voir le try/catch plus haut) :
       reflète tout de suite l'état "hors service" au lieu de laisser
       firebaseConnected sur sa valeur initiale (true), qui afficherait
       à tort "🟢 Connecté" à un utilisateur déjà appairé lors d'une
       session précédente. */
    firebaseConnected = false;
    updateSyncConnectionStatus();
}

const SYNC_HISTORY_KEY = "syncHistory";

function renderSyncHistory(){
    const history = JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || "null");
    if(!history){
        syncHistoryInfo.textContent = "";
        syncHistoryRow.hidden = true;
        return;
    }
    const who = history.deviceId===syncDeviceId ? "cet appareil" : "un autre appareil";
    const when = new Date(history.updatedAt).toLocaleString("fr-FR",{
        day:"2-digit",month:"2-digit",year:"numeric",
        hour:"2-digit",minute:"2-digit"
    });
    syncHistoryInfo.textContent = `🕓 Dernière modification par ${who} — ${when}`;
    syncHistoryRow.hidden = false;
}

function recordSyncHistory(deviceId,updatedAt){
    localStorage.setItem(SYNC_HISTORY_KEY,JSON.stringify({deviceId,updatedAt}));
    renderSyncHistory();
}

/* --- "Qui a changé quoi" : suivi par section, pas juste globalement ---
   Chaque section (groupe de champs de collectSyncData()) porte son propre
   {deviceId, updatedAt} dans sectionMeta, écrit à chaque push partiel
   (voir pushToSync()) et fusionné ici à chaque réception. Persisté pour
   que le panneau ait quelque chose à montrer dès l'ouverture, avant tout
   nouvel échange. */
const SYNC_SECTION_GROUPS = [
    { label:"Planning", keys:["planning"] },
    { label:"Checklist", keys:["checklist","checklistTemplates"] },
    { label:"Budget & devises", keys:["tricountParticipants","tricountExpenses","baseCurrency","targetCurrency"] },
    { label:"Dates & voyage", keys:["dayCount","startDate","tripName","tripCountry","tripTimezone"] },
    { label:"Aide", keys:["helpNotes","helpReports"] },
    /* Verrou par voyage (2026-09-04, demandé explicitement après un premier
       envoi 100% local) : tripLockPinHash reste un HASH SHA-256, jamais le
       code en clair — voir le commentaire près de TRIP_LOCK_PIN_HASH_KEY.
       Verrouiller sur un appareil verrouille donc aussi le voyage sur tous
       les autres appareils appairés, avec le même code PIN partagé. */
    { label:"Verrou du voyage", keys:["currentTripLocked","tripLockPinHash"] }
];
const SYNC_ALL_KEYS = SYNC_SECTION_GROUPS.flatMap(g=>g.keys);

const SYNC_SECTION_META_KEY = "syncSectionMeta";
let knownSectionMeta = JSON.parse(localStorage.getItem(SYNC_SECTION_META_KEY) || "{}");

function saveKnownSectionMeta(){
    localStorage.setItem(SYNC_SECTION_META_KEY,JSON.stringify(knownSectionMeta));
}

function renderSyncSectionMeta(){
    if(!syncSectionMetaList) return;
    syncSectionMetaList.innerHTML = "";
    SYNC_SECTION_GROUPS.forEach(group=>{
        let latest = null;
        group.keys.forEach(k=>{
            /* "planning" est un objet {jour: {deviceId,updatedAt}} depuis le
               passage à une synchro par jour (voir pushToSync()/
               applySyncData()), pas un {deviceId,updatedAt} plat comme les
               autres clés — on prend le jour le plus récent. */
            if(k==="planning"){
                const perDay = knownSectionMeta.planning;
                if(perDay && typeof perDay==="object"){
                    Object.values(perDay).forEach(m=>{
                        if(m && (!latest || m.updatedAt>latest.updatedAt)) latest = m;
                    });
                }
                return;
            }
            const m = knownSectionMeta[k];
            if(m && (!latest || m.updatedAt>latest.updatedAt)) latest = m;
        });
        if(!latest) return;
        const row = document.createElement("div");
        row.className = "sync-section-meta-row";
        const who = latest.deviceId===syncDeviceId ? "cet appareil" : "un autre appareil";
        const when = new Date(latest.updatedAt).toLocaleString("fr-FR",{
            day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
        });
        const label = document.createElement("span");
        label.textContent = group.label;
        const value = document.createElement("b");
        value.textContent = `${who} · ${when}`;
        row.appendChild(label);
        row.appendChild(value);
        syncSectionMetaList.appendChild(row);
    });
}

function generateSyncCode(){
    let code = "";
    const randomValues = crypto.getRandomValues(new Uint32Array(10));
    for(let i=0;i<10;i++){
        code += SYNC_CODE_CHARS[randomValues[i] % SYNC_CODE_CHARS.length];
    }
    return code;
}

/* --- Écritures en attente d'envoi (visibilité, pas juste "ça marche tout
   seul") --- Le SDK Firebase met en file les écritures faites hors ligne et
   les rejoue à la reconnexion (voir le commentaire près de firebaseConnected
   plus haut), mais l'utilisateur n'a aujourd'hui aucun signe qu'il y a
   quelque chose "en attente" pendant ce temps. pendingSyncWrites compte les
   .update() lancés mais pas encore confirmés par le serveur — incrémenté
   juste avant syncRef.update(), décrémenté dans .then() ET .catch() (voir
   pushToSync()) : reste donc élevé tant qu'on est hors ligne, puisque la
   promesse d'un .update() ne se résout qu'une fois l'écriture accusée par
   le serveur, jamais de façon optimiste. */
let pendingSyncWrites = 0;

function updateSyncPendingIndicator(){
    if(!syncPendingInfo) return;
    if(pendingSyncWrites<=0){
        syncPendingInfo.hidden = true;
        return;
    }
    syncPendingInfo.textContent = pendingSyncWrites===1
        ? "📤 1 modification en attente d'envoi…"
        : `📤 ${pendingSyncWrites} modifications en attente d'envoi…`;
    syncPendingInfo.hidden = false;
}

/* --- Filet de sécurité en cas de conflit de synchronisation ---
   Voir applySyncData() : quand une donnée distante s'apprête à écraser une
   section où CET appareil a un changement local pas encore envoyé (donc un
   vrai conflit, pas juste une mise à jour normale), la valeur locale
   d'avant écrasement est sauvegardée ici avant d'être remplacée — un seul
   niveau de backup (pas un historique), pour rester simple. */
const SYNC_CONFLICT_BACKUP_KEY = "syncConflictBackup";

function renderSyncConflictBackupRow(){
    if(!syncConflictBackup) return;
    const backup = JSON.parse(localStorage.getItem(SYNC_CONFLICT_BACKUP_KEY) || "null");
    if(!backup){
        syncConflictBackup.hidden = true;
        return;
    }
    syncConflictBackupWhen.textContent = new Date(backup.timestamp).toLocaleString("fr-FR",{
        day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
    });
    syncConflictBackup.hidden = false;
}

function restoreSyncConflictBackup(){

    const backup = JSON.parse(localStorage.getItem(SYNC_CONFLICT_BACKUP_KEY) || "null");
    if(!backup) return;

    let restoredAnything = false;

    if(backup.planning){
        Object.keys(backup.planning).forEach(day=>{
            if(UNSAFE_OBJECT_KEYS.includes(day)) return;
            planning[day] = backup.planning[day];
        });
        sanitizePlanningSlots();
        restoredAnything = true;
    }

    if(backup.checklist!==undefined){
        checklist = backup.checklist;
        restoredAnything = true;
    }

    if(backup.tricountParticipants!==undefined){
        tricountParticipants = backup.tricountParticipants;
        localStorage.setItem(TRICOUNT_PARTICIPANTS_KEY,JSON.stringify(tricountParticipants));
        restoredAnything = true;
    }

    if(backup.tricountExpenses!==undefined){
        tricountExpenses = backup.tricountExpenses;
        localStorage.setItem(TRICOUNT_EXPENSES_KEY,JSON.stringify(tricountExpenses));
        restoredAnything = true;
    }

    if(!restoredAnything) return;

    localStorage.removeItem(SYNC_CONFLICT_BACKUP_KEY);
    renderSyncConflictBackupRow();

    localStorage.setItem("vacationPlanning",JSON.stringify(planning));
    localStorage.setItem(CHECKLIST_STORAGE_KEY,JSON.stringify(checklist));

    createTabs();
    renderActivities();
    renderChecklist();
    renderTricount();

    /* Repousse la version restaurée pour qu'elle l'emporte à nouveau côté
       Firebase — sans ça, elle ne resterait que locale et un prochain
       événement distant pourrait l'écraser une seconde fois. */
    pushToSync();

    showToast("Tes changements ont été restaurés.",{type:"success"});
}

syncConflictRestoreBtn.addEventListener("click",restoreSyncConflictBackup);

syncConflictDismissBtn.addEventListener("click",()=>{
    localStorage.removeItem(SYNC_CONFLICT_BACKUP_KEY);
    renderSyncConflictBackupRow();
});

function updateSyncPanelView(){
    if(syncCode){
        syncUnpaired.hidden = true;
        syncPaired.hidden = false;
        syncPanel.classList.add("wide");
        syncCodeDisplay.textContent = syncCode;
        renderInlineSyncQr();
        renderSyncHistory();
        renderSyncSectionMeta();
        renderSyncConflictBackupRow();
        updateSyncPendingIndicator();
        updateSyncConnectionStatus();
        updateSyncAutoModeUI();
    }else{
        syncUnpaired.hidden = false;
        syncPaired.hidden = true;
        syncPanel.classList.remove("wide");
        /* Explicite plutôt que de compter uniquement sur syncPaired.hidden
           pour masquer ses descendants en cascade : remet à zéro l'état
           propre à syncManualActions, qui n'est sinon réinitialisé que
           depuis la branche "appairé" (updateSyncAutoModeUI()) et jamais
           ici — pas de bug observé en pratique (l'ancêtre masqué suffit),
           mais évite toute dépendance implicite si la structure change un
           jour. */
        syncManualActions.hidden = true;
    }
}

function collectSyncData(){
    return {
        /* Identifiant du voyage EN COURS sur cet appareil (currentTripId,
           déjà utilisé par l'historique des voyages) — pas juste les champs
           du voyage. Sert à applySyncData() à distinguer "mise à jour du
           voyage déjà partagé" de "un autre appareil a ouvert un voyage
           différent", pour archiver automatiquement au bon moment plutôt
           que de silencieusement mélanger deux voyages différents. */
        tripId: currentTripId,
        planning,
        checklist,
        tricountParticipants,
        tricountExpenses,
        dayCount,
        startDate,
        tripName,
        tripCountry,
        tripTimezone: localStorage.getItem(TRIP_TIMEZONE_KEY) || "",
        baseCurrency: localStorage.getItem("baseCurrency") || "GBP",
        targetCurrency: localStorage.getItem("targetCurrency") || "",
        checklistTemplates: JSON.parse(localStorage.getItem(CHECKLIST_TEMPLATE_STATE_KEY) || "[]"),
        helpNotes: helpNotesInput.value,
        helpReports: helpReportsHistory,
        currentTripLocked,
        tripLockPinHash: localStorage.getItem(TRIP_LOCK_PIN_HASH_KEY) || "",
        updatedAt: Date.now(),
        deviceId: syncDeviceId
    };
}

/* Instantané (désérialisé) du dernier envoi RÉUSSI de CET appareil — sert
   uniquement à détecter quelles sections ont changé depuis, jamais mis à
   jour par une réception distante. Doit être une copie profonde : payload
   contient des références directes vers planning/checklist/... (les vraies
   variables vivantes de l'appli), donc une simple affectation
   (lastPushedPayload = payload) pointerait vers les MÊMES objets — toute
   mutation ultérieure de planning se répercuterait aussi dans
   lastPushedPayload, et computeChangedSections() ne verrait jamais de
   différence. */
let lastPushedPayload = null;

const UNSAFE_OBJECT_KEYS = ["__proto__","constructor","prototype"];

/* "planning" est exclu de la comparaison à plat : un jour ajouté/modifié
   pendant qu'un AUTRE jour a aussi changé ailleurs ne doit pas être compté
   comme "toute la section a changé" — voir computeChangedPlanningDays() et
   le commentaire dans pushToSync(). */
function computeChangedSections(payload){
    if(!lastPushedPayload) return SYNC_ALL_KEYS.slice();
    return SYNC_ALL_KEYS.filter(k=>{
        if(k==="planning") return computeChangedPlanningDays(payload).length>0;
        return JSON.stringify(payload[k])!==JSON.stringify(lastPushedPayload[k]);
    });
}

/* Jours dont le contenu diffère du dernier envoi réussi de CET appareil
   (ajoutés, modifiés OU supprimés — un jour présent avant et absent
   maintenant compte aussi, pour que sa suppression soit propagée). Sert à
   la fois à pushToSync() (quels chemins Firebase écrire) et au filet de
   sécurité anti-conflit dans applySyncData(). */
function computeChangedPlanningDays(payload){
    const prevPlanning = (lastPushedPayload && lastPushedPayload.planning) || {};
    const nextPlanning = payload.planning || {};
    const days = new Set([...Object.keys(prevPlanning),...Object.keys(nextPlanning)]);
    return Array.from(days).filter(day=>
        JSON.stringify(nextPlanning[day])!==JSON.stringify(prevPlanning[day])
    );
}

/* Instantané complet prêt pour un .set() (pas un .update() partiel) —
   utilisé quand tout le document doit être (re)créé d'un coup : la
   direction "mine" en rejoignant un code, et la régénération de code. */
function buildFullSyncSnapshot(){
    const payload = collectSyncData();
    const meta = { deviceId: payload.deviceId, updatedAt: payload.updatedAt };
    const sectionMeta = {};
    SYNC_ALL_KEYS.forEach(k=>{
        if(k==="planning"){
            sectionMeta.planning = {};
            Object.keys(payload.planning || {}).forEach(day=>{
                sectionMeta.planning[day] = meta;
            });
            return;
        }
        sectionMeta[k] = meta;
    });
    payload.sectionMeta = sectionMeta;
    return payload;
}

/* Envoi complet (.set(), pas un .update() partiel) vers un code donné —
   utilisé pour la toute première publication d'un nouveau code, le bouton
   "Envoyer" manuel (mockup B), et la direction "mine" de la liaison
   initiale. Centralisé ici pour que les trois endroits restent identiques
   au lieu de trois copies qui divergent au fil du temps. */
async function pushFullSnapshotToRemote(code){
    /* Rejette au lieu de lancer un TypeError synchrone sur syncDb.ref() —
       les appelants (syncGenerateBtn/syncJoinBtn/syncPushBtn/régénération
       de code) ont tous déjà un .catch() qui affiche un toast d'erreur,
       il suffit donc que cette promesse échoue normalement. */
    if(!syncDb) throw new Error("Synchronisation indisponible");
    /* Attend la connexion anonyme (2026-09-02, voir plus haut près de
       firebase.auth()) avant d'écrire — sans ça, un clic assez rapide
       après le chargement de la page lance ce .set() avant que le SDK
       n'ait fini de s'authentifier, et les règles ("auth != null")
       rejettent l'écriture alors même que la connexion anonyme aurait
       fini par réussir une fraction de seconde plus tard. */
    await syncAuthReady;
    const snapshot = buildFullSyncSnapshot();
    await syncDb.ref("trips/"+code).set(snapshot);
    lastPushedPayload = JSON.parse(JSON.stringify(snapshot));
    knownSectionMeta = JSON.parse(JSON.stringify(snapshot.sectionMeta));
    saveKnownSectionMeta();
    renderSyncSectionMeta();
    recordSyncHistory(snapshot.deviceId,snapshot.updatedAt);
}

/* Simple lecture ponctuelle (.once()) — utilisée par le bouton "Récupérer"
   manuel et la liaison initiale (direction "theirs"), qui ont chacun besoin
   de VOIR la donnée avant de décider (appareil non trouvé, ou confirmation
   d'écrasement) plutôt que de la laisser s'appliquer toute seule comme le
   fait le listener continu de startSyncListener(). */
async function pullSnapshotFromRemote(code){
    if(!syncDb) throw new Error("Synchronisation indisponible");
    await syncAuthReady;
    const snapshot = await syncDb.ref("trips/"+code).once("value");
    return snapshot.val();
}

/* Adopte un voyage reçu d'un autre appareil dont l'identité (tripId) diffère
   du voyage EN COURS sur cet appareil : archive d'abord ce dernier dans
   l'historique (exactement comme "Nouveau voyage"/restaurer un voyage
   archivé le font déjà), puis bascule l'identité locale sur le voyage reçu.
   Centralise ce que la liaison initiale faisait déjà en ligne, maintenant
   aussi déclenché par applySyncData() elle-même (sync continue OU
   Récupérer manuel) — voir [[sync_reliability_hardening]]. */
function adoptRemoteTrip(remoteTripId){
    archiveCurrentTrip();
    currentTripId = remoteTripId || generateId();
    localStorage.setItem(CURRENT_TRIP_ID_KEY,currentTripId);
    lastPushedPayload = null;
    knownSectionMeta = {};
    saveKnownSectionMeta();
    refreshOpenPhotoViews();
    /* Seul chemin de changement de currentTripId qui ne fait PAS de
       location.reload() (voir les autres : welcomeCreateBtn, restoreTrip()...)
       — le listener des documents partagés est keyé par tripId dans son
       chemin RTDB, donc il faut le ré-attacher explicitement ici plutôt que
       compter sur un rechargement de page pour le faire. */
    attachTripAttachmentsListener();
    refreshActivityAttachmentCounts().then(()=>{
        renderActivities();
        if(!reservationsView.hidden) renderReservations();
    });
}

function pushToSync(){

    if(!syncRef || applyingRemoteUpdate) return;

    clearTimeout(syncPushTimer);

    syncPushTimer = setTimeout(()=>{

        const payload = collectSyncData();
        const changed = computeChangedSections(payload);

        if(changed.length===0) return;

        const meta = { deviceId: payload.deviceId, updatedAt: payload.updatedAt };
        const update = { updatedAt: payload.updatedAt, deviceId: payload.deviceId };

        /* "planning" écrit un chemin Firebase PAR JOUR ("planning/Jour 3"),
           pas un seul "planning" global comme les autres sections : ainsi,
           si deux appareils hors ligne modifient chacun un jour différent,
           Firebase fusionne nativement les deux écritures à la reconnexion
           au lieu que la seconde n'écrase tout le planning de la première
           (y compris les jours qu'elle n'avait pas touchés). Un jour
           supprimé s'écrit comme null, ce que .update() traite comme une
           suppression de ce chemin. */
        const changedPlanningDays = changed.includes("planning") ? computeChangedPlanningDays(payload) : [];
        changedPlanningDays.forEach(day=>{
            if(UNSAFE_OBJECT_KEYS.includes(day)) return;
            update["planning/"+day] = (payload.planning && payload.planning[day]!==undefined) ? payload.planning[day] : null;
            update["sectionMeta/planning/"+day] = meta;
        });

        /* .update() (pas .set()) : seules les clés listées ici sont
           écrites — tout ce qu'un AUTRE appareil a écrit entre-temps sur
           les sections non listées reste intact, contrairement à
           l'ancien .set() du document entier qui écrasait tout à chaque
           sauvegarde, même les sections que cet appareil n'avait pas
           touchées. Les chemins "sectionMeta/x" fonctionnent comme des
           chemins imbriqués normaux pour .update(). */
        changed.forEach(k=>{
            if(k==="planning") return;
            update[k] = payload[k];
            update["sectionMeta/"+k] = meta;
        });

        pendingSyncWrites++;
        updateSyncPendingIndicator();

        syncRef.update(update).then(()=>{

            pendingSyncWrites--;
            updateSyncPendingIndicator();

            lastPushedPayload = JSON.parse(JSON.stringify(payload));

            changed.forEach(k=>{
                if(k==="planning"){
                    knownSectionMeta.planning = knownSectionMeta.planning || {};
                    changedPlanningDays.forEach(day=>{ knownSectionMeta.planning[day] = meta; });
                    return;
                }
                knownSectionMeta[k] = meta;
            });

            saveKnownSectionMeta();
            renderSyncSectionMeta();
            recordSyncHistory(payload.deviceId,payload.updatedAt);

        }).catch(err=>{
            pendingSyncWrites--;
            updateSyncPendingIndicator();
            console.error("Erreur de synchronisation :",err);
        });
    },800);
}

function generateId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function sanitizePlanningSlots(){
    Object.keys(planning).forEach(day=>{
        const d = planning[day];
        if(!Array.isArray(d.matin)) d.matin = [];
        if(!Array.isArray(d.midi)) d.midi = [];
        if(!Array.isArray(d.apresMidi)) d.apresMidi = [];
        if(!Array.isArray(d.soir)) d.soir = [];
        if(d.title===undefined) d.title = "";
        ["matin","midi","apresMidi","soir"].forEach(slot=>{
            d[slot].forEach(activity=>{
                if(!activity.id) activity.id = generateId();
            });
        });
    });
}

/* --- Historique des voyages ---
   Local par défaut (comme les photos, jamais synchronisées) — chaque
   entrée peut individuellement devenir "partagée" (trip.shared) via les
   fonctions de partage sélectif plus bas (2026-09-02) : seules les
   métadonnées/le planning traversent alors Firebase (trips/{code}/
   historique/{id}), jamais les photos/documents de ce voyage archivé, qui
   restent en IndexedDB comme pour le voyage actif. */

const TRIP_HISTORY_KEY = "tripHistory";

/* Auto-guérison contre les doublons signalés dans l'historique (2026-09-02) :
   aucune cause certaine identifiée par relecture de code (tous les appels à
   archiveCurrentTrip() régénèrent bien currentTripId juste après, voir
   finalizeTripCreation()/replaceTripWithImportedRows()/restoreTrip()/
   adoptRemoteTrip()) — filet de sécurité au lieu d'un correctif ciblé tant
   que la cause exacte n'est pas reproduite. Garde la copie la plus RÉCENTE
   (archivedAt le plus grand) en cas de vrai id en double, et réécrit
   silencieusement le localStorage assaini. */
function loadTripHistory(){
    let history;
    try{
        history = JSON.parse(localStorage.getItem(TRIP_HISTORY_KEY)) || [];
    }catch(err){
        return [];
    }
    if(!Array.isArray(history)) return [];

    let changed = false;

    /* Le voyage ACTIF ne doit jamais apparaître dans son propre historique
       (signalé 2026-09-03) — quelle que soit la façon dont il s'y est
       retrouvé (résidu d'avant le garde de attachTripHistoryListener, ou
       tout autre chemin), on l'en retire ici à la lecture plutôt que
       d'exiger que chaque point d'écriture s'en souvienne. */
    if(currentTripId && history.some(t=>t && t.id===currentTripId)){
        history = history.filter(t=>!t || t.id!==currentTripId);
        changed = true;
    }

    const byId = new Map();
    history.forEach(trip=>{
        if(!trip || !trip.id) return;
        const existing = byId.get(trip.id);
        if(!existing || (trip.archivedAt||0)>=(existing.archivedAt||0)){
            byId.set(trip.id,trip);
        }
    });

    if(byId.size!==history.length){
        history = history
            .map(trip=>trip && trip.id ? byId.get(trip.id) : trip)
            .filter((trip,index,arr)=>arr.findIndex(t=>t===trip)===index);
        changed = true;
    }

    if(changed){
        localStorage.setItem(TRIP_HISTORY_KEY,JSON.stringify(history));
    }

    return history;
}

function saveTripHistory(history){
    localStorage.setItem(TRIP_HISTORY_KEY,JSON.stringify(history));
}

/* --- Partage sélectif de l'historique (2026-09-02) ---
   Un voyage archivé reste local tant qu'il n'a pas été explicitement
   partagé (bouton dans sa fiche) — contrairement au voyage EN COURS,
   toujours synchronisé dès qu'appairé. trip.shared distingue les deux
   côté UI (badge "🔗 Partagé" dans la liste, bouton dans la fiche). */

let tripHistoryRef = null;

function detachTripHistoryListener(){
    if(tripHistoryRef){
        tripHistoryRef.off();
        tripHistoryRef = null;
    }
}

async function attachTripHistoryListener(){

    detachTripHistoryListener();
    if(!syncDb || !syncCode) return;

    await syncAuthReady;
    if(!syncCode) return; // s'est délié pendant l'attente

    tripHistoryRef = syncDb.ref("trips/"+syncCode+"/historique");

    tripHistoryRef.on("value",(snapshot)=>{

        const remote = snapshot.val() || {};
        const localHistory = loadTripHistory();
        let changed = false;

        // Ajoute les voyages partagés reçus qu'on n'a pas encore.
        // receivedShare:true distingue "je l'ai reçu" de "je suis celui qui
        // l'a partagé" — voir unshareTripFromHistory() : seul le partageur
        // doit pouvoir révoquer le partage pour tout le monde, un
        // destinataire qui "ne veut plus" ne doit retirer que sa propre
        // copie, jamais celle de l'autre appareil.
        // id!==currentTripId (2026-09-02, bug signalé "restaurer un voyage
        // partagé crée une copie") : restaurer un voyage archivé le retire
        // de l'historique local et en fait le voyage ACTIF (restoreTrip()),
        // mais s'il était partagé, l'entrée pouvait rester sur Firebase le
        // temps que restoreTrip() la révoque (ou pour toujours côté
        // destinataire, qui n'a pas le droit d'y toucher) — sans ce garde,
        // ce même listener la voyait "absente de l'historique local" et la
        // réinjectait aussitôt comme un doublon fantôme, alors qu'elle
        // vient de devenir le voyage actif, pas un voyage archivé.
        Object.keys(remote).forEach(id=>{
            if(!localHistory.find(t=>t.id===id) && id!==currentTripId){
                localHistory.unshift({...remote[id], id, shared:true, receivedShare:true});
                changed = true;
            }
        });

        // Retire les entrées PARTAGÉES localement qui ont disparu du
        // distant (l'autre appareil les a supprimées/dé-partagées) — les
        // voyages LOCAUX (jamais partagés) ne sont jamais concernés par ce
        // filtre, seul leur propre bouton "Supprimer" peut les retirer.
        const kept = localHistory.filter(t=>!t.shared || remote[t.id]);
        if(kept.length!==localHistory.length) changed = true;

        if(changed){
            saveTripHistory(kept);
            if(!tripHistoryView.hidden) renderTripHistoryView();
        }
    });
}

async function shareTripToHistory(trip){

    if(!syncDb || !syncCode){
        showToast("Synchronisation indisponible ou aucun appareil relié.",{type:"error"});
        return;
    }

    await syncAuthReady;

    try{
        const payload = JSON.parse(JSON.stringify(trip));
        delete payload.shared;
        await syncDb.ref("trips/"+syncCode+"/historique/"+trip.id).set(payload);

        trip.shared = true;
        saveTripHistory(loadTripHistory().map(t=>t.id===trip.id ? {...t,shared:true} : t));
        showToast("Voyage partagé avec l'autre appareil.",{type:"success"});
    }catch(err){
        console.error("Impossible de partager ce voyage :",err);
        showToast("Impossible de partager ce voyage.",{type:"error"});
    }
}

/* Volontairement asymétrique (corrigé 2026-09-02, signalé après un vrai
   test à deux appareils) : côté PARTAGEUR (celui qui a archivé ce voyage
   ici en premier), "ne plus partager" révoque le partage pour tout le
   monde (retire de Firebase) MAIS garde sa propre copie, juste redevenue
   locale. Côté DESTINATAIRE (trip.receivedShare, reçu via
   attachTripHistoryListener()), ça ne doit retirer QUE sa propre copie
   locale — jamais toucher à Firebase, sous peine de supprimer aussi le
   voyage chez le partageur d'origine, qui n'a rien demandé. */
async function unshareTripFromHistory(trip){

    if(trip.receivedShare){
        saveTripHistory(loadTripHistory().filter(t=>t.id!==trip.id));
        return;
    }

    /* L'état local DOIT être mis à jour AVANT le retrait Firebase, pas après
       (bug signalé 2026-09-02 : le voyage disparaissait entièrement au lieu
       de juste redevenir local). Cause réelle : dès que .remove() atteint
       Firebase, le listener continu attachTripHistoryListener() (actif sur
       CET appareil aussi, pas que sur les destinataires) reçoit la mise à
       jour et applique son filtre de nettoyage
       "!t.shared || remote[t.id]" — si trip.shared valait encore true en
       local à cet instant (état pas encore réécrit), remote[t.id] devenu
       absent faisait échouer les deux conditions et le voyage était retiré
       du localStorage. En écrivant shared:false ICI d'abord, ce filtre le
       garde (!t.shared devient vrai) quel que soit le moment où le listener
       se déclenche. */
    trip.shared = false;
    saveTripHistory(loadTripHistory().map(t=>t.id===trip.id ? {...t,shared:false} : t));

    if(syncDb && syncCode){
        await syncAuthReady;
        try{
            await syncDb.ref("trips/"+syncCode+"/historique/"+trip.id).remove();
        }catch(err){
            console.error("Impossible de retirer le partage de ce voyage :",err);
        }
    }
}

function buildCurrentTripSnapshot(){
    return {
        id: currentTripId,
        name: tripName,
        country: tripCountry,
        startDate: localStorage.getItem("startDate") || "",
        dayCount,
        baseCurrency: localStorage.getItem("baseCurrency") || "GBP",
        targetCurrency: localStorage.getItem("targetCurrency") || "",
        tripTimezone: localStorage.getItem(TRIP_TIMEZONE_KEY) || "",
        planning,
        checklist,
        tricountParticipants,
        tricountExpenses,
        checklistTemplates: JSON.parse(localStorage.getItem(CHECKLIST_TEMPLATE_STATE_KEY) || "[]"),
        // Bug signalé 2026-09-04 ("un voyage verrouillé restauré ne reste
        // pas verrouillé") : le verrou du voyage EN COURS ne survivait déjà
        // pas à son propre archivage (Nouveau voyage, restauration d'un
        // autre voyage...) — voir aussi restoreTrip() pour le sens inverse.
        locked: currentTripLocked,
        stepCount: parseInt(localStorage.getItem(TRIP_STEP_COUNT_KEY),10) || 0,
        archivedAt: Date.now()
    };
}

function archiveCurrentTrip(){
    const history = loadTripHistory();
    history.unshift(buildCurrentTripSnapshot());
    saveTripHistory(history);
}

let replacingExistingTrip = false;

function startNewTrip(){

    replacingExistingTrip = true;

    closeAllFullscreenViews();

    document.getElementById("welcomeTripName").value = "";
    document.getElementById("welcomeStartDate").value = "";
    document.getElementById("welcomeEndDate").value = "";
    welcomeCountrySelect.value = "";
    welcomeCountrySelect.classList.add("welcome-select-placeholder");
    welcomeIconChoice = "default";
    welcomeParticipants = [];
    renderWelcomeParticipants();

    document.getElementById("welcomeLaterBtn").hidden = true;
    document.getElementById("welcomeCancelBtn").hidden = false;

    document.getElementById("welcomeView").hidden = false;
}

document.getElementById("welcomeCancelBtn").addEventListener("click",()=>{
    replacingExistingTrip = false;
    document.getElementById("welcomeView").hidden = true;
    document.getElementById("welcomeLaterBtn").hidden = false;
    document.getElementById("welcomeCancelBtn").hidden = true;
});

document.getElementById("newTripBtn").addEventListener("click",()=>{
    showConfirmModal(
        `Créer un nouveau voyage ? « ${tripName || "Ce voyage"} » sera archivé dans l'historique des voyages, tu pourras le consulter (et le restaurer) plus tard.`,
        startNewTrip
    );
});

function applySyncData(data,isInitialLoad){

    if(!data) return;

    /* Un AUTRE appareil a ouvert un voyage différent (Nouveau voyage,
       restaurer depuis l'historique...) et l'a envoyé — pas juste une mise
       à jour du voyage déjà partagé (auquel cas data.tripId===currentTripId
       et rien ne se passe ici). Le voyage EN COURS sur CET appareil est
       d'abord archivé, comme le fait déjà la liaison initiale — voir
       adoptRemoteTrip(). tripSwapped évite le toast générique "Mis à jour"
       plus bas en plus de celui-ci (redondant). Pas de toast du tout si
       isInitialLoad : la toute première réception après un appairage/un
       Récupérer manuel a déjà sa propre confirmation/son propre toast. */
    let tripSwapped = false;
    if(data.tripId && data.tripId!==currentTripId){
        adoptRemoteTrip(data.tripId);
        tripSwapped = true;
        if(!isInitialLoad){
            showToast(
                "📦 Un voyage différent a été reçu d'un autre appareil — ton voyage précédent a été archivé dans l'historique.",
                {type:"success",duration:7000}
            );
        }
    }

    /* Rétrocompatibilité : un document sans sectionMeta (écrit par un
       appareil qui n'aurait pas encore chargé cette version du code)
       retombe sur l'ancien filtre global — évite une boucle d'écho tant
       que tous les appareils n'ont pas rechargé. Dès que sectionMeta
       existe, le filtre se fait section par section ci-dessous, ce qui
       permet à un appareil d'appliquer le changement de checklist d'un
       autre même si SA PROPRE dernière écriture a mis à jour le planning
       (donc deviceId global = lui-même). */
    const hasSectionMeta = data.sectionMeta && typeof data.sectionMeta==="object";
    if(!hasSectionMeta && data.deviceId===syncDeviceId) return;

    function sectionIsSelf(key,day){
        if(!hasSectionMeta) return false;
        if(key==="planning"){
            const perDay = data.sectionMeta.planning;
            const meta = perDay && perDay[day];
            return !!(meta && meta.deviceId===syncDeviceId);
        }
        const meta = data.sectionMeta[key];
        return !!(meta && meta.deviceId===syncDeviceId);
    }

    if(hasSectionMeta){
        Object.assign(knownSectionMeta,data.sectionMeta);
        saveKnownSectionMeta();
    }

    applyingRemoteUpdate = true;
    let anyRemoteChangeApplied = false;

    /* --- Filet de sécurité anti-conflit ---
       Avant d'écraser une section locale avec la version distante, on
       vérifie si CET appareil a un changement local pas encore confirmé
       envoyé (la valeur locale actuelle diffère de lastPushedPayload, le
       dernier envoi réussi) : si oui, c'est un vrai conflit — les deux
       appareils ont modifié la même chose "en même temps" (probablement
       l'un juste avant de recevoir la mise à jour de l'autre). On
       sauvegarde alors la valeur locale AVANT de l'écraser, pour permettre
       une restauration en un clic (voir restoreSyncConflictBackup() et le
       toast plus bas) — sans ça, une modification récente pouvait
       disparaître sans un mot. Limité aux sections où perdre du contenu
       serait le plus coûteux (planning, checklist, dépenses partagées) :
       les champs de métadonnées (nom du voyage, devises...) changent
       rarement des deux côtés en même temps et sont triviaux à retaper. */
    let conflictBackup = null;

    function stashConflict(key,day,value){
        if(!conflictBackup) conflictBackup = {};
        if(day){
            conflictBackup[key] = conflictBackup[key] || {};
            conflictBackup[key][day] = value;
        }else{
            conflictBackup[key] = value;
        }
    }

    function localDivergedFromLastPush(key,currentValue,day){
        if(!lastPushedPayload) return false;
        if(day) return JSON.stringify(currentValue)!==JSON.stringify((lastPushedPayload.planning||{})[day]);
        return JSON.stringify(currentValue)!==JSON.stringify(lastPushedPayload[key]);
    }

    if(data.planning && typeof data.planning==="object"){

        const allDays = new Set([...Object.keys(planning),...Object.keys(data.planning)]);
        let planningChanged = false;

        allDays.forEach(day=>{

            if(UNSAFE_OBJECT_KEYS.includes(day)) return;
            if(sectionIsSelf("planning",day)) return;

            const remoteValue = data.planning[day]!==undefined ? data.planning[day] : null;
            const localValue = planning[day];

            if(JSON.stringify(localValue)===JSON.stringify(remoteValue)) return;

            if(localDivergedFromLastPush("planning",localValue,day)){
                stashConflict("planning",day,localValue);
            }

            if(remoteValue===null){
                delete planning[day];
            }else{
                planning[day] = remoteValue;
            }
            planningChanged = true;
        });

        if(planningChanged){
            sanitizePlanningSlots();
            savePlanning();
            anyRemoteChangeApplied = true;
        }
    }

    if(Array.isArray(data.checklist) && !sectionIsSelf("checklist")){
        if(localDivergedFromLastPush("checklist",checklist)) stashConflict("checklist",null,checklist);
        checklist = data.checklist;
        saveChecklist();
        anyRemoteChangeApplied = true;
    }

    if(Array.isArray(data.tricountParticipants) && !sectionIsSelf("tricountParticipants")){
        if(localDivergedFromLastPush("tricountParticipants",tricountParticipants)) stashConflict("tricountParticipants",null,tricountParticipants);
        tricountParticipants = data.tricountParticipants;
        localStorage.setItem(TRICOUNT_PARTICIPANTS_KEY,JSON.stringify(tricountParticipants));
        anyRemoteChangeApplied = true;
    }

    if(Array.isArray(data.tricountExpenses) && !sectionIsSelf("tricountExpenses")){
        if(localDivergedFromLastPush("tricountExpenses",tricountExpenses)) stashConflict("tricountExpenses",null,tricountExpenses);
        tricountExpenses = data.tricountExpenses;
        localStorage.setItem(TRICOUNT_EXPENSES_KEY,JSON.stringify(tricountExpenses));
        anyRemoteChangeApplied = true;
    }

    if(data.dayCount && !sectionIsSelf("dayCount")){
        dayCount = data.dayCount;
        localStorage.setItem("dayCount",dayCount);
        anyRemoteChangeApplied = true;
    }

    if(data.startDate!==undefined && !sectionIsSelf("startDate")){
        startDate = data.startDate;
        startDateInput.value = startDate;
        localStorage.setItem("startDate",startDate);
        anyRemoteChangeApplied = true;
    }

    if(data.tripName!==undefined && data.tripName!==tripName && !sectionIsSelf("tripName")){
        tripName = data.tripName;
        localStorage.setItem(TRIP_NAME_KEY,tripName);
        if(tripName) appTitle.textContent = appTitleEmoji()+" "+tripName;
        anyRemoteChangeApplied = true;
    }

    if(data.tripCountry!==undefined && data.tripCountry!==tripCountry && !sectionIsSelf("tripCountry")){
        tripCountry = data.tripCountry;
        localStorage.setItem(TRIP_COUNTRY_KEY,tripCountry);
        tripCountrySelect.value = tripCountry;
        anyRemoteChangeApplied = true;
    }

    if(data.tripTimezone!==undefined && !sectionIsSelf("tripTimezone")){
        localStorage.setItem(TRIP_TIMEZONE_KEY,data.tripTimezone);
        tripTimezoneSelect.value = data.tripTimezone;
        anyRemoteChangeApplied = true;
    }

    let currencyChanged = false;

    if(data.baseCurrency && CURRENCIES[data.baseCurrency] && data.baseCurrency!==baseCurrency && !sectionIsSelf("baseCurrency")){
        baseCurrency = data.baseCurrency;
        localStorage.setItem("baseCurrency",baseCurrency);
        converterBaseCurrencySelect.value = baseCurrency;
        currencyChanged = true;
        anyRemoteChangeApplied = true;
    }

    if(data.targetCurrency && CURRENCIES[data.targetCurrency] && data.targetCurrency!==targetCurrency && !sectionIsSelf("targetCurrency")){
        targetCurrency = data.targetCurrency;
        localStorage.setItem("targetCurrency",targetCurrency);
        targetCurrencySelect.value = targetCurrency;
        currencyChanged = true;
        anyRemoteChangeApplied = true;
    }

    if(currencyChanged){
        applyCurrencyMeta();
        currentRate = null;
        fetchExchangeRate();
        updateActivityPriceCurrencyToggle();
    }

    if(Array.isArray(data.checklistTemplates) && !sectionIsSelf("checklistTemplates")){
        localStorage.setItem(CHECKLIST_TEMPLATE_STATE_KEY,JSON.stringify(data.checklistTemplates));
        anyRemoteChangeApplied = true;
    }

    if(data.helpNotes!==undefined && !sectionIsSelf("helpNotes")){
        helpNotesInput.value = data.helpNotes;
        localStorage.setItem(HELP_NOTES_KEY,data.helpNotes);
        anyRemoteChangeApplied = true;
    }

    if(Array.isArray(data.helpReports) && !sectionIsSelf("helpReports")){
        helpReportsHistory = data.helpReports;
        localStorage.setItem(HELP_REPORTS_KEY,JSON.stringify(helpReportsHistory));
        renderHelpReportsHistory();
        anyRemoteChangeApplied = true;
    }

    if(data.currentTripLocked!==undefined && data.currentTripLocked!==currentTripLocked && !sectionIsSelf("currentTripLocked")){
        currentTripLocked = data.currentTripLocked;
        localStorage.setItem(CURRENT_TRIP_LOCKED_KEY,currentTripLocked ? "1" : "0");
        updateCurrentTripLockToggle();
        anyRemoteChangeApplied = true;
    }

    /* Hash SHA-256 seulement (jamais le code en clair) — voir
       TRIP_LOCK_PIN_HASH_KEY. Garde "data.tripLockPinHash &&" (pas juste
       !==undefined) : un appareil qui n'a jamais défini de code envoie ""
       dans son propre payload, qui ne doit jamais effacer un code déjà
       défini ailleurs. */
    if(data.tripLockPinHash && data.tripLockPinHash!==localStorage.getItem(TRIP_LOCK_PIN_HASH_KEY) && !sectionIsSelf("tripLockPinHash")){
        localStorage.setItem(TRIP_LOCK_PIN_HASH_KEY,data.tripLockPinHash);
        anyRemoteChangeApplied = true;
    }

    ensureDaysExist();
    if(currentDay > dayCount) currentDay = dayCount;

    createTabs();
    renderActivities();
    renderChecklist();
    renderTricount();
    updateCountdownBanner();
    updateDatePlacement();
    refreshEndDateDisplay();
    renderSyncSectionMeta();

    applyingRemoteUpdate = false;

    /* Un AUTRE appareil vient de verrouiller ce voyage (ou l'a reçu comme
       tel dès l'appairage) : force le même écran PIN ici aussi, sauf si
       CET appareil est celui qui vient de verrouiller (déjà dans
       unlockedTripIds) — sinon le verrou distant n'aurait aucun effet réel
       sur un appareil resté ouvert au moment du verrouillage. Le garde
       tripLockView.hidden évite de relancer l'écran (et de perdre une
       saisie en cours) s'il est déjà affiché. */
    if(currentTripLocked && !unlockedTripIds.has("__current__") && tripLockView.hidden){
        requestTripUnlock("__current__",tripName || "Ce voyage",()=>{},{cancellable:false});
    }

    if(conflictBackup){
        conflictBackup.timestamp = Date.now();
        localStorage.setItem(SYNC_CONFLICT_BACKUP_KEY,JSON.stringify(conflictBackup));
        renderSyncConflictBackupRow();
    }

    if(anyRemoteChangeApplied){

        syncStatus.textContent =
        `🟢 Synchronisé — ${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;

        recordSyncHistory(data.deviceId,data.updatedAt);

        /* Pas de notification pour la toute première réception après un
           appairage/chargement de page : c'est attendu, pas une
           "nouveauté" que l'utilisateur doit remarquer. Pas non plus si un
           voyage différent vient d'être adopté (tripSwapped) : son propre
           toast dédié a déjà été montré plus haut, celui-ci ferait doublon.
           Le toast "Mis à jour depuis un autre appareil." (cas sans
           conflit) a été retiré à la demande de l'utilisateur (2026-09-04)
           — 🟢 Synchronisé ci-dessus suffit comme indicateur discret,
           le conflit ci-dessous reste affiché (c'est un avertissement
           actionnable, pas une simple notification). */
        if(!isInitialLoad && !tripSwapped && conflictBackup){
            showToast(
                "⚠️ Cette donnée a aussi été modifiée sur l'autre appareil — tes changements récents ont peut-être été remplacés.",
                {
                    type:"error",
                    duration:9000,
                    actionLabel:"Restaurer",
                    onAction:restoreSyncConflictBackup
                }
            );
        }
    }
}

/* La présence (savoir quels appareils sont là) et l'écoute continue du
   PLANNING (savoir ce qu'ils ont modifié) sont maintenant deux choses
   séparées — la présence reste toujours active dès qu'on est appairé, mais
   le listener Firebase continu ne s'attache que si syncAutoEnabled. En
   mode manuel, pushToSync() (appelé par savePlanning()/saveChecklist() à
   chaque modif) no-op tout seul puisque syncRef reste null — aucun endroit
   à part startSyncListener() n'a besoin de connaître ce réglage. */
function startSyncListener(){
    updateDevicePresence();
    if(syncAutoEnabled) attachPlanningListener();
    // Indépendant de syncAutoEnabled, comme la présence juste au-dessus :
    // recevoir un voyage archivé partagé est un événement ponctuel, pas
    // un flux continu qu'on voudrait pouvoir couper séparément. Même
    // logique pour les documents partagés.
    attachTripHistoryListener();
    attachTripAttachmentsListener();
}

async function attachPlanningListener(){

    if(syncRef) syncRef.off();
    if(!syncDb) return;
    await syncAuthReady;
    if(syncRef) syncRef.off(); // une régénération/déconnexion pendant l'attente a pu se glisser entre-temps

    syncRef = syncDb.ref("trips/"+syncCode);

    /* .on("value") déclenche immédiatement avec l'état déjà en base au
       moment de l'attache — ce premier événement n'est pas un "nouveau"
       changement distant (juste "voilà ce qu'il y a"), donc pas de
       notification pour lui ; seuls les suivants le sont vraiment. Le
       filtre d'écho (est-ce moi qui ai écrit ça ?) se fait maintenant
       section par section DANS applySyncData(), plus ici globalement —
       voir le commentaire dans applySyncData(). */
    let firstSnapshot = true;

    syncRef.on("value",(snapshot)=>{

        const data = snapshot.val();
        if(!data) return;

        applySyncData(data,firstSnapshot);
        firstSnapshot = false;

    },(err)=>{
        console.error("Erreur de connexion à la synchronisation :",err);
        syncStatus.textContent = "⚠️ Connexion à la synchronisation impossible";
    });
}

function detachPlanningListener(){
    if(syncRef){
        syncRef.off();
        syncRef = null;
    }
}

function pairWithCode(code,options){

    syncCode = code;
    localStorage.setItem(SYNC_CODE_KEY,syncCode);

    startSyncListener();
    updateSyncPanelView();

    if(options && options.isNew){
        /* Publication complète, indépendante de syncAutoEnabled : il faut
           bien que trips/{code} existe pour que l'autre appareil puisse
           un jour le lire, que la sync auto soit activée ici ou non.
           .catch() ajouté ici (audit 2026-09-01) : sans lui, un échec
           (réseau ou Firebase indisponible) ne laissait qu'une rejection
           de promesse non gérée en console, sans aucun retour visible
           pour l'utilisateur qui reste pourtant sur "en attente...". */
        pushFullSnapshotToRemote(syncCode).catch(()=>{
            showToast("Impossible de publier le code de synchronisation.",{type:"error"});
        });
        syncStatus.textContent = "🟢 Code généré, en attente de l'autre appareil";
    }
}

syncToggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isOpen = !syncPanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeSearchPanel();
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
// desktopProfilePanel déclaré tôt près d'optionsMenuPanel (voir le
// commentaire TDZ à cet endroit) — pas ici.

desktopProfileBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isOpen = !desktopProfilePanel.hidden;
    if(!isOpen){
        closeOptionsMenu();
        closeSearchPanel();
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
    /* Seul point d'entrée de la sync qui ne passait par aucune promesse
       déjà catchée (contrairement à Rejoindre/Récupérer/Envoyer) — sans
       cette vérification, un clic ici pendant que Firebase est
       indisponible affichait quand même "Code généré" avant que la
       publication échoue silencieusement en arrière-plan. */
    if(!syncDb){
        showToast("Synchronisation indisponible sur cet appareil pour le moment.",{type:"error"});
        return;
    }
    const code = generateSyncCode();
    pairWithCode(code,{isNew:true});
    showToast("Code de synchronisation généré.",{type:"success"});
});

/* Choix "recevoir/envoyer" supprimé (demande explicite 2026-09-02) : lier
   un appareil à un code existant (QR scanné ou code à 10 caractères tapé)
   ne fait plus qu'une seule chose, sans ambiguïté possible — cet appareil
   REÇOIT toujours le planning de celui qui a généré le code. Pour repartir
   dans l'autre sens (partager CE planning), l'appareil qui a les données à
   garder doit être celui qui génère le code (syncGenerateBtn), pas celui
   qui le rejoint. */
syncJoinBtn.addEventListener("click",()=>{

    const code = syncCodeInput.value.trim().toUpperCase();
    if(!code) return;

    syncJoinBtn.disabled = true;

    pullSnapshotFromRemote(code).then(data=>{

        syncJoinBtn.disabled = false;

        if(!data){
            showToast("Aucune donnée trouvée pour ce code.",{type:"error"});
            return;
        }

        showConfirmModal(
            "Lier cet appareil remplacera son planning actuel par celui reçu de l'autre appareil — le planning actuel sera d'abord archivé dans l'historique des voyages, tu pourras le consulter (et le restaurer) plus tard. Continuer ?",
            ()=>{
                adoptRemoteTrip(data.tripId);
                pairWithCode(code,{isNew:false});
                applySyncData(data,true);
                syncCodeInput.value = "";
                showToast("Appareil lié avec succès — ton ancien planning a été archivé.",{type:"success"});
            }
        );

    }).catch(()=>{
        syncJoinBtn.disabled = false;
        showToast("Impossible de contacter le service de synchronisation.",{type:"error"});
    });
});

/* --- Récupérer / Envoyer manuellement, tant qu'on est déjà appairé (mockup
   B) --- Mêmes briques que la liaison initiale ci-dessus
   (pullSnapshotFromRemote/pushFullSnapshotToRemote/adoptRemoteTrip), utiles
   à tout moment après le pairage, pas juste une fois au début — et
   indispensables quand la synchronisation automatique est désactivée. */

syncPullBtn.addEventListener("click",()=>{

    syncPullBtn.disabled = true;

    pullSnapshotFromRemote(syncCode).then(data=>{

        syncPullBtn.disabled = false;

        if(!data){
            showToast("Aucune donnée trouvée pour ce code.",{type:"error"});
            return;
        }

        const isDifferentTrip = data.tripId && data.tripId!==currentTripId;

        showConfirmModal(
            isDifferentTrip
                ? "Récupérer le planning de l'autre appareil remplacera celui de cet appareil — le voyage actuel sera d'abord archivé dans l'historique, tu pourras le consulter (et le restaurer) plus tard. Continuer ?"
                : "Récupérer le planning de l'autre appareil mettra cet appareil à jour avec ses dernières modifications. Continuer ?",
            ()=>{
                applySyncData(data,true);
                showToast("Planning récupéré depuis l'autre appareil.",{type:"success"});
            }
        );

    }).catch(()=>{
        syncPullBtn.disabled = false;
        showToast("Impossible de contacter le service de synchronisation.",{type:"error"});
    });
});

syncPushBtn.addEventListener("click",()=>{
    showConfirmModal(
        "Envoyer le planning de cet appareil remplacera celui actuellement sur l'autre appareil — s'il diffère, son voyage actuel y sera d'abord archivé dans son historique dès qu'il rouvrira l'appli. Continuer ?",
        ()=>{
            syncPushBtn.disabled = true;
            pushFullSnapshotToRemote(syncCode).then(()=>{
                syncPushBtn.disabled = false;
                showToast("Planning envoyé à l'autre appareil.",{type:"success"});
            }).catch(()=>{
                syncPushBtn.disabled = false;
                showToast("Impossible d'envoyer le planning à l'autre appareil.",{type:"error"});
            });
        }
    );
});

function updateSyncAutoModeUI(){
    if(!syncAutoToggle) return;
    syncAutoToggle.checked = syncAutoEnabled;
    syncManualActions.hidden = syncAutoEnabled;
}

syncAutoToggle.addEventListener("change",()=>{
    syncAutoEnabled = syncAutoToggle.checked;
    localStorage.setItem(SYNC_AUTO_KEY,syncAutoEnabled ? "1" : "0");
    updateSyncAutoModeUI();
    if(syncAutoEnabled){
        attachPlanningListener();
        showToast("Synchronisation automatique activée.",{type:"success"});
    }else{
        detachPlanningListener();
        showToast("Synchronisation automatique désactivée — utilise Récupérer/Envoyer pour mettre à jour manuellement.",{duration:5500});
    }
});

function clearSyncState(){
    detachPlanningListener();
    removeOwnPresence(syncCode);
    detachDevicesPresenceListener();
    detachTripHistoryListener();
    detachTripAttachmentsListener();
    remoteAttachmentsIndex = {};
    syncCode = "";
    localStorage.removeItem(SYNC_CODE_KEY);
    lastPushedPayload = null;
    knownSectionMeta = {};
    saveKnownSectionMeta();
}

syncUnlinkBtn.addEventListener("click",()=>{
    clearSyncState();
    updateSyncPanelView();
    showToast("Synchronisation désactivée sur cet appareil.");
});

/* Pas de véritable révocation ciblée possible sans authentification par
   appareil (Firebase Auth + règles de sécurité côté console — hors de
   portée du code client seul, voir la discussion avec l'utilisateur). Le
   plus proche qu'on puisse faire depuis ici : migrer les données vers un
   nouveau code, ce qui coupe TOUS les appareils utilisant l'ancien (pas
   un seul en particulier) — ils devront se relier avec le nouveau code
   partagé à la main. */
syncRegenerateBtn.addEventListener("click",()=>{
    showConfirmModal(
        "Régénérer le code coupera la synchronisation pour TOUS les appareils utilisant le code actuel — ils devront se relier avec le nouveau. Continuer ?",
        ()=>{
            const newCode = generateSyncCode();
            const oldCode = syncCode;

            syncRegenerateBtn.disabled = true;

            pushFullSnapshotToRemote(newCode).then(()=>{
                syncRegenerateBtn.disabled = false;

                detachPlanningListener();
                removeOwnPresence(oldCode);

                /* Marque l'ancien code comme abandonné SANS supprimer ses
                   données : un appareil encore relié avec ce code (qui n'a
                   pas encore vu ce message) continue de lire des données
                   valables plutôt qu'un noeud brusquement vidé. Sert de
                   repère pour un nettoyage manuel futur (console Firebase),
                   pas une suppression automatique — voir
                   [[sync_reliability_hardening]] pour le raisonnement. */
                syncDb.ref("trips/"+oldCode+"/abandoned").set({
                    at: firebase.database.ServerValue.TIMESTAMP,
                    reason: "regenerated",
                    supersededBy: newCode
                });

                syncCode = newCode;
                localStorage.setItem(SYNC_CODE_KEY,syncCode);

                startSyncListener();
                updateSyncPanelView();

                showToast("Nouveau code généré — les appareils précédemment liés ne sont plus synchronisés.",{type:"success",duration:5000});
            }).catch(()=>{
                syncRegenerateBtn.disabled = false;
                showToast("Impossible de régénérer le code.",{type:"error"});
            });
        }
    );
});

updateSyncPanelView();

if(syncCode){
    startSyncListener();
}

/* Arrivée depuis un lien de QR de synchronisation (renderInlineSyncQr() plus
   haut) ouvert par la caméra native du téléphone ou une autre appli — donc
   PAS via qrScanFrame(), qui gère le cas "scanné avec le scanner interne de
   l'appli". Même flux de liaison que ce dernier (remplir syncCodeInput,
   cliquer syncJoinBtn) pour ne pas dupliquer la logique. Le paramètre est
   retiré de l'URL tout de suite après, sinon un simple rechargement de page
   relancerait la liaison à chaque fois. */
const urlSyncCode = new URLSearchParams(location.search).get("sync");
if(urlSyncCode){
    history.replaceState(null,"",location.pathname);
    syncCodeInput.value = urlSyncCode.trim().toUpperCase();
    syncJoinBtn.click();
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
    showToast("Application mise à jour.",{type:"success",duration:3000});
}

/* --- Badge de version du cache (coin bas-droit, vérification rapide) --- */

const cacheVersionBadge = document.getElementById("cacheVersionBadge");

function updateCacheVersionBadge(){
    if(!("caches" in window)) return;
    caches.keys().then(keys=>{
        const planningKeys = keys.filter(k=>/^planning-v\d+$/.test(k));
        cacheVersionBadge.textContent = planningKeys.length
            ? `Cache : ${planningKeys[planningKeys.length-1]}`
            : "";
    });
}

updateCacheVersionBadge();

/* Vérification manuelle : registration.update() + un peu de feedback textuel.
   Ne gère pas elle-même l'installation/le rechargement — self.skipWaiting()
   côté service worker + le listener "controllerchange" plus haut s'en
   chargent déjà automatiquement dès qu'une nouvelle version est trouvée. */
const checkUpdateBtn = document.getElementById("checkUpdateBtn");

async function checkForAppUpdate(){
    if(!("serviceWorker" in navigator)){
        showToast("Service worker non disponible sur ce navigateur.",{type:"error"});
        return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    if(!registration){
        showToast("Aucun service worker actif à vérifier.",{type:"error"});
        return;
    }
    showToast("Recherche de mise à jour…",{duration:1500});
    try{
        await registration.update();
    }catch(err){
        console.error("Vérification de mise à jour impossible :",err);
        showToast("Impossible de vérifier les mises à jour.",{type:"error"});
        return;
    }
    if(registration.installing || registration.waiting){
        showToast("Mise à jour trouvée — l'app va se recharger dans un instant.",{type:"success",duration:3000});
    }else{
        updateCacheVersionBadge();
        showToast("Tu es déjà à jour.",{type:"success"});
    }
}

checkUpdateBtn.addEventListener("click",checkForAppUpdate);

/* Rendu initial : createTabs()/renderTabs() s'exécutent bien plus tôt dans le
   script (avant COUNTRY_BBOXES etc.), donc le tout premier appel à
   renderDayWeather() échoue silencieusement (promesse rejetée, sans casser le
   reste du script). On la relance ici une fois tout initialisé. */
renderDayWeather();

/* Rattache les photos prises avant l'historique des voyages au voyage actif
   (voir migrateLegacyPhotos) puis réaffiche la bande de photos du jour au
   cas où elle se serait affichée vide avant la fin de la migration. */
migrateLegacyPhotos().then(renderDayPhotos);

/* Le tout premier renderActivities()/renderReservations() (plus haut dans
   le script) tourne avant que ce scan IndexedDB async ait pu se résoudre —
   activityAttachmentCounts est donc vide à ce moment-là (aucun badge, aucune
   activité "documents seulement" dans Réservations) puis se corrige tout
   seul dès que le scan aboutit, ici. */
refreshActivityAttachmentCounts().then(()=>{
    renderActivities();
    if(!reservationsView.hidden) renderReservations();
});

/* --- Raccourcis d'application (appui long sur l'icône, manifest.json) ---
   Chaque raccourci navigue vers ?shortcut=... — traité une seule fois ici,
   tout en bas, une fois le reste de l'app initialisé (currentDay, planning,
   tricountParticipants… doivent déjà avoir leurs vraies valeurs). L'URL est
   nettoyée juste après pour qu'un simple rechargement de page ne redéclenche
   pas le raccourci indéfiniment. */
(function handleAppShortcut(){
    const shortcut = new URLSearchParams(location.search).get("shortcut");
    if(!shortcut) return;

    history.replaceState(null,"",location.pathname);

    if(localStorage.getItem(TRIP_CREATED_KEY)!=="1"){
        showToast("Crée d'abord un voyage pour utiliser ce raccourci.",{type:"error"});
        return;
    }

    if(shortcut==="photo"){
        openDayCameraView(currentDay,null);
    }else if(shortcut==="expense"){
        setActiveMainTab("budget");
        switchTricountTab("new");
    }else if(shortcut==="scanqr"){
        // CAPACITOR (2026-09-05) : startQrScan() bascule déjà lui-même sur
        // le scanner natif quand disponible (nativeBarcodeScanAvailable()).
        startQrScan();
    }else if(shortcut==="addactivity"){
        setActiveMainTab("planning");
        openFormDrawer();
        document.getElementById("activityName").focus();
    }
})();

/* --- Verrouillage du voyage actif au démarrage ---
   Recouvre l'app déjà rendue en dessous (#tripLockView, z-index:3900, voir
   style.css) plutôt que de restructurer toute la séquence de démarrage —
   même approche que les autres recouvrements plein écran de cette
   session. cancellable:false : il n'y a nulle part où "annuler" vers, ce
   voyage EST le seul actif sur l'appareil. */
if(currentTripLocked && localStorage.getItem(TRIP_CREATED_KEY)==="1"){
    requestTripUnlock("__current__",tripName || "Ce voyage",()=>{},{cancellable:false});
}

