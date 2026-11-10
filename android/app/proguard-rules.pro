# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Ajoute pour la version release optimisee (R8) ---
# Capacitor appelle les plugins et le pont JS par reflexion : on garde tout leur code tel quel
# (R8 n'optimise que les bibliotheques : androidx, ML Kit, Kotlin, Play Services...).
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class io.capawesome.** { *; }
-keep class dev.barooni.** { *; }
-keep class ee.forgr.** { *; }
-keep class app.capgo.** { *; }
-keep class com.aparajita.** { *; }
-keep class com.whitestein.** { *; }
# Code natif de Tabi Go (widgets, export NAS)
-keep class com.julien.planningvacances.** { *; }
