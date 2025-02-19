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
    const chunksRef = useRef<BlobPart[]>([]);
    const lastProcessTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        // WebSocket接続の初期化
        wsRef.current = new WebSocket('ws://localhost:8000/ws');
        
        wsRef.current.onopen = () => {
            console.log('WebSocket connected');
            setError(null);
        };

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);

                if (data.type === 'error') {
                    const errorMessage = data.error?.message || 'エラーが発生しました';
                    console.error('Server error:', data.error);
                    setError(errorMessage);
                    setTimeout(() => setError(null), 5000);
                } else if (data.type === 'message') {
                    console.log('AI response:', data.text);
                    setError(null);
                }
            } catch (err) {
                console.error('Message parsing error:', err);
                setError('メッセージの処理中にエラーが発生しました');
            }
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('サーバーとの接続に失敗しました');
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const processChunks = async (isLastChunk: boolean = false) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && chunksRef.current.length > 0) {
            try {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
                if (blob.size < 1000) {
                    console.log('Skipping small audio chunk');
                    return;
                }
                console.log(`Sending ${isLastChunk ? 'final' : ''} audio chunk, size:`, blob.size);
                wsRef.current.send(blob);
                chunksRef.current = [];
                lastProcessTimeRef.current = Date.now();
            } catch (err) {
                console.error('Error sending audio data:', err);
                setError('音声データの送信に失敗しました');
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // 録音開始時にリセット
            chunksRef.current = [];
            lastProcessTimeRef.current = Date.now();

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    const currentTime = Date.now();
                    
                    if (currentTime - lastProcessTimeRef.current >= 5000) {
                        await processChunks();
                    }
                }
            };

            mediaRecorder.onstop = async () => {
                await processChunks(true);
                stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
                chunksRef.current = [];
            };

            mediaRecorder.start(1000);
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