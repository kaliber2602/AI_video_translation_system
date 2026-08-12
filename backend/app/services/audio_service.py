import os
import subprocess
from pydub import AudioSegment

class AudioService:
    @staticmethod
    def extract_audio(video_path: str, output_audio_path: str):
        """Trích xuất audio gốc từ video bằng FFmpeg."""
        command = [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
            output_audio_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    @staticmethod
    def separate_vocal_bgm(audio_path: str, output_dir: str):
        """
        Tách âm thanh gốc thành 2 track riêng biệt bằng Demucs:
        - Vocal Track: Dùng để nhận diện giọng nói (STT) & trích xuất Voice Profile.
        - BGM Track: Nhạc nền & hiệu ứng âm thanh giữ lại để mix hậu kỳ.
        """
        command = [
            "demucs", "--two-stems=vocals",
            "-n", "htdemucs",
            "-o", output_dir, audio_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        vocal_path = os.path.join(output_dir, "htdemucs", base_name, "vocals.wav")
        bgm_path = os.path.join(output_dir, "htdemucs", base_name, "no_vocals.wav")
        
        return vocal_path, bgm_path

    @staticmethod
    def mix_and_mux(video_path: str, tts_audio_path: str, bgm_audio_path: str, final_output_path: str, temp_dir: str):
        """Mix track lồng tiếng mới (TTS) với nhạc nền gốc (BGM) và ghép lại vào Video."""
        mixed_audio_path = os.path.join(temp_dir, "mixed_audio.wav")
        
        # 1. Trộn âm thanh bằng Pydub
        tts_audio = AudioSegment.from_file(tts_audio_path)
        bgm_audio = AudioSegment.from_file(bgm_audio_path)
        
        # Hạ âm lượng BGM xuống 10dB để giọng lồng tiếng nghe rõ ràng hơn
        bgm_audio = bgm_audio - 10 
        
        # Đè TTS lên BGM
        mixed_audio = bgm_audio.overlay(tts_audio)
        mixed_audio.export(mixed_audio_path, format="wav")
        
        # 2. Muxing Audio & Video bằng FFMPEG
        command = [
            "ffmpeg", "-y", "-i", video_path, "-i", mixed_audio_path,
            "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", final_output_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
