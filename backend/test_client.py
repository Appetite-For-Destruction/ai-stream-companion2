import asyncio
import websockets
import json
import subprocess
import os

async def convert_wav_to_webm(input_file, output_file):
    try:
        subprocess.run([
            'ffmpeg',
            '-i', input_file,
            '-c:a', 'libopus',
            output_file
        ], check=True)
        print(f"変換成功: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"変換エラー: {e}")
        raise

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    
    # WAVファイルをWebMに変換
    if not os.path.exists('test.wav'):
        print("test.wavが見つかりません。まずgenerate_test_audio.pyを実行してください。")
        return
        
    await convert_wav_to_webm('test.wav', 'test.webm')
    
    try:
        async with websockets.connect(uri) as websocket:
            print("WebSocket接続確立")
            
            # テスト用の音声ファイルを送信
            with open("test.webm", "rb") as f:
                audio_data = f.read()
                await websocket.send(audio_data)
                print("音声データ送信完了")
            
            # サーバーからのレスポンスを待機
            response = await websocket.recv()
            print(f"受信したレスポンス: {response}")
            
            response_data = json.loads(response)
            if response_data.get("type") == "error":
                print(f"エラー発生: {response_data.get('error')}")
            else:
                print(f"認識テキスト: {response_data.get('text')}")
                
    except Exception as e:
        print(f"エラー発生: {str(e)}")

if __name__ == "__main__":
    print("テスト開始")
    asyncio.get_event_loop().run_until_complete(test_websocket())
    print("テスト終了") 