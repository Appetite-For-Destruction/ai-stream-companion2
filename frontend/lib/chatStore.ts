export class ChatStore {
    private static instance: ChatStore;
    private messages: string[] = [];
    private subscribers: ((messages: string[]) => void)[] = [];

    private constructor() {}

    static getInstance(): ChatStore {
        if (!ChatStore.instance) {
            ChatStore.instance = new ChatStore();
        }
        return ChatStore.instance;
    }

    addMessage(message: string) {
        this.messages.push(message);
        // 最大メッセージ数を制限（例：100件）
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }
        // 購読者に通知
        this.notifySubscribers();
    }

    getMessages(): string[] {
        return [...this.messages];
    }

    subscribe(callback: (messages: string[]) => void) {
        this.subscribers.push(callback);
        // 初回実行
        callback(this.getMessages());
        // クリーンアップ関数を返す
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    private notifySubscribers() {
        const messages = this.getMessages();
        this.subscribers.forEach(callback => callback(messages));
    }

    clear() {
        this.messages = [];
        this.notifySubscribers();
    }
} 