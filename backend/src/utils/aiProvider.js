import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Provider Abstraction Layer
 * Tries Claude first, falls back to Gemini if Claude fails
 * Normalizes both APIs to a common interface
 */

class AIProvider {
  constructor() {
    this.claudeClient = null;
    this.geminiClient = null;
    this.initializeClients();
  }

  initializeClients() {
    // Initialize Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.claudeClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }

    // Initialize Gemini if API key is available
    if (process.env.GOOGLE_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }

    if (!this.claudeClient && !this.geminiClient) {
      throw new Error('No AI API keys configured. Set ANTHROPIC_API_KEY or GOOGLE_API_KEY in .env');
    }
  }

  // Format image buffer for Claude
  formatImageForClaude(buffer, mimeType) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType,
        data: buffer.toString("base64")
      }
    };
  }

  // Format image buffer for Gemini
  async formatImageForGemini(buffer, mimeType) {
    return {
      inlineData: {
        mimeType,
        data: buffer.toString("base64")
      }
    };
  }

  /**
   * Generate grading response with fallback
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {string} mimeType - MIME type of image
   * @param {string} systemPrompt - System prompt for grading
   * @param {number} maxRetries - Max retries for rate limiting
   * @returns {string} - JSON string response from AI
   */
  async generateWithFallback(imageBuffer, mimeType, systemPrompt, maxRetries = 3) {
    let lastError = null;

    // Try Claude first
    if (this.claudeClient) {
      try {
        console.log('[AIProvider] Attempting Claude...');
        const response = await this.generateWithClaude(imageBuffer, mimeType, systemPrompt, maxRetries);
        console.log('[AIProvider] Claude succeeded');
        return response;
      } catch (error) {
        console.warn('[AIProvider] Claude failed:', error.message);
        lastError = error;
      }
    }

    // Fall back to Gemini
    if (this.geminiClient) {
      try {
        console.log('[AIProvider] Claude failed, attempting Gemini...');
        const response = await this.generateWithGemini(imageBuffer, mimeType, systemPrompt, maxRetries);
        console.log('[AIProvider] Gemini succeeded');
        return response;
      } catch (error) {
        console.warn('[AIProvider] Gemini failed:', error.message);
        lastError = error;
      }
    }

    // Both failed
    throw new Error(`All AI providers failed. Claude: ${lastError?.message || 'Not configured'}`);
  }

  /**
   * Generate response using Claude
   */
  async generateWithClaude(imageBuffer, mimeType, systemPrompt, maxRetries = 3) {
    let delayMs = 15000; // Wait 15 seconds if we hit a rate limit

    for (let i = 0; i < maxRetries; i++) {
      try {
        const imagePart = this.formatImageForClaude(imageBuffer, mimeType);

        const response = await this.claudeClient.messages.create({
          model: "claude-opus-4-1-20250805",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                imagePart,
                {
                  type: "text",
                  text: "Please analyze this worksheet image and provide the grading results in JSON format."
                }
              ]
            }
          ]
        });

        return response.content?.[0]?.text || '';
      } catch (error) {
        const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
        
        if (isRateLimit && i < maxRetries - 1) {
          console.warn(`[Claude] 429 Quota Exceeded. Retrying in ${delayMs / 1000} seconds... (Attempt ${i + 1} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs += 10000; // Increase exponentially
          continue;
        }

        // Re-throw the error to trigger fallback
        throw error;
      }
    }
  }

  /**
   * Generate response using Gemini
   */
  async generateWithGemini(imageBuffer, mimeType, systemPrompt, maxRetries = 3) {
    let delayMs = 15000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = this.geminiClient.getGenerativeModel({
          model: "gemini-2.0-flash", // Using latest Gemini model
          systemInstruction: systemPrompt
        });

        const imagePart = await this.formatImageForGemini(imageBuffer, mimeType);

        const response = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                imagePart,
                {
                  text: "Please analyze this worksheet image and provide the grading results in JSON format."
                }
              ]
            }
          ]
        });

        const textContent = response.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return textContent;
      } catch (error) {
        // Gemini uses different error codes for rate limiting
        const isRateLimit = 
          error.status === 429 || 
          error.message?.includes('429') ||
          error.message?.includes('RESOURCE_EXHAUSTED') ||
          error.message?.includes('rate limit');

        if (isRateLimit && i < maxRetries - 1) {
          console.warn(`[Gemini] Rate limited. Retrying in ${delayMs / 1000} seconds... (Attempt ${i + 1} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs += 10000;
          continue;
        }

        throw error;
      }
    }
  }

  /**
   * Health check - returns which providers are available
   */
  getStatus() {
    return {
      claude: !!this.claudeClient,
      gemini: !!this.geminiClient,
      primary: this.claudeClient ? 'Claude' : 'Gemini',
      fallback: this.geminiClient ? 'Gemini' : 'Claude'
    };
  }
}

// Export singleton instance
let providerInstance = null;

export const getAIProvider = () => {
  if (!providerInstance) {
    providerInstance = new AIProvider();
  }
  return providerInstance;
};

export default AIProvider;
