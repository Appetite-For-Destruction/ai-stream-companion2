import { WebSocketMessage } from './types';
import { ChatStore } from './chatStore';

export default class WebSocketManager {
    private static instance: WebSocketManager;
    private ws: WebSocket | null = null;
    private messageHandlers: ((data: any) => void)[] = [];
    private chatStore: ChatStore;

    private constructor() {
        this.chatStore = ChatStore.getInstance();
        this.ws = new WebSocket('ws://localhost:8000/ws');
        
        this.ws.onmessage = this.handleMessage;

        this.ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // 再接続ロジックを追加することも可能
        };
    }

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    addMessageHandler(handler: (data: any) => void) {
        this.messageHandlers.push(handler);
    }

    removeMessageHandler(handler: (data: any) => void) {
        this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    }

    public sendMessage(message: string | Blob) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private handleMessage = (event: MessageEvent) => {
        try {
            console.log('WebSocket raw message:', event.data);
            const data = JSON.parse(event.data);
            console.log('WebSocket parsed message:', data);

            // メッセージの種類に応じた処理
            if (data.type === 'message' || data.type === 'screen_analysis') {
                this.chatStore.addMessage(data.text);
            }

            // 他のハンドラーにも通知
            this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
} 