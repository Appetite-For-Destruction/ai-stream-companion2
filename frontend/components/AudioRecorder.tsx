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

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
                audioBitsPerSecond: 128000
            });
            mediaRecorderRef.current = mediaRecorder;

            // 全ての音声データを一つのチャンクとして扱う
            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    console.log('Chunk size:', event.data.size, 'MIME type:', event.data.type);
                    // チャンクを蓄積するだけ
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    if (chunksRef.current.length > 0) {
                        const blob = new Blob(chunksRef.current, { 
                            type: 'audio/webm'
                        });
                        console.log('Final blob size:', blob.size);
                        if (blob.size < 1000) {
                            throw new Error('録音データが小さすぎます');
                        }
                        wsManager.sendMessage(blob);
                    }
                } catch (err) {
                    console.error('録音データの処理に失敗しました:', err);
                    setError(err instanceof Error ? err.message : '録音データの処理に失敗しました');
                } finally {
                    stream.getTracks().forEach(track => track.stop());
                    mediaRecorderRef.current = null;
                    chunksRef.current = [];
                }
            };

            // より短い間隔で録音を区切る
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