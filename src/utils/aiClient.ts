
import { GoogleGenAI } from "@google/genai";

interface AIParams {
  model: string;
  contents: string | any;
  config?: any;
}

export const aiClient = {
  onQuotaExceeded: null as (() => void) | null,
  onConsumeCredit: null as ((params?: { orgId?: string, forceUsage?: boolean }) => Promise<boolean>) | null,
  
  generate: async (params: AIParams & { cacheKey?: string, organizationId?: string }) => {
    try {
      // 1. Credit Check (Simulated for this demo architecture)
      if (aiClient.onConsumeCredit) {
        const hasCredits = await aiClient.onConsumeCredit({ orgId: params.organizationId });
        if (!hasCredits) {
          throw new Error("QUOTA_EXCEEDED");
        }
      }

      // 2. Call the server-side proxy
      const baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '') : '';
      const apiUrl = `${baseUrl}/api/generate`;
      console.log(`[AI Client] Fetching from ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          contents: params.contents,
          config: params.config
        }),
      });

      console.log(`[AI Client] Response status: ${response.status} (${response.ok ? 'OK' : 'ERROR'})`);
      const contentType = response.headers.get("content-type");
      console.log(`[AI Client] Content-Type: ${contentType}`);

      if (!response.ok) {
        let errorMsg = "Generation failed";
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } else {
          const text = await response.text();
          console.error("Non-JSON error response from server:", text.substring(0, 200));
          errorMsg = `Server error (${response.status})`;
        }
        
        // Handle specific rate limit from proxy
        if (response.status === 429) {
          aiClient.onQuotaExceeded?.();
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      // The server proxy might return the full result or just the text
      const extractedText = typeof result.text === 'string' ? result.text : 
                            (result.response?.text || result.response?.candidates?.[0]?.content?.parts?.[0]?.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "");
      
      return {
        text: extractedText,
        response: result
      };
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      
      if (error?.message?.includes("QUOTA_EXCEEDED")) {
        aiClient.onQuotaExceeded?.();
      }
      
      throw error;
    }
  }
};
