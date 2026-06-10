
import { LearningNeed } from "../types";

/**
 * Safely parses JSON returned from an LLM.
 * Aggressively cleans Markdown, fix common trailing commas, and partial JSON issues.
 */
export const safeJsonParse = <T>(text: string | undefined, fallback: T | null = null): T | null => {
    if (!text) return fallback;

    try {
        // 1. Strip Markdown code blocks
        let cleanText = text.replace(/```json\n?|```/g, '').trim();
        
        // 2. Remove "json" prefix if it exists without backticks
        if (cleanText.toLowerCase().startsWith('json')) {
            cleanText = cleanText.substring(4).trim();
        }

        // 3. Remove any text before the first '{' or '['
        const firstBracket = cleanText.search(/[{[]/);
        if (firstBracket === -1) return fallback;
        if (firstBracket > 0) {
            cleanText = cleanText.substring(firstBracket);
        }

        // 4. Remove any text after the last '}' or ']'
        const lastCurly = cleanText.lastIndexOf('}');
        const lastSquare = cleanText.lastIndexOf(']');
        const end = Math.max(lastCurly, lastSquare);
        if (end === -1) return fallback;
        cleanText = cleanText.substring(0, end + 1);

        // 5. Fix common trailing commas
        cleanText = cleanText.replace(/,\s*([}\]])/g, '$1');

        // 6. Handle potential single quotes instead of double quotes (common in some LLM outputs)
        // This is risky but can help if the JSON is simple
        try {
            return JSON.parse(cleanText) as T;
        } catch (e) {
            // Try to replace single quotes with double quotes if it looks like a JSON object
            // This is a last resort
            const withDoubleQuotes = cleanText.replace(/'/g, '"');
            try {
                return JSON.parse(withDoubleQuotes) as T;
            } catch (e2) {
                // If it still fails, try to find the first '[' and last ']' for array extraction
                const start = cleanText.indexOf('[');
                const endArr = cleanText.lastIndexOf(']');
                if (start !== -1 && endArr !== -1 && endArr > start) {
                    const arrayPart = cleanText.substring(start, endArr + 1);
                    try {
                        return JSON.parse(arrayPart) as T;
                    } catch (e3) {
                        // Final attempt: try to fix common JSON errors in the array part
                        const fixedArray = arrayPart.replace(/,\s*([}\]])/g, '$1');
                        try {
                            return JSON.parse(fixedArray) as T;
                        } catch (e4) {
                            throw e; // Re-throw original error if all attempts fail
                        }
                    }
                }
                throw e;
            }
        }
    } catch (e) {
        console.error("JSON Parse Error on AI output:", e, "\nOriginal Text:", text);
        return fallback;
    }
};

/**
 * DEPRECATED: Images are now handled via CSS patterns/Icons to ensure production reliability.
 * Returns a placeholder to prevent crashes if called.
 */
export const getSafeImageUrl = (keyword: string): string => {
    return `https://placehold.co/800x600/e2e8f0/475569?text=${encodeURIComponent(keyword)}`;
};

/**
 * Checks if the browser supports Speech Recognition (Chrome/Edge/Android).
 */
export const supportsSpeechRecognition = (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

/**
 * Explicitly triggers micro-stream getUserMedia sequence to force APK / WebView
 * host to manifest a standard Android system permission prompt rather than throwing instantly.
 */
export const ensureMicrophonePermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return false;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Clean up tracks immediately
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (e) {
        console.warn("[Mic Permission] Verification failed, or user blocked microphone access:", e);
        return false;
    }
};

/**
 * Generates specific pedagogical instructions based on a student's learning needs.
 */
export const getLearnerProfileContext = (needs: string[] | undefined): string => {
    if (!needs || needs.length === 0) return "";

    const instructions: string[] = [];

    if (needs.includes('visual_impairment')) {
        instructions.push("STRICT ACCESSIBILITY: Content must be descriptive text only. No reliance on diagrams.");
    }
    if (needs.includes('dyslexia')) {
        instructions.push("FORMATTING: Use short sentences, bullet points, and simple vocabulary.");
    }
    if (needs.includes('adhd')) {
        instructions.push("ENGAGEMENT: Break concepts into micro-chunks. Use exciting, active language.");
    }

    if (instructions.length > 0) {
        return `\n\nLEARNER PROFILE ADJUSTMENTS:\n${instructions.join('\n')}\n`;
    }
    return "";
};

/**
 * Simple string matching helper for voice answers.
 * Returns true if the input contains the target answer (fuzzy).
 */
export const isFuzzyMatch = (input: string, targets: string[], threshold: number = 0.8): boolean => {
    if (!input || !targets || targets.length === 0) return false;
    const lowerInput = input.toLowerCase();
    return targets.some(target => lowerInput.includes(target.toLowerCase()));
};
