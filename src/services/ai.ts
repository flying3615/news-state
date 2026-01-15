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

        const systemPrompt = `You are a financial market analyst specializing in identifying investment opportunities. 
Your task is to filter and summarize news that presents actionable investment insights, strictly in JSON format.
Focus on news that could impact stock prices, create trading opportunities, or signal market trends.
DO NOT include any introductory text, conversational filler, or markdown formatting outside the JSON block.
Output MUST be a valid JSON array highlighting investment potential.`;

        const userPrompt = `
I will provide you with a list of market news items.
Your task is to:
1. **Filter and Select** the top 10-20 most impactful news items that present **STOCK INVESTMENT OPPORTUNITIES or strictly related to Financial Markets**.
2. **Focus on**: Earnings reports, product launches, regulatory approvals, mergers & acquisitions, major contracts, breakthrough technologies, sector trends, analyst upgrades/downgrades, and market-moving events.
3. **EXCLUDE**: General political news, sports, entertainment, minor regional events, or news without clear stock market implications.
4. **Prioritize** news that could significantly impact stock prices or present trading opportunities.
5. Summarize each selected item in **Simplified Chinese** (简体中文), highlighting the **investment angle** and potential market impact.
6. **Extract** the most relevant Stock Symbol or Asset Class (e.g., AAPL, NVDA, TSLA, BTC, GOLD, USD). If a specific stock is mentioned or strongly implied, ALWAYS include it. Returns null only if no specific investment target exists.
7. **Output MUST be a valid JSON array**.

Structure:
[
  {
    "title": "News Title in Chinese (focus on investment angle)",
    "summary": "Summary in Chinese emphasizing investment opportunity or risk",
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
            console.log(`[AI] Response keys:`, Object.keys(response));
            console.log(`[AI] Full response object:`, JSON.stringify(response).substring(0, 1000));

            // Try different possible response properties and nested structures
            let content = '';

            // Direct string response
            if (typeof response === 'string') {
                content = response;
            }
            // Check common response property patterns
            else if (response.response) {
                content = typeof response.response === 'string' ? response.response : JSON.stringify(response.response);
            } else if (response.result) {
                content = typeof response.result === 'string' ? response.result : JSON.stringify(response.result);
            } else if (response.output) {
                content = typeof response.output === 'string' ? response.output : JSON.stringify(response.output);
            } else if (response.text) {
                content = response.text;
            } else if (response.generated_text) {
                content = response.generated_text;
            } else if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
                // OpenAI-style response
                content = response.choices[0].message?.content || response.choices[0].text || '';
            } else if (response.data) {
                content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            }

            if (!content) {
                console.warn('[AI] Empty response from AI model');
                console.warn('[AI] Response structure:', JSON.stringify(response, null, 2));
                console.warn('[AI] Available properties:', Object.keys(response).join(', '));
                return [];
            }

            // Log the first 500 chars for debugging
            console.log(`[AI] Response content extracted (first 500 chars): ${content.substring(0, 500)}`);

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
