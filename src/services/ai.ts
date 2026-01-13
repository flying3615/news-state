import { Env, NewsItem } from '../types';

export class AiService {
    private ai: any;

    constructor(env: Env) {
        this.ai = env.AI;
    }

    async summarizeNews(newsItems: NewsItem[]): Promise<string> {
        if (newsItems.length === 0) return '';

        const prompt = `
You remain a helpful assistant.
I will provide you with a list of market news items.
Your task is to:
1. Select the top 5-10 most impactful news items.
2. Summarize each item in **Simplified Chinese** (简体中文).
3. **Output MUST be in Chinese**. Do not output English.
4. Format the output as a bulleted list (• item).

News Items:
${newsItems.map(item => `- ${item.title} (${item.pubDate}): ${item.content || ''}`).join('\n')}

Output:
`;

        try {
            const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
                messages: [{ role: 'user', content: prompt }],
            });

            return response.response || 'No summary generated.';
        } catch (error) {
            console.error('AI Processing Error:', error);
            return 'Failed to generate summary.';
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
            const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
                messages: [{ role: 'user', content: prompt }],
            });
            return response.response || '';
        } catch (e) {
            console.error("AI Error Congress:", e);
            return "Failed to analyze congress trades.";
        }
    }
}
