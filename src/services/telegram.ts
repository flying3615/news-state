import { Env } from '../types';

export class TelegramService {
    private token: string;
    private chatId: string;

    constructor(env: Env) {
        this.token = env.TELEGRAM_BOT_TOKEN;
        this.chatId = env.TELEGRAM_CHAT_ID;
    }

    async sendMessage(text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
        if (!this.token || !this.chatId) {
            console.warn('Telegram credentials missing, skipping message');
            return;
        }

        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: this.chatId,
                text: text,
                parse_mode: parseMode,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to send Telegram message:', errorText);
        }
    }
}
