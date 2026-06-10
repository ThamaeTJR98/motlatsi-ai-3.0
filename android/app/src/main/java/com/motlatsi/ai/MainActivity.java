package com.motlatsi.ai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            // Check if google-services.json was processed & loaded (creates google_app_id resource)
            int resId = getResources().getIdentifier("google_app_id", "string", getPackageName());
            if (resId == 0) {
                // If native configuration is missing, initialize a fallback default FirebaseApp
                // to prevent capacitor background push-notifications plugin from throwing critical errors.
                if (FirebaseApp.getApps(this).isEmpty()) {
                    FirebaseOptions options = new FirebaseOptions.Builder()
                        .setApplicationId("1:1234567890:android:0000000000000000000000")
                        .setApiKey("dummy_firebase_api_key_for_local_development_only")
                        .setProjectId("dummy-firebase-project-id")
                        .build();
                    FirebaseApp.initializeApp(this, options);
                }
            }
        } catch (Exception e) {
            // Quietly catch any issues to ensure the main application logic is never interrupted
        }
    }
}