package com.julien.planningvacances;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;
import android.util.SizeF;
import android.widget.RemoteViews;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/* CAPACITOR (2026-09-08) : widget "Taux de change rapide" — affiche
   KEY_FX_TEXT/KEY_FX_SUB tels que déjà formatés par updateHomeWidgetData()
   (app.js), à partir du currentRate déjà calculé par le convertisseur
   existant (fetchExchangeRate()). Chaînes vides = aucune conversion faite
   cette session -> état de repli "Ouvre le convertisseur" plutôt qu'un
   taux inventé ou périmé sans le dire.

   2026-11-08 : CLAVIER dans le widget — on tape le montant directement,
   sans ouvrir l'appli. Les RemoteViews n'acceptent pas de champ de saisie :
   chaque touche envoie un broadcast (ACTION_KEY) à ce provider, qui garde la
   saisie par widget (prefs fxIn_<id>, fxSw_<id> = sens inversé) et calcule
   avec le DERNIER taux envoyé par l'appli (KEY_FX_RATE, gardé entre les
   sessions ; sa date s'affiche s'il a plus d'un jour). Mise en page
   adaptative (Android 12+) : widget assez grand -> widget_fx_keypad.xml,
   petit -> widget_fx.xml (affichage seul, comme avant). */
public class FxWidgetProvider extends AppWidgetProvider {

    static final String ACTION_KEY = "com.julien.planningvacances.FX_KEY";
    private static final String[] KEYS = {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "del", "clear", "swap"};
    private static final int[] KEY_IDS = {R.id.k0, R.id.k1, R.id.k2, R.id.k3, R.id.k4, R.id.k5, R.id.k6, R.id.k7, R.id.k8, R.id.k9,
            R.id.kComma, R.id.kDel, R.id.kClear, R.id.kSwap};

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_KEY.equals(intent.getAction())) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            String key = intent.getStringExtra("key");
            if (id != AppWidgetManager.INVALID_APPWIDGET_ID && key != null) {
                press(context, id, key);
                updateAppWidget(context, AppWidgetManager.getInstance(context), id);
            }
            return;
        }
        super.onReceive(context, intent);
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        SharedPreferences.Editor e = prefs(context).edit();
        for (int id : appWidgetIds) e.remove("fxIn_" + id).remove("fxSw_" + id);
        e.apply();
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, FxWidgetProvider.class));
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(HomeWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Saisie : chiffres, une virgule (2 décimales au plus), effacer, tout effacer, inverser le sens. */
    private static void press(Context context, int id, String key) {
        SharedPreferences p = prefs(context);
        String in = p.getString("fxIn_" + id, "");
        boolean swapped = p.getBoolean("fxSw_" + id, false);
        switch (key) {
            case "del": if (!in.isEmpty()) in = in.substring(0, in.length() - 1); break;
            case "clear": in = ""; break;
            case "swap": swapped = !swapped; break;
            case ",":
                if (!in.contains(",")) in = (in.isEmpty() ? "0" : in) + ",";
                break;
            default: // chiffre
                int comma = in.indexOf(',');
                if (comma >= 0 && in.length() - comma > 2) break;      // 2 décimales max
                if (comma < 0 && in.length() >= 9) break;               // 999 999 999 max
                in = in.equals("0") ? key : in + key;
        }
        p.edit().putString("fxIn_" + id, in).putBoolean("fxSw_" + id, swapped).apply();
    }

    private static String fmt(double v) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.FRANCE);
        int dec = Math.abs(v) >= 100 ? 0 : 2;
        nf.setMinimumFractionDigits(dec);
        nf.setMaximumFractionDigits(dec);
        return nf.format(v);
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = prefs(context);
        String theme = prefs.getString(HomeWidgetPlugin.KEY_THEME, "default");
        RemoteViews compact = compactViews(context, prefs, theme);
        RemoteViews views;
        if (Build.VERSION.SDK_INT >= 31) {
            Map<SizeF, RemoteViews> m = new HashMap<>();
            m.put(new SizeF(100f, 90f), compact);
            m.put(new SizeF(140f, 150f), keypadViews(context, prefs, theme, appWidgetId));
            views = new RemoteViews(m);
        } else {
            views = compact;
        }
        WidgetRefresh.push(appWidgetManager, appWidgetId, views);
    }

    private static PendingIntent openApp(Context context) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.setData(Uri.parse("https://julienbruwaert1-sys.github.io/planning-vacances/?shortcut=convert"));
        return PendingIntent.getActivity(context, 3, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Affichage seul (petit widget) : comme avant le clavier. */
    private static RemoteViews compactViews(Context context, SharedPreferences prefs, String theme) {
        String fxText = prefs.getString(HomeWidgetPlugin.KEY_FX_TEXT, "");
        String fxSub = prefs.getString(HomeWidgetPlugin.KEY_FX_SUB, "");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_fx);
        views.setInt(R.id.fxRoot, "setBackgroundResource", WidgetThemeColors.backgroundRes(theme));
        if (TextUtils.isEmpty(fxText)) {
            views.setTextViewText(R.id.fxBig, "–");
            views.setTextViewText(R.id.fxSub, context.getString(R.string.widget_fx_empty));
        } else {
            views.setTextViewText(R.id.fxBig, fxText);
            views.setTextViewText(R.id.fxSub, fxSub);
        }
        views.setOnClickPendingIntent(R.id.fxRoot, openApp(context));
        return views;
    }

    /** Widget avec clavier : saisie et résultat calculés ici, avec le dernier taux connu. */
    private static RemoteViews keypadViews(Context context, SharedPreferences prefs, String theme, int id) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_fx_keypad);
        v.setInt(R.id.fxRoot, "setBackgroundResource", WidgetThemeColors.backgroundRes(theme));

        String in = prefs.getString("fxIn_" + id, "");
        boolean swapped = prefs.getBoolean("fxSw_" + id, false);
        String from = prefs.getString(HomeWidgetPlugin.KEY_FX_FROM, "");
        String to = prefs.getString(HomeWidgetPlugin.KEY_FX_TO, "");
        double rate = 0;
        try { rate = Double.parseDouble(prefs.getString(HomeWidgetPlugin.KEY_FX_RATE, "")); } catch (NumberFormatException ignored) {}
        if (swapped && rate > 0) { rate = 1 / rate; String t = from; from = to; to = t; }

        if (rate <= 0) {
            v.setTextViewText(R.id.fxPair, "💱 Convertisseur");
            v.setTextViewText(R.id.fxInput, in);
            v.setTextViewText(R.id.fxResult, context.getString(R.string.widget_fx_empty));
        } else {
            long at = prefs.getLong(HomeWidgetPlugin.KEY_FX_RATE_AT, 0);
            String old = at > 0 && System.currentTimeMillis() - at > 86_400_000L
                    ? " · taux du " + new SimpleDateFormat("dd/MM", Locale.FRANCE).format(new Date(at)) : "";
            v.setTextViewText(R.id.fxPair, "💱 " + from + " → " + to + old);
            double amount = 1;
            if (!in.isEmpty()) {
                try { amount = Double.parseDouble(in.replace(',', '.')); } catch (NumberFormatException e) { amount = 0; }
            }
            v.setTextViewText(R.id.fxInput, (in.isEmpty() ? "1" : in) + " " + from + " =");
            v.setTextViewText(R.id.fxResult, fmt(amount * rate) + " " + to);
        }

        for (int i = 0; i < KEYS.length; i++) {
            Intent k = new Intent(context, FxWidgetProvider.class)
                    .setAction(ACTION_KEY)
                    .setData(Uri.parse("tabigo-fx://" + id + "/" + KEYS[i]))   // un PendingIntent distinct par touche et par widget
                    .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                    .putExtra("key", KEYS[i]);
            v.setOnClickPendingIntent(KEY_IDS[i], PendingIntent.getBroadcast(context, id * 32 + i, k,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        v.setOnClickPendingIntent(R.id.kOpen, openApp(context));
        return v;
    }
}
