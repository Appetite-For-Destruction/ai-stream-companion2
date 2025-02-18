import os
import openai
import tempfile
import subprocess
from typing import BinaryIO, Dict, Union
from dotenv import load_dotenv
from fastapi import WebSocketDisconnect

load_dotenv()

class AudioServiceError(Exception):
    def __init__(self, message: str, error_type: str):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)

class AudioService:
    def __init__(self):
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise AudioServiceError("OpenAI APIキーが設定されていません", "config_error")

    async def convert_audio(self, input_file: str) -> str:
        """WebMをMP3に変換"""
        output_file = input_file.replace('.webm', '.mp3')
        try:
            result = subprocess.run([
                'ffmpeg', '-i', input_file,
                '-acodec', 'libmp3lame',
                '-ar', '44100',
                output_file
            ], check=True, capture_output=True)
            return output_file
        except subprocess.CalledProcessError as e:
            raise AudioServiceError(
                f"音声変換に失敗しました: {e.stderr.decode()}", 
                "conversion_error"
            )
        except FileNotFoundError:
            raise AudioServiceError(
                "ffmpegがインストールされていません", 
                "system_error"
            )

    async def transcribe_audio(self, audio_data: BinaryIO) -> Dict[str, Union[str, bool]]:
        temp_files = []
        try:
            # 一時ファイルとしてWebMを保存
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_webm:
                temp_webm.write(audio_data.read())
                temp_webm_path = temp_webm.name
                temp_files.append(temp_webm_path)

            # MP3に変換
            temp_mp3_path = await self.convert_audio(temp_webm_path)
            temp_files.append(temp_mp3_path)

            # Whisper APIで音声認識
            with open(temp_mp3_path, 'rb') as audio_file:
                response = await openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="ja"
                )

            return {
                "success": True,
                "text": response.text,
                "error": None
            }

        except AudioServiceError as e:
            return {
                "success": False,
                "text": "",
                "error": {"type": e.error_type, "message": e.message}
            }
        except openai.RateLimitError:
            return {
                "success": False,
                "text": "",
                "error": {"type": "rate_limit", "message": "APIレート制限に達しました"}
            }
        except openai.APIError as e:
            return {
                "success": False,
                "text": "",
                "error": {"type": "api_error", "message": str(e)}
            }
        except Exception as e:
            return {
                "success": False,
                "text": "",
                "error": {"type": "unknown", "message": str(e)}
            }
        finally:
            # 一時ファイルの削除
            for file_path in temp_files:
                try:
                    os.unlink(file_path)
                except Exception:
                    pass

    async def generate_response(self, text: str) -> Dict[str, Union[str, bool]]:
        try:
            response = await openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたは配信者のチャットに現れるコメンテーターです。短く、面白く、親しみやすいコメントをしてください。"},
                    {"role": "user", "content": f"以下の音声に対してコメントしてください：{text}"}
                ],
                max_tokens=100
            )
            return {
                "success": True,
                "text": response.choices[0].message.content,
                "error": None
            }
        except openai.RateLimitError:
            return {
                "success": False,
                "text": "",
                "error": {"type": "rate_limit", "message": "APIレート制限に達しました"}
            }
        except Exception as e:
            return {
                "success": False,
                "text": "",
                "error": {"type": "response_error", "message": str(e)}
            }