package com.julien.planningvacances;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.text.TextUtils;
import android.widget.RemoteViews;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/* CAPACITOR (2026-09-06) : widget d'écran d'accueil réel, style "B2 nuit
   étoilée" (voir la comparaison de mockups d'où ce style a été choisi) —
   le nombre de jours restants est l'élément principal, sur un fond dégradé
   qui reprend les couleurs du thème actif de l'appli (Noël/Ghibli/
   Halloween/Sakura/Momiji/Néon, voir themeBackgroundRes()/themeAccentColor()
   ci-dessous, valeurs reprises telles quelles des cartes sombres de
   style.css pour rester cohérent avec le reste de l'appli). Les jours
   restants sont recalculés au RENDU (à partir de la date de départ
   stockée), pas poussés une fois comme une valeur déjà relative — sinon le
   compte à rebours resterait figé si l'appli reste fermée plusieurs jours.
   Approximation assumée : le calcul utilise le fuseau horaire du TÉLÉPHONE,
   pas celui du voyage (getTripNow() dans app.js) — acceptable pour un coup
   d'œil sur l'écran d'accueil, la valeur précise reste dans l'appli
   elle-même. */
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
        String theme = prefs.getString(HomeWidgetPlugin.KEY_THEME, "default");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_trip);

        views.setInt(R.id.widgetRoot, "setBackgroundResource", WidgetThemeColors.backgroundRes(theme));
        views.setTextColor(R.id.widgetBigNumber, WidgetThemeColors.accentColor(theme));

        // Photo réelle (style "P2 sans assombrissement", choisie parmi la
        // comparaison de mockups) : remplace la bordure "M4"/la barre néon
        // pour Sakura/Momiji/Ghibli/Halloween/Néon — redondant d'afficher à
        // la fois une vraie photo ET la décoration emoji/lumineuse
        // équivalente par-dessus. Pas de voile sombre (retiré à la demande,
        // voir le commentaire dans widget_trip.xml) : la lisibilité vient
        // de l'ombre portée posée directement sur chaque TextView.
        int photoRes = WidgetThemeColors.photoRes(theme);
        boolean hasPhoto = photoRes != 0;
        views.setViewVisibility(R.id.widgetPhoto, hasPhoto ? android.view.View.VISIBLE : android.view.View.GONE);
        if (hasPhoto) {
            views.setImageViewResource(R.id.widgetPhoto, photoRes);
        }

        String leafBand = hasPhoto ? null : themeLeafBand(theme);
        if (leafBand == null) {
            views.setViewVisibility(R.id.widgetLeafBand, android.view.View.GONE);
        } else {
            views.setViewVisibility(R.id.widgetLeafBand, android.view.View.VISIBLE);
            views.setTextViewText(R.id.widgetLeafBand, leafBand);
        }

        // Barre lumineuse (mockup "N2") : Néon uniquement, sous le nom du
        // voyage — voir res/drawable/widget_neon_glow.xml. GONE si Néon a
        // maintenant une vraie photo (hasPhoto), même raisonnement que la
        // bordure "M4" ci-dessus.
        views.setViewVisibility(R.id.widgetNeonGlow,
            ("neon".equals(theme) && !hasPhoto) ? android.view.View.VISIBLE : android.view.View.GONE);

        // Scène "H3 nuit étoilée" : affichée pour tout thème SANS photo
        // dédiée, dérivé de hasPhoto plutôt qu'un test littéral
        // "default".equals(theme) — verif 2026-09-06, repéré comme
        // fragile : un futur thème ajouté côté appli mais oublié dans
        // WidgetThemeColors.photoRes() (donc hasPhoto=false) retombe ainsi
        // proprement sur cette scène de secours au lieu d'un fond nu.
        views.setViewVisibility(R.id.widgetScene,
            hasPhoto ? android.view.View.GONE : android.view.View.VISIBLE);

        if (TextUtils.isEmpty(tripName)) {
            views.setTextViewText(R.id.widgetTripName, context.getString(R.string.widget_default_title));
            views.setTextViewText(R.id.widgetBigNumber, "✈");
            views.setTextViewText(R.id.widgetCaption, context.getString(R.string.widget_default_subtitle));
            views.setViewVisibility(R.id.widgetNextActivity, android.view.View.GONE);
        } else {
            views.setTextViewText(R.id.widgetTripName, tripName);

            Countdown countdown = countdownFor(context, startDate);
            views.setTextViewText(R.id.widgetBigNumber, countdown.number);
            views.setTextViewText(R.id.widgetCaption, countdown.caption);

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

    /* Bordure décorative "M4" (voir la comparaison de mockups) — choisie
       pour chaque thème parmi les mockups équivalents proposés. Néon reste
       volontairement sans bordure (seul thème sans aucune particule
       animée ailleurs dans l'appli, voir applySelectedTheme() dans
       app.js — rester sobre ici reste cohérent). */
    private static String themeLeafBand(String theme) {
        if (theme == null) return null;
        switch (theme) {
            case "noel": return "❄️  🎄  ❄️";
            case "ghibli": return "🌿  🍃  🌿";
            case "halloween": return "🎃  👻  🎃";
            case "sakura": return "🌸  🦋  🌸";
            case "momiji": return "🍁  🍂  🍁";
            default: return null;
        }
    }

    private static class Countdown {
        final String number;
        final String caption;
        Countdown(String number, String caption) {
            this.number = number;
            this.caption = caption;
        }
    }

    private static Countdown countdownFor(Context context, String startDate) {
        if (TextUtils.isEmpty(startDate)) {
            return new Countdown("–", context.getString(R.string.widget_default_subtitle));
        }
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.FRANCE);
            Date target = sdf.parse(startDate);
            if (target == null) return new Countdown("–", context.getString(R.string.widget_default_subtitle));

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
                return new Countdown(String.valueOf(diffDays), context.getString(R.string.widget_days_remaining_caption));
            } else if (diffDays == 0) {
                return new Countdown("0", context.getString(R.string.widget_today));
            } else {
                return new Countdown("✓", context.getString(R.string.widget_ongoing));
            }
        } catch (ParseException e) {
            return new Countdown("–", context.getString(R.string.widget_default_subtitle));
        }
    }
}
