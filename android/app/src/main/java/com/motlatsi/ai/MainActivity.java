package com.motlatsi.ai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            // Check if FirebaseApp class is present on classpath (e.g. via @capacitor/push-notifications plugin)
            Class<?> firebaseAppClass = Class.forName("com.google.firebase.FirebaseApp");
            
            try {
                // Check if default instance is already initialized
                firebaseAppClass.getMethod("getInstance").invoke(null);
            } catch (Exception notInitialized) {
                // Not initialized! Initialize fallback FirebaseApp to prevent push notification registration crashes
                Class<?> firebaseOptionsClass = Class.forName("com.google.firebase.FirebaseOptions");
                Class<?> builderClass = Class.forName("com.google.firebase.FirebaseOptions$Builder");
                
                Object builder = builderClass.getDeclaredConstructor().newInstance();
                builderClass.getMethod("setApplicationId", String.class).invoke(builder, "1:1234567890:android:0000000000000000000000");
                builderClass.getMethod("setApiKey", String.class).invoke(builder, "dummy_firebase_api_key_for_local_development_only");
                builderClass.getMethod("setProjectId", String.class).invoke(builder, "dummy-firebase-project-id");
                
                Object options = builderClass.getMethod("build").invoke(builder);
                
                firebaseAppClass.getMethod("initializeApp", android.content.Context.class, firebaseOptionsClass).invoke(null, this, options);
            }
        } catch (Exception e) {
            // Quietly catch any issues (e.g. Firebase not in classpath) to avoid interrupting main logic
        }
    }
}