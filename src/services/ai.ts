/// <reference path="../global.d.ts" />
import { Env, NewsItem } from '../types';

export class AiService {
    private ai: any;
    private env: Env;

    constructor(env: Env) {
        this.ai = env.AI;
        this.env = env;
    }

    async summarizeNews(newsItems: NewsItem[]): Promise<any[]> {
        if (newsItems.length === 0) return [];

        const systemPrompt = `You are a financial market analyst. 
Your task is to filter and summarize news strictly in JSON format.
DO NOT include any introductory text, conversational filler, or markdown formatting outside the JSON block.
Output MUST be a valid JSON array.`;

        const userPrompt = `
I will provide you with a list of market news items.
Your task is to:
1. **Filter and Select** the top 5-10 most impactful news items that are **strictly related to Financial Markets**.
2. **Exclude** general political news, sports, entertainment, or minor regional events.
3. Summarize each selected item in **Simplified Chinese** (简体中文).
4. **Extract** the most relevant Stock Symbol or Asset Class (e.g., AAPL, NVDA, BTC, GOLD, USD) if explicitly mentioned or strongly implied. Returns null if none.
5. **Output MUST be a valid JSON array**.

Structure:
[
  {
    "title": "News Title in Chinese",
    "summary": "Summary in Chinese",
    "symbol": "TickerSymbol" // e.g. "NVDA", or null
  }
]

News Items:
${newsItems.map(item => `- ${item.title} (${item.pubDate}): ${item.content || ''}`).join('\n')}

Output JSON:
`;

        try {
            const model = this.env.AI_TEXT_MODEL || '@cf/meta/llama-3.1-70b-instruct';
            const maxTokens = parseInt(this.env.AI_MAX_TOKENS) || 2048;

            console.log(`[AI] Using model: ${model}, max_tokens: ${maxTokens}`);

            const response = await this.ai.run(model, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: maxTokens
            });

            console.log(`[AI] Raw response type: ${typeof response}, has response property: ${!!response.response}`);

            let content = response.response || '';

            if (!content) {
                console.warn('[AI] Empty response from AI model');
                return [];
            }

            // Log the first 500 chars for debugging
            console.log(`[AI] Response preview (first 500 chars): ${content.substring(0, 500)}`);

            // Clean up common AI artifacts
            content = content.trim();

            // Remove markdown code blocks if present
            content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Remove any text before first [ or {
            const jsonStartMatch = content.match(/[\[{]/);
            if (jsonStartMatch) {
                content = content.substring(content.indexOf(jsonStartMatch[0]));
            }

            // Remove any text after last ] or }
            const jsonEndMatch = content.match(/[\]}]/g);
            if (jsonEndMatch) {
                const lastBracket = content.lastIndexOf(jsonEndMatch[jsonEndMatch.length - 1]);
                content = content.substring(0, lastBracket + 1);
            }

            // Try to extract JSON array from content
            const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*]/);
            const targetJson = jsonMatch ? jsonMatch[0] : content;

            console.log(`[AI] Attempting to parse JSON (length: ${targetJson.length})`);

            try {
                const parsed = JSON.parse(targetJson);
                console.log(`[AI] Successfully parsed ${Array.isArray(parsed) ? parsed.length : 0} items`);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.warn('[AI] JSON parse error:', e instanceof Error ? e.message : String(e));
                console.warn('[AI] Full AI response:', content);
                console.warn('[AI] Attempted to parse:', targetJson.substring(0, 1000));
                return [];
            }

        } catch (error) {
            console.error('[AI] Processing Error:', error instanceof Error ? error.message : String(error));
            if (error instanceof Error && error.stack) {
                console.error('[AI] Stack trace:', error.stack);
            }
            return [];
        }
    }

}
