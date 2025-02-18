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
            # バイナリデータとして音声を受け取る
            data = await websocket.receive_bytes()
            
            # 一時ファイルとして保存
            with tempfile.NamedTemporaryFile(suffix=".webm") as temp_file:
                temp_file.write(data)
                temp_file.seek(0)
                
                # Whisper APIで音声認識
                text = await audio_service.transcribe_audio(temp_file)
                if text:
                    await websocket.send_text(text)
    except WebSocketDisconnect:
        print("クライアントが切断されました") 