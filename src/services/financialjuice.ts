import { XMLParser } from 'fast-xml-parser';
import { NewsItem } from '../types';

export class FinancialJuiceService {
    private parser: XMLParser;
    private readonly FEED_URL = 'https://www.financialjuice.com/feed.ashx?xy=rss';

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    async fetchNews(): Promise<NewsItem[]> {
        try {
            console.log(`Fetching FinancialJuice RSS from ${this.FEED_URL}`);
            const response = await fetch(this.FEED_URL, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)' }
            });
            if (!response.ok) {
                console.error(`Failed to fetch FinancialJuice RSS: ${response.status} ${response.statusText}`);
                return [];
            }
            const xmlText = await response.text();

            if (xmlText.length < 500) {
                console.warn(`FinancialJuice RSS Response too short: ${xmlText}`);
            }
            const feed = this.parser.parse(xmlText);

            // FinancialJuice RSS structure is standard <rss><channel><item>...
            let items: any[] = [];
            if (feed.rss && feed.rss.channel && feed.rss.channel.item) {
                items = Array.isArray(feed.rss.channel.item)
                    ? feed.rss.channel.item
                    : [feed.rss.channel.item];
            } else {
                console.warn('Unexpected FinancialJuice RSS structure', JSON.stringify(feed));
            }

            return items.map((item: any) => ({
                id: item.guid || item.link || item.title || 'unknown',
                title: item.title || 'No Title',
                link: item.link || '',
                pubDate: item.pubDate || new Date().toISOString(),
                source: 'FinancialJuice' as const,
                content: item.description || ''
            })).slice(0, 50); // Fetch up to 50 items
        } catch (error) {
            console.error('Error fetching FinancialJuice RSS:', error);
            return [];
        }
    }
}
