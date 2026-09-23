# app/services/video_understanding_service.py - Real Chaptering & Document Understanding
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.core.database import DatabaseSession, RowRecord
from app.models import Video, VideoChapter, VideoDocument, TranscriptSegment, VideoChatMessage, Project

logger = logging.getLogger("app.services.video_understanding_service")


def _format_timestamp(seconds: float) -> str:
    secs = int(seconds)
    mins = secs // 60
    rem_secs = secs % 60
    hours = mins // 60
    rem_mins = mins % 60
    if hours > 0:
        return f"{hours:02d}:{rem_mins:02d}:{rem_secs:02d}"
    return f"{rem_mins:02d}:{rem_secs:02d}"


def clean_media_title(title: Optional[str], max_len: int = 24) -> str:
    """
    Cleans raw video filenames for concise, human-readable display.
    Removes common video extensions and long alphanumeric hashes.
    Example: 'snaptik.vn_7531969162319629582.mp4' -> 'snaptik.vn_7531...'
    """
    if not title:
        return "Video"
    cleaned = title.strip()
    for ext in [".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"]:
        if cleaned.lower().endswith(ext):
            cleaned = cleaned[:-len(ext)]
            break
    if len(cleaned) > max_len:
        return cleaned[:max_len] + "..."
    return cleaned



class VideoUnderstandingService:
    def __init__(self, db: Optional[DatabaseSession] = None):
        self.db = db if db is not None else DatabaseSession()

    def get_chapters(self, video_id: int) -> List[Dict[str, Any]]:
        rows = self.db.query(VideoChapter).filter(VideoChapter.video_id == video_id).all()
        rows.sort(key=lambda x: x.get("sequence", 0))
        return [dict(r) for r in rows]

    def generate_chapters(self, video_id: int) -> List[Dict[str, Any]]:
        video = self.db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video with ID {video_id} not found")

        segments = self.db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).all()
        segments.sort(key=lambda s: s.get("start_time", 0.0))

        chapters_to_insert = []
        if segments:
            # Group transcript into dynamic chapters of ~60-120 seconds or significant pause
            chapter_idx = 1
            current_chunk = []
            chunk_start = segments[0].get("start_time", 0.0)

            for seg in segments:
                current_chunk.append(seg)
                seg_end = seg.get("end_time", chunk_start)
                if (seg_end - chunk_start) >= 90.0:
                    summary_text = " ".join(s.get("original_text", "") for s in current_chunk).strip()
                    title = f"Chapter {chapter_idx}: {summary_text[:40]}..." if len(summary_text) > 40 else f"Chapter {chapter_idx}"
                    chapters_to_insert.append({
                        "video_id": video_id,
                        "sequence": chapter_idx,
                        "start_time": chunk_start,
                        "end_time": seg_end,
                        "title": title,
                        "summary": summary_text[:300],
                        "thumbnail_path": None,
                    })
                    chapter_idx += 1
                    current_chunk = []
                    chunk_start = seg_end

            if current_chunk:
                seg_end = current_chunk[-1].get("end_time", chunk_start + 10.0)
                summary_text = " ".join(s.get("original_text", "") for s in current_chunk).strip()
                title = f"Chapter {chapter_idx}: {summary_text[:40]}..." if len(summary_text) > 40 else f"Chapter {chapter_idx}"
                chapters_to_insert.append({
                    "video_id": video_id,
                    "sequence": chapter_idx,
                    "start_time": chunk_start,
                    "end_time": seg_end,
                    "title": title,
                    "summary": summary_text[:300],
                    "thumbnail_path": None,
                })
        else:
            # Fallback based on video duration
            duration = video.get("duration") or 120.0
            part = max(30.0, duration / 3.0)
            titles = ["Introduction & Overview", "Core Discussion & Analysis", "Summary & Conclusion"]
            for idx, title in enumerate(titles):
                s_time = idx * part
                e_time = min(duration, (idx + 1) * part)
                chapters_to_insert.append({
                    "video_id": video_id,
                    "sequence": idx + 1,
                    "start_time": s_time,
                    "end_time": e_time,
                    "title": title,
                    "summary": f"Segment covers timeline {_format_timestamp(s_time)} - {_format_timestamp(e_time)}",
                    "thumbnail_path": None,
                })

        # Remove existing chapters for video to regenerate cleanly
        self.db.execute("DELETE FROM video_chapters WHERE video_id = %s", (video_id,))

        created_chapters = []
        for ch in chapters_to_insert:
            record = VideoChapter(**ch)
            self.db.add(record)
            created_chapters.append(ch)

        self.db.commit()
        return self.get_chapters(video_id)

    def get_documents(self, video_id: int) -> List[Dict[str, Any]]:
        rows = self.db.query(VideoDocument).filter(VideoDocument.video_id == video_id).all()
        rows.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
        return [dict(r) for r in rows]

    def get_document(self, video_id: int, doc_id: int) -> Optional[Dict[str, Any]]:
        doc = self.db.query(VideoDocument).filter(
            (VideoDocument.id == doc_id) & (VideoDocument.video_id == video_id)
        ).first()
        return dict(doc) if doc else None

    def generate_document(self, video_id: int, doc_type: str = "markdown") -> Dict[str, Any]:
        video = self.db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video with ID {video_id} not found")

        chapters = self.get_chapters(video_id)
        if not chapters:
            chapters = self.generate_chapters(video_id)

        segments = self.db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).all()
        segments.sort(key=lambda s: s.get("start_time", 0.0))

        title = video.get("title") or video.get("original_filename") or f"Video #{video_id}"
        duration = video.get("duration") or 0.0

        md_lines = [
            f"# {title}",
            "",
            f"**Duration:** {_format_timestamp(duration)}  ",
            f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
            f"**Document Type:** Executive Timeline & Summary",
            "",
            "## Executive Summary",
            "",
        ]

        full_transcript_text = " ".join(s.get("original_text", "") for s in segments)
        llm_summary_res = None
        try:
            from app.services.llm_service import LLMService
            llm_service = LLMService()
            llm_summary_res = llm_service.summarize_video_content(video_title=title, full_transcript=full_transcript_text)
        except Exception as e:
            logger.warning(f"[Document] LLM summary fallback: {e}")

        if llm_summary_res and llm_summary_res.get("summary"):
            md_lines.append(llm_summary_res["summary"])
        else:
            md_lines.append(f'Tài liệu này cung cấp bản phân tích cấu trúc, tóm tắt và bảng phân đoạn thời gian tự động cho video "{title}".')
        md_lines.append("")
        md_lines.append("## Chapter Timeline")
        md_lines.append("")


        for ch in chapters:
            st = _format_timestamp(ch.get("start_time", 0.0))
            et = _format_timestamp(ch.get("end_time", 0.0))
            ch_title = ch.get("title", "Chapter")
            ch_sum = ch.get("summary", "")
            md_lines.append(f"### [{st} - {et}] {ch_title}")
            if ch_sum:
                md_lines.append(f"{ch_sum}")
            md_lines.append("")

        if segments:
            md_lines.append("## Full Transcript Dialogue")
            md_lines.append("")
            for seg in segments:
                st = _format_timestamp(seg.get("start_time", 0.0))
                text = seg.get("original_text", "").strip()
                speaker = seg.get("speaker") or "Speaker"
                md_lines.append(f"- **[{st}] {speaker}:** {text}")
            md_lines.append("")

        content_markdown = "\n".join(md_lines)
        file_size_bytes = len(content_markdown.encode("utf-8"))

        doc_record = VideoDocument(
            video_id=video_id,
            doc_type=doc_type,
            title=f"{title} - Structured Summary",
            file_path=None,
            content_markdown=content_markdown,
            file_size_bytes=file_size_bytes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(doc_record)
        self.db.commit()
        self.db.refresh(doc_record)

        return dict(doc_record)

    def search_transcript(self, video_id: int, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Multilingual Hybrid Search (FAISS GPU/CPU Vector Similarity + Dual-Language Lexical Boost).
        Finds context accurately whether query is in original spoken language (EN/ZH) or translated (VI).
        """
        if not query or not query.strip():
            return []

        # 1. Try FAISS Semantic Search first
        try:
            from app.services.faiss_vector_service import FaissVectorService
            vector_service = FaissVectorService(db=self.db)
            semantic_results = vector_service.search_semantic(
                query=query,
                video_id=video_id,
                top_k=limit
            )
            if semantic_results and len(semantic_results) > 0:
                return semantic_results[:limit]
        except Exception as e:
            logger.warning(f"[Search] FAISS semantic search fallback: {e}")

        # 2. Dual-Language Lexical Fallback (Original + Translated + Edited)
        from app.core.database import get_db_cursor
        query_terms = [t.lower() for t in query.strip().split() if len(t) > 1]

        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    ts.id, ts.start_time, ts.end_time, ts.original_text,
                    tr.translated_text, tr.edited_text
                FROM transcript_segments ts
                LEFT JOIN translation_segments tr ON ts.id = tr.transcript_segment_id
                WHERE ts.video_id = %s
                ORDER BY ts.start_time ASC;
            """, (video_id,))
            rows = cur.fetchall()

        scored_results = []
        if rows:
            for r in rows:
                seg_id, st, et, orig_text, trans_text, edit_text = r
                orig_text = orig_text or ""
                target_text = edit_text or trans_text or ""
                combined_search_corpus = f"{orig_text} {target_text}".lower()

                score = 0.0
                if query.lower() in combined_search_corpus:
                    score += 5.0

                matches = sum(1 for term in query_terms if term in combined_search_corpus)
                if matches > 0:
                    score += (matches / (len(query_terms) or 1)) * 3.0

                if score > 0.0:
                    scored_results.append({
                        "video_id": video_id,
                        "start_time": float(st or 0.0),
                        "end_time": float(et or 0.0),
                        "timestamp_formatted": _format_timestamp(float(st or 0.0)),
                        "text": orig_text if orig_text else target_text,
                        "translated_text": target_text,
                        "speaker": "Speaker",
                        "relevance_score": round(score, 2),
                    })
        else:
            # Fallback to ORM db.query for unit tests / mock DB
            segments = self.db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).all()
            for s in segments:
                text = s.get("original_text", "") if hasattr(s, "get") else getattr(s, "original_text", "")
                text_lower = text.lower()
                score = 0.0
                if query.lower() in text_lower:
                    score += 5.0
                matches = sum(1 for term in query_terms if term in text_lower)
                if matches > 0:
                    score += (matches / (len(query_terms) or 1)) * 3.0
                if score > 0.0:
                    st = s.get("start_time", 0.0) if hasattr(s, "get") else getattr(s, "start_time", 0.0)
                    et = s.get("end_time", 0.0) if hasattr(s, "get") else getattr(s, "end_time", 0.0)
                    spk = s.get("speaker") if hasattr(s, "get") else getattr(s, "speaker", "Speaker")
                    scored_results.append({
                        "video_id": video_id,
                        "start_time": float(st or 0.0),
                        "end_time": float(et or 0.0),
                        "timestamp_formatted": _format_timestamp(float(st or 0.0)),
                        "text": text,
                        "translated_text": "",
                        "speaker": spk or "Speaker",
                        "relevance_score": round(score, 2),
                    })

        scored_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_results[:limit]

    def search_project_transcripts(self, project_id: int, query: str, user_id: Optional[int] = None, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Multilingual Semantic search across videos belonging to a specific workspace project.
        User video embedding and transcript data is strictly isolated per tenant.
        """
        if not query or not query.strip():
            return []

        # Validate project ownership if user_id is provided
        if user_id is not None:
            proj = self.db.query(Project).filter(Project.id == project_id, Project.owner_id == user_id).first()
            if not proj:
                logger.warning(f"Unauthorized or non-existent project search attempt: user={user_id}, project={project_id}")
                return []

        # 1. Try FAISS project-wide semantic search
        try:
            from app.services.faiss_vector_service import FaissVectorService
            vector_service = FaissVectorService(db=self.db)
            sem_results = vector_service.search_semantic(
                query=query,
                project_id=project_id,
                user_id=user_id,
                top_k=limit
            )
            if sem_results and len(sem_results) > 0:
                # Attach video titles
                video_map = {}
                for r in sem_results:
                    vid_id = r.get("video_id")
                    if vid_id not in video_map:
                        v = self.db.query(Video).filter(Video.id == vid_id).first()
                        video_map[vid_id] = v.get("title") if v else f"Video #{vid_id}"
                    r["video_title"] = video_map[vid_id]
                return sem_results[:limit]
        except Exception as e:
            logger.warning(f"[Project Search] FAISS project search fallback: {e}")

        # 2. Fallback per-video search
        videos = self.db.query(Video).filter(Video.project_id == project_id).all()
        all_results = []
        for v in videos:
            vid_id = v.get("id") if hasattr(v, "get") else getattr(v, "id", None)
            v_title = v.get("title") if hasattr(v, "get") else getattr(v, "title", "Video")
            if vid_id:
                results = self.search_transcript(video_id=vid_id, query=query, limit=5)
                for r in results:
                    r["video_title"] = v_title
                    all_results.append(r)

        all_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return all_results[:limit]

    def get_chat_history(self, video_id: int, user_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve historical Q&A chat messages for a video, isolated strictly to the user."""
        query_filter = VideoChatMessage.video_id == video_id
        if user_id is not None:
            query_filter = (VideoChatMessage.video_id == video_id) & (VideoChatMessage.user_id == user_id)
        
        rows = self.db.query(VideoChatMessage).filter(query_filter).all()
        rows.sort(key=lambda x: x.get("created_at") or datetime.min)
        return [dict(r) for r in rows][-limit:]

    def clear_chat_history(self, video_id: int, user_id: int) -> bool:
        """Clear all chat history for a video owned by user."""
        try:
            self.db.execute(
                "DELETE FROM video_chat_messages WHERE video_id = %s AND user_id = %s",
                (video_id, user_id)
            )
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"[Chat] Failed to clear history for video {video_id}: {e}")
            return False

    def chat_with_video(
        self,
        video_id: int,
        user_id: int,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        model_name: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        RAG Chat Agent with Video Transcript:
        1. Retrieves relevant transcript context chunks for user's question.
        2. Synthesizes an intelligent response with clickable timestamp citations.
        3. Persists user message and assistant reply into video_chat_messages table.
        """
        if not message or not message.strip():
            raise ValueError("Message cannot be empty.")

        video = self.db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video #{video_id} not found.")

        video_title = video.get("title") or "Video"
        duration_sec = video.get("duration") or 0.0

        # Step 1: Detect User Intent (Summary / Overview vs Specific Transcript Query)
        msg_lower = message.strip().lower()
        is_summary_intent = any(kw in msg_lower for kw in [
            "tóm tắt", "tổng kết", "tổng quan", "nội dung chính", "ý chính",
            "summary", "overview", "key takeaways", "nói về cái gì", "nội dung là gì"
        ])

        top_chunks = self.search_transcript(video_id=video_id, query=message, limit=5)
        citations = []
        context_snippets = []

        for c in top_chunks:
            spk = c.get("speaker") or "Speaker"
            citations.append({
                "video_id": video_id,
                "start_time": c.get("start_time", 0.0),
                "end_time": c.get("end_time", 0.0),
                "timestamp_formatted": c.get("timestamp_formatted", "00:00"),
                "text": c.get("text", ""),
                "speaker": spk,
            })
            context_snippets.append(f"[{c.get('timestamp_formatted', '00:00')}] ({spk}): {c.get('text', '')}")

        # If user asks for summary/overview, enrich citations with video chapters if available
        if is_summary_intent:
            chapters = self.get_chapters(video_id)
            if not chapters:
                try:
                    chapters = self.generate_chapters(video_id)
                except Exception:
                    chapters = []
            for ch in chapters[:4]:
                st = ch.get("start_time", 0.0)
                citations.append({
                    "video_id": video_id,
                    "start_time": st,
                    "end_time": ch.get("end_time", st + 5.0),
                    "timestamp_formatted": _format_timestamp(st),
                    "text": f"Chương: {ch.get('title', 'Chapter')} - {ch.get('summary', '')}",
                    "speaker": "Chapter",
                })

        # Step 2: Formulate Assistant Answer via LLM with Fallback
        llm_reply = None
        try:
            from app.services.llm_service import LLMService
            llm_service = LLMService()
            llm_reply = llm_service.generate_chat_answer(
                question=message.strip(),
                video_title=video_title,
                citations=citations,
                model_name=model_name,
                tone=tone,
            )
        except Exception as e:
            logger.warning(f"[Chat] LLM answer generation fallback: {e}")

        if llm_reply:
            reply = llm_reply
        elif is_summary_intent:
            # High-quality structured heuristic summary when LLM is unavailable
            chapters = self.get_chapters(video_id)
            if chapters:
                ch_lines = "\n".join([
                    f"- [{_format_timestamp(ch.get('start_time', 0.0))}]: {ch.get('title', 'Phân đoạn')} - {ch.get('summary', '')}"
                    for ch in chapters
                ])
                reply = (
                    f"Tổng kết nội dung video **{video_title}** (thời lượng {_format_timestamp(duration_sec)}):\n\n"
                    f"{ch_lines}\n\n"
                    f"Bạn có thể nhấp vào các mốc thời gian trên để tua đến từng phần nội dung tương ứng."
                )
            elif citations:
                snippets_formatted = "\n".join(
                    [f"- [{c['timestamp_formatted']}]: \"{c['text']}\"" for c in citations[:4]]
                )
                reply = (
                    f"Tổng hợp các ý nổi bật trong video **{video_title}**:\n\n"
                    f"{snippets_formatted}\n\n"
                    f"Nhấn vào các mốc thời gian để xem trực tiếp phân đoạn trong video."
                )
            else:
                reply = (
                    f"Video **{video_title}** có thời lượng {_format_timestamp(duration_sec)}. "
                    f"Chưa ghi nhận đủ câu thoại rõ ràng để tổng kết chi tiết. Bạn có thể kiểm tra danh sách phụ đề của video."
                )
        elif citations:
            best = citations[0]
            best_ts = best["timestamp_formatted"]
            if len(citations) == 1:
                reply = (
                    f"Dựa trên nội dung video, thông tin bạn cần được đề cập tại mốc thời gian [{best_ts}]:\n\n"
                    f"> \"{best['text']}\"\n\n"
                    f"Bạn có thể nhấn vào mốc [{best_ts}] để xem trực tiếp đoạn này trong trình phát."
                )
            else:
                snippets_formatted = "\n".join(
                    [f"- [{c['timestamp_formatted']}]: \"{c['text']}\"" for c in citations[:3]]
                )
                reply = (
                    f"Dựa trên nội dung video, tôi tìm thấy các đoạn liên quan đến câu hỏi của bạn:\n\n"
                    f"{snippets_formatted}\n\n"
                    f"Trong đó, phân đoạn rõ ràng nhất nằm ở [{best_ts}]. Nhấn vào các mốc thời gian trên để tua đến phân cảnh tương ứng."
                )
        else:
            # General summary or fallback when exact keywords are not spoken
            reply = (
                f"Tôi đã rà soát toàn bộ bản ghi giọng nói của video **{video_title}** (thời lượng {_format_timestamp(duration_sec)}), "
                f"tuy nhiên chưa tìm thấy câu thoại nào đề cập trực tiếp đến nội dung bạn vừa hỏi. "
                f"Bạn có thể thử tìm kiếm với các từ khóa ngắn gọn hơn hoặc xem danh sách Chapters của video."
            )


        # Step 3: Persist messages in DB
        now = datetime.utcnow()
        user_record = VideoChatMessage(
            video_id=video_id,
            user_id=user_id,
            role="user",
            message=message.strip(),
            citations=[],
            created_at=now,
        )
        self.db.add(user_record)
        self.db.commit()

        asst_record = VideoChatMessage(
            video_id=video_id,
            user_id=user_id,
            role="assistant",
            message=reply,
            citations=citations,
            created_at=now,
        )
        self.db.add(asst_record)
        self.db.commit()
        self.db.refresh(asst_record)

        return {
            "id": asst_record.get("id"),
            "video_id": video_id,
            "role": "assistant",
            "message": reply,
            "citations": citations,
            "created_at": now.isoformat(),
        }

    def chat_with_project(
        self,
        project_id: int,
        user_id: int,
        message: str,
        model_name: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Workspace-Level RAG Chat Agent:
        Synthesizes answers across ALL videos in a workspace project with clickable citations.
        """
        if not message or not message.strip():
            raise ValueError("Message cannot be empty.")

        project = self.db.query(Project).filter(Project.id == project_id, Project.owner_id == user_id).first()
        if not project:
            raise ValueError(f"Project #{project_id} not found or unauthorized.")

        project_name = project.get("name") or f"Project #{project_id}"

        # 1. Search across project
        top_chunks = self.search_project_transcripts(project_id=project_id, query=message, user_id=user_id, limit=5)

        citations = []
        for c in top_chunks:
            citations.append({
                "video_id": c.get("video_id"),
                "video_title": c.get("video_title", "Video"),
                "start_time": c.get("start_time"),
                "end_time": c.get("end_time"),
                "timestamp_formatted": c.get("timestamp_formatted"),
                "text": c.get("text"),
                "translated_text": c.get("translated_text"),
            })

        if citations:
            llm_reply = None
            try:
                from app.services.llm_service import LLMService
                llm_service = LLMService()
                llm_reply = llm_service.generate_chat_answer(
                    question=message.strip(),
                    video_title=f"Dự án {project_name}",
                    citations=citations,
                    model_name=model_name,
                    tone=tone,
                )
            except Exception as e:
                logger.warning(f"[ProjectChat] LLM answer generation fallback: {e}")

            if llm_reply:
                reply = llm_reply
            else:
                best = citations[0]
                best_vtitle = clean_media_title(best.get("video_title"))
                best_ts = best.get("timestamp_formatted", "00:00")

                # Group citations by video to eliminate repetitive filenames
                grouped_by_video: Dict[str, List[Dict[str, Any]]] = {}
                for c in citations:
                    vt = clean_media_title(c.get("video_title"))
                    if vt not in grouped_by_video:
                        grouped_by_video[vt] = []
                    grouped_by_video[vt].append(c)

                # Format clean hierarchial summary
                blocks = []
                for vname, vcitations in grouped_by_video.items():
                    c_lines = []
                    for c in vcitations[:3]:
                        trans_note = f" (Dịch: \"{c['translated_text']}\")" if c.get("translated_text") else ""
                        c_lines.append(f"  - [{c['timestamp_formatted']}]: \"{c['text']}\"{trans_note}")
                    blocks.append(f"Video {vname}:\n" + "\n".join(c_lines))

                snippets_formatted = "\n\n".join(blocks)
                reply = (
                    f"Trong không gian làm việc {project_name}, tôi tìm thấy các nội dung liên quan:\n\n"
                    f"{snippets_formatted}\n\n"
                    f"Đoạn phù hợp nhất nằm ở video {best_vtitle} tại mốc [{best_ts}]. "
                    f"Bạn có thể nhấn vào mốc thời gian để xem chi tiết."
                )
        else:
            reply = (
                f"Tôi đã rà soát toàn bộ video trong Workspace {project_name}, "
                f"nhưng chưa tìm thấy phân đoạn nào liên quan trực tiếp đến câu hỏi của bạn. "
                f"Hãy thử dùng từ khóa ngắn gọn hơn hoặc câu hỏi cụ thể hơn."
            )

        now = datetime.utcnow()
        return {
            "project_id": project_id,
            "role": "assistant",
            "message": reply,
            "citations": citations,
            "created_at": now.isoformat(),
        }

    def search_workspace_transcripts(
        self,
        user_id: int,
        query: str,
        limit: int = 15,
    ) -> List[Dict[str, Any]]:
        """
        Cross-Project Semantic Search across ALL workspace projects and videos owned by a user.
        Integrates FAISS vector index retrieval with project/video metadata.
        """
        if not query or not query.strip():
            return []

        user_projects = self.db.query(Project).filter(
            Project.owner_id == user_id,
            Project.status != "trash",
            Project.deleted_at == None
        ).all()

        if not user_projects:
            return []

        project_map = {}
        for p in user_projects:
            pid = p.get("id") if hasattr(p, "get") else getattr(p, "id", None)
            pname = p.get("name") if hasattr(p, "get") else getattr(p, "name", "Project")
            if pid:
                project_map[pid] = pname

        all_results: List[Dict[str, Any]] = []

        # 1. Search across each project's FAISS index
        for pid, pname in project_map.items():
            try:
                proj_results = self.search_project_transcripts(
                    project_id=pid,
                    query=query,
                    user_id=user_id,
                    limit=limit
                )
                for r in proj_results:
                    r["project_id"] = pid
                    r["project_name"] = pname
                    all_results.append(r)
            except Exception as e:
                logger.warning(f"[Workspace Search] Error searching project {pid}: {e}")

        # 2. Sort all combined results by relevance score descending
        all_results.sort(key=lambda x: x.get("relevance_score", 0.0), reverse=True)
        return all_results[:limit]

    def chat_with_workspace(
        self,
        user_id: int,
        message: str,
        model_name: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Global Workspace-Level RAG Q&A Assistant:
        Answers questions across ALL projects and videos owned by the user.
        Provides clickable citations with project_id and video_id.
        """
        if not message or not message.strip():
            raise ValueError("Message cannot be empty.")

        top_chunks = self.search_workspace_transcripts(user_id=user_id, query=message, limit=6)

        citations = []
        for c in top_chunks:
            citations.append({
                "project_id": c.get("project_id"),
                "project_name": c.get("project_name", "Project"),
                "video_id": c.get("video_id"),
                "video_title": c.get("video_title", "Video"),
                "start_time": c.get("start_time"),
                "end_time": c.get("end_time"),
                "timestamp_formatted": c.get("timestamp_formatted"),
                "text": c.get("text"),
                "translated_text": c.get("translated_text"),
            })

        if citations:
            llm_reply = None
            try:
                from app.services.llm_service import LLMService
                llm_service = LLMService()
                llm_reply = llm_service.generate_chat_answer(
                    question=message.strip(),
                    video_title="Toàn bộ không gian làm việc (Workspace)",
                    citations=citations,
                    model_name=model_name,
                    tone=tone,
                )
            except Exception as e:
                logger.warning(f"[WorkspaceChat] LLM answer generation fallback: {e}")

            if llm_reply:
                reply = llm_reply
            else:
                best = citations[0]
                best_pname = best.get("project_name") or "Dự án"
                best_vtitle = clean_media_title(best.get("video_title"))
                best_ts = best.get("timestamp_formatted", "00:00")

                # Hierarchical grouping: Project -> Video -> Citations
                grouped: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
                for c in citations:
                    pname = c.get("project_name") or "Dự án"
                    vtitle = clean_media_title(c.get("video_title"))
                    if pname not in grouped:
                        grouped[pname] = {}
                    if vtitle not in grouped[pname]:
                        grouped[pname][vtitle] = []
                    grouped[pname][vtitle].append(c)

                # Format clean hierarchical representation
                proj_blocks = []
                for pname, vids in grouped.items():
                    vid_blocks = []
                    for vtitle, vcitations in vids.items():
                        c_lines = []
                        for c in vcitations[:3]:
                            trans_note = f" (Dịch: \"{c['translated_text']}\")" if c.get("translated_text") else ""
                            c_lines.append(f"    - [{c['timestamp_formatted']}]: \"{c['text']}\"{trans_note}")
                        vid_blocks.append(f"  Video {vtitle}:\n" + "\n".join(c_lines))
                    proj_blocks.append(f"Dự án {pname}:\n" + "\n".join(vid_blocks))

                snippets_formatted = "\n\n".join(proj_blocks)
                reply = (
                    f"Dựa trên rà soát các video trong Workspace của bạn:\n\n"
                    f"{snippets_formatted}\n\n"
                    f"Nội dung phù hợp nhất thuộc dự án {best_pname} (video {best_vtitle}) tại mốc [{best_ts}]. "
                    f"Bạn có thể nhấn vào mốc thời gian để xem chi tiết video."
                )
        else:
            reply = (
                f"Tôi đã rà soát toàn bộ các dự án và video trong Workspace của bạn, "
                f"nhưng chưa tìm thấy đoạn hội thoại nào liên quan đến câu hỏi của bạn. "
                f"Bạn có thể thử tìm kiếm với các từ khóa khác xem sao nhé!"
            )

        now = datetime.utcnow()
        return {
            "role": "assistant",
            "message": reply,
            "citations": citations,
            "created_at": now.isoformat(),
        }



