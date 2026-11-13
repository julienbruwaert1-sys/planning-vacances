package com.julien.planningvacances;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

import org.json.JSONObject;

/* 2026-11-13 : envoi du voyage à l'appli Tabi Go de la montre (Galaxy Watch).

   Passe par la "Data Layer" de Wear OS : la montre (même identifiant
   d'appli com.julien.planningvacances, même clé de signature) reçoit les
   données même si son appli est fermée, et les garde pour fonctionner sans
   réseau. Le JSON est préparé côté JS (buildWatchPayload() dans app.js) ;
   on y ajoute seulement le dernier taux de change connu, déjà gardé dans
   les SharedPreferences du widget convertisseur.

   Aucune montre / pas de Wear OS sur le téléphone : la tâche échoue en
   silence, rien d'autre n'est touché (même garde-fou que les widgets). */
public final class WearSync {

    private static final String TAG = "TabiGoWear";
    static final String PATH = "/tabigo/data";

    private WearSync() {}

    public static void push(Context context, String watchJson, SharedPreferences prefs) {
        if (watchJson == null || watchJson.isEmpty()) return;
        try {
            JSONObject o = new JSONObject(watchJson);
            String rate = prefs.getString(HomeWidgetPlugin.KEY_FX_RATE, "");
            if (rate != null && !rate.isEmpty()) {
                JSONObject fx = new JSONObject();
                fx.put("rate", rate);
                fx.put("from", prefs.getString(HomeWidgetPlugin.KEY_FX_FROM, ""));
                fx.put("to", prefs.getString(HomeWidgetPlugin.KEY_FX_TO, ""));
                fx.put("fromCode", prefs.getString(HomeWidgetPlugin.KEY_FX_FROM_CODE, ""));
                fx.put("toCode", prefs.getString(HomeWidgetPlugin.KEY_FX_TO_CODE, ""));
                fx.put("at", prefs.getLong(HomeWidgetPlugin.KEY_FX_RATE_AT, 0L));
                o.put("fx", fx);
            }
            PutDataMapRequest req = PutDataMapRequest.create(PATH);
            req.getDataMap().putString("json", o.toString());
            PutDataRequest data = req.asPutDataRequest().setUrgent();
            Wearable.getDataClient(context.getApplicationContext()).putDataItem(data)
                .addOnFailureListener(e -> Log.i(TAG, "Montre non joignable : " + e.getMessage()));
        } catch (Throwable t) {
            Log.w(TAG, "Envoi à la montre impossible", t);
        }
    }
}
