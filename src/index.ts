/// <reference path="./global.d.ts" />
import { Env } from './types';
import { RssService } from './services/rss';
import { AiService } from './services/ai';
import { TelegramService } from './services/telegram';
import { YahooService } from './services/yahoo';
import { FinancialJuiceService } from './services/financialjuice';

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
    const aiService = new AiService(env);
    const telegramService = new TelegramService(env);
    const yahooService = new YahooService();
    const financialJuiceService = new FinancialJuiceService();

    // 1. Fetch Data
    console.log(`Starting data fetch (Force: ${force})...`);

    // Test Yahoo Finance if forced
    if (force) {
        const testQuote = await yahooService.getQuote('NVDA');
        console.log(`[DEBUG] Quote for NVDA: ${JSON.stringify(testQuote)}`);
    }

    const marketNews = await rssService.fetchNews();
    const fjNews = await financialJuiceService.fetchNews();
    const allNews = [...marketNews, ...fjNews];
    console.log(`Fetched ${marketNews.length} generic RSS items and ${fjNews.length} FinancialJuice items.`);

    // 2. Filter New Items (Simple deduplication via KV)
    const newMarketNews = [];
    for (const item of allNews) {
        const seen = await env.NEWS_STATE.get(`seen_news:${item.id}`);
        if (!seen || force) {
            newMarketNews.push(item);
            // Expire after 24h
            if (!force) await env.NEWS_STATE.put(`seen_news:${item.id}`, '1', { expirationTtl: 86400 });
        }
    }

    if (newMarketNews.length === 0) {
        console.log('No new items to process.');
        return;
    }

    // 3. AI Processing
    let message = '';

    if (newMarketNews.length > 0) {
        console.log(`[AI] Processing ${newMarketNews.length} news items...`);
        const newsSummaries = await aiService.summarizeNews(newMarketNews);
        console.log(`[AI] Received ${newsSummaries.length} summaries from AI`);

        let formattedNews = '';
        for (const item of newsSummaries) {
            if (!item || !item.summary) {
                console.warn('[AI] Skipping invalid summary item:', item);
                continue;
            }

            let line = `• ${item.summary}`;
            const symbol = item.symbol;

            // Inject Market Data if symbol exists
            if (symbol && symbol !== 'null') {
                console.log(`[MARKET] Fetching quote for symbol: ${symbol}`);
                // Add a small delay to avoid Yahoo rate limits if many symbols found
                await new Promise(resolve => setTimeout(resolve, 1000));

                try {
                    const quote = await yahooService.getQuote(symbol);
                    if (quote) {
                        const icon = quote.changePercent >= 0 ? '🟢' : '🔴';
                        const sign = quote.changePercent >= 0 ? '+' : '';
                        line += ` (${symbol}: $${quote.price}, ${icon} ${sign}${quote.changePercent}%)`;
                        console.log(`[MARKET] ${symbol}: $${quote.price} (${sign}${quote.changePercent}%)`);
                    } else {
                        console.warn(`[MARKET] No quote data returned for ${symbol}`);
                    }
                } catch (error) {
                    console.error(`[MARKET] Error fetching quote for ${symbol}:`, error);
                }
            }
            formattedNews += `${line}\n`;
        }

        if (formattedNews) {
            message += `📢 **Market News Update**\n${formattedNews}\n\n`;
        } else {
            console.warn('[AI] No formatted news generated from summaries');
        }
    }

    // 4. Send Notification
    if (message) {
        await telegramService.sendMessage(message);
        console.log('Notification sent.');
    }
}
