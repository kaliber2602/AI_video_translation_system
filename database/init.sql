-- =========================================================
-- AI VIDEO TRANSLATION & VIDEO UNDERSTANDING PLATFORM
-- PostgreSQL Comprehensive Database Initialization (Full Schema)
-- =========================================================

BEGIN;

-- =========================================================
-- MODULE 1: USERS, AUTHENTICATION & PREFERENCES
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

CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(20) DEFAULT 'en',
    default_target_language VARCHAR(20) DEFAULT 'vi',
    
    -- AI Model Preferences per Stage
    default_separation_model VARCHAR(100) DEFAULT 'demucs_v4',
    default_stt_model VARCHAR(100) DEFAULT 'whisperx_large_v3',
    default_diarization_model VARCHAR(100) DEFAULT 'pyannote_3.1',
    default_translation_model VARCHAR(100) DEFAULT 'nllb_200_1.3b',
    default_tts_model VARCHAR(100) DEFAULT 'xtts_v2',
    default_llm_model VARCHAR(100) DEFAULT 'gpt_4o',
    default_embedding_model VARCHAR(100) DEFAULT 'qwen3_embedding',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (
        user_id,
        theme,
        language,
        default_target_language,
        default_separation_model,
        default_stt_model,
        default_diarization_model,
        default_translation_model,
        default_tts_model,
        default_llm_model,
        default_embedding_model
    )
    VALUES (
        NEW.id,
        'light',
        'en',
        'vi',
        'demucs_v4',
        'whisperx_large_v3',
        'pyannote_3.1',
        'nllb_200_1.3b',
        'xtts_v2',
        'gpt_4o',
        'qwen3_embedding'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_user_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_user_settings();

CREATE TABLE user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    
    -- Email Channels
    email_on_pipeline_success BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_pipeline_failed BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_quota_warning BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_project_invitation BOOLEAN NOT NULL DEFAULT TRUE,
    email_on_comment_mention BOOLEAN NOT NULL DEFAULT TRUE,

    -- In-App Channels
    inapp_on_pipeline_success BOOLEAN NOT NULL DEFAULT TRUE,
    inapp_on_pipeline_failed BOOLEAN NOT NULL DEFAULT TRUE,
    inapp_on_quota_warning BOOLEAN NOT NULL DEFAULT TRUE,
    inapp_on_project_invitation BOOLEAN NOT NULL DEFAULT TRUE,
    inapp_on_comment_mention BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_notification_pref_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION create_default_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_notification_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_user_notification_preferences();

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

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,

    type VARCHAR(50) NOT NULL DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    target_type VARCHAR(50),
    target_id INTEGER,
    metadata JSONB,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

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
        ON DELETE CASCADE
);

-- =========================================================
-- MODULE 2: SUBSCRIPTIONS, QUOTAS & FINANCIAL AUDIT
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
    resource_type VARCHAR(50) NOT NULL, -- STORAGE, CONSUMABLE, LIMIT, FEATURE
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

CREATE TABLE credit_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    video_id INTEGER,
    job_id UUID,
    service_type VARCHAR(50) NOT NULL, -- stt, translation, tts, video_understanding, embedding
    credits_deducted INTEGER NOT NULL,
    balance_after INTEGER,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_credit_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL, -- stripe, paypal, vnpay, momo
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

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
-- MODULE 3: PROJECTS, KNOWLEDGE BASE & SHARING
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

CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    invitation_token VARCHAR(255) UNIQUE,
    invited_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_members_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_members_inviter
        FOREIGN KEY (invited_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_project_members_role
        CHECK (role IN ('viewer', 'commenter', 'editor', 'admin')),

    CONSTRAINT chk_project_members_status
        CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),

    CONSTRAINT uq_project_member
        UNIQUE (project_id, email)
);

CREATE TABLE project_share_links (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    permission VARCHAR(50) NOT NULL DEFAULT 'view',
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    allow_export_docs BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_share_links_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_share_links_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_project_share_links_permission
        CHECK (permission IN ('view', 'comment', 'edit'))
);

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
-- MODULE 4: AI MODELS CATALOG & PIPELINE CONFIGS
-- =========================================================

CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- separation, stt, diarization, translation, tts, llm, embedding
    provider VARCHAR(50) NOT NULL, -- local, openai, elevenlabs, anthropic, google
    credit_cost_per_minute INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    required_plan VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro, business
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- MODULE 5: VIDEOS & AI PROCESSING PIPELINE
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

CREATE TABLE video_pipeline_configs (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL UNIQUE,

    -- Models selected for this video
    separation_model VARCHAR(100) DEFAULT 'demucs_v4',
    stt_model VARCHAR(100) DEFAULT 'whisperx_large_v3',
    diarization_model VARCHAR(100) DEFAULT 'pyannote_3.1',
    translation_model VARCHAR(100) DEFAULT 'nllb_200_1.3b',
    tts_model VARCHAR(100) DEFAULT 'xtts_v2',
    llm_model VARCHAR(100) DEFAULT 'gpt_4o',
    embedding_model VARCHAR(100) DEFAULT 'qwen3_embedding',

    -- Language Settings
    source_language VARCHAR(20),
    target_language VARCHAR(20) NOT NULL DEFAULT 'vi',

    -- Audio Cleaning & Filters
    enable_noise_reduction BOOLEAN NOT NULL DEFAULT TRUE,
    enable_audio_normalization BOOLEAN NOT NULL DEFAULT TRUE,
    enable_vocal_isolation BOOLEAN NOT NULL DEFAULT TRUE,
    enable_filler_word_removal BOOLEAN NOT NULL DEFAULT FALSE,

    -- Automations
    auto_generate_subtitles BOOLEAN NOT NULL DEFAULT TRUE,
    auto_generate_dubbing BOOLEAN NOT NULL DEFAULT TRUE,
    auto_chapter_detection BOOLEAN NOT NULL DEFAULT TRUE,
    auto_generate_summary BOOLEAN NOT NULL DEFAULT TRUE,
    voice_speed DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_pipeline_configs_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);

CREATE TABLE speaker_profiles (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,

    speaker_label VARCHAR(100) NOT NULL,
    voice_sample_path TEXT,
    voice_embedding_path TEXT,
    voice_description TEXT,
    language VARCHAR(20),
    gender VARCHAR(20),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_speaker_profiles_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);

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

CREATE TABLE video_render_outputs (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    target_language VARCHAR(20) NOT NULL,
    resolution VARCHAR(50) DEFAULT '1080p',
    format VARCHAR(20) DEFAULT 'mp4',
    
    dubbed_audio_path TEXT,
    subtitle_path TEXT,
    output_video_path TEXT,
    file_size_bytes BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- processing, completed, failed
    error_message TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_render_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_video_render_target
        UNIQUE (video_id, target_language, resolution)
);

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
-- MODULE 6: VIDEO UNDERSTANDING, CHAPTERING & STRUCTURED DOCS
-- =========================================================

CREATE TABLE video_chapters (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    thumbnail_path TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_chapters_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_chapter_time
        CHECK (end_time >= start_time)
);

CREATE TABLE video_documents (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    doc_type VARCHAR(50) NOT NULL, -- markdown, docx, pdf, html
    title VARCHAR(255) NOT NULL,
    file_path TEXT,
    content_markdown TEXT,
    file_size_bytes BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_documents_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);

-- =========================================================
-- MODULE 7: SEMANTIC SEARCH & VECTOR EMBEDDINGS
-- =========================================================

