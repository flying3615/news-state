import { Env } from './types';
import { RssService } from './services/rss';
import { FinnhubService } from './services/finnhub';
import { AiService } from './services/ai';
import { TelegramService } from './services/telegram';
import { YahooService } from './services/yahoo';

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('Cron trigger detected');
        await processMarketNews(env, false);
    },

    // Optional: HTTP handler for manual triggering
    // Use /trigger?force=true to ignore deduplication and re-process current feed/trades due to testing.
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname.includes('/trigger')) {
            // Check for force param
            const force = url.searchParams.get('force') === 'true';
            await processMarketNews(env, force);
            return new Response(`Triggered manually (Force: ${force})`);
        }
        return new Response('Market News Bot is running. Use /trigger to force run.');
    }
};

async function processMarketNews(env: Env, force: boolean) {
    const rssService = new RssService();
    const finnhubService = new FinnhubService(env);
    const aiService = new AiService(env);
    const telegramService = new TelegramService(env);
    const yahooService = new YahooService();

    // 1. Fetch Data
    console.log(`Starting data fetch (Force: ${force})...`);
    const marketNews = await rssService.fetchNews();
    console.log(`Fetched ${marketNews.length} market news items.`);

    const congressTrades = await finnhubService.fetchCongressTrades();
    console.log(`Fetched ${congressTrades.length} congress trades.`);

    // 2. Filter New Items (Simple deduplication via KV)
    const newMarketNews = [];
    for (const item of marketNews) {
        const seen = await env.NEWS_STATE.get(`seen_news:${item.id}`);
        if (!seen || force) {
            newMarketNews.push(item);
            // Expire after 24h
            if (!force) await env.NEWS_STATE.put(`seen_news:${item.id}`, '1', { expirationTtl: 86400 });
        }
    }

    // Simplistic dedupe for congress trades
    const newCongressTrades = [];
    for (const trade of congressTrades) {
        const id = `${trade.symbol}-${trade.transactionDate}-${trade.owner}-${trade.amount}`;
        const seen = await env.NEWS_STATE.get(`seen_trade:${id}`);
        if (!seen || force) {
            // Enrich with current price from Yahoo Finance
            const currentPrice = await yahooService.getCurrentPrice(trade.symbol);
            if (currentPrice) {
                (trade as any).currentPrice = currentPrice;
            }
            newCongressTrades.push(trade);
            if (!force) await env.NEWS_STATE.put(`seen_trade:${id}`, '1', { expirationTtl: 86400 * 7 });
        }
    }

    if (newMarketNews.length === 0 && newCongressTrades.length === 0) {
        console.log('No new items to process.');
        return;
    }

    // 3. AI Processing
    let message = '';

    if (newMarketNews.length > 0) {
        const newsSummary = await aiService.summarizeNews(newMarketNews);
        message += `📢 **Market News Update**\n${newsSummary}\n\n`;
    }

    if (newCongressTrades.length > 0) {
        const tradeAnalysis = await aiService.analyzeCongressTrades(newCongressTrades);
        message += `🏛️ **Congress Trading Alert**\n${tradeAnalysis}\n\n`;
    }

    // 4. Send Notification
    if (message) {
        await telegramService.sendMessage(message);
        console.log('Notification sent.');
    }
}
