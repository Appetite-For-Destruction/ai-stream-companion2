import wave
import struct
import math

# テスト用の音声ファイルを生成
def generate_sine_wave(frequency, duration, sample_rate=44100):
    samples = []
    num_samples = int(duration * sample_rate)
    
    for i in range(num_samples):
        sample = math.sin(2 * math.pi * frequency * i / sample_rate)
        samples.append(int(sample * 32767))  # 16-bit PCM
    
    return samples

# WAVファイルの作成
def create_wav_file(filename, samples, sample_rate=44100):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # モノラル
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # サンプルをバイナリデータに変換
        packed_samples = struct.pack('<%dh' % len(samples), *samples)
        wav_file.writeframes(packed_samples)

# 1秒間の440Hz正弦波を生成
samples = generate_sine_wave(440, 1.0)
create_wav_file('test.wav', samples)

print("テスト用音声ファイルを生成しました: test.wav") 