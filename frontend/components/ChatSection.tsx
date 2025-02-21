'use client';
import React, { useEffect, useState, useRef } from 'react';
import { ChatStore } from '@/lib/chatStore';

export default function ChatSection() {
    const [messages, setMessages] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // ChatStoreを購読
        const chatStore = ChatStore.getInstance();
        const unsubscribe = chatStore.subscribe(setMessages);
        
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        // 新しいメッセージが来たら自動スクロール
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className="bg-gray-800 rounded-lg p-4 h-[300px] overflow-y-auto">
            <div className="space-y-2">
                {messages.map((message, index) => (
                    <p key={index} className="text-sm text-gray-300">
                        {message}
                    </p>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
} 