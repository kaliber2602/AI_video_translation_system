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
    avatar TEXT,
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
-- DEFAULT USER SETTINGS TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (
        user_id,
        theme,
        language,
        default_target_language,
        default_translation_model,
        default_tts_model
    )
    VALUES (
        NEW.id,
        'default_theme',
        'en',
        NULL,
        NULL,
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_create_default_user_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_user_settings();

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

-- =========================================================
-- SUBSCRIPTION PLANS & RESOURCES
-- =========================================================

CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_resources (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_key VARCHAR(100) NOT NULL,
    limit_value VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_plan_resources_plan
        FOREIGN KEY (plan_id)
        REFERENCES plans(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_plan_resource
        UNIQUE (plan_id, resource_key)
);

CREATE TABLE storage_addons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    storage_bytes BIGINT NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_subscriptions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_subscriptions_plan
        FOREIGN KEY (plan_id)
        REFERENCES plans(id)
        ON DELETE RESTRICT
);

CREATE TABLE user_storage_addons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    addon_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_storage_addons_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_storage_addons_addon
        FOREIGN KEY (addon_id)
        REFERENCES storage_addons(id)
        ON DELETE RESTRICT
);

CREATE TABLE user_consumable_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    credits_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_consumable_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_user_consumable_period
        UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX idx_plan_resources_plan_id ON plan_resources(plan_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_storage_addons_user_id ON user_storage_addons(user_id);
CREATE INDEX idx_user_consumable_usage_user_id ON user_consumable_usage(user_id);

-- =========================================================
-- DEFAULT USER SUBSCRIPTION TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION assign_default_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id INTEGER;
BEGIN
    SELECT id INTO free_plan_id FROM plans WHERE code = 'free' LIMIT 1;
    IF free_plan_id IS NOT NULL THEN
        INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
        VALUES (NEW.id, free_plan_id, 'active', CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_default_user_subscription
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION assign_default_user_subscription();

-- =========================================================
-- SEED INITIAL PLANS & RESOURCES
-- =========================================================

INSERT INTO plans (code, name, description, price_monthly, price_yearly, is_popular, display_order)
VALUES
    ('free', 'Free', 'For trying the platform and personal use', 0.00, 0.00, FALSE, 1),
    ('pro', 'Pro', 'For creators, freelancers and professionals', 12.00, 120.00, TRUE, 2),
    ('business', 'Business', 'For teams, studios and scaling organizations', 49.00, 490.00, FALSE, 3);

-- FREE RESOURCES
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'STORAGE', 'storage_bytes', '5368709120', 'bytes' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'CONSUMABLE', 'ai_credits_monthly', '1000', 'credits' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_file_size_bytes', '524288000', 'bytes' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_video_duration_seconds', '1800', 'seconds' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_upload_resolution', '1080p', 'resolution' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_processing_resolution', '720p', 'resolution' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_streaming_resolution', '720p', 'resolution' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_export_resolution', '720p', 'resolution' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_concurrent_jobs', '1', 'count' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_projects', '5', 'count' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'ai_translation', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'text_to_speech', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'speaker_diarization', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'hls_streaming', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'video_editor', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'document_export', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'smart_subtitles', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'batch_processing', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'api_access', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'priority_processing', 'true', 'boolean' FROM plans WHERE code = 'free';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'team_workspace', 'true', 'boolean' FROM plans WHERE code = 'free';

-- PRO RESOURCES
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'STORAGE', 'storage_bytes', '107374182400', 'bytes' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'CONSUMABLE', 'ai_credits_monthly', '10000', 'credits' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_file_size_bytes', '5368709120', 'bytes' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_video_duration_seconds', '14400', 'seconds' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_upload_resolution', '4K', 'resolution' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_processing_resolution', '1080p', 'resolution' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_streaming_resolution', '1080p', 'resolution' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_export_resolution', '1080p', 'resolution' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_concurrent_jobs', '3', 'count' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_projects', '50', 'count' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'ai_translation', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'text_to_speech', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'speaker_diarization', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'hls_streaming', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'video_editor', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'document_export', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'smart_subtitles', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'batch_processing', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'api_access', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'priority_processing', 'true', 'boolean' FROM plans WHERE code = 'pro';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'team_workspace', 'true', 'boolean' FROM plans WHERE code = 'pro';

-- BUSINESS RESOURCES
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'STORAGE', 'storage_bytes', '1099511627776', 'bytes' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'CONSUMABLE', 'ai_credits_monthly', '100000', 'credits' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_file_size_bytes', '21474836480', 'bytes' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_video_duration_seconds', '43200', 'seconds' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_upload_resolution', '4K', 'resolution' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_processing_resolution', '4K', 'resolution' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_streaming_resolution', '4K', 'resolution' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_export_resolution', '4K', 'resolution' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_concurrent_jobs', '10', 'count' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_projects', '500', 'count' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'ai_translation', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'text_to_speech', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'speaker_diarization', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'hls_streaming', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'video_editor', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'document_export', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'smart_subtitles', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'batch_processing', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'api_access', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'priority_processing', 'true', 'boolean' FROM plans WHERE code = 'business';
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'team_workspace', 'true', 'boolean' FROM plans WHERE code = 'business';

-- STORAGE ADD-ONS
INSERT INTO storage_addons (code, name, storage_bytes, price_monthly, price_yearly, display_order)
VALUES
    ('addon_50gb', '+50 GB Storage', 53687091200, 2.00, 20.00, 1),
    ('addon_200gb', '+200 GB Storage', 214748364800, 6.00, 60.00, 2),
    ('addon_500gb', '+500 GB Storage', 536870912000, 10.00, 100.00, 3),
    ('addon_1tb', '+1 TB Storage', 1099511627776, 15.00, 150.00, 4);

COMMIT;