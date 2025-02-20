'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import WebSocketManager from '@/lib/websocket';
import { WebSocketMessage } from '@/lib/types';

export default function StreamView() {
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsManager = WebSocketManager.getInstance();

    useEffect(() => {
        const handleMessage = (data: WebSocketMessage) => {
            console.log('Received message:', data);
            setMessages(prev => [...prev, data]);

            // 自動スクロール
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

            // エラーメッセージの自動削除
            if (data.type === 'error') {
                setTimeout(() => {
                    setMessages(prev => prev.filter(msg => msg !== data));
                }, 5000);
            }
        };

        wsManager.addMessageHandler(handleMessage);

        return () => {
            wsManager.removeMessageHandler(handleMessage);
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