'use client';

import Navbar from '@/components/layout/Navbar';
import LiveStream from '@/components/layout/LiveStream';
import ChatSection from '@/components/layout/ChatSection';
import { useState, useEffect } from 'react';
import WebSocketManager from '@/lib/websocket';
import { WebSocketMessage, Comment } from '@/lib/types';

export default function Home() {
  const [comments, setComments] = useState<Comment[]>([]);
  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    const handleMessage = (data: WebSocketMessage) => {
      if (data.type === 'message' && data.text) {
        const newComment: Comment = {
          id: Date.now(),
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };
        setComments(prev => [...prev, newComment]);
      }
    };

    wsManager.addMessageHandler(handleMessage);

    return () => {
      wsManager.removeMessageHandler(handleMessage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインエリア */}
          <div className="lg:col-span-2">
            <LiveStream />
          </div>
          
          {/* チャットエリア */}
          <div className="lg:col-span-1">
            <ChatSection comments={comments} />
          </div>
        </div>
      </main>
    </div>
  );
}
