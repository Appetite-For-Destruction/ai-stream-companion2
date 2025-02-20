import { Video } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          <div className="flex items-center space-x-2">
            <Video className="text-red-500" size={24} />
            <span className="font-bold text-lg">AI Stream Companion</span>
          </div>
        </div>
      </div>
    </nav>
  );
} 