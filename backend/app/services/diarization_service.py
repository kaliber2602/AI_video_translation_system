# app/services/diarization_service.py
import os
import json
from typing import List, Dict, Any, Optional
from app.models import SpeakerProfile
from sqlalchemy.orm import Session


class DiarizationService:
    """Service for speaker diarization using pyannote"""
    
    def __init__(self):
        self.pipeline = None
        self._load_pipeline()
    
    def _load_pipeline(self):
        """Load pyannote pipeline lazily"""
        try:
            from pyannote.audio import Pipeline
            import torch
            import os
            
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=os.getenv("HF_TOKEN")
            )
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self.pipeline.to(torch.device("cuda"))
            
            print("[Diarization] Pyannote pipeline loaded successfully")
        except Exception as e:
            print(f"[Diarization] Failed to load pyannote: {e}")
            self.pipeline = None
    
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
            raise RuntimeError("Pyannote pipeline not available")
        
        # Run diarization
        diarization = self.pipeline(audio_path)
        
        # Process results
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
        
        Args:
            transcript_path: Path to transcript JSON file
            diarization_segments: Diarization segments from pyannote
            output_path: Path to save updated transcript
        
        Returns:
            Updated segments with speaker labels
        """
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segments = transcript_data.get("segments", [])
        
        # Map speakers to segments based on timestamps
        for seg in segments:
            seg_start = seg.get("start", 0)
            seg_end = seg.get("end", 0)
            seg_mid = (seg_start + seg_end) / 2
            
            # Find matching speaker
            speaker = "SPEAKER_01"  # Default
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
        db: Session,
        video_id: int,
        segments: List[Dict],
        language: str = "en"
    ) -> List[SpeakerProfile]:
        """
        Create speaker profiles from diarized segments
        
        Args:
            db: Database session
            video_id: Video ID
            segments: Segments with speaker labels
            language: Detected language
        
        Returns:
            List of created SpeakerProfile objects
        """
        # Get unique speakers
        speakers = set()
        for seg in segments:
            if seg.get("speaker"):
                speakers.add(seg["speaker"])
        
        # Create profiles
        profiles = []
        for speaker_label in speakers:
            # Check if speaker already exists
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
                db.flush()
                profiles.append(profile)
            else:
                profiles.append(existing)
        
        db.commit()
        return profiles