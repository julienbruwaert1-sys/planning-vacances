package com.julien.planningvacances;

import android.app.BroadcastOptions;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Envoi des photos et documents d'un voyage sur le NAS perso de Julien, via son appli « NAS » (fr.julien.nas)
 * installée sur le même téléphone : elle les met en file d'attente et les envoie dans
 * Voyages/&lt;voyage&gt;/&lt;Photos|Documents|Reçus&gt; dès que le NAS répond (Tailscale en voyage).
 *
 * JS : Capacitor.Plugins.NasExport.disponible() -> {disponible}
 *      Capacitor.Plugins.NasExport.envoyer({data: base64 ou data:URL, nom, dossier: "Voyages/..."})
 *
 * Le fichier est écrit dans le cache (cache/nas-export), partagé par le FileProvider de l'appli, lisible par
 * l'appli NAS grâce à grantUriPermission, puis annoncé par un broadcast explicite (identité partagée sur
 * Android 14+ : l'appli NAS n'accepte que Tabi Go). Le cache est vidé des fichiers de plus d'un jour.
 */
@CapacitorPlugin(name = "NasExport")
public class NasExportPlugin extends Plugin {
    static final String NAS = "fr.julien.nas";
    static final String ACTION = "fr.julien.nas.VOYAGE";

    private boolean installed() {
        try {
            getContext().getPackageManager().getPackageInfo(NAS, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @PluginMethod
    public void disponible(PluginCall call) {
        JSObject r = new JSObject();
        r.put("disponible", installed());
        call.resolve(r);
    }

    @PluginMethod
    public void envoyer(PluginCall call) {
        String data = call.getString("data");
        String nom = call.getString("nom");
        String dossier = call.getString("dossier");
        if (data == null || nom == null || dossier == null || !dossier.startsWith("Voyages/")) {
            call.reject("paramètres manquants");
            return;
        }
        if (!installed()) {
            call.reject("appli NAS absente");
            return;
        }
        getBridge().execute(() -> {
            try {
                int comma = data.indexOf(',');
                byte[] bytes = Base64.decode(data.startsWith("data:") && comma > 0 ? data.substring(comma + 1) : data, Base64.DEFAULT);
                File dir = new File(getContext().getCacheDir(), "nas-export");
                dir.mkdirs();
                File[] old = dir.listFiles();
                if (old != null) for (File f : old) if (System.currentTimeMillis() - f.lastModified() > 86_400_000L) f.delete();
                File f = new File(dir, System.currentTimeMillis() + "-" + nom.replaceAll("[\\\\/:*?\"<>|]", "_"));
                try (FileOutputStream out = new FileOutputStream(f)) { out.write(bytes); }

                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                getContext().grantUriPermission(NAS, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent i = new Intent(ACTION)
                        .setClassName(NAS, NAS + ".VoyageReceiver")
                        .setData(uri)
                        .putExtra("dossier", dossier)
                        .putExtra("nom", nom)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                if (Build.VERSION.SDK_INT >= 34) {
                    BroadcastOptions o = BroadcastOptions.makeBasic();
                    o.setShareIdentityEnabled(true);
                    getContext().sendBroadcast(i, null, o.toBundle());
                } else {
                    getContext().sendBroadcast(i);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("envoi au NAS impossible : " + e.getMessage());
            }
        });
    }
}
