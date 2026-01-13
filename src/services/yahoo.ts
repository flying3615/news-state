export class YahooService {
    private readonly BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

    async getCurrentPrice(symbol: string): Promise<number | null> {
        try {
            if (!symbol) return null;
            console.log(`Fetching price for ${symbol} via direct API...`);

            const response = await fetch(`${this.BASE_URL}/${symbol}?interval=1d&range=1d`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                console.error(`Yahoo API Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const data: any = await response.json();
            const result = data.chart?.result?.[0];

            if (result && result.meta && result.meta.regularMarketPrice) {
                return result.meta.regularMarketPrice;
            }

            return null;
        } catch (error) {
            console.error(`Yahoo Finance Error for ${symbol}:`, error);
            return null;
        }
    }
}
