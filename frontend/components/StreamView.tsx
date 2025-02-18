'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

export default function StreamView() {
    const [messages, setMessages] = useState<string[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        wsRef.current = new WebSocket('ws://localhost:8000/ws');
        
        wsRef.current.onmessage = (event) => {
            setMessages(prev => [...prev, event.data]);
        };

        return () => {
            wsRef.current?.close();
        };
    }, []);

    return (
        <div className="relative w-full h-screen">
            <div className="absolute inset-0 pointer-events-none">
                {messages.map((message, index) => (
                    <Card 
                        key={index}
                        className="animate-slide-left bg-opacity-80 p-2 m-2 inline-block"
                    >
                        {message}
                    </Card>
                ))}
            </div>
        </div>
    );
} 