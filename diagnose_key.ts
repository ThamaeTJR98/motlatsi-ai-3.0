
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
    console.log("--- DIAGNOSTIC START ---");
    
    // 1. Check Environment Variables
    const envKey = process.env.API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;
    
    console.log("1. Environment Variable Check:");
    console.log(`   API_KEY: ${mask(envKey)}`);
    console.log(`   GEMINI_API_KEY: ${mask(geminiKey)}`);
    console.log(`   GOOGLE_API_KEY: ${mask(googleKey)}`);

    const activeKey = envKey || geminiKey || googleKey;

    if (!activeKey) {
        console.error("❌ CRITICAL: No API key found in process.env");
        return;
    }

    // 2. Check for common formatting issues
    if (activeKey.startsWith('"') || activeKey.startsWith("'")) {
        console.warn("⚠️ WARNING: Key appears to be wrapped in quotes. This often causes 400 errors.");
    }
    if (activeKey.includes(' ')) {
        console.warn("⚠️ WARNING: Key contains whitespace.");
    }

    // 3. Test the Key with a simple call
    console.log("\n2. Testing Key with GoogleGenAI SDK...");
    try {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: 'Hello, are you working?' }] }]
        });
        console.log("✅ SUCCESS: API Call worked!");
        console.log("   Response:", response.text?.substring(0, 50) + "...");
    } catch (error: any) {
        console.error("❌ FAILURE: API Call failed.");
        console.error("   Error Message:", error.message);
        console.error("   Error Details:", JSON.stringify(error, null, 2));
    }
    console.log("--- DIAGNOSTIC END ---");
}

function mask(key: string | undefined) {
    if (!key) return "undefined";
    if (key.length < 10) return key; // Too short to mask properly
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)} (Length: ${key.length})`;
}

diagnose();
