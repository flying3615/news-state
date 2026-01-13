import { XMLParser } from 'fast-xml-parser';
import { NewsItem } from '../types';

export class RssService {
    private parser: XMLParser;
    private readonly FEED_URL = 'https://www.investing.com/rss/news.rss';

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    async fetchNews(): Promise<NewsItem[]> {
        try {
            console.log(`Fetching RSS from ${this.FEED_URL}`);
            const response = await fetch(this.FEED_URL, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)' }
            });
            if (!response.ok) {
                console.error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
                return [];
            }
            const xmlText = await response.text();
            console.log(`RSS Fetched. Length: ${xmlText.length}`);
            if (xmlText.length < 500) {
                console.warn(`RSS Response too short: ${xmlText}`);
            }
            const feed = this.parser.parse(xmlText);

            // Handle different RSS versions (rss.channel.item or feed.entry)
            let items: any[] = [];
            if (feed.rss && feed.rss.channel && feed.rss.channel.item) {
                items = Array.isArray(feed.rss.channel.item)
                    ? feed.rss.channel.item
                    : [feed.rss.channel.item];
            } else if (feed.feed && feed.feed.entry) {
                items = Array.isArray(feed.feed.entry)
                    ? feed.feed.entry
                    : [feed.feed.entry];
            }

            return items.map((item: any) => ({
                id: item.guid || item.link || item.title || 'unknown',
                title: item.title || 'No Title',
                link: item.link || '',
                pubDate: item.pubDate || item.updated || new Date().toISOString(),
                source: 'RSS' as const,
                content: item.description || item.contentSnippet || item.content || ''
            })).slice(0, 30);
        } catch (error) {
            console.error('Error fetching RSS:', error);
            return [];
        }
    }
}
