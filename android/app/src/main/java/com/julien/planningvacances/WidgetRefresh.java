package com.julien.planningvacances;

import android.appwidget.AppWidgetManager;
import android.util.Log;
import android.widget.RemoteViews;

/* CAPACITOR (2026-11-08) : point unique de mise à jour des 5 widgets.

   Historique : chaque provider faisait updateAppWidget(id, null) juste
   avant le vrai contenu — astuce constatée nécessaire sur OneUI pour
   forcer une ré-inflation complète du layout (voir le commentaire détaillé
   dans TripWidgetProvider), au lieu d'un simple "reapply" sur l'ancienne
   hiérarchie de vues en cache.

   Android 17 (SDK 37) a cassé cette astuce : AppWidgetManager appelle
   désormais views.setOriginalDensity() sans tester null ->
   NullPointerException. Lancée depuis HomeWidgetPlugin (thread
   CapacitorPlugins), elle n'était rattrapée nulle part et fermait TOUTE
   l'appli à chaque ouverture dès qu'un widget était posé (et aussi en
   arrière-plan au rafraîchissement périodique APPWIDGET_UPDATE).

   On garde l'astuce là où elle fonctionne encore (Android <= 16), on
   l'ignore proprement là où le système la refuse, et le vrai contenu est
   TOUJOURS envoyé ensuite. */
public final class WidgetRefresh {

    private static final String TAG = "TabiGoWidget";

    private WidgetRefresh() {}

    public static void push(AppWidgetManager appWidgetManager, int appWidgetId, RemoteViews views) {
        try {
            appWidgetManager.updateAppWidget(appWidgetId, (RemoteViews) null);
        } catch (RuntimeException e) {
            // Android 17+ : remise à zéro par null refusée — sans gravité,
            // le updateAppWidget ci-dessous suffit à afficher le contenu.
            Log.w(TAG, "Remise à zéro du widget " + appWidgetId + " ignorée : " + e);
        }
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
