package com.julien.planningvacances;

/* CAPACITOR (2026-09-06) : couleurs par thème partagées entre les widgets
   d'écran d'accueil (TripWidgetProvider, TricountPillWidgetProvider...) —
   extrait de TripWidgetProvider pour ne pas dupliquer ce switch à chaque
   nouveau widget. Valeurs reprises telles quelles des cartes sombres de
   chaque thème dans style.css (body.dark.theme-X .day-content), voir les
   fichiers res/drawable/widget_bg_*.xml pour le détail des dégradés. */
public class WidgetThemeColors {

    public static int backgroundRes(String theme) {
        if (theme == null) return R.drawable.widget_bg_default;
        switch (theme) {
            case "noel": return R.drawable.widget_bg_noel;
            case "ghibli": return R.drawable.widget_bg_ghibli;
            case "halloween": return R.drawable.widget_bg_halloween;
            case "sakura": return R.drawable.widget_bg_sakura;
            case "momiji": return R.drawable.widget_bg_momiji;
            case "neon": return R.drawable.widget_bg_neon;
            default: return R.drawable.widget_bg_default;
        }
    }

    /* Mêmes dégradés que backgroundRes() mais en forme de pilule (radius
       surdimensionné) — voir res/drawable/widget_pill_bg_*.xml, utilisé par
       TricountPillWidgetProvider. */
    public static int pillBackgroundRes(String theme) {
        if (theme == null) return R.drawable.widget_pill_bg_default;
        switch (theme) {
            case "noel": return R.drawable.widget_pill_bg_noel;
            case "ghibli": return R.drawable.widget_pill_bg_ghibli;
            case "halloween": return R.drawable.widget_pill_bg_halloween;
            case "sakura": return R.drawable.widget_pill_bg_sakura;
            case "momiji": return R.drawable.widget_pill_bg_momiji;
            case "neon": return R.drawable.widget_pill_bg_neon;
            default: return R.drawable.widget_pill_bg_default;
        }
    }

    /* Vraies photos (licence Pixabay, usage commercial libre sans
       attribution — voir les fichiers res/drawable/widget_photo_*.{jpg,png})
       remplaçant la bordure "M4"/la barre néon, style "P2 sans
       assombrissement" choisi parmi la comparaison de mockups (photo
       pleine carte, pas de voile sombre — la lisibilité du texte vient de
       l'ombre portée posée sur chaque TextView, voir widget_trip.xml).
       0 = pas de photo pour ce thème (default garde son propre
       traitement, la scène "H3 nuit étoilée"). */
    public static int photoRes(String theme) {
        if (theme == null) return 0;
        switch (theme) {
            case "noel": return R.drawable.widget_photo_noel;
            case "sakura": return R.drawable.widget_photo_sakura;
            case "momiji": return R.drawable.widget_photo_momiji;
            case "ghibli": return R.drawable.widget_photo_ghibli;
            case "halloween": return R.drawable.widget_photo_halloween;
            case "neon": return R.drawable.widget_photo_neon;
            default: return 0;
        }
    }

    public static int accentColor(String theme) {
        if (theme == null) return android.graphics.Color.parseColor("#F0935A");
        switch (theme) {
            case "noel": return android.graphics.Color.parseColor("#E8C468");
            case "ghibli": return android.graphics.Color.parseColor("#D8B25C");
            case "halloween": return android.graphics.Color.parseColor("#F2954B");
            case "sakura": return android.graphics.Color.parseColor("#F5A9C6");
            case "momiji": return android.graphics.Color.parseColor("#E8834A");
            case "neon": return android.graphics.Color.parseColor("#4DE8FF");
            default: return android.graphics.Color.parseColor("#F0935A");
        }
    }
}
