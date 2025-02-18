import AudioRecorder from '@/components/AudioRecorder';
import StreamView from '@/components/StreamView';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">AI Stream Companion</h1>
        <StreamView />
        <AudioRecorder />
      </div>
    </main>
  );
}
