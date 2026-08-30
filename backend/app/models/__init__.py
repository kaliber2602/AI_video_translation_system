# app/models/__init__.py
from sqlalchemy.ext.automap import automap_base
from app.core.database import engine

# Auto-generate models from existing database tables
Base = automap_base()
Base.prepare(autoload_with=engine)

# Map your tables to model names
Video = Base.classes.videos
VideoPipelineConfig = Base.classes.video_pipeline_configs
PipelineJob = Base.classes.pipeline_jobs
PipelineTaskLog = Base.classes.pipeline_task_logs
User = Base.classes.users
UserSettings = Base.classes.user_settings
Project = Base.classes.projects
ProjectMember = Base.classes.project_members
ProjectGlossary = Base.classes.project_glossary
Tag = Base.classes.tags
ProjectTag = Base.classes.project_tags
Plan = Base.classes.plans
PlanResource = Base.classes.plan_resources
UserSubscription = Base.classes.user_subscriptions
StorageAddon = Base.classes.storage_addons
UserStorageAddon = Base.classes.user_storage_addons
SpeakerProfile = Base.classes.speaker_profiles
TranscriptSegment = Base.classes.transcript_segments
TranslationSegment = Base.classes.translation_segments
SubtitleSegment = Base.classes.subtitle_segments
VideoChapter = Base.classes.video_chapters
VideoDocument = Base.classes.video_documents
VideoEmbedding = Base.classes.video_embeddings
AIModel = Base.classes.ai_models

__all__ = [
    'Base',
    'Video',
    'VideoPipelineConfig',
    'PipelineJob',
    'PipelineTaskLog',
    'User',
    'UserSettings',
    'Project',
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
]