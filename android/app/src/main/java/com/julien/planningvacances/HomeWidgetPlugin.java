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

        editor.apply();

        TripWidgetProvider.updateAllWidgets(context);
        // Le bouton Tricount ne montre que la couleur du thème (pas de
        // donnée de voyage), mais doit quand même suivre un changement de
        // thème fait pendant qu'il est déjà posé sur l'écran d'accueil.
        TricountPillWidgetProvider.updateAllWidgets(context);

        call.resolve(new JSObject().put("value", true));
    }
}
