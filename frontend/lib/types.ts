export type WebSocketMessage = {
    type: 'message' | 'error';
    text?: string;
    error?: {
        type: string;
        message: string;
    };
}; 