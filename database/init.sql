-- =========================================================
-- AI VIDEO TRANSLATION SYSTEM
-- PostgreSQL Database Initialization
-- =========================================================

BEGIN;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- USER SETTINGS
-- =========================================================

CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(20) DEFAULT 'en',
    default_target_language VARCHAR(20),
    default_translation_model VARCHAR(100),
    default_tts_model VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================================
-- Refreshtokens
-- =========================================================


CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
    ON refresh_tokens(expires_at);


-- =========================================================
-- PROJECTS
-- =========================================================

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_path TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_projects_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =========================================================
-- TAGS
-- =========================================================

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tags_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_tags_user_name
        UNIQUE (user_id, name)
);

-- =========================================================
-- PROJECT TAGS
-- =========================================================

CREATE TABLE project_tags (
    project_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (project_id, tag_id),

    CONSTRAINT fk_project_tags_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_tags_tag
        FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
);

-- =========================================================
-- PROJECT GLOSSARY
-- =========================================================

CREATE TABLE project_glossary (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    source_term VARCHAR(255) NOT NULL,
    target_term VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_glossary_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
);

-- =========================================================
-- VIDEOS
-- =========================================================

CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,

    title VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500),

    original_path TEXT,
    extracted_vocal_path TEXT,
    background_music_path TEXT,

    transcript_path TEXT,
    subtitle_path TEXT,
    dubbed_audio_path TEXT,
    output_path TEXT,

    duration DOUBLE PRECISION,
    fps DOUBLE PRECISION,
    resolution VARCHAR(50),

    status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    current_step VARCHAR(100),
    progress INTEGER NOT NULL DEFAULT 0,

    error_message TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_videos_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_videos_progress
        CHECK (progress >= 0 AND progress <= 100)
);

-- =========================================================
-- SPEAKER PROFILES
-- =========================================================

CREATE TABLE speaker_profiles (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,

    speaker_label VARCHAR(100) NOT NULL,
    voice_sample_path TEXT,
    voice_description TEXT,
    language VARCHAR(20),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_speaker_profiles_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);

-- =========================================================
-- TRANSCRIPT SEGMENTS
-- =========================================================

CREATE TABLE transcript_segments (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    speaker_id INTEGER,

    sequence INTEGER NOT NULL,
    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL,

    original_text TEXT NOT NULL,
    language VARCHAR(20),
    confidence DOUBLE PRECISION,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transcript_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_transcript_speaker
        FOREIGN KEY (speaker_id)
        REFERENCES speaker_profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_transcript_time
        CHECK (end_time >= start_time),

    CONSTRAINT chk_transcript_confidence
        CHECK (
            confidence IS NULL
            OR (confidence >= 0 AND confidence <= 1)
        )
);

-- =========================================================
-- TRANSLATION SEGMENTS
-- =========================================================

CREATE TABLE translation_segments (
    id SERIAL PRIMARY KEY,
    transcript_segment_id INTEGER NOT NULL,

    target_language VARCHAR(20) NOT NULL,

    translated_text TEXT,
    edited_text TEXT,

    translation_model VARCHAR(100),
    is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_translation_transcript
        FOREIGN KEY (transcript_segment_id)
        REFERENCES transcript_segments(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_translation_language
        UNIQUE (transcript_segment_id, target_language)
);

-- =========================================================
-- SUBTITLE SEGMENTS
-- =========================================================

CREATE TABLE subtitle_segments (
    id SERIAL PRIMARY KEY,
    translation_segment_id INTEGER NOT NULL,

    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL,

    subtitle_text TEXT NOT NULL,
    subtitle_format VARCHAR(50),
    style_json JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_subtitle_translation
        FOREIGN KEY (translation_segment_id)
        REFERENCES translation_segments(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_subtitle_time
        CHECK (end_time >= start_time)
);

-- =========================================================
-- VIDEO COMMENTS
-- =========================================================

CREATE TABLE video_comments (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    step VARCHAR(100),
    "timestamp" DOUBLE PRECISION,

    comment TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_comments_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_video_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =========================================================
-- ACTIVITY LOGS
-- =========================================================

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,

    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id INTEGER,

    metadata JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_activity_logs_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_projects_owner_id
    ON projects(owner_id);

CREATE INDEX idx_project_tags_tag_id
    ON project_tags(tag_id);

CREATE INDEX idx_project_glossary_project_id
    ON project_glossary(project_id);

CREATE INDEX idx_videos_project_id
    ON videos(project_id);

CREATE INDEX idx_videos_status
    ON videos(status);

CREATE INDEX idx_speaker_profiles_video_id
    ON speaker_profiles(video_id);

CREATE INDEX idx_transcript_segments_video_id
    ON transcript_segments(video_id);

CREATE INDEX idx_transcript_segments_sequence
    ON transcript_segments(video_id, sequence);

CREATE INDEX idx_translation_segments_transcript_id
    ON translation_segments(transcript_segment_id);

CREATE INDEX idx_subtitle_segments_translation_id
    ON subtitle_segments(translation_segment_id);

CREATE INDEX idx_video_comments_video_id
    ON video_comments(video_id);

CREATE INDEX idx_video_comments_user_id
    ON video_comments(user_id);

CREATE INDEX idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX idx_notifications_unread
    ON notifications(user_id, is_read);

CREATE INDEX idx_activity_logs_project_id
    ON activity_logs(project_id);

CREATE INDEX idx_activity_logs_user_id
    ON activity_logs(user_id);

COMMIT;