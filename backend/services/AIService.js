const { OpenAI } = require('openai');

class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your_openai_key') {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn('[AI] OpenAI API Key not configured. AI parsing will be disabled.');
      this.openai = null;
    }
  }

  /**
   * Parses a free-text agricultural listing into structured data.
   * Example: "Selling 500kg of Organic Rice for 45 rupees per kg in Mandya"
   * Returns: { produce: "Rice", quantity: 500, price: 45, location: "Mandya" }
   */
  async parseListing(text) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_key') {
      console.warn('[AI] OpenAI API Key not configured. Skipping AI parsing.');
      return null;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert at parsing agricultural business data. Extract the following fields from the user's text:
            - produce (The crop name, e.g., Rice, Tomato, Onion)
            - quantity (Just the number, normalized to kg if possible)
            - unit (kg, quintal, or ton)
            - price (The minimum expected price per kg in Rupees)
            - location (The village, city, or district mentioned)
            
            Respond ONLY in valid JSON. If a value is missing, use null.
            Input may be in English or Kannada (written in Kannada or Latin script).`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('[AI] Error parsing listing:', error);
      return null;
    }
  }
}

module.exports = new AIService();
