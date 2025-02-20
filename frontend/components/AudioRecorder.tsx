'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import WebSocketManager from '@/lib/websocket';
import { WebSocketMessage } from '@/lib/types';

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const lastProcessTimeRef = useRef<number>(Date.now());
    const wsManager = WebSocketManager.getInstance();

    useEffect(() => {
        const handleMessage = (data: WebSocketMessage) => {
            if (data.type === 'error') {
                const errorMessage = data.error?.message || 'エラーが発生しました';
                setError(errorMessage);
                setTimeout(() => setError(null), 5000);
            }
        };

        wsManager.addMessageHandler(handleMessage);

        return () => {
            wsManager.removeMessageHandler(handleMessage);
        };
    }, []);

    const processChunks = async (isLastChunk: boolean = false) => {
        if (chunksRef.current.length > 0) {
            try {
                const blob = new Blob(chunksRef.current, { 
                    type: mediaRecorderRef.current?.mimeType || 'audio/webm'  // 実際のmimeTypeを使用
                });
                if (blob.size < 5000) {
                    console.log('Skipping small audio chunk');
                    return;
                }
                console.log(`Sending ${isLastChunk ? 'final' : ''} audio chunk, size:`, blob.size);
                wsManager.sendMessage(blob);
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
                mimeType: 'audio/webm',
                audioBitsPerSecond: 128000,
                bitsPerSecond: 128000
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    const currentTime = Date.now();
                    
                    if (currentTime - lastProcessTimeRef.current >= 10000) {
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

            mediaRecorder.start(500);
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