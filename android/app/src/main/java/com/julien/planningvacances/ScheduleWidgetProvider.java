package com.julien.planningvacances;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/* CAPACITOR (2026-09-08) : widget "Programme du jour" — timeline mini des
   (jusqu'à 4) activités du jour de voyage EN COURS, poussées déjà
   formatées (heure + icône + nom) par updateHomeWidgetData() (app.js) dans
   KEY_SCHEDULE_JSON. Contrairement au compte à rebours de
   TripWidgetProvider, rien ici ne se périme selon une formule prévisible
   au fil des jours — donc pas de recalcul au rendu, juste un affichage du
   dernier snapshot poussé. Voir HomeWidgetPlugin.java pour le détail des
   clés partagées. */
public class ScheduleWidgetProvider extends AppWidgetProvider {

    private static final int[] ROW_IDS = {
        R.id.scheduleRow1, R.id.scheduleRow2, R.id.scheduleRow3, R.id.scheduleRow4
    };
    private static final int[] TIME_IDS = {
        R.id.scheduleTime1, R.id.scheduleTime2, R.id.scheduleTime3, R.id.scheduleTime4
    };
    private static final int[] TITLE_IDS = {
        R.id.scheduleTitle1, R.id.scheduleTitle2, R.id.scheduleTitle3, R.id.scheduleTitle4
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ScheduleWidgetProvider.class));
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(HomeWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String tripName = prefs.getString(HomeWidgetPlugin.KEY_TRIP_NAME, "");
        String dayLabel = prefs.getString(HomeWidgetPlugin.KEY_SCHEDULE_DAY_LABEL, "");
        String scheduleJson = prefs.getString(HomeWidgetPlugin.KEY_SCHEDULE_JSON, "[]");
        String theme = prefs.getString(HomeWidgetPlugin.KEY_THEME, "default");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_schedule);
        views.setInt(R.id.scheduleRoot, "setBackgroundResource", WidgetThemeColors.backgroundRes(theme));

        JSONArray items = new JSONArray();
        if (!TextUtils.isEmpty(scheduleJson)) {
            try {
                items = new JSONArray(scheduleJson);
            } catch (Exception e) {
                items = new JSONArray();
            }
        }

        if (TextUtils.isEmpty(tripName)) {
            views.setTextViewText(R.id.scheduleDayLabel, context.getString(R.string.widget_default_title));
            views.setTextViewText(R.id.scheduleEmpty, context.getString(R.string.widget_default_subtitle));
            views.setViewVisibility(R.id.scheduleEmpty, View.VISIBLE);
            for (int rowId : ROW_IDS) views.setViewVisibility(rowId, View.GONE);
        } else {
            views.setTextViewText(R.id.scheduleDayLabel, dayLabel);

            if (items.length() == 0) {
                views.setTextViewText(R.id.scheduleEmpty, context.getString(R.string.widget_schedule_empty));
                views.setViewVisibility(R.id.scheduleEmpty, View.VISIBLE);
                for (int rowId : ROW_IDS) views.setViewVisibility(rowId, View.GONE);
            } else {
                views.setViewVisibility(R.id.scheduleEmpty, View.GONE);
                for (int i = 0; i < ROW_IDS.length; i++) {
                    if (i < items.length()) {
                        JSONObject item = items.optJSONObject(i);
                        views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                        views.setTextViewText(TIME_IDS[i], item != null ? item.optString("time", "") : "");
                        views.setTextViewText(TITLE_IDS[i], item != null ? item.optString("title", "") : "");
                    } else {
                        views.setViewVisibility(ROW_IDS[i], View.GONE);
                    }
                }
            }
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 2, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.scheduleRoot, pendingIntent);

        // Voir le commentaire équivalent dans TripWidgetProvider : force une
        // ré-inflation complète plutôt qu'un simple "reapply" en cache.
        appWidgetManager.updateAppWidget(appWidgetId, null);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
