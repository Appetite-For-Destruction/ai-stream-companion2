import cv2
import numpy as np
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class ScreenAnalyzer:
    def __init__(self):
        self.previous_frame = None
        
    async def analyze_frame(self, frame_data: bytes) -> Dict[str, Any]:
        try:
            # バイナリデータをnumpy配列（画像）に変換
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {"error": "Invalid frame data"}
            
            # 画像を縮小して処理を軽くする
            frame = cv2.resize(frame, (640, 360))
            
            # グレースケール変換
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # 動き検出（前フレームとの差分）
            if self.previous_frame is not None:
                frame_delta = cv2.absdiff(self.previous_frame, gray)
                motion_detected = np.mean(frame_delta) > 10  # 簡単な動き検出
            else:
                motion_detected = False
            
            self.previous_frame = gray
            
            # 基本的な解析結果を返す
            return {
                "frame_size": frame.shape,
                "average_brightness": np.mean(gray),
                "motion_detected": motion_detected
            }
            
        except Exception as e:
            logger.error(f"Frame analysis error: {str(e)}")
            return {"error": str(e)} 