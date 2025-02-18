import os
import openai
from typing import BinaryIO
from dotenv import load_dotenv

load_dotenv()

class AudioService:
    def __init__(self):
        openai.api_key = os.getenv("OPENAI_API_KEY")

    async def transcribe_audio(self, audio_data: BinaryIO) -> str:
        try:
            response = await openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_data,
                language="ja"
            )
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