package com.julien.planningvacances;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.widget.RemoteViews;

/* CAPACITOR (2026-09-08) : widget "Taux de change rapide" — affiche
   KEY_FX_TEXT/KEY_FX_SUB tels que déjà formatés par updateHomeWidgetData()
   (app.js), à partir du currentRate déjà calculé par le convertisseur
   existant (fetchExchangeRate()). Chaînes vides = aucune conversion faite
   cette session -> état de repli "Ouvre le convertisseur" plutôt qu'un
   taux inventé ou périmé sans le dire. */
public class FxWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, FxWidgetProvider.class));
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(HomeWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String fxText = prefs.getString(HomeWidgetPlugin.KEY_FX_TEXT, "");
        String fxSub = prefs.getString(HomeWidgetPlugin.KEY_FX_SUB, "");
        String theme = prefs.getString(HomeWidgetPlugin.KEY_THEME, "default");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_fx);
        views.setInt(R.id.fxRoot, "setBackgroundResource", WidgetThemeColors.backgroundRes(theme));

        if (TextUtils.isEmpty(fxText)) {
            views.setTextViewText(R.id.fxBig, "–");
            views.setTextViewText(R.id.fxSub, context.getString(R.string.widget_fx_empty));
        } else {
            views.setTextViewText(R.id.fxBig, fxText);
            views.setTextViewText(R.id.fxSub, fxSub);
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.setData(android.net.Uri.parse(
            "https://julienbruwaert1-sys.github.io/planning-vacances/?shortcut=convert"
        ));
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 3, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.fxRoot, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, null);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
