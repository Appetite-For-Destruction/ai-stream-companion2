export type WebSocketMessage = {
    type: 'message' | 'error' | 'screen_analysis';
    text?: string;
    error?: {
        type: string;
        message: string;
    };
    data?: {
        success: boolean;
        text: string;
        error: {
            type: string;
            message: string;
        } | null;
    };
};

export type Comment = {
  id: number;
  text: string;
  timestamp: string;
}; 