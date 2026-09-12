# app/services/diarization_service.py - Standardized Pyannote Speaker Diarization (No SQLAlchemy)
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.database import DatabaseSession, RowRecord
from app.models import SpeakerProfile


_cached_pipeline = None
_pipeline_initialized = False


class DiarizationService:
    """Service for speaker diarization using pyannote"""
    
    def __init__(self):
        global _cached_pipeline, _pipeline_initialized
        if _pipeline_initialized:
            self.pipeline = _cached_pipeline
            return

        self.pipeline = None
        self._load_pipeline()
        _cached_pipeline = self.pipeline
        _pipeline_initialized = True
    
    def _load_pipeline(self):
        """Load pyannote pipeline with auto device detection"""
        hf_token = (os.getenv("HF_TOKEN") or "").strip()
        if not hf_token:
            print("[Diarization] ⚠️ HF_TOKEN not set; Diarization pipeline will run in fallback mode", flush=True)
            self.pipeline = None
            return

        try:
            from pyannote.audio import Pipeline
            import torch
            
            print("[Diarization] Loading pyannote/speaker-diarization-3.1...", flush=True)
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            
            # Auto-detect CUDA
            if torch.cuda.is_available():
                self.pipeline.to(torch.device("cuda"))
                print("[Diarization] ✅ Pyannote pipeline loaded on GPU", flush=True)
            else:
                self.pipeline.to(torch.device("cpu"))
                print("[Diarization] ⚠️ Pyannote pipeline loaded on CPU", flush=True)
            
        except Exception as e:
            print(f"[Diarization] ❌ Failed to load pyannote: {e}", flush=True)
            self.pipeline = None
    
    def is_available(self) -> bool:
        return self.pipeline is not None

    def diarize(self, audio_path: str, num_speakers: Optional[int] = None) -> List[Dict]:
        """
        Run speaker diarization on audio file
        
        Args:
            audio_path: Path to audio file
            num_speakers: Number of speakers (auto-detect if None)
        
        Returns:
            List of speaker segments with start, end, speaker label
        """
        if not self.pipeline:
            # Graceful fallback: return a single default speaker turn
            return [{
                "start": 0.0,
                "end": 999999.0,
                "speaker": "SPEAKER_01",
                "duration": 999999.0
            }]
        
        import warnings
        with warnings.catch_warnings():
            # Suppress torch std() degrees of freedom warning on silent frames
            warnings.filterwarnings("ignore", message=".*degrees of freedom.*")
            warnings.filterwarnings("ignore", category=UserWarning)
            diarization = self.pipeline(audio_path)
        
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker,
                "duration": turn.end - turn.start
            })
        
        return segments
    
    def assign_speakers_to_transcript(
        self,
        transcript_path: str,
        diarization_segments: List[Dict],
        output_path: Optional[str] = None
    ) -> List[Dict]:
        """
        Assign speaker labels to transcript segments based on diarization
        """
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segments = transcript_data.get("segments", [])
        
        for seg in segments:
            seg_start = seg.get("start", 0)
            seg_end = seg.get("end", 0)
            seg_mid = (seg_start + seg_end) / 2
            
            speaker = "SPEAKER_01"
            for diar_seg in diarization_segments:
                if diar_seg["start"] <= seg_mid <= diar_seg["end"]:
                    speaker = diar_seg["speaker"]
                    break
            
            seg["speaker"] = speaker
        
        transcript_data["segments"] = segments
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(transcript_data, f, indent=2)
        
        return segments
    
    def create_speaker_profiles(
        self,
        db: DatabaseSession,
        video_id: int,
        segments: List[Dict],
        language: str = "en"
    ) -> List[RowRecord]:
        """
        Create speaker profiles from diarized segments in PostgreSQL
        """
        speakers = set()
        for seg in segments:
            if seg.get("speaker"):
                speakers.add(seg["speaker"])
        
        if not speakers:
            speakers.add("SPEAKER_01")

        profiles = []
        for speaker_label in speakers:
            existing = db.query(SpeakerProfile).filter(
                SpeakerProfile.video_id == video_id,
                SpeakerProfile.speaker_label == speaker_label
            ).first()
            
            if not existing:
                profile = SpeakerProfile(
                    video_id=video_id,
                    speaker_label=speaker_label,
                    language=language,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(profile)
                profiles.append(profile)
            else:
                profiles.append(existing)
        
        db.commit()
        return profiles