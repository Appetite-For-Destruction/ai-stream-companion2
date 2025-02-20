import { MessageSquare } from 'lucide-react';
import { Comment } from '@/lib/types';
import { useEffect, useRef } from 'react';

// ランダムな名前を生成する関数
const generateRandomName = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const randomString = Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)])
    .join('') + Array.from({ length: 3 }, () => numbers[Math.floor(Math.random() * numbers.length)])
    .join('');
  return randomString;
};

// ランダムな色を生成する関数
const generateRandomColor = () => {
  const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `#${randomHex}`;
};

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
        <div className="text-sm text-gray-400">{comments.length} messages</div>
      </div>

      <div className="h-[calc(100%-4rem)] overflow-y-auto space-y-4 pr-2">
        {comments.map((comment) => {
          // ランダムな名前を生成
          const randomName = generateRandomName();
          // ランダムな色を生成
          const randomColor = generateRandomColor();

          return (
            <div key={comment.id} className="flex items-start space-x-2 hover:bg-gray-700/50 p-2 rounded">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: randomColor }}
              >
                {randomName[0].toUpperCase()}
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{randomName}</span>
                  <span className="text-xs text-gray-400">{comment.timestamp}</span>
                </div>
                <p className="text-sm mt-1">{comment.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
