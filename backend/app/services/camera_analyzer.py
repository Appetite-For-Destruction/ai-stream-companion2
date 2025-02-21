import cv2
import numpy as np
from typing import Dict, Union, Any
import logging
import openai
import base64
import json
import time

logger = logging.getLogger(__name__)

class CameraAnalyzer:
    def __init__(self):
        self.comment_history = []
        self.max_history_size = 10
        self.cleanup_counter = 0
        
    async def cleanup_old_data(self):
        self.cleanup_counter += 1
        if self.cleanup_counter > 100:
            self.comment_history = self.comment_history[-self.max_history_size:]
            self.cleanup_counter = 0
        
    async def analyze_frame(self, frame_data: bytes) -> Dict[str, Union[str, bool, Dict[str, str]]]:
        try:
            # 定期的なクリーンアップを実行
            await self.cleanup_old_data()
            
            # キャッシュ用の変数
            self.last_analysis_time = getattr(self, 'last_analysis_time', 0)
            current_time = time.time()
            
            # 最小間隔（秒）を設定
            MIN_ANALYSIS_INTERVAL = 1.0
            
            if current_time - self.last_analysis_time < MIN_ANALYSIS_INTERVAL:
                return self.last_result if hasattr(self, 'last_result') else {
                    "success": False,
                    "text": "",
                    "error": {"type": "too_frequent", "message": "解析間隔が短すぎます"}
                }

            # バイナリデータをnumpy配列（画像）に変換
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {
                    "success": False,
                    "text": "",
                    "error": {"type": "invalid_frame", "message": "画像データの読み込みに失敗しました"}
                }
            
            # 処理用に小さいサイズにリサイズ
            process_frame = cv2.resize(frame, (512, 512))
            
            # カメラ映像の認識（Vision APIを使用）
            encoded_image = cv2.imencode('.jpg', process_frame)[1].tobytes()
            vision_client = openai.AsyncOpenAI()
            
            try:
                response = await vision_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": """
                                カメラ映像について以下の形式で情報を返してください。
                                必ず以下のJSONフォーマットで返してください：
                                
                                {
                                    "scene_type": "映像の種類（人物/風景/物体/その他）",
                                    "action": "映像内の動き（静止/動作中/その他）",
                                    "content": "映像の主な内容（20文字以内）"
                                }
                                
                                他の文章は含めず、JSONのみを返してください。
                                """},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64.b64encode(encoded_image).decode()}",
                                        "detail": "auto"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=150,
                    temperature=0.3
                )
                
                try:
                    content = response.choices[0].message.content.strip()
                    content = content.replace('```json', '').replace('```', '').strip()
                    scene_content = json.loads(content)
                    
                    # コメントを生成
                    comment = await self.generate_comment(scene_content)
                    
                    result = {
                        "success": True,
                        "text": comment,
                        "error": None
                    }
                    
                    self.last_result = result
                    self.last_analysis_time = current_time
                    
                except json.JSONDecodeError:
                    logger.error(f"JSON parse error. Response: {content}")
                    result = {
                        "success": False,
                        "text": "",
                        "error": {"type": "parse_error", "message": "カメラ映像の解析に失敗しました"}
                    }
                    
            except Exception as e:
                logger.error(f"Vision API error: {str(e)}")
                result = {
                    "success": False,
                    "text": "",
                    "error": {"type": "api_error", "message": str(e)}
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Frame analysis error: {str(e)}")
            return {
                "success": False,
                "text": "",
                "error": {"type": "analysis_error", "message": str(e)}
            }

    async def generate_comment(self, analysis_result: Dict[str, Any]) -> str:
        try:
            client = openai.AsyncOpenAI()
            
            prompt = f"""
            あなたは面白いコメントを生成するAIです。コメントは15文字以下の短めがほとんどで、長めのコメントはごくわずかです。
            以下の情報に基づいて、短いコメントを生成してください：
            {analysis_result["scene_type"]}で{analysis_result["action"]}中
            内容：{analysis_result["content"]}
            
            直前のコメント: {self.comment_history[-1] if self.comment_history else "なし"}
            """
            
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "短いコメントのみを生成するAIです。余計な説明は含めません。"},
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