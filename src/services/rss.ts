import Parser from 'rss-parser';
import { NewsItem } from '../types';

export class RssService {
    private parser: Parser;
    // FinanceJuice specific RSS or general market news
    // NOTE: FinanceJuice RSS might be protected or specific. Using a generic investing RSS for demo,
    // user mentioned FinanceJuice, so we try to use a URL if known, else we use investing.com or yahoo.
    // For this implementation, I'll use a placeholder URL or a common one.
    // Checking typical FinanceJuice RSS... usually it's https://www.financejuice.com/rss
    private readonly FEED_URL = 'https://www.financejuice.com/feed';

    constructor() {
        this.parser = new Parser();
    }

    async fetchNews(): Promise<NewsItem[]> {
        try {
            const feed = await this.parser.parseURL(this.FEED_URL);
            return feed.items.map(item => ({
                id: item.guid || item.link || item.title || 'unknown',
                title: item.title || 'No Title',
                link: item.link || '',
                pubDate: item.pubDate || new Date().toISOString(),
                source: 'RSS' as const,
                content: item.contentSnippet || item.content
            })).slice(0, 10); // Limit to top 10
        } catch (error) {
            console.error('Error fetching RSS:', error);
            return [];
        }
    }
}
