from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .services.audio_service import AudioService
import tempfile

app = FastAPI()
audio_service = AudioService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            
            with tempfile.NamedTemporaryFile(suffix=".webm") as temp_file:
                temp_file.write(data)
                temp_file.seek(0)
                
                # 音声認識
                transcription_result = await audio_service.transcribe_audio(temp_file)
                if not transcription_result["success"]:
                    await websocket.send_json({
                        "type": "error",
                        "error": transcription_result["error"]
                    })
                    continue

                # AIによるレスポンス生成
                response_result = await audio_service.generate_response(transcription_result["text"])
                if response_result["success"]:
                    await websocket.send_json({
                        "type": "message",
                        "text": response_result["text"]
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "error": response_result["error"]
                    })

    except WebSocketDisconnect:
        print("クライアントが切断されました")
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")
        await websocket.send_json({
            "type": "error",
            "error": {"type": "system_error", "message": "サーバーエラーが発生しました"}
        })
        await websocket.close() 