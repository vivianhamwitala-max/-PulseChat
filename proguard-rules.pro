# Keep Firebase and model classes
-keep class com.pulsechat.app.data.model.** { *; }
-keepclassmembers class com.pulsechat.app.data.model.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
