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
1. Filter for the most impactful news regarding financial markets.
2. Summarize the key points in Chinese.
3. Be concise and professional.
4. Format the output as a bulleted list.

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

        const prompt = `
I have a list of recent stock trades by US Congress members.
Identify any significant or unusual trading activity (Buying/Selling).
Summarize in Chinese.

Trades:
${JSON.stringify(trades, null, 2)}

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
