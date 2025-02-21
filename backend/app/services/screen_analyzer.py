import cv2
import numpy as np
from typing import Dict, Any
import logging
import openai

logger = logging.getLogger(__name__)

class ScreenAnalyzer:
    def __init__(self):
        self.previous_frame = None
        self.comment_history = []
        
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

    async def generate_comment(self, analysis_result: Dict[str, Any]) -> str:
        try:
            client = openai.AsyncOpenAI()
            brightness = analysis_result["average_brightness"]
            has_motion = analysis_result["motion_detected"]
            
            prompt = f"""
            画面の特徴:
            - 明るさ: {brightness}/255
            - 動きの有無: {'あり' if has_motion else 'なし'}
            
            これらの特徴から、5文字以下の短いコメントを生成してください。
            前回までのコメント: {', '.join(self.comment_history[-3:] if self.comment_history else [])}
            """
            
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたは配信のコメント生成AIです。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=50
            )
            
            comment = response.choices[0].message.content.strip()
            self.comment_history.append(comment)
            if len(self.comment_history) > 10:
                self.comment_history = self.comment_history[-10:]
                
            return comment
            
        except Exception as e:
            logger.error(f"Comment generation error: {str(e)}")
            return "..." 