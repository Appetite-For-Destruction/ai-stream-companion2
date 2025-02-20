import React, { useEffect, useRef, useState } from 'react';
import AudioRecorder from '../AudioRecorder';

export default function LiveStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamType, setStreamType] = useState<'camera' | 'screen' | 'none'>('none');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [subscribers, setSubscribers] = useState<number>(0); // 固定の購読者数を保持するためのステート

  const startCameraStream = async () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop()); // 既存のストリームを停止
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const startScreenStream = async () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop()); // 既存のストリームを停止
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing screen:', error);
    }
  };

  const stopStreams = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop()); // すべてのトラックを停止
      setMediaStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null; // ビデオをクリア
      }
    }
  };

  useEffect(() => {
    stopStreams(); // コンポーネントがアンマウントされたときにストリームを停止
  }, []);

  useEffect(() => {
    if (streamType === 'camera') {
      startCameraStream();
    } else if (streamType === 'screen') {
      startScreenStream();
    } else {
      stopStreams(); // どちらも使用しない場合
    }
  }, [streamType]);

  useEffect(() => {
    // コンポーネントがマウントされたときにランダムな購読者数を生成
    const randomSubscribers = Math.floor(Math.random() * 1000) + 1;
    setSubscribers(randomSubscribers);
  }, []); // 空の依存配列で一度だけ実行

  return (
    <div>
      <div className="aspect-video bg-gray-800 rounded-lg mb-4 relative">
        <video ref={videoRef} autoPlay className="absolute inset-0 w-full h-full object-cover rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          {streamType === 'none' && <p className="text-gray-400">Audio Stream Active</p>}
        </div>
        <div className="absolute bottom-4 right-4">
          <AudioRecorder />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🔴 Live: AI Stream Session</h1>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            S
          </div>
          <div>
            <p className="font-semibold">Streamer</p>
            <p className="text-sm text-gray-400">Subscribe: {subscribers}</p>
          </div>
          <button onClick={() => setStreamType('camera')} className="bg-blue-500 text-white px-4 py-2 rounded">カメラ</button>
          <button onClick={() => setStreamType('screen')} className="bg-green-500 text-white px-4 py-2 rounded">画面共有</button>
        </div>
      </div>
    </div>
  );
}
