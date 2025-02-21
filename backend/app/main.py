from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .services.audio_service import AudioService
from .services.screen_analyzer import ScreenAnalyzer
import tempfile
import logging

app = FastAPI()
audio_service = AudioService()
screen_analyzer = ScreenAnalyzer()
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
            message = await websocket.receive()
            
            # メッセージタイプに応じて処理を分岐
            if "bytes" in message:
                data = message["bytes"]
                logger.info(f"Received binary data of size: {len(data)} bytes")
                
                # 音声処理（WebMフォーマットチェックは一時的に無効化）
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
                    temp_file.write(data)
                    temp_file.seek(0)
                    
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
            elif "text" in message:
                logger.info(f"Received text message: {message['text']}")
            else:
                logger.error(f"Unexpected message format: {message}")

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