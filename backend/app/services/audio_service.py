import os
import openai
import tempfile
import subprocess
from typing import BinaryIO
from dotenv import load_dotenv

load_dotenv()

class AudioService:
    def __init__(self):
        openai.api_key = os.getenv("OPENAI_API_KEY")

    async def convert_audio(self, input_file: str) -> str:
        """WebMをMP3に変換"""
        output_file = input_file.replace('.webm', '.mp3')
        try:
            subprocess.run([
                'ffmpeg', '-i', input_file,
                '-acodec', 'libmp3lame',
                '-ar', '44100',
                output_file
            ], check=True, capture_output=True)
            return output_file
        except subprocess.CalledProcessError as e:
            print(f"音声変換エラー: {e.stderr.decode()}")
            raise

    async def transcribe_audio(self, audio_data: BinaryIO) -> str:
        try:
            # 一時ファイルとしてWebMを保存
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_webm:
                temp_webm.write(audio_data.read())
                temp_webm_path = temp_webm.name

            # MP3に変換
            temp_mp3_path = await self.convert_audio(temp_webm_path)

            # Whisper APIで音声認識
            with open(temp_mp3_path, 'rb') as audio_file:
                response = await openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="ja"
                )

            # 一時ファイルを削除
            os.unlink(temp_webm_path)
            os.unlink(temp_mp3_path)

            return response.text
        except Exception as e:
            print(f"音声認識エラー: {e}")
            return ""

    async def generate_response(self, text: str) -> str:
        try:
            response = await openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたは配信者のチャットに現れるコメンテーターです。短く、面白く、親しみやすいコメントをしてください。"},
                    {"role": "user", "content": f"以下の音声に対してコメントしてください：{text}"}
                ],
                max_tokens=100
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"レスポンス生成エラー: {e}")
            return ""