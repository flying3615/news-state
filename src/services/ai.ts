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

            const response = await this.ai.run(model, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: maxTokens
            });

            let content = response.response || '';

            // Clean up common AI artifacts
            content = content.trim();

            // Try to extract JSON from markdown or text
            const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const targetJson = jsonMatch ? jsonMatch[0] : content;

            try {
                return JSON.parse(targetJson);
            } catch (e) {
                console.warn("AI returned non-JSON or invalid JSON:", content);
                return [];
            }

        } catch (error) {
            console.error('AI Processing Error:', error);
            return [];
        }
    }

    async analyzeCongressTrades(trades: any[]): Promise<string> {
        if (trades.length === 0) return '';

        const tradeContext = trades.map(t => {
            let str = `- ${t.owner} ${t.transactionType} ${t.symbol} on ${t.transactionDate}. Amount: ${t.amount}. `;
            if (t.price) str += `Price @ Tx: $${t.price}. `;
            if (t.currentPrice) str += `Current Price: $${t.currentPrice}.`;
            return str;
        }).join('\n');

        const systemPrompt = "You are an expert on US Congressional trading activity. Summarize trends clearly in Chinese.";
        const userPrompt = `
I have a list of recent stock trades by US Congress members.
Identify any significant or unusual trading activity (Buying/Selling).
Summarize in Chinese.
For each trade, mention the Transaction Price vs Current Price if available to show if they are currently profitable.

Trades:
${tradeContext}

Output:
`;
        try {
            const model = this.env.AI_TEXT_MODEL || '@cf/meta/llama-3.1-70b-instruct';
            const maxTokens = Math.floor((parseInt(this.env.AI_MAX_TOKENS) || 2048) / 2);

            const response = await this.ai.run(model, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: maxTokens
            });
            return response.response || '';
        } catch (e) {
            console.error("AI Error Congress:", e);
            return "Failed to analyze congress trades.";
        }
    }
}
