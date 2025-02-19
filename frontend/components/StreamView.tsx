'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

type Message = {
    type: 'message' | 'error';
    text: string;  // messageタイプの場合は必須
    error?: {      // errorタイプの場合は必須
        type: string;
        message: string;
    };
};

// メッセージ作成用のヘルパー関数
const createMessage = (data: any): Message => {
    if (data.type === 'message') {
        return {
            type: 'message',
            text: data.text,
            error: undefined
        };
    } else {
        return {
            type: 'error',
            text: '',
            error: data.error
        };
    }
};

export default function StreamView() {
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        wsRef.current = new WebSocket('ws://localhost:8000/ws');
        
        wsRef.current.onopen = () => {
            console.log('WebSocket connection established');
        };
        
        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);

                const newMessage = createMessage(data);
                setMessages(prev => [...prev, newMessage]);

                // 自動スクロール
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);

                // エラーメッセージの自動削除
                if (newMessage.type === 'error') {
                    setTimeout(() => {
                        setMessages(prev => prev.filter(msg => msg !== newMessage));
                    }, 5000);
                }
            } catch (err) {
                console.error('Message parsing error:', err);
            }
        };

        return () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <div className="relative w-full h-[calc(100vh-8rem)] overflow-y-auto bg-background/50">
            <div className="flex flex-col items-start p-4 space-y-2">
                {messages.map((message, index) => (
                    <div key={index} className="w-full flex justify-start">
                        {message.type === 'error' ? (
                            <Card className="bg-destructive text-destructive-foreground p-2 inline-flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {message.error?.message}
                            </Card>
                        ) : (
                            <Card className="animate-slide-left bg-card/80 text-card-foreground p-2 shadow-md max-w-[80%]">
                                {message.text}
                            </Card>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
} 