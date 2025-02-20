'use client';

import AudioRecorder from '@/components/AudioRecorder';
import ChatSection from '@/components/layout/ChatSection';
import { useState, useEffect } from 'react';
import WebSocketManager from '@/lib/websocket';
import { WebSocketMessage, Comment } from '@/lib/types';

export default function Home() {
  const [comments, setComments] = useState<Comment[]>([]);
  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    console.log('Setting up WebSocket handler');
    const handleMessage = (data: WebSocketMessage) => {
      console.log('Received WebSocket message in page:', data);

      // メッセージタイプとテキストの存在チェック
      if (data.type === 'message' && data.text) {
        const newComment: Comment = {
          id: Date.now(),
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };
        console.log('Adding new comment:', newComment);
        setComments(prev => [...prev, newComment]);
      } else {
        console.log('Invalid message format or error response:', data);
      }
    };

    wsManager.addMessageHandler(handleMessage);
    console.log('WebSocket handler added');

    return () => {
      console.log('Cleaning up WebSocket handler');
      wsManager.removeMessageHandler(handleMessage);
    };
  }, []);

  console.log('Current comments:', comments);  // コメントの状態をレンダリング時に確認

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインエリア */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h1 className="text-2xl font-bold mb-4">AI Stream Companion</h1>
              <div className="relative">
                <AudioRecorder />
              </div>
            </div>
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
