from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .services.audio_service import AudioService
from .services.screen_analyzer import ScreenAnalyzer
from .services.camera_analyzer import CameraAnalyzer
import tempfile
import logging
import asyncio

app = FastAPI()
audio_service = AudioService()
screen_analyzer = ScreenAnalyzer()
camera_analyzer = CameraAnalyzer()
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

    async def ping(self, websocket: WebSocket):
        while True:
            try:
                await websocket.send_text("ping")  # Pingメッセージを送信
                await asyncio.sleep(30)  # 30秒ごとにPingを送信
            except Exception as e:
                logger.error(f"Error while sending ping: {str(e)}")
                break

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    # Pingメッセージを送信するタスクを開始
    ping_task = asyncio.create_task(manager.ping(websocket))

    try:
        while True:
            try:
                message = await websocket.receive()

                if "bytes" in message:
                    data = message["bytes"]
                    logger.info(f"Received binary data of size: {len(data)} bytes")
                    
                    # データの先頭バイトをチェックしてタイプを判別
                    if data[:3].startswith(b"\xff\xd8\xff"):  # JPEG format
                        # カメラ映像の解析
                        result = await camera_analyzer.analyze_frame(data)
                        if result["success"]:
                            await websocket.send_json({
                                "type": "message",
                                "text": result["text"]  # ここでコメントを送信
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "error": result["error"]
                            })
                    elif data[:4].startswith(b"\x1a\x45\xdf\xa3"):  # WebM format
                        # 音声処理
                        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
                            temp_file.write(data)
                            temp_file.seek(0)
                            
                            result = await audio_service.transcribe_audio(temp_file)
                            
                            if result["success"]:
                                await websocket.send_json({
                                    "type": "message",
                                    "text": result["text"]  # ここでもコメントを送信
                                })
                            else:
                                logger.error(f"Processing error: {result['error']}")
                                await websocket.send_json({
                                    "type": "error",
                                    "error": result["error"]
                                })
                    elif data[:4].startswith(b"\x89PNG"):  # PNG format
                        # 画面キャプチャ処理
                        result = await screen_analyzer.analyze_frame(data)
                        if not result["success"]:
                            logger.error(f"Screen analysis error: {result['error']}")
                            await websocket.send_json({
                                "type": "error",
                                "error": result["error"]
                            })
                        else:
                            await websocket.send_json({
                                "type": "message",
                                "text": result['text']  # コメントを送信
                            })
                elif "text" in message:
                    logger.info(f"Received text message: {message['text']}")
                else:
                    if message.get("type") == "websocket.disconnect":
                        logger.info("Client initiated disconnect")
                        break
                    else:
                        logger.warning(f"Unexpected message format: {message}")
                        continue

            except WebSocketDisconnect:
                logger.info("Client disconnected")
                break
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send_json({
                    "type": "error",
                    #"error": {"type": "processing_error", "message": "メッセージの処理中にエラーが発生しました"}
                })
                continue

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        logger.info("Cleaning up websocket connection")
        await manager.disconnect(websocket) 
        ping_task.cancel()  # Pingタスクをキャンセル
