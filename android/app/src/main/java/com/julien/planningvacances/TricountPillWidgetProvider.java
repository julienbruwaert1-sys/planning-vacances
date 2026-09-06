package com.julien.planningvacances;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

/* CAPACITOR (2026-09-06) : deuxième widget d'écran d'accueil, style "P3"
   (bouton pilule) de la comparaison de mockups — distinct de la carte
   compte à rebours (TripWidgetProvider), ouvre directement Tricount sur un
   tap. Réutilise le même mécanisme que les raccourcis d'appli existants
   (res/xml/shortcuts.xml, ?shortcut=xxx lu par handleAppShortcut() dans
   app.js) plutôt que d'inventer un nouveau chemin : ACTION_VIEW vers l'URL
   de l'appli avec ?shortcut=expense (déjà géré, ouvre Tricount sur l'onglet
   "nouvelle dépense") — aucun nouveau code JS nécessaire pour l'action
   elle-même. Couleur de fond thémée comme l'autre widget, voir
   WidgetThemeColors (partagé entre les deux). */
public class TricountPillWidgetProvider extends AppWidgetProvider {

    private static final String SHORTCUT_URL =
        "https://julienbruwaert1-sys.github.io/planning-vacances/?shortcut=expense";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, TricountPillWidgetProvider.class));
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(HomeWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String theme = prefs.getString(HomeWidgetPlugin.KEY_THEME, "default");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tricount_pill);
        views.setInt(R.id.pillRoot, "setBackgroundResource", WidgetThemeColors.pillBackgroundRes(theme));
        views.setTextViewText(R.id.pillIcon, "🧾");
        views.setTextViewText(R.id.pillLabel, "Tricount");

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.setData(Uri.parse(SHORTCUT_URL));
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 1, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.pillRoot, pendingIntent);

        // Voir le commentaire équivalent dans TripWidgetProvider : force une
        // ré-inflation complète plutôt qu'un simple "reapply" en cache.
        appWidgetManager.updateAppWidget(appWidgetId, null);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
