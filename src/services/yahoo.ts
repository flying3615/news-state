export class YahooService {
    private readonly BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

    async getQuote(symbol: string, retries: number = 2): Promise<{ price: number; changePercent: number } | null> {
        try {
            if (!symbol) return null;
            const cleanSymbol = symbol.replace('$', '').trim();

            for (let i = 0; i <= retries; i++) {
                const response = await fetch(`${this.BASE_URL}/${cleanSymbol}?interval=1d&range=1d`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (response.status === 429 && i < retries) {
                    console.warn(`Rate limit hit for ${cleanSymbol}, retrying in 2s... (Attempt ${i + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                if (!response.ok) {
                    console.error(`Yahoo API Error for ${cleanSymbol}: ${response.status} ${response.statusText}`);
                    return null;
                }

                const data: any = await response.json();
                const result = data.chart?.result?.[0];
                const meta = result?.meta;

                if (meta && meta.regularMarketPrice) {
                    const currentPrice = meta.regularMarketPrice;
                    const previousClose = meta.chartPreviousClose || meta.previousClose;

                    let changePercent = 0;
                    if (previousClose) {
                        changePercent = ((currentPrice - previousClose) / previousClose) * 100;
                    }

                    return {
                        price: currentPrice,
                        changePercent: parseFloat(changePercent.toFixed(2))
                    };
                }
                break; // If OK but no data, don't retry
            }

            return null;
        } catch (error) {
            console.error(`Yahoo Finance Error for ${symbol}:`, error);
            return null;
        }
    }
}
