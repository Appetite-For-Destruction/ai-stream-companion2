'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

type WebSocketError = {
    type: string;
    message: string;
};

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // WebSocket接続の初期化
        wsRef.current = new WebSocket('ws://localhost:8000/ws');
        
        wsRef.current.onopen = () => {
            setError(null);
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'error') {
                setError(data.error.message);
                // エラーメッセージを5秒後に消去
                setTimeout(() => setError(null), 5000);
            }
        };

        wsRef.current.onerror = () => {
            setError('サーバーとの接続に失敗しました');
        };

        return () => {
            wsRef.current?.close();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(event.data);
                }
            };

            mediaRecorder.start(1000); // 1秒ごとにデータを送信
            setIsRecording(true);
            setError(null);
        } catch (err) {
            console.error('音声の取得に失敗しました:', err);
            setError('マイクへのアクセスに失敗しました');
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
            {error && (
                <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm">
                    {error}
                </div>
            )}
            <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                size="lg"
            >
                {isRecording ? (
                    <>
                        <MicOff className="mr-2 h-5 w-5" />
                        録音停止
                    </>
                ) : (
                    <>
                        <Mic className="mr-2 h-5 w-5" />
                        録音開始
                    </>
                )}
            </Button>
        </div>
    );
} 