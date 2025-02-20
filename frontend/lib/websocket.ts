export default class WebSocketManager {
    private static instance: WebSocketManager;
    private ws: WebSocket;
    private messageHandlers: ((data: WebSocketMessage) => void)[] = [];

    private constructor() {
        this.ws = new WebSocket('ws://localhost:8000/ws');
        
        this.ws.onmessage = (event) => {
            console.log('WebSocket raw message:', event.data);  // デバッグ用
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket parsed message:', data);  // デバッグ用
                this.messageHandlers.forEach(handler => handler(data));
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

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

    addMessageHandler(handler: (data: WebSocketMessage) => void) {
        this.messageHandlers.push(handler);
    }

    removeMessageHandler(handler: (data: WebSocketMessage) => void) {
        this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    }

    sendMessage(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
} 