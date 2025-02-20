import { MessageSquare } from 'lucide-react';
import { Comment } from '@/lib/types';

interface ChatSectionProps {
  comments: Comment[];
}

export default function ChatSection({ comments }: ChatSectionProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 min-h-[400px]">
      {/* ヘッダー */}
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare size={20} />
        <h2 className="text-lg font-semibold">AI Comments ({comments.length})</h2>
      </div>

      {/* デバッグ表示 */}
      <div className="text-xs text-gray-400 mb-2">
        Comments count: {comments.length}
      </div>

      {/* コメント表示エリア */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
        {comments.length === 0 ? (
          <div className="text-gray-500 text-center">No comments yet</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                AI
              </div>
              <div>
                <span className="text-xs text-gray-400">{comment.timestamp}</span>
                <p className="text-sm">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 