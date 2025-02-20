import { MessageSquare } from 'lucide-react';
import { Comment } from '@/lib/types';
import { useEffect, useRef } from 'react';

interface ChatSectionProps {
  comments: Comment[];
}

export default function ChatSection({ comments }: ChatSectionProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 新しいコメントが追加されたら自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} />
          <h2 className="text-lg font-semibold">AI Comments</h2>
        </div>
        <div className="text-sm text-gray-400">
          {comments.length} messages
        </div>
      </div>

      <div className="h-[calc(100%-4rem)] overflow-y-auto space-y-4 pr-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-2 hover:bg-gray-700/50 p-2 rounded">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
              AI
            </div>
            <div>
              <span className="text-xs text-gray-400">{comment.timestamp}</span>
              <p className="text-sm mt-1">{comment.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
} 