# app/services/tts_aligner_service.py
import os
import subprocess
import json
import requests
import tempfile
from typing import List, Dict, Any, Optional
import logging
import numpy as np
import soundfile as sf
from pydub import AudioSegment

logger = logging.getLogger("app.services.tts_aligner_service")

class TTSAlignerService:
    def __init__(self, tts_api_url: str = None):
        self.tts_api_url = tts_api_url or os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
        logger.info(f"TTSAlignerService initialized with API: {self.tts_api_url}")

    def generate_tts_with_alignment(
        self,
        segments: List[Dict[str, Any]],
        output_path: str,
        temp_dir: str,
        vocal_path: Optional[str] = None,
        tgt_lang: str = "en"
    ) -> str:
        """
        Generate TTS for each segment and combine into a single audio file.
        """
        if not segments:
            raise ValueError("No segments provided for TTS generation")
        
        logger.info(f"Generating TTS for {len(segments)} segments, target language: {tgt_lang}")
        
        # Create temp directory
        os.makedirs(temp_dir, exist_ok=True)
        
        # ✅ Extract voice profile once for all segments
        speaker_wav_data = None
        if vocal_path and os.path.exists(vocal_path):
            logger.info(f"Using vocal track for voice cloning: {vocal_path}")
            speaker_wav_data = self._get_speaker_wav(vocal_path)
        
        if speaker_wav_data is None:
            logger.warning("No speaker voice provided, using default voice")
        
        # Generate TTS for each segment
        audio_segments = []
        
        for idx, seg in enumerate(segments):
            text = seg.get("translated_text", seg.get("text", ""))
            if not text or len(text.strip()) < 1:
                logger.warning(f"Segment {idx} has empty text, skipping")
                continue
            
            logger.info(f"Generating TTS for segment {idx}: {text[:50]}...")
            
            try:
                # ✅ Generate TTS with speaker voice
                audio_data = self._call_tts_service(text, tgt_lang, speaker_wav_data)
                
                if audio_data is None:
                    logger.error(f"Failed to generate TTS for segment {idx}")
                    continue
                
                # Save individual segment
                seg_path = os.path.join(temp_dir, f"segment_{idx:04d}.wav")
                sf.write(seg_path, audio_data, 22050)
                
                # Load as AudioSegment for alignment
                audio_seg = AudioSegment.from_file(seg_path)
                
                # Get original duration
                original_duration = seg.get("end", 0) - seg.get("start", 0)
                if original_duration > 0:
                    # Align duration (time-stretch)
                    current_duration = len(audio_seg) / 1000.0
                    if current_duration > original_duration * 1.2 or current_duration < original_duration * 0.8:
                        # Time-stretch to match original duration
                        speed_factor = current_duration / original_duration
                        audio_seg = self._time_stretch_audio(audio_seg, speed_factor)
                        logger.info(f"Time-stretched segment {idx}: {current_duration:.2f}s -> {original_duration:.2f}s (factor: {speed_factor:.2f})")
                
                audio_segments.append((seg.get("start", 0), audio_seg))
                
            except Exception as e:
                logger.error(f"Failed to generate TTS for segment {idx}: {e}")
                continue
        
        if not audio_segments:
            raise Exception("No TTS segments were generated successfully")
        
        # Combine all segments with silence gaps
        combined_audio = self._combine_audio_segments(audio_segments)
        
        # Export combined audio
        combined_audio.export(output_path, format="wav")
        logger.info(f"TTS generated successfully: {output_path} ({os.path.getsize(output_path)} bytes)")
        
        # Verify file is valid
        if os.path.getsize(output_path) < 1024:
            raise Exception(f"TTS file is too small ({os.path.getsize(output_path)} bytes), generation failed")
        
        return output_path

    def _call_tts_service(self, text: str, tgt_lang: str, speaker_wav_data: Optional[bytes] = None) -> Optional[np.ndarray]:
        """Call the TTS service to generate audio with voice cloning."""
        try:
            # ✅ Check if we have speaker data
            if speaker_wav_data is None:
                # Try to use a default voice
                logger.warning("No speaker voice data available, trying with default voice")
                # Some TTS services allow empty speaker_wav for default voice
            
            # ✅ Prepare multipart/form-data for TTS service
            # The service expects:
            # - text: string (required)
            # - speaker_wav: file (required for voice cloning)
            
            # Create multipart form data
            files = {}
            data = {
                "text": text,
                "language": tgt_lang,
                "speaker_id": "0",
                "style": "neutral",
                "speed": 1.0
            }
            
            # ✅ Add speaker_wav as file if available
            if speaker_wav_data:
                files["speaker_wav"] = ("speaker.wav", speaker_wav_data, "audio/wav")
                logger.info(f"Sending speaker_wav: {len(speaker_wav_data)} bytes")
            
            # Make request with multipart/form-data
            response = requests.post(
                self.tts_api_url,
                data=data,
                files=files if files else None,
                timeout=120
            )
            
            if response.status_code != 200:
                logger.error(f"TTS service returned {response.status_code}: {response.text[:500]}")
                return None
            
            # Check response content type
            content_type = response.headers.get("content-type", "")
            
            if "audio" in content_type or "octet-stream" in content_type:
                # Save response to temp file and load
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                    f.write(response.content)
                    temp_file = f.name
                
                try:
                    # Load audio
                    audio, sr = sf.read(temp_file)
                    if sr != 22050:
                        # Resample to 22050 if needed
                        from scipy import signal
                        audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                    return audio
                finally:
                    os.unlink(temp_file)
            elif "json" in content_type:
                # Try JSON response with base64 audio
                data = response.json()
                if "audio" in data:
                    import base64
                    audio_bytes = base64.b64decode(data["audio"])
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        f.write(audio_bytes)
                        temp_file = f.name
                    
                    try:
                        audio, sr = sf.read(temp_file)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        return audio
                    finally:
                        os.unlink(temp_file)
                elif "url" in data:
                    # Download audio from URL
                    audio_response = requests.get(data["url"], timeout=30)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        f.write(audio_response.content)
                        temp_file = f.name
                    
                    try:
                        audio, sr = sf.read(temp_file)
                        if sr != 22050:
                            from scipy import signal
                            audio = signal.resample(audio, int(len(audio) * 22050 / sr))
                        return audio
                    finally:
                        os.unlink(temp_file)
            else:
                logger.error(f"Unexpected response from TTS service: {content_type[:100]}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error("TTS service timeout after 120 seconds")
            return None
        except Exception as e:
            logger.error(f"Error calling TTS service: {e}")
            return None

    def _get_speaker_wav(self, vocal_path: str) -> Optional[bytes]:
        """Extract speaker voice sample from vocal track."""
        if not vocal_path or not os.path.exists(vocal_path):
            logger.warning(f"Vocal path not found: {vocal_path}")
            return None
        
        try:
            # Read vocal audio
            audio, sr = sf.read(vocal_path)
            
            # Convert to mono if stereo
            if len(audio.shape) > 1:
                audio = np.mean(audio, axis=1)
            
            # ✅ Trim to first 5-10 seconds for voice sample
            sample_duration = min(10, len(audio) / sr)
            sample_samples = int(sample_duration * sr)
            audio_sample = audio[:sample_samples]
            
            # Save as temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                sf.write(f.name, audio_sample, sr)
                with open(f.name, "rb") as audio_file:
                    audio_data = audio_file.read()
                os.unlink(f.name)
                
            logger.info(f"Extracted speaker sample: {sample_duration:.1f}s, {len(audio_data)} bytes")
            return audio_data
                
        except Exception as e:
            logger.error(f"Failed to extract voice profile: {e}")
            return None

    def _time_stretch_audio(self, audio: AudioSegment, speed_factor: float) -> AudioSegment:
        """Time-stretch audio using FFmpeg."""
        try:
            # Save temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                temp_input = f.name
                audio.export(temp_input, format="wav")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                temp_output = f.name
            
            # Use FFmpeg for time stretching
            cmd = [
                "ffmpeg", "-y",
                "-i", temp_input,
                "-filter:a", f"atempo={1/speed_factor}",
                temp_output
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Load stretched audio
            stretched = AudioSegment.from_file(temp_output)
            
            # Clean up
            os.unlink(temp_input)
            os.unlink(temp_output)
            
            return stretched
            
        except Exception as e:
            logger.error(f"Time-stretch failed: {e}")
            return audio

    def _combine_audio_segments(self, audio_segments: List[tuple]) -> AudioSegment:
        """Combine audio segments with appropriate gaps."""
        if not audio_segments:
            raise ValueError("No audio segments to combine")
        
        # Sort by start time
        audio_segments.sort(key=lambda x: x[0])
        
        # Start with first segment
        combined = audio_segments[0][1]
        last_end = audio_segments[0][0] + len(audio_segments[0][1]) / 1000.0
        
        for start_time, audio_seg in audio_segments[1:]:
            gap = start_time - last_end
            
            if gap > 0:
                # Add silence gap
                silence = AudioSegment.silent(duration=int(gap * 1000))
                combined += silence
            
            combined += audio_seg
            last_end = start_time + len(audio_seg) / 1000.0
        
        return combined

    def extract_voice_profile(self, vocal_path: str) -> Optional[bytes]:
        """Extract voice profile from vocal track for voice cloning."""
        return self._get_speaker_wav(vocal_path)