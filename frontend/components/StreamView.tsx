'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

type Message = {
    type: 'message' | 'error';
    text?: string;
    error?: {
        type: string;
        message: string;
    };
};

export default function StreamView() {
    const [messages, setMessages] = useState<Message[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        wsRef.current = new WebSocket('ws://localhost:8000/ws');
        
        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);

            // エラーメッセージは5秒後に消去
            if (data.type === 'error') {
                setTimeout(() => {
                    setMessages(prev => prev.filter(msg => msg !== data));
                }, 5000);
            }
        };

        wsRef.current.onerror = () => {
            setMessages(prev => [...prev, {
                type: 'error',
                error: {
                    type: 'connection_error',
                    message: 'WebSocket接続エラー'
                }
            }]);
        };

        return () => {
            wsRef.current?.close();
        };
    }, []);

    return (
        <div className="relative w-full h-screen">
            <div className="absolute inset-0 pointer-events-none">
                {messages.map((message, index) => (
                    message.type === 'error' ? (
                        <Card 
                            key={index}
                            className="bg-destructive text-destructive-foreground p-2 m-2 inline-flex items-center gap-2"
                        >
                            <AlertCircle className="h-4 w-4" />
                            {message.error?.message}
                        </Card>
                    ) : (
                        <Card 
                            key={index}
                            className="animate-slide-left bg-card text-card-foreground bg-opacity-80 p-2 m-2 inline-block"
                        >
                            {message.text}
                        </Card>
                    )
                ))}
            </div>
        </div>
    );
} 