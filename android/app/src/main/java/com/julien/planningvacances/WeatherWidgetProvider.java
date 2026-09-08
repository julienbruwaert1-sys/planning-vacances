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

/* CAPACITOR (2026-09-08) : widget "Météo du jour" — affiche le dernier
   relevé déjà poussé par showWeatherCard() (app.js) via
   updateHomeWidgetData(), icône/textes déjà formatés côté JS (WEATHER_CODES
   n'est pas dupliqué ici). Chaînes vides = pas encore de relevé météo cette
   session (ouvrir l'appli une fois suffit à le peupler). */
public class WeatherWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, WeatherWidgetProvider.class));
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(HomeWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String icon = prefs.getString(HomeWidgetPlugin.KEY_WEATHER_ICON, "");
        String temp = prefs.getString(HomeWidgetPlugin.KEY_WEATHER_TEMP, "");
        String desc = prefs.getString(HomeWidgetPlugin.KEY_WEATHER_DESC, "");
        String minMax = prefs.getString(HomeWidgetPlugin.KEY_WEATHER_MINMAX, "");
        String theme = prefs.getString(HomeWidgetPlugin.KEY_THEME, "default");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_weather);
        views.setInt(R.id.weatherRoot, "setBackgroundResource", WidgetThemeColors.backgroundRes(theme));

        if (TextUtils.isEmpty(temp)) {
            views.setTextViewText(R.id.weatherIconBig, "🌡️");
            views.setTextViewText(R.id.weatherTemp, "–");
            views.setTextViewText(R.id.weatherDesc, context.getString(R.string.widget_weather_empty));
            views.setTextViewText(R.id.weatherMinMax, "");
        } else {
            views.setTextViewText(R.id.weatherIconBig, icon);
            views.setTextViewText(R.id.weatherTemp, temp);
            views.setTextViewText(R.id.weatherDesc, desc);
            views.setTextViewText(R.id.weatherMinMax, minMax);
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 4, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.weatherRoot, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, null);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
