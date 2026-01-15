export interface Env {
    AI: any;
    NEWS_STATE: KVNamespace;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
    AI_TEXT_MODEL: string;
    AI_MAX_TOKENS: string;
}

export interface NewsItem {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    source: 'RSS' | 'Congress' | 'General' | 'FinancialJuice';
    content?: string;
}
