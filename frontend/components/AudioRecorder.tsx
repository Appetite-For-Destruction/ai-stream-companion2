'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        wsRef.current = new WebSocket('ws://localhost:8000/ws');
        return () => {
            wsRef.current?.close();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && wsRef.current) {
                    wsRef.current.send(event.data);
                }
            };

            mediaRecorder.start(1000); // 1秒ごとにデータを送信
            setIsRecording(true);
        } catch (err) {
            console.error('音声の取得に失敗しました:', err);
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    return (
        <div className="fixed bottom-4 right-4">
            <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
            >
                {isRecording ? "録音停止" : "録音開始"}
            </Button>
        </div>
    );
}