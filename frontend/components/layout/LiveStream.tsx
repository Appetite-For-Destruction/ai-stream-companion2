'use client';
import React, { useEffect, useRef, useState } from 'react';
import AudioRecorder from '../AudioRecorder';
import WebSocketManager from '@/lib/websocket';

export default function LiveStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamType, setStreamType] = useState<'camera' | 'screen' | 'none'>('none');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [subscribers, setSubscribers] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<{
    type: string;
    text: string;
    success: boolean;
    error?: { message: string };
  } | null>(null);
  const wsManager = WebSocketManager.getInstance();

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
        // 画面キャプチャの定期送信を開始
        startScreenCapture(stream);
      }
    } catch (error) {
      console.error('Error accessing screen:', error);
    }
  };

  const startScreenCapture = (stream: MediaStream) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    let intervalId: NodeJS.Timeout;

    intervalId = setInterval(() => {
      if (video && ctx) {
        // キャプチャサイズを制限して転送データを削減
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            wsManager.sendMessage(blob);
          }
        }, 'image/png', 0.8);  // 品質を80%に設定
      }
    }, 2000); // 2秒ごとにキャプチャ

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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
    const randomSubscribers = Math.floor(Math.random() * 1000) + 1;
    setSubscribers(randomSubscribers);
  }, []);

  useEffect(() => {
    const handleMessage = (data: any) => {
      if (data.type === 'screen_analysis') {
        setAnalysisResult(data.data);
      }
    };
    
    wsManager.addMessageHandler(handleMessage);
    return () => wsManager.removeMessageHandler(handleMessage);
  }, []);

  return (
    <div>
      <div className="aspect-video bg-gray-800 rounded-lg mb-4 relative">
        {streamType !== 'none' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-lg"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {streamType === 'none' && <p className="text-gray-400">Audio Stream Active</p>}
        </div>
        <div className="absolute bottom-4 right-4">
          <AudioRecorder />
        </div>
      </div>

      {streamType === 'screen' && analysisResult && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">画面解析結果</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>ステータス: {analysisResult.success ? '成功' : 'エラー'}</p>
            {analysisResult.error && (
              <p className="text-red-400">
                エラー: {analysisResult.error.message}
              </p>
            )}
          </div>
        </div>
      )}

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
