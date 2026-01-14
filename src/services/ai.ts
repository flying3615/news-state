import { Env, NewsItem } from '../types';

export class AiService {
    private ai: any;

    constructor(env: Env) {
        this.ai = env.AI;
    }

    async summarizeNews(newsItems: NewsItem[]): Promise<any[]> {
        if (newsItems.length === 0) return [];

        const prompt = `
You remain a helpful assistant.
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
            const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
                messages: [{ role: 'user', content: prompt }],
            });

            const content = response.response || '';
            // Try to parse JSON from the response. Llama 3 often wraps code in markdown blocks.
            const jsonMatch = content.match(/\[.*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback: try parsing the whole string if no markdown block found
            try {
                return JSON.parse(content);
            } catch (e) {
                console.warn("AI returned non-JSON:", content);
                return [];
            }

        } catch (error) {
            console.error('AI Processing Error:', error);
            return [];
        }
    }

    async analyzeCongressTrades(trades: any[]): Promise<string> {
        if (trades.length === 0) return '';

        // Format trades for AI context
        const tradeContext = trades.map(t => {
            let str = `- ${t.owner} ${t.transactionType} ${t.symbol} on ${t.transactionDate}. Amount: ${t.amount}. `;
            if (t.price) str += `Price @ Tx: $${t.price}. `;
            if (t.currentPrice) str += `Current Price: $${t.currentPrice}.`;
            return str;
        }).join('\n');

        const prompt = `
I have a list of recent stock trades by US Congress members.
Identify any significant or unusual trading activity (Buying/Selling).
Summarize in Chinese.
For each trade, mention the Transaction Price vs Current Price if available to show if they are currently profitable.

Trades:
${tradeContext}

Output:
`;
        try {
            const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
                messages: [{ role: 'user', content: prompt }],
            });
            return response.response || '';
        } catch (e) {
            console.error("AI Error Congress:", e);
            return "Failed to analyze congress trades.";
        }
    }
}