CREATE TABLE video_embeddings (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    transcript_segment_id INTEGER,
    chapter_id INTEGER,
    vector_id VARCHAR(100) NOT NULL, -- Reference ID in FAISS/Qdrant/Milvus
    model_name VARCHAR(100) NOT NULL DEFAULT 'qwen3_embedding',
    chunk_text TEXT NOT NULL,
    start_time DOUBLE PRECISION,
    end_time DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_embeddings_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_video_embeddings_segment
        FOREIGN KEY (transcript_segment_id)
        REFERENCES transcript_segments(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_video_embeddings_chapter
        FOREIGN KEY (chapter_id)
        REFERENCES video_chapters(id)
        ON DELETE CASCADE
);

-- =========================================================
-- MODULE 8: ASYNCHRONOUS PIPELINE JOBS & TASK LOGS
-- =========================================================

CREATE TABLE pipeline_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id INTEGER NOT NULL,
    triggered_by INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed, cancelled
    current_step VARCHAR(100), -- extract_audio, demucs, whisperx, translation, tts, render, llm, embedding
    progress INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    config_json JSONB,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pipeline_jobs_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pipeline_jobs_user
        FOREIGN KEY (triggered_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE pipeline_task_logs (
    id SERIAL PRIMARY KEY,
    job_id UUID NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    worker_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, success, failed, retrying
    retry_count INTEGER NOT NULL DEFAULT 0,
    duration_ms BIGINT,
    log_output TEXT,
    error_trace TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pipeline_task_logs_job
        FOREIGN KEY (job_id)
        REFERENCES pipeline_jobs(id)
        ON DELETE CASCADE
);

CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ALL INDEXES
-- =========================================================

CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_share_links_token ON project_share_links(token);

CREATE INDEX idx_project_tags_tag_id ON project_tags(tag_id);
CREATE INDEX idx_project_glossary_project_id ON project_glossary(project_id);

CREATE INDEX idx_videos_project_id ON videos(project_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_video_pipeline_configs_video ON video_pipeline_configs(video_id);

CREATE INDEX idx_speaker_profiles_video_id ON speaker_profiles(video_id);
CREATE INDEX idx_transcript_segments_video_id ON transcript_segments(video_id);
CREATE INDEX idx_transcript_segments_sequence ON transcript_segments(video_id, sequence);
CREATE INDEX idx_transcript_segments_time ON transcript_segments(video_id, start_time);

CREATE INDEX idx_translation_segments_transcript_id ON translation_segments(transcript_segment_id);
CREATE INDEX idx_subtitle_segments_translation_id ON subtitle_segments(translation_segment_id);
CREATE INDEX idx_video_render_outputs_video ON video_render_outputs(video_id);

CREATE INDEX idx_video_chapters_video ON video_chapters(video_id);
CREATE INDEX idx_video_documents_video ON video_documents(video_id);
CREATE INDEX idx_video_embeddings_video ON video_embeddings(video_id);
CREATE INDEX idx_video_embeddings_time ON video_embeddings(video_id, start_time);

CREATE INDEX idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX idx_video_comments_user_id ON video_comments(user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

CREATE INDEX idx_plan_resources_plan_id ON plan_resources(plan_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_storage_addons_user_id ON user_storage_addons(user_id);
CREATE INDEX idx_user_consumable_usage_user_id ON user_consumable_usage(user_id);
CREATE INDEX idx_credit_audit_user ON credit_audit_logs(user_id);
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);

CREATE INDEX idx_pipeline_jobs_video ON pipeline_jobs(video_id);
CREATE INDEX idx_pipeline_jobs_status ON pipeline_jobs(status);
CREATE INDEX idx_pipeline_task_logs_job ON pipeline_task_logs(job_id);

-- =========================================================
-- SEED INITIAL AI MODELS
-- =========================================================

INSERT INTO ai_models (code, name, category, provider, credit_cost_per_minute, is_active, required_plan)
VALUES
    -- Separation
    ('demucs_v4', 'Demucs v4 Hybrid', 'separation', 'local', 1, TRUE, 'free'),
    ('mdx_net_karaoke', 'MDX-Net Extra Vocal', 'separation', 'local', 2, TRUE, 'pro'),
    
    -- STT
    ('whisperx_large_v3', 'WhisperX Large v3', 'stt', 'local', 1, TRUE, 'free'),
    ('whisper_turbo', 'Whisper Large v3 Turbo', 'stt', 'local', 1, TRUE, 'free'),
    ('google_chirp_2', 'Google Cloud Speech Chirp 2', 'stt', 'google', 3, TRUE, 'business'),

    -- Diarization
    ('pyannote_3.1', 'Pyannote Audio 3.1', 'diarization', 'local', 1, TRUE, 'free'),

    -- Translation
    ('nllb_200_1.3b', 'Meta NLLB-200 (1.3B)', 'translation', 'local', 1, TRUE, 'free'),
    ('nllb_200_3.3b', 'Meta NLLB-200 (3.3B High Fidelity)', 'translation', 'local', 2, TRUE, 'pro'),
    ('gpt_4o', 'OpenAI GPT-4o Localization', 'translation', 'openai', 3, TRUE, 'pro'),
    ('claude_3.5_sonnet', 'Anthropic Claude 3.5 Sonnet', 'translation', 'anthropic', 3, TRUE, 'business'),
    ('deepl_pro', 'DeepL Pro Neural MT', 'translation', 'local', 2, TRUE, 'pro'),

    -- TTS & Voice Cloning
    ('xtts_v2', 'Coqui XTTS v2 Voice Clone', 'tts', 'local', 2, TRUE, 'free'),
    ('qwen3_tts', 'Qwen3-TTS Neural Multilingual', 'tts', 'local', 2, TRUE, 'pro'),
    ('elevenlabs_multilingual_v2', 'ElevenLabs Multilingual v2', 'tts', 'elevenlabs', 5, TRUE, 'business'),
    ('azure_neural', 'Azure Cognitive Speech Neural', 'tts', 'local', 2, TRUE, 'pro'),

    -- LLM & Understanding
    ('gpt_4o_mini', 'GPT-4o Mini Chapter Generator', 'llm', 'openai', 1, TRUE, 'free'),
    ('qwen_2.5_72b', 'Qwen 2.5 72B Video Insight', 'llm', 'local', 2, TRUE, 'pro'),
    ('deepseek_v3', 'DeepSeek-V3 Structured Summary', 'llm', 'local', 1, TRUE, 'free'),

    -- Embedding
    ('qwen3_embedding', 'Qwen3-Embedding 1024d', 'embedding', 'local', 1, TRUE, 'free'),
    ('bge_m3', 'BGE-M3 Dense + Sparse Retrieval', 'embedding', 'local', 1, TRUE, 'pro')
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- SEED INITIAL PLANS & RESOURCES
-- =========================================================

INSERT INTO plans (code, name, description, price_monthly, price_yearly, is_popular, display_order)
VALUES
    ('free', 'Free', 'For trying the platform and personal use', 0.00, 0.00, FALSE, 1),
    ('pro', 'Pro', 'For creators, freelancers and professionals', 12.00, 120.00, TRUE, 2),
    ('business', 'Business', 'For teams, studios and scaling organizations', 49.00, 490.00, FALSE, 3)
ON CONFLICT (code) DO NOTHING;

-- FREE RESOURCES
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'STORAGE', 'storage_bytes', '5368709120', 'bytes' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'CONSUMABLE', 'ai_credits_monthly', '1000', 'credits' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_file_size_bytes', '524288000', 'bytes' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_video_duration_seconds', '1800', 'seconds' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_upload_resolution', '1080p', 'resolution' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_processing_resolution', '720p', 'resolution' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_streaming_resolution', '720p', 'resolution' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_export_resolution', '720p', 'resolution' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_concurrent_jobs', '1', 'count' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_projects', '5', 'count' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'ai_translation', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'text_to_speech', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'speaker_diarization', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'hls_streaming', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'video_editor', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'document_export', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'smart_subtitles', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'batch_processing', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'api_access', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'priority_processing', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'team_workspace', 'true', 'boolean' FROM plans WHERE code = 'free'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;

-- PRO RESOURCES
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'STORAGE', 'storage_bytes', '107374182400', 'bytes' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'CONSUMABLE', 'ai_credits_monthly', '10000', 'credits' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_file_size_bytes', '5368709120', 'bytes' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_video_duration_seconds', '14400', 'seconds' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_upload_resolution', '4K', 'resolution' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_processing_resolution', '1080p', 'resolution' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_streaming_resolution', '1080p', 'resolution' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_export_resolution', '1080p', 'resolution' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_concurrent_jobs', '3', 'count' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_projects', '50', 'count' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'ai_translation', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'text_to_speech', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'speaker_diarization', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'hls_streaming', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'video_editor', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'document_export', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'smart_subtitles', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'batch_processing', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'api_access', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'priority_processing', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'team_workspace', 'true', 'boolean' FROM plans WHERE code = 'pro'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;

-- BUSINESS RESOURCES
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'STORAGE', 'storage_bytes', '1099511627776', 'bytes' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'CONSUMABLE', 'ai_credits_monthly', '100000', 'credits' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_file_size_bytes', '21474836480', 'bytes' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_video_duration_seconds', '43200', 'seconds' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_upload_resolution', '4K', 'resolution' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_processing_resolution', '4K', 'resolution' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_streaming_resolution', '4K', 'resolution' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_export_resolution', '4K', 'resolution' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_concurrent_jobs', '10', 'count' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'LIMIT', 'max_projects', '500', 'count' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'ai_translation', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'text_to_speech', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'speaker_diarization', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'hls_streaming', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'video_editor', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'document_export', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'smart_subtitles', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'batch_processing', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'api_access', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'priority_processing', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;
INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
SELECT id, 'FEATURE', 'team_workspace', 'true', 'boolean' FROM plans WHERE code = 'business'
ON CONFLICT (plan_id, resource_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;

-- STORAGE ADD-ONS
INSERT INTO storage_addons (code, name, storage_bytes, price_monthly, price_yearly, display_order)
VALUES
    ('addon_50gb', '+50 GB Storage', 53687091200, 2.00, 20.00, 1),
    ('addon_200gb', '+200 GB Storage', 214748364800, 6.00, 60.00, 2),
    ('addon_500gb', '+500 GB Storage', 536870912000, 10.00, 100.00, 3),
    ('addon_1tb', '+1 TB Storage', 1099511627776, 15.00, 150.00, 4)
ON CONFLICT (code) DO NOTHING;

COMMIT;