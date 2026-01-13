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

        // Fetch in parallel
        await Promise.all(this.WATCHLIST.map(async (symbol) => {
            try {
                const response = await fetch(`${this.BASE_URL}/stock/congress-trading?symbol=${symbol}&token=${this.apiKey}`);
                if (!response.ok) {
                    console.error(`Finnhub API Error for ${symbol}: ${response.status} ${response.statusText}`);
                    const text = await response.text();
                    console.error(`Response body: ${text.substring(0, 200)}`);
                    return;
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
            } catch (err) {
                console.error(`Failed to fetch congress data for ${symbol}`, err);
            }
        }));

        return allTrades;
    }
}
