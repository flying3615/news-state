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

    async fetchNews(retries: number = 2): Promise<NewsItem[]> {
        try {
            for (let i = 0; i <= retries; i++) {
                console.log(`Fetching RSS from ${this.FEED_URL} (Attempt ${i + 1})`);
                const response = await fetch(this.FEED_URL, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (response.status === 429 && i < retries) {
                    console.warn(`Investing.com rate limit hit, retrying in 5s...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                if (!response.ok) {
                    console.error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
                    return [];
                }
                const xmlText = await response.text();

                const feed = this.parser.parse(xmlText);

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
                    id: item.guid?.['#text'] || item.guid || item.link || item.title || 'unknown',
                    title: item.title || 'No Title',
                    link: item.link || '',
                    pubDate: item.pubDate || item.updated || new Date().toISOString(),
                    source: 'RSS' as const,
                    content: item.description || item.contentSnippet || item.content || ''
                })).slice(0, 30);
            }
            return [];
        } catch (error) {
            console.error('Error fetching RSS:', error);
            return [];
        }
    }
}
