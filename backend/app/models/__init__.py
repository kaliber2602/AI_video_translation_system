# app/models/__init__.py - Pure Python Domain Table Models (Zero SQLAlchemy)
from app.core.database import TableModel, Base

# Model descriptors mapping table names to domain entities
Video = TableModel("videos")
VideoPipelineConfig = TableModel("video_pipeline_configs")
PipelineJob = TableModel("pipeline_jobs")
PipelineTaskLog = TableModel("pipeline_task_logs")
User = TableModel("users")
UserSettings = TableModel("user_settings")
Project = TableModel("projects")
ProjectFolder = TableModel("project_folders")
ProjectMember = TableModel("project_members")
ProjectGlossary = TableModel("project_glossary")
Tag = TableModel("tags")
ProjectTag = TableModel("project_tags")
Plan = TableModel("plans")
PlanResource = TableModel("plan_resources")
UserSubscription = TableModel("user_subscriptions")
StorageAddon = TableModel("storage_addons")
UserStorageAddon = TableModel("user_storage_addons")
SpeakerProfile = TableModel("speaker_profiles")
TranscriptSegment = TableModel("transcript_segments")
TranslationSegment = TableModel("translation_segments")
SubtitleSegment = TableModel("subtitle_segments")
VideoChapter = TableModel("video_chapters")
VideoDocument = TableModel("video_documents")
VideoEmbedding = TableModel("video_embeddings")
AIModel = TableModel("ai_models")
VideoRenderOutput = TableModel("video_render_outputs")

__all__ = [
    'Base',
    'Video',
    'VideoPipelineConfig',
    'PipelineJob',
    'PipelineTaskLog',
    'User',
    'UserSettings',
    'Project',
    'ProjectFolder',
    'ProjectMember',
    'ProjectGlossary',
    'Tag',
    'ProjectTag',
    'Plan',
    'PlanResource',
    'UserSubscription',
    'StorageAddon',
    'UserStorageAddon',
    'SpeakerProfile',
    'TranscriptSegment',
    'TranslationSegment',
    'SubtitleSegment',
    'VideoChapter',
    'VideoDocument',
    'VideoEmbedding',
    'AIModel',
    'VideoRenderOutput',
]