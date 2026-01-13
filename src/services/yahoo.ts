import yahooFinance from 'yahoo-finance2';

export class YahooService {
    constructor() {
        // Suppress console "notices" from yahoo-finance2 (optional)
        yahooFinance.suppressNotices(['yahooSurvey']);
    }

    async getCurrentPrice(symbol: string): Promise<number | null> {
        try {
            if (!symbol) return null;
            console.log(`Fetching price for ${symbol}...`);
            const quote = await yahooFinance.quote(symbol);
            return quote.regularMarketPrice || null;
        } catch (error) {
            console.error(`Yahoo Finance Error for ${symbol}:`, error);
            return null;
        }
    }
}
