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
    
            if (typeof event.data === 'string') {
                // 受信データがJSON文字列であるかを判定
                if (event.data.startsWith('{') || event.data.startsWith('[')) {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket parsed message:', data);
    
                    if (data.type === 'message') {
                        // コメントを追加
                        this.chatStore.addMessage(data.text);
                        console.log('Comment added:', data.text); // 追加されたコメントをログに表示
                    } else if (data.type === 'error') {
                        console.error('Error received:', data.error);
                    }
    
                    // 他のハンドラーにも通知
                    this.messageHandlers.forEach(handler => handler(data));
                } else if (event.data === 'ping') {
                    console.log('Received ping message, responding with pong.');
                    this.sendMessage('pong');
                } else {
                    console.warn('Received non-JSON message, ignoring:', event.data);
                }
            } else {
                console.warn('Received non-string message, ignoring:', event.data);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
    
} 