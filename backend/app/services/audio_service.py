# app/services/audio_service.py
import os
import subprocess
import logging
from typing import Optional
from pydub import AudioSegment
import torch
import uuid
from datetime import datetime

from app.services.s3_service import upload_file
from app.services.hls_service import process_video_to_hls
from app.core.config import AWS_S3_BUCKET

logger = logging.getLogger("app.services.audio_service")

class AudioService:
    @staticmethod
    def extract_audio(video_path: str, output_audio_path: str):
        """Extract audio from video using FFmpeg."""
        command = [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
            output_audio_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        logger.info(f"✅ Audio extracted to: {output_audio_path}")

    @staticmethod
    def separate_vocal_bgm(audio_path: str, output_dir: str):
        """
        Separate audio into vocal and BGM tracks using Demucs:
        - Vocal Track: For speech recognition (STT) & voice profile extraction
        - BGM Track: Background music & sound effects to keep for post-production mixing
        """
        # Auto-detect CUDA
        cuda_available = torch.cuda.is_available()
        
        if cuda_available:
            logger.info("[Demucs] ✅ CUDA detected, using GPU")
            device = "cuda"
        else:
            logger.info("[Demucs] ⚠️ CUDA not detected, using CPU")
            device = "cpu"
        
        command = [
            "demucs", "--two-stems=vocals",
            "-n", "htdemucs",
            "-o", output_dir,
            "--device", device,
            "--shifts", "2" if cuda_available else "1",
            audio_path
        ]
        
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            logger.info(f"[Demucs] ✅ Separation complete on {device.upper()}")
        except Exception as e:
            logger.error(f"[Demucs] ❌ Separation failed: {e}")
            # Fallback: try CPU if GPU failed
            if device == "cuda":
                logger.info("[Demucs] 🔄 Retrying on CPU...")
                command = [
                    "demucs", "--two-stems=vocals",
                    "-n", "htdemucs",
                    "-o", output_dir,
                    "--device", "cpu",
                    "--shifts", "1",
                    audio_path
                ]
                subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            else:
                raise
        
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        vocal_path = os.path.join(output_dir, "htdemucs", base_name, "vocals.wav")
        bgm_path = os.path.join(output_dir, "htdemucs", base_name, "no_vocals.wav")
        
        # Verify files exist
        if not os.path.exists(vocal_path):
            raise FileNotFoundError(f"Vocal track not found at: {vocal_path}")
        if not os.path.exists(bgm_path):
            raise FileNotFoundError(f"BGM track not found at: {bgm_path}")
        
        logger.info(f"✅ Vocal track: {vocal_path}")
        logger.info(f"✅ BGM track: {bgm_path}")
        
        return vocal_path, bgm_path

    @staticmethod
    def mix_and_mux(
        video_path: str,
        tts_audio_path: str,
        bgm_audio_path: Optional[str],
        final_output_path: str,
        temp_dir: str,
        video_id: Optional[int] = None,
        language: Optional[str] = None,
        quality: Optional[str] = "1080p",
        generate_hls: bool = True
    ):
        """
        Mix TTS audio with optional BGM and mux with video.
        The output video will maintain the full original video length.
        """
        mixed_audio_path = os.path.join(temp_dir, "mixed_audio.wav")
        
        try:
            # 1. Load TTS audio
            logger.info(f"Loading TTS audio from: {tts_audio_path}")
            if not os.path.exists(tts_audio_path):
                raise FileNotFoundError(f"TTS audio not found at: {tts_audio_path}")
            
            tts_audio = AudioSegment.from_file(tts_audio_path)
            logger.info(f"TTS audio duration: {len(tts_audio)/1000:.2f}s, channels: {tts_audio.channels}")
            
            # 2. Handle BGM (if provided)
            if bgm_audio_path and os.path.exists(bgm_audio_path):
                logger.info(f"Loading BGM from: {bgm_audio_path}")
                bgm_audio = AudioSegment.from_file(bgm_audio_path)
                logger.info(f"BGM duration: {len(bgm_audio)/1000:.2f}s, channels: {bgm_audio.channels}")
                
                # Reduce BGM volume by 10dB to make voice clearer
                bgm_audio = bgm_audio - 10
                
                # Ensure BGM is same length as TTS (or loop if shorter)
                if len(bgm_audio) < len(tts_audio):
                    logger.info(f"BGM shorter than TTS, looping...")
                    loop_count = (len(tts_audio) // len(bgm_audio)) + 1
                    bgm_audio = bgm_audio * loop_count
                
                # Trim BGM to match TTS duration
                bgm_audio = bgm_audio[:len(tts_audio)]
                
                # Overlay TTS on BGM
                logger.info("Mixing TTS with BGM...")
                mixed_audio = bgm_audio.overlay(tts_audio)
            else:
                # No BGM, use TTS only
                logger.info("No BGM provided, using TTS audio only")
                mixed_audio = tts_audio
            
            # 3. Get video duration
            logger.info(f"Checking video file: {video_path}")
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found at: {video_path}")
            
            # Get video duration
            cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", video_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0 and result.stdout:
                video_duration = float(result.stdout.strip())
                logger.info(f"Video duration: {video_duration:.2f}s")
            else:
                logger.warning("Could not get video duration")
                video_duration = len(mixed_audio) / 1000.0
            
            # ✅ 4. PAD AUDIO TO MATCH VIDEO LENGTH
            audio_duration = len(mixed_audio) / 1000.0
            if audio_duration < video_duration:
                # Pad with silence to match video length
                silence_duration_ms = int((video_duration - audio_duration) * 1000)
                silence = AudioSegment.silent(duration=silence_duration_ms)
                mixed_audio = mixed_audio + silence
                logger.info(f"Padded audio from {audio_duration:.2f}s to {video_duration:.2f}s")
            elif audio_duration > video_duration:
                # Trim audio to match video length if it's longer
                mixed_audio = mixed_audio[:int(video_duration * 1000)]
                logger.info(f"Trimmed audio from {audio_duration:.2f}s to {video_duration:.2f}s")
            
            # 5. Export mixed audio
            logger.info(f"Exporting mixed audio to: {mixed_audio_path}")
            mixed_audio.export(mixed_audio_path, format="wav")
            
            # Verify mixed audio was created
            if not os.path.exists(mixed_audio_path) or os.path.getsize(mixed_audio_path) == 0:
                raise Exception("Mixed audio file is empty or was not created")
            
            # 6. Mux audio with video using FFmpeg
            logger.info(f"Muxing video ({video_path}) with mixed audio...")
            
            # ✅ REMOVED -shortest flag since audio is now padded to full video length
            command = [
                "ffmpeg", "-y",
                "-i", video_path,
                "-i", mixed_audio_path,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-movflags", "+faststart",
                final_output_path
            ]
            
            logger.info(f"Running FFmpeg command: {' '.join(command)}")
            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg failed with error: {result.stderr}")
                raise subprocess.CalledProcessError(result.returncode, command, result.stderr)
            
            # Verify output file was created and has content
            if not os.path.exists(final_output_path):
                raise FileNotFoundError(f"Output file not created: {final_output_path}")
            
            file_size = os.path.getsize(final_output_path)
            if file_size < 1024:
                logger.warning(f"Output file is very small ({file_size} bytes), may be corrupted")
                # Try alternative approach: use copy codec
                logger.info("Retrying with copy codec...")
                command_copy = [
                    "ffmpeg", "-y",
                    "-i", video_path,
                    "-i", mixed_audio_path,
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-map", "0:v:0",
                    "-map", "1:a:0",
                    "-movflags", "+faststart",
                    final_output_path
                ]
                result = subprocess.run(command_copy, capture_output=True, text=True)
                if result.returncode != 0:
                    logger.error(f"FFmpeg copy failed: {result.stderr}")
                    raise subprocess.CalledProcessError(result.returncode, command_copy, result.stderr)
                
                file_size = os.path.getsize(final_output_path)
                if file_size < 1024:
                    raise Exception(f"Output file is still too small ({file_size} bytes)")
            
            logger.info(f"✅ Dubbed video created successfully: {final_output_path} ({file_size} bytes)")
            
            # Prepare result
            result = {
                "local_path": final_output_path,
                "file_size": file_size
            }
            
            # Upload to S3 if video_id is provided
            if video_id:
                try:
                    # Upload original MP4 to S3
                    s3_key = AudioService._upload_to_s3(final_output_path, video_id, language, quality)
                    result["s3_key"] = s3_key
                    logger.info(f"✅ MP4 uploaded to S3: {s3_key}")
                    
                    # Generate HLS from the MP4
                    if generate_hls:
                        logger.info(f"🎬 Generating HLS for video {video_id}...")
                        hls_result = process_video_to_hls(
                            input_path=final_output_path,
                            video_id=video_id,
                            language=language or "vi",
                            qualities=["240p", "360p", "720p", "1080p"]
                        )
                        result["hls"] = hls_result
                        logger.info(f"✅ HLS generated for video {video_id}: {len(hls_result.get('qualities', []))} qualities")
                        logger.info(f"   Master playlist: {hls_result.get('master_playlist_s3')}")
                        
                except Exception as e:
                    logger.error(f"❌ S3 upload/HLS failed: {e}")
                    result["error"] = f"S3 upload/HLS failed: {str(e)}"
            
            return result
            
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg failed: {e.stderr if e.stderr else str(e)}")
            raise
        except FileNotFoundError as e:
            logger.error(f"File not found: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Mix and mux failed: {str(e)}")
            raise
    

    @staticmethod
    def _upload_to_s3(local_path: str, video_id: int, language: str, quality: str) -> str:
        """Upload a file to S3 with proper naming and logging."""
        # Generate S3 key with video_id
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.basename(local_path)
        s3_key = f"videos/{video_id}/dubbed/{language}/{quality}/{timestamp}_{filename}"
        
        # Determine content type
        ext = os.path.splitext(local_path)[1].lower()
        content_type_map = {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".mkv": "video/x-matroska",
            ".webm": "video/webm"
        }
        content_type = content_type_map.get(ext, "video/mp4")
        
        # Log before upload
        logger.info(f"📤 Uploading video {video_id} to S3: {s3_key}")
        logger.info(f"   Local file: {local_path} ({os.path.getsize(local_path)} bytes)")
        logger.info(f"   Content type: {content_type}")
        
        # Upload to S3
        try:
            upload_file(local_path, s3_key, content_type)
            logger.info(f"✅ Successfully uploaded video {video_id} to S3: {s3_key}")
            logger.info(f"   S3 URI: s3://{AWS_S3_BUCKET}/{s3_key}")
            return s3_key
        except Exception as e:
            logger.error(f"❌ Failed to upload video {video_id} to S3: {str(e)}")
            raise

    @staticmethod
    def get_audio_duration(audio_path: str) -> float:
        """Get duration of audio file in seconds."""
        try:
            audio = AudioSegment.from_file(audio_path)
            return len(audio) / 1000.0
        except Exception as e:
            logger.error(f"Failed to get audio duration: {e}")
            return 0.0

    @staticmethod
    def normalize_audio(audio_path: str, output_path: str, target_dbfs: float = -20.0):
        """Normalize audio to target dBFS level."""
        try:
            audio = AudioSegment.from_file(audio_path)
            current_dbfs = audio.dBFS
            gain = target_dbfs - current_dbfs
            normalized = audio.apply_gain(gain)
            normalized.export(output_path, format="wav")
            logger.info(f"✅ Audio normalized: {audio_path} -> {output_path} (gain: {gain:.2f}dB)")
            return output_path
        except Exception as e:
            logger.error(f"Failed to normalize audio: {e}")
            raise

    @staticmethod
    def trim_silence(audio_path: str, output_path: str, silence_thresh: int = -50, min_silence_len: int = 500):
        """Trim leading/trailing silence from audio."""
        try:
            audio = AudioSegment.from_file(audio_path)
            start_trim = 0
            for i in range(0, len(audio), min_silence_len):
                if audio[i:i+min_silence_len].dBFS > silence_thresh:
                    start_trim = i
                    break
            
            end_trim = len(audio)
            for i in range(len(audio) - min_silence_len, 0, -min_silence_len):
                if audio[i:i+min_silence_len].dBFS > silence_thresh:
                    end_trim = i + min_silence_len
                    break
            
            trimmed = audio[start_trim:end_trim]
            trimmed.export(output_path, format="wav")
            logger.info(f"✅ Silence trimmed: {audio_path} -> {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Failed to trim silence: {e}")
            raise

    @staticmethod
    def convert_to_mono(audio_path: str, output_path: str):
        """Convert audio to mono."""
        try:
            audio = AudioSegment.from_file(audio_path)
            if audio.channels > 1:
                mono = audio.set_channels(1)
                mono.export(output_path, format="wav")
                logger.info(f"✅ Converted to mono: {audio_path} -> {output_path}")
                return output_path
            else:
                import shutil
                shutil.copy2(audio_path, output_path)
                logger.info(f"✅ Already mono: {audio_path} -> {output_path}")
                return output_path
        except Exception as e:
            logger.error(f"Failed to convert to mono: {e}")
            raise