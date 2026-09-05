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

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/* CAPACITOR (2026-09-06) : widget d'écran d'accueil réel — la partie
   "PRÉPARATION seulement" documentée le 2026-09-05 (updateHomeWidgetData()
   dans app.js) devient fonctionnelle ici. Les jours restants sont recalculés
   au RENDU (à partir de la date de départ stockée), pas poussés une fois
   comme une valeur déjà relative — sinon le compte à rebours resterait figé
   si l'appli reste fermée plusieurs jours. Approximation assumée : le calcul
   utilise le fuseau horaire du TÉLÉPHONE, pas celui du voyage (getTripNow()
   dans app.js) — acceptable pour un coup d'œil sur l'écran d'accueil, la
   valeur précise reste dans l'appli elle-même. */
public class TripWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, TripWidgetProvider.class));
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(HomeWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String tripName = prefs.getString(HomeWidgetPlugin.KEY_TRIP_NAME, "");
        String startDate = prefs.getString(HomeWidgetPlugin.KEY_START_DATE, "");
        String nextActivityTitle = prefs.getString(HomeWidgetPlugin.KEY_NEXT_ACTIVITY_TITLE, "");
        long nextActivityAt = prefs.getLong(HomeWidgetPlugin.KEY_NEXT_ACTIVITY_AT, 0L);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_trip);

        if (TextUtils.isEmpty(tripName)) {
            views.setTextViewText(R.id.widgetTripName, context.getString(R.string.widget_default_title));
            views.setTextViewText(R.id.widgetCountdown, context.getString(R.string.widget_default_subtitle));
            views.setViewVisibility(R.id.widgetNextActivity, android.view.View.GONE);
        } else {
            views.setTextViewText(R.id.widgetTripName, tripName);
            views.setTextViewText(R.id.widgetCountdown, countdownLabel(context, startDate));

            if (TextUtils.isEmpty(nextActivityTitle)) {
                views.setViewVisibility(R.id.widgetNextActivity, android.view.View.GONE);
            } else {
                views.setViewVisibility(R.id.widgetNextActivity, android.view.View.VISIBLE);
                String time = nextActivityAt > 0
                    ? new SimpleDateFormat("HH:mm", Locale.FRANCE).format(new Date(nextActivityAt))
                    : "";
                String label = TextUtils.isEmpty(time) ? nextActivityTitle : (time + " · " + nextActivityTitle);
                views.setTextViewText(R.id.widgetNextActivity, label);
            }
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widgetRoot, pendingIntent);

        // updateAppWidget(id, null) avant le vrai contenu : constaté sur
        // appareil réel (OneUI Samsung), le système garde en mémoire la
        // hiérarchie de vues déjà appliquée à cet appWidgetId et se
        // contente d'un "reapply" (mise à jour des valeurs sur les MÊMES
        // vues) au lieu de ré-inflater res/layout/widget_trip.xml — ce qui
        // ignorait silencieusement un changement de layout (racine
        // LinearLayout -> FrameLayout) même après une vraie mise à jour
        // d'appli. Passer par null casse ce cache et force une inflation
        // complète à chaque fois, seule façon fiable de garantir que le
        // widget reflète toujours le layout réellement empaqueté.
        appWidgetManager.updateAppWidget(appWidgetId, null);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String countdownLabel(Context context, String startDate) {
        if (TextUtils.isEmpty(startDate)) {
            return context.getString(R.string.widget_default_subtitle);
        }
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.FRANCE);
            Date target = sdf.parse(startDate);
            if (target == null) return context.getString(R.string.widget_default_subtitle);

            Calendar today = Calendar.getInstance();
            today.set(Calendar.HOUR_OF_DAY, 0);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            today.set(Calendar.MILLISECOND, 0);

            Calendar targetCal = Calendar.getInstance();
            targetCal.setTime(target);
            targetCal.set(Calendar.HOUR_OF_DAY, 0);
            targetCal.set(Calendar.MINUTE, 0);
            targetCal.set(Calendar.SECOND, 0);
            targetCal.set(Calendar.MILLISECOND, 0);

            long diffDays = Math.round((targetCal.getTimeInMillis() - today.getTimeInMillis()) / 86400000.0);

            if (diffDays > 0) {
                return context.getString(R.string.widget_days_remaining, diffDays);
            } else if (diffDays == 0) {
                return context.getString(R.string.widget_today);
            } else {
                return context.getString(R.string.widget_ongoing);
            }
        } catch (ParseException e) {
            return context.getString(R.string.widget_default_subtitle);
        }
    }
}
