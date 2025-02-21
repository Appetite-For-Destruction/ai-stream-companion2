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
            try:
                message = await websocket.receive()
                
                if "bytes" in message:
                    data = message["bytes"]
                    logger.info(f"Received binary data of size: {len(data)} bytes")
                    
                    # データの先頭バイトをチェックしてタイプを判別
                    if data[:4].startswith(b"\x1a\x45\xdf\xa3"):  # WebM format
                        # 音声処理
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
                    elif data[:4].startswith(b"\x89PNG"):  # PNG format
                        # 画面キャプチャ処理
                        result = await screen_analyzer.analyze_frame(data)
                        if "error" not in result:
                            # 解析結果に基づいてコメントを生成
                            comment = await screen_analyzer.generate_comment(result)
                            await websocket.send_json({
                                "type": "screen_analysis",
                                "data": {
                                    **result,
                                    "comment": comment
                                }
                            })
                        else:
                            logger.error(f"Screen analysis error: {result['error']}")
                            await websocket.send_json({
                                "type": "error",
                                "error": {
                                    "type": "analysis_error",
                                    "message": "画面解析中にエラーが発生しました"
                                }
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
                    "error": {"type": "processing_error", "message": "メッセージの処理中にエラーが発生しました"}
                })
                continue

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        logger.info("Cleaning up websocket connection")
        await manager.disconnect(websocket) 