// Global type declarations for Cloudflare Workers
/// <reference types="@cloudflare/workers-types" />

// WebWorker global types
interface Console {
    log(...data: any[]): void;
    warn(...data: any[]): void;
    error(...data: any[]): void;
    info(...data: any[]): void;
    debug(...data: any[]): void;
}

declare const console: Console;
declare function setTimeout(callback: () => void, ms: number): number;

// Cloudflare Workers types (these should come from @cloudflare/workers-types)
declare global {
    interface ExecutionContext {
        waitUntil(promise: Promise<any>): void;
        passThroughOnException(): void;
    }

    interface ScheduledEvent {
        cron: string;
        scheduledTime: number;
        noRetry(): void;
    }
}

