from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .services.audio_service import AudioService
import tempfile
import logging

app = FastAPI()
audio_service = AudioService()
logger = logging.getLogger(__name__)

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
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_bytes()
            
            with tempfile.NamedTemporaryFile(suffix=".webm") as temp_file:
                temp_file.write(data)
                temp_file.seek(0)
                
                # 音声認識とレスポンス生成
                result = await audio_service.transcribe_audio(temp_file)
                
                if result["success"]:
                    await websocket.send_json({
                        "type": "message",
                        "text": result["text"]
                    })
                else:
                    logger.error(f"Processing error: {result['error']}")
                    await websocket.send_json({
                        "type": "error",
                        "error": result["error"]
                    })

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "error": {"type": "system_error", "message": "サーバーエラーが発生しました"}
        })
        await manager.disconnect(websocket) 