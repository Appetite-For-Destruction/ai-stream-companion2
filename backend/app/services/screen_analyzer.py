import cv2
import numpy as np
from typing import Dict, Any
import logging
import openai
import time
import base64
import json

logger = logging.getLogger(__name__)

class ScreenAnalyzer:
    def __init__(self):
        self.previous_frame = None
        self.comment_history = []
        self.max_history_size = 10
        self.cleanup_counter = 0
        
    async def cleanup_old_data(self):
        self.cleanup_counter += 1
        if self.cleanup_counter > 100:  # 100フレームごとにクリーンアップ
            self.comment_history = self.comment_history[-self.max_history_size:]
            if self.previous_frame is not None:
                self.previous_frame = cv2.resize(self.previous_frame, (320, 180))  # より小さいサイズに
            self.cleanup_counter = 0
        
    async def analyze_frame(self, frame_data: bytes) -> Dict[str, Any]:
        try:
            # 定期的なクリーンアップを実行
            await self.cleanup_old_data()
            
            # キャッシュ用の変数
            self.last_analysis_time = getattr(self, 'last_analysis_time', 0)
            current_time = time.time()
            
            # 最小間隔（秒）を設定
            MIN_ANALYSIS_INTERVAL = 1.0
            
            if current_time - self.last_analysis_time < MIN_ANALYSIS_INTERVAL:
                return self.last_result if hasattr(self, 'last_result') else {"error": "Too frequent"}
            
            # 前回の結果との差分が小さい場合はキャッシュを返す
            if hasattr(self, 'last_result') and not isinstance(self.last_result, dict):
                current_brightness = np.mean(gray)
                prev_brightness = self.last_result.get('average_brightness', 0)
                if abs(current_brightness - prev_brightness) < 5.0:  # 輝度変化が小さい
                    return self.last_result
            
            # バイナリデータをnumpy配列（画像）に変換
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {
                    "error": "Invalid frame data",
                    "details": "画像データの読み込みに失敗しました。",
                    "code": "INVALID_FRAME"
                }
            
            if frame.size == 0:
                return {
                    "error": "Empty frame",
                    "details": "空の画像フレームを受信しました。",
                    "code": "EMPTY_FRAME"
                }
            
            # 黒画面検出（全ての値が0の場合）
            if np.mean(frame) < 1.0:
                return {
                    "error": "Black screen",
                    "details": "画面が真っ黒です",
                    "code": "BLACK_SCREEN"
                }
            
            # 画像サイズが大きすぎる場合の処理
            MAX_DIMENSION = 2048  # Vision APIの推奨最大サイズ
            MIN_DIMENSION = 768   # Vision APIの推奨最小サイズ
            height, width = frame.shape[:2]
            if width > MAX_DIMENSION or height > MAX_DIMENSION:
                scale = MAX_DIMENSION / max(width, height)
                frame = cv2.resize(frame, None, fx=scale, fy=scale)
            
            # 最小サイズの保証
            if min(height, width) < MIN_DIMENSION:
                scale = MIN_DIMENSION / min(height, width)
                frame = cv2.resize(frame, None, fx=scale, fy=scale)
            
            # 処理用に小さいサイズにリサイズ
            process_frame = cv2.resize(frame, (512, 512))  # Vision APIの推奨サイズ
            
            # グレースケール変換
            gray = cv2.cvtColor(process_frame, cv2.COLOR_BGR2GRAY)
            
            # 動き検出（前フレームとの差分）
            if self.previous_frame is not None:
                frame_delta = cv2.absdiff(self.previous_frame, gray)
                motion_detected = np.mean(frame_delta) > 10  # 簡単な動き検出
            else:
                motion_detected = False
            
            self.previous_frame = gray
            
            # 色の分析
            colors = cv2.split(frame)
            dominant_color = {
                "blue": float(np.mean(colors[0])),
                "green": float(np.mean(colors[1])),
                "red": float(np.mean(colors[2]))
            }
            
            # エッジ検出
            edges = cv2.Canny(gray, 100, 200)
            edge_density = float(np.mean(edges > 0))
            
            # 画面内容の認識（Vision APIを使用）
            encoded_image = cv2.imencode('.jpg', process_frame)[1].tobytes()
            vision_client = openai.AsyncOpenAI()
            try:
                response = await vision_client.chat.completions.create(
                    model="gpt-4o-mini",  # 新しいモデル名を使用
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": """
                                この画面について以下の情報を日本語のJSONで返してください：
                                {
                                    "screen_type": "画面の種類（エディタ/ブラウザ/ターミナル/その他）",
                                    "user_action": "ユーザーの行動（コーディング/閲覧/コマンド実行/その他）",
                                    "content": "画面の主な内容（50文字以内）"
                                }
                                """},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64.b64encode(encoded_image).decode()}",
                                        "detail": "auto"  # 自動で解像度を決定
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=150,
                    temperature=0.7  # より自然な応答に
                )
                
                try:
                    screen_content = json.loads(response.choices[0].message.content)
                except json.JSONDecodeError:
                    # JSONパースに失敗した場合、テキストから必要な情報を抽出
                    text_response = response.choices[0].message.content
                    screen_content = {
                        "screen_type": "解析中",
                        "user_action": "解析中",
                        "content": text_response[:50] if text_response else "解析中"
                    }
            except Exception as e:
                logger.error(f"Vision API error: {str(e)}")
                if "model_not_found" in str(e):
                    logger.error("Vision API model not available. Falling back to basic analysis.")
                    # 基本的な画面解析に基づく推測
                    brightness = np.mean(gray)
                    screen_content = {
                        "screen_type": "解析中（基本）",
                        "user_action": "行動分析中",
                        "content": f"輝度:{brightness:.1f}, 動き:{'あり' if motion_detected else 'なし'}"
                    }
                else:
                    screen_content = {
                        "screen_type": "エラー",
                        "user_action": "エラー",
                        "content": "画面解析に失敗しました"
                    }
            
            # numpy配列をPythonのネイティブ型に変換
            result = {
                "frame_size": list(frame.shape[:2]),  # tupleをリストに変換
                "average_brightness": float(np.mean(gray)),  # numpy.float64をfloatに変換
                "motion_detected": bool(motion_detected),  # numpyのbool_をboolに変換
                "dominant_color": dominant_color,
                "edge_density": edge_density,
                "screen_content": screen_content
            }
            
            # 重要な変化がある場合のみログ出力
            if not hasattr(self, 'last_result') or \
               abs(result['average_brightness'] - self.last_result.get('average_brightness', 0)) > 5.0 or \
               result['motion_detected'] != self.last_result.get('motion_detected', False):
                logger.info(f"Significant change detected: {result}")
            else:
                logger.debug(f"Frame analyzed: {result['frame_size']}")
            
            self.last_result = result
            self.last_analysis_time = current_time
            return result
            
        except Exception as e:
            logger.error(f"Frame analysis error: {str(e)}")
            return {"error": str(e)}

    async def generate_comment(self, analysis_result: Dict[str, Any]) -> str:
        try:
            # コメント生成の間隔制御
            self.last_comment_time = getattr(self, 'last_comment_time', 0)
            current_time = time.time()
            
            # 最小間隔（秒）を設定
            MIN_COMMENT_INTERVAL = 3.0
            
            if current_time - self.last_comment_time < MIN_COMMENT_INTERVAL:
                return self.last_comment if hasattr(self, 'last_comment') else "..."
            
            client = openai.AsyncOpenAI()
            brightness = analysis_result["average_brightness"]
            has_motion = analysis_result["motion_detected"]
            
            prompt = f"""
            画面の特徴:
            - 明るさ: {brightness}/255
            - 動きの有無: {'あり' if has_motion else 'なし'}
            - 主要色: R:{analysis_result["dominant_color"]["red"]:.1f}, 
                     G:{analysis_result["dominant_color"]["green"]:.1f}, 
                     B:{analysis_result["dominant_color"]["blue"]:.1f}
            - エッジ密度: {analysis_result["edge_density"]:.2f}
            - 画面の種類: {analysis_result["screen_content"]["screen_type"]}
            - ユーザーの行動: {analysis_result["screen_content"]["user_action"]}
            - 画面の内容: {analysis_result["screen_content"]["content"]}
            
            以下のルールに従って、配信のコメントを生成してください：
            
            1. 画面の種類に応じたコメント：
               - エディタの場合：コーディングに関する励まし
               - ブラウザの場合：閲覧内容への興味や共感
               - ターミナルの場合：コマンドへの反応
               - その他：状況に応じた反応
            
            2. ユーザーの行動に応じた反応：
               - コーディング中：「すごい」「ナイス」など
               - 閲覧中：「なるほど」「へぇ」など
               - コマンド実行中：「おお」「よし」など
            
            3. 動きや明るさの変化への反応：
               - 動きが多い：活発な反応
               - 暗い画面：励ましや心配
               - 明るい画面：ポジティブな反応
            
            コメントは3-5文字で、絵文字を1つ含めてください。
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
            self.last_comment = comment
            self.last_comment_time = current_time
            self.comment_history.append(comment)
            if len(self.comment_history) > 10:
                self.comment_history = self.comment_history[-10:]
                
            return comment
            
        except Exception as e:
            logger.error(f"Comment generation error: {str(e)}")
            return "..." 