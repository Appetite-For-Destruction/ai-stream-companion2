export type WebSocketMessage = {
    type: 'message' | 'error';
    text?: string;
    error?: {
        type: string;
        message: string;
    };
};

export type Comment = {
  id: number;
  text: string;
  timestamp: string;
}; 