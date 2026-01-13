import { Env, CongressTrade } from '../types';

export class FinnhubService {
    private apiKey: string;
    private readonly BASE_URL = 'https://finnhub.io/api/v1';

    constructor(env: Env) {
        this.apiKey = env.FINNHUB_API_KEY;
    }

    // Finnhub Free tier requires 'symbol' for congress-trading.
    // We will monitor a watchlist of popular stocks.
    private readonly WATCHLIST = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'AMZN', 'GOOGL', 'META'];

    async fetchCongressTrades(): Promise<CongressTrade[]> {
        if (!this.apiKey) {
            console.warn('Finnhub API Key missing');
            return [];
        }

        const allTrades: CongressTrade[] = [];
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const dateStr = oneMonthAgo.toISOString().split('T')[0]; // YYYY-MM-DD

        // Fetch sequentially to avoid rate limits (429)
        for (const symbol of this.WATCHLIST) {
            try {
                const response = await fetch(`${this.BASE_URL}/stock/congress-trading?symbol=${symbol}&token=${this.apiKey}`);

                if (response.status === 429) {
                    console.warn(`Rate limit hit for ${symbol}, waiting 2s...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Simple retry logic could go here, but for now we skip
                    continue;
                }

                if (!response.ok) {
                    console.error(`Finnhub API Error for ${symbol}: ${response.status} ${response.statusText}`);
                    continue;
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.warn(`Unexpected content-type for ${symbol}: ${contentType}. Likely API issue/redirect.`);
                    continue;
                }

                const data: any = await response.json();
                // data matches: { symbol: string, data: [ { name, ... } ] }

                if (data && data.data) {
                    const recentTrades = data.data.filter((t: any) => t.transactionDate >= dateStr);
                    recentTrades.forEach((t: any) => {
                        allTrades.push({
                            symbol: data.symbol,
                            transactionDate: t.transactionDate,
                            owner: t.owner,
                            transactionType: t.transactionType,
                            amount: t.amount,
                            price: t.price
                        });
                    });
                }

                // Add a small delay between successful requests
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay

            } catch (err) {
                console.error(`Failed to fetch congress data for ${symbol}`, err);
            }
        }

        return allTrades;
    }
}
