import os
import openai
import tempfile
import subprocess
from typing import BinaryIO, Dict, Union
from dotenv import load_dotenv
from fastapi import WebSocketDisconnect
import logging

load_dotenv()

# ロガーの設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        logger.info("AudioService initialized with OpenAI API key")

    async def convert_audio(self, input_file: str) -> str:
        """WebMをMP3に変換"""
        output_file = input_file.replace('.webm', '.mp3')
        try:
            logger.info(f"Converting audio: {input_file} -> {output_file}")
            
            # 入力ファイルのフォーマットを確認
            probe_result = subprocess.run([
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=format_name',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                input_file
            ], capture_output=True, text=True)
            if probe_result.returncode != 0:
                logger.error(f"FFprobe error: {probe_result.stderr}")
                raise AudioServiceError("入力ファイルのフォーマット取得に失敗しました", "conversion_error")
            logger.info(f"Input format probe result: {probe_result.stdout.strip()}")
            
            result = subprocess.run([
                'ffmpeg',
                '-hide_banner',
                '-y',
                '-f', 'webm',  # 入力フォーマットを明示的に指定
                '-i', input_file,
                '-acodec', 'libmp3lame',  # コーデック指定
                '-ar', '44100',
                '-ac', '1',
                '-b:a', '128k',
                '-f', 'mp3',
                output_file
            ], capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                logger.error(f"FFmpeg command output: {result.stdout}")
                logger.error(f"Input file exists: {os.path.exists(input_file)}")
                logger.error(f"Input file size: {os.path.getsize(input_file) if os.path.exists(input_file) else 'N/A'}")
                raise AudioServiceError(f"音声変換に失敗しました: {result.stderr}", "conversion_error")

            if os.path.exists(output_file):
                file_size = os.path.getsize(output_file)
                logger.info(f"Converted file size: {file_size} bytes")
                return output_file
            else:
                raise AudioServiceError("変換後のファイルが生成されませんでした", "conversion_error")

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr}")
            raise AudioServiceError("FFmpegの実行に失敗しました", "conversion_error")

    async def transcribe_audio(self, audio_data: BinaryIO) -> Dict[str, Union[str, bool]]:
        temp_files = []
        try:
            logger.info("Starting audio transcription")
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False, mode='wb') as temp_webm:
                audio_data.seek(0)
                content = audio_data.read()
                
                # ファイルヘッダーの確認
                logger.info(f"First 16 bytes of content: {content[:16].hex()}")
                
                temp_webm.write(content)
                temp_webm.flush()
                os.fsync(temp_webm.fileno())  # 確実にディスクに書き込む
                
                temp_files.append(temp_webm.name)
                
                # ファイルの存在とサイズを確認
                logger.info(f"Temp file path: {temp_webm.name}")
                logger.info(f"Temp file exists: {os.path.exists(temp_webm.name)}")
                logger.info(f"Temp file size: {os.path.getsize(temp_webm.name)}")

            # MP3に変換
            temp_mp3_path = await self.convert_audio(temp_webm.name)
            temp_files.append(temp_mp3_path)

            # Whisper APIで音声認識
            with open(temp_mp3_path, 'rb') as audio_file:
                client = openai.AsyncOpenAI()
                response = await client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-1",
                    language="ja"
                )

                if not response.text:
                    return {
                        "success": False,
                        "text": "",
                        "error": {"type": "transcription_error", "message": "音声認識結果が空でした"}
                    }

                # AIによるレスポンス生成
                return await self.generate_response(response.text)

        except Exception as e:
            logger.error(f"Error during transcription: {str(e)}")
            return {
                "success": False,
                "text": "",
                "error": {"type": "unknown", "message": str(e)}
            }
        finally:
            for file_path in temp_files:
                try:
                    if os.path.exists(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    logger.error(f"Failed to delete {file_path}: {str(e)}")

    async def generate_response(self, text: str) -> Dict[str, Union[str, bool]]:
        try:
            client = openai.AsyncOpenAI()  # AsyncOpenAIクライアントを使用
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたは配信者のチャットに現れるコメンテーターです。短く、面白く、親しみやすいコメントをしてください。"},
                    {"role": "user", "content": f"以下の音声に対してコメントしてください：{text}"}
                ],
                max_tokens=100
            )
            logger.info(f"Generated AI response: {response.choices[0].message.content}")
            return {
                "success": True,
                "text": response.choices[0].message.content,
                "error": None
            }
        except Exception as e:
            logger.error(f"Response generation error: {str(e)}")
            return {
                "success": False,
                "text": "",
                "error": {"type": "response_error", "message": str(e)}
            }