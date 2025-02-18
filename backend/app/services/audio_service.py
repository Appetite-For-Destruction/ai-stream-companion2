import openai
from typing import BinaryIO

class AudioService:
    def __init__(self):
        self.client = openai.OpenAI()

    async def transcribe_audio(self, audio_data: BinaryIO) -> str:
        try:
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_data,
                language="ja"
            )
            return response.text
        except Exception as e:
            print(f"音声認識エラー: {e}")
            return ""