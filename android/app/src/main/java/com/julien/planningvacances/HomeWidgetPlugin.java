package com.julien.planningvacances;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* CAPACITOR (2026-09-06) : pont JS -> natif pour le widget d'écran d'accueil.
   Le localStorage d'une WebView n'est pas lisible depuis un composant natif
   séparé comme un AppWidgetProvider — cette méthode écrit donc les mêmes
   données déjà préparées par updateHomeWidgetData() (app.js) dans une vraie
   SharedPreferences Android, puis force le widget à se rafraîchir tout de
   suite plutôt que d'attendre le prochain cycle updatePeriodMillis (30 min,
   le minimum imposé par Android, gardé seulement comme filet de sécurité si
   l'appli reste fermée longtemps). Voir TripWidgetProvider.java pour la
   lecture de ces mêmes clés au rendu. */
@CapacitorPlugin(name = "HomeWidget")
public class HomeWidgetPlugin extends Plugin {

    public static final String PREFS_NAME = "TripWidgetPrefs";
    public static final String KEY_TRIP_NAME = "tripName";
    public static final String KEY_START_DATE = "startDate";
    public static final String KEY_NEXT_ACTIVITY_TITLE = "nextActivityTitle";
    public static final String KEY_NEXT_ACTIVITY_AT = "nextActivityAt";
    public static final String KEY_THEME = "theme";

    /* Ajoutés 2026-09-08 pour les 3 nouveaux widgets (Programme du jour /
       Taux de change / Météo du jour) : toutes ces valeurs arrivent déjà
       ENTIÈREMENT formatées côté JS (heure, symbole de devise, icône
       météo...) — contrairement au compte à rebours de TripWidgetProvider,
       rien ici ne DOIT être recalculé au rendu (pas de valeur qui se périme
       selon une formule prévisible), donc pas de raison de dupliquer des
       tables de correspondance (devises, codes météo) côté Java. Chaîne
       vide = donnée indisponible, chaque provider affiche alors son propre
       état de repli plutôt qu'un texte vide. */
    public static final String KEY_SCHEDULE_DAY_LABEL = "scheduleDayLabel";
    public static final String KEY_SCHEDULE_JSON = "scheduleJson";
    public static final String KEY_FX_TEXT = "fxText";
    public static final String KEY_FX_SUB = "fxSub";
    public static final String KEY_WEATHER_ICON = "weatherIcon";
    public static final String KEY_WEATHER_TEMP = "weatherTemp";
    public static final String KEY_WEATHER_DESC = "weatherDesc";
    public static final String KEY_WEATHER_MINMAX = "weatherMinMax";

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        Context context = getContext();
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();

        editor.putString(KEY_TRIP_NAME, call.getString(KEY_TRIP_NAME, ""));
        editor.putString(KEY_START_DATE, call.getString(KEY_START_DATE, ""));
        editor.putString(KEY_NEXT_ACTIVITY_TITLE, call.getString(KEY_NEXT_ACTIVITY_TITLE, ""));
        editor.putString(KEY_THEME, call.getString(KEY_THEME, "default"));

        Long nextActivityAt = call.getLong(KEY_NEXT_ACTIVITY_AT);
        editor.putLong(KEY_NEXT_ACTIVITY_AT, nextActivityAt != null ? nextActivityAt : 0L);

        editor.putString(KEY_SCHEDULE_DAY_LABEL, call.getString(KEY_SCHEDULE_DAY_LABEL, ""));
        editor.putString(KEY_SCHEDULE_JSON, call.getString(KEY_SCHEDULE_JSON, "[]"));
        editor.putString(KEY_FX_TEXT, call.getString(KEY_FX_TEXT, ""));
        editor.putString(KEY_FX_SUB, call.getString(KEY_FX_SUB, ""));
        editor.putString(KEY_WEATHER_ICON, call.getString(KEY_WEATHER_ICON, ""));
        editor.putString(KEY_WEATHER_TEMP, call.getString(KEY_WEATHER_TEMP, ""));
        editor.putString(KEY_WEATHER_DESC, call.getString(KEY_WEATHER_DESC, ""));
        editor.putString(KEY_WEATHER_MINMAX, call.getString(KEY_WEATHER_MINMAX, ""));

        editor.apply();

        TripWidgetProvider.updateAllWidgets(context);
        // Le bouton Tricount ne montre que la couleur du thème (pas de
        // donnée de voyage), mais doit quand même suivre un changement de
        // thème fait pendant qu'il est déjà posé sur l'écran d'accueil.
        TricountPillWidgetProvider.updateAllWidgets(context);
        ScheduleWidgetProvider.updateAllWidgets(context);
        FxWidgetProvider.updateAllWidgets(context);
        WeatherWidgetProvider.updateAllWidgets(context);

        call.resolve(new JSObject().put("value", true));
    }
}
