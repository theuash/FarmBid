const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } else {
      console.warn('[Gemini] API Key not configured. Natural language features will be limited.');
      this.genAI = null;
    }
  }

  /**
   * Analyzes user message to detect intent and extract entities.
   * Returns a structured object: { intent: string, entities: object }
   */
  async analyzeMessage(text, context = {}) {
    if (!this.genAI) return null;

    try {
      const prompt = `
        You are an AI assistant for FarmBid, a WhatsApp-based agricultural marketplace. 
        Your job is to understand the user's intent and extract key information.

        Context: User is currently in state "${context.state || 'UNKNOWN'}"
        Current User Message: "${text}"

        Analyze the message and respond ONLY in valid JSON format with the following structure:
        {
          "intent": "list_crop" | "view_listings" | "go_back" | "go_home" | "register" | "unknown",
          "entities": {
            "produce": "string (e.g. Tomato, Coffee)",
            "quantity": "number (normalized to kg)",
            "price": "number (in rupees per kg)",
            "location": "string (village/city)",
            "unit": "kg | quintal | ton"
          },
          "sentiment": "positive" | "negative" | "neutral",
          "reasoning": "short explanation of why you chose this intent"
        }

        Rules:
        - If the user says "back", "prev", or "previous", intent should be "go_back".
        - If the user provides crop details (e.g. "Selling 100kg rice"), intent is "list_crop".
        - If the user wants to see their auctions, intent is "view_listings".
        - Respond in English, even if input is in Kannada text or Latin script.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().replace(/```json|```/g, '').trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[Gemini] Error analyzing message:', error);
      return null;
    }
  }
}

module.exports = new GeminiService();
