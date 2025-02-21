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
            
            # numpy配列をPythonのネイティブ型に変換
            result = {
                "frame_size": list(frame.shape[:2]),  # tupleをリストに変換
                "average_brightness": float(np.mean(gray)),  # numpy.float64をfloatに変換
                "motion_detected": bool(motion_detected)  # numpyのbool_をboolに変換
            }
            
            logger.info(f"Frame analysis result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Frame analysis error: {str(e)}")
            return {"error": str(e)} 