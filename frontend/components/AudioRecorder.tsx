'use client';

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import WebSocketManager from "@/lib/websocket";
import { WebSocketMessage } from "@/lib/types";

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    // refで現在の録音状態を管理（onstop のクロージャの問題を解決）
    const isRecordingRef = useRef(isRecording);
    const wsManager = WebSocketManager.getInstance();
    const CHUNK_INTERVAL = 10000; // 10秒ごと

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    // 指定したストリームから新しい MediaRecorder を生成するヘルパー関数
    const createNewRecorder = (stream: MediaStream): MediaRecorder => {
        const recorder = new MediaRecorder(stream, {
            // 修正: MIME タイプに codecs=opus を指定し、正しい WebM ヘッダーが付与されるようにする
            mimeType: "audio/webm; codecs=opus",
            audioBitsPerSecond: 128000,
        });
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                console.log("Received segment, size:", event.data.size);
                wsManager.sendMessage(event.data);
            }
        };
        recorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            setError("録音中にエラーが発生しました");
        };
        recorder.onstop = () => {
            // 最新の録音状態を isRecordingRef.current で判定する
            if (isRecordingRef.current && stream.active) {
                // 自動再開：新たな recorder を作成して録音開始
                mediaRecorderRef.current = createNewRecorder(stream);
                mediaRecorderRef.current.start();
            } else {
                // 停止ボタンが押されたときは、ストリームも停止
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        return recorder;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            // 新しい MediaRecorder を作成して開始
            const recorder = createNewRecorder(stream);
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setError(null);

            // CHUNK_INTERVAL ごとに recorder.stop() を呼び出してセグメントを確定する
            intervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && isRecordingRef.current) {
                    mediaRecorderRef.current.stop();
                }
            }, CHUNK_INTERVAL);
        } catch (err) {
            console.error("音声の取得に失敗しました:", err);
            setError("マイクへのアクセスに失敗しました");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }
    };

    useEffect(() => {
        const handleMessage = (data: WebSocketMessage) => {
            if (data.type === "error") {
                const errorMessage = data.error?.message || "エラーが発生しました";
                setError(errorMessage);
                setTimeout(() => setError(null), 5000);
            }
        };

        wsManager.addMessageHandler(handleMessage);

        return () => {
            wsManager.removeMessageHandler(handleMessage);
            if (mediaRecorderRef.current && isRecordingRef.current) {
                mediaRecorderRef.current.stop();
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [wsManager]);

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