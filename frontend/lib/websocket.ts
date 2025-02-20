type MessageHandler = (message: any) => void;

class WebSocketManager {
    private static instance: WebSocketManager;
    private ws: WebSocket | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();

    private constructor() {
        this.connect();
    }

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    private connect() {
        this.ws = new WebSocket('ws://localhost:8000/ws');
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.messageHandlers.forEach(handler => handler(data));
            } catch (err) {
                console.error('Message parsing error:', err);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // 再接続ロジックを追加することも可能
        };
    }

    addMessageHandler(handler: MessageHandler) {
        this.messageHandlers.add(handler);
    }

    removeMessageHandler(handler: MessageHandler) {
        this.messageHandlers.delete(handler);
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

export default WebSocketManager; 