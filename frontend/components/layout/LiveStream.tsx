import AudioRecorder from '../AudioRecorder';

export default function LiveStream() {
  return (
    <div>
      <div className="aspect-video bg-gray-800 rounded-lg mb-4 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">Audio Stream Active</p>
        </div>
        <div className="absolute bottom-4 right-4">
          <AudioRecorder />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🔴 Live: AI Stream Session</h1>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            AI
          </div>
          <div>
            <p className="font-semibold">AI Assistant</p>
            <p className="text-sm text-gray-400">Active Listening</p>
          </div>
        </div>
      </div>
    </div>
  );
} 