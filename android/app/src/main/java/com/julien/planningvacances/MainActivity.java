package com.julien.planningvacances;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

/* CAPACITOR (2026-09-05, @capgo/capacitor-social-login) : implémenter ce
   marqueur est une exigence explicite du plugin pour autoriser les scopes
   OAuth Google supplémentaires (ici drive.appdata, voir connectGoogleDrive()
   dans app.js) — sans ça, login() rejette systématiquement avec "You
   CANNOT use scopes without modifying the main activity." Aucune vraie
   logique requise dans la méthode elle-même (juste un garde-fou du
   plugin), voir GoogleProvider.java côté plugin. */
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}

    /* CAPACITOR (2026-09-06, widget d'écran d'accueil) : HomeWidgetPlugin
       est un plugin Capacitor 100% local à ce projet (pas un paquet npm à
       vendoriser) — doit être enregistré manuellement AVANT super.onCreate(),
       convention Capacitor standard pour un plugin qui n'est pas découvert
       automatiquement via node_modules. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HomeWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
