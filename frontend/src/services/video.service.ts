import api from "./api/axios";
import type { VideoUpdateRequest } from "../types/video";

export interface MediaInfo {
  format?: string;
  duration?: number;
  size?: number;
  file_size?: number;
  bitrate?: number | string;
  video_codec?: string;
  width?: number;
  height?: number;
  fps?: number;
  audio_codec?: string;
  sample_rate?: number;
  channels?: number;
  audio_channels?: number;
  aspect_ratio?: string;
  resolution?: string;
  video?: {
    codec?: string;
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: number | string;
  };
  audio?: {
    codec?: string;
    sample_rate?: number;
    channels?: number;
    bitrate?: number | string;
  };
  raw?: Record<string, any>;
}

export const videoService = {
  // Upload with real progress tracking and folder support
  async uploadVideo(
    file: File,
    targetLanguage: string,
    projectId?: number,
    folderId?: number,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ) {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams({ target_language: targetLanguage });
    if (projectId) params.append("project_id", String(projectId));
    if (folderId) params.append("folder_id", String(folderId));

    const response = await api.post(`/api/videos/upload?${params.toString()}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Get single video details
  async getVideo(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}`);
    return response.data;
  },

  // Update video metadata / settings
  async updateVideo(videoId: number, payload: Partial<VideoUpdateRequest>) {
    const response = await api.patch(`/api/videos/${videoId}`, payload);
    return response.data;
  },

  // Save pipeline progress snapshot
  async savePipelineSnapshot(
    videoId: number,
    snapshot: {
      active_step?: number;
      current_step?: string;
      target_language?: string;
      progress?: number;
      state_data?: Record<string, any>;
    }
  ) {
    const response = await api.post(`/api/videos/${videoId}/snapshot`, snapshot);
    return response.data;
  },

  // 6-Tier Pipeline Config 2-Way Synchronization
  async getVideoPipelineConfig(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/pipeline-config`);
    return response.data;
  },

  async updateVideoPipelineConfig(videoId: number, configData: Record<string, any>, presetInfo?: { preset_id?: number; preset_name?: string }) {
    const response = await api.put(`/api/videos/${videoId}/pipeline-config`, {
      config_data: configData,
      ...(presetInfo || {}),
    });
    return response.data;
  },

  async saveVideoAsPreset(videoId: number, name: string, description?: string) {
    const response = await api.post(`/api/videos/${videoId}/save-as-preset`, {
      name,
      description,
    });
    return response.data;
  },

  // Media Inspector
  async getVideoMediaInfo(videoId: number): Promise<MediaInfo> {
    const response = await api.get(`/api/videos/${videoId}/media-info`);
    const data = response.data || {};
    return {
      ...data,
      video: {
        codec: data.video_codec || data.video?.codec,
        width: data.width || data.video?.width,
        height: data.height || data.video?.height,
        fps: data.fps || data.video?.fps,
        bitrate: data.bitrate || data.video?.bitrate,
      },
      audio: {
        codec: data.audio_codec || data.audio?.codec,
        sample_rate: data.sample_rate || data.audio?.sample_rate,
        channels: data.audio_channels || data.channels || data.audio?.channels,
        bitrate: data.audio?.bitrate,
      },
    };
  },

  // Single-Segment AI Rewrite
  async rewriteTranslationSegment(videoId: number, segmentId: number, mode: "shorter" | "casual" | "formal" | "catchy", currentText: string) {
    const response = await api.post(`/api/videos/${videoId}/translation/segments/${segmentId}/rewrite`, {
      mode,
      current_text: currentText,
    });
    return response.data;
  },

  // Single-Segment TTS Regeneration
  async regenerateSegmentTTS(videoId: number, segmentId: number, payload: { text: string; voice_id?: string; speed?: number; engine?: string }) {
    const response = await api.post(`/api/videos/${videoId}/tts/segments/${segmentId}`, payload);
    return response.data;
  },

  // Audio extraction
  async extractAudio(videoId: number) {
    const response = await api.post(`/api/videos/${videoId}/audio/extract`, {}, { timeout: 180000 });
    return response.data;
  },

  // Media Blobs (authenticated streams for in-browser playback)
  async getVideoBlob(videoId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/api/videos/${videoId}/original`, {
      responseType: "blob",
    });
    return response.data;
  },

  async getAudioBlob(videoId: number, language: string): Promise<Blob> {
    const response = await api.get<Blob>(`/api/videos/${videoId}/tts/${language}?preview=true`, {
      responseType: "blob",
    });
    if (response.data.size < 1024) {
      throw new Error(`TTS audio file is corrupted or empty (${response.data.size} bytes)`);
    }
    return response.data;
  },

  async getDubbedVideoBlob(videoId: number, language: string, format = "mp4", quality = "1080p"): Promise<Blob> {
    const response = await api.get<Blob>(`/api/videos/${videoId}/dub/${language}/download?format=${format}&quality=${encodeURIComponent(quality)}`, {
      responseType: "blob",
    });
    return response.data;
  },

  // List videos with filtering
  async listVideos(params?: {
    project_id?: number;
    folder_id?: number;
    root_only?: boolean;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.project_id) queryParams.append('project_id', String(params.project_id));
    if (params?.folder_id !== undefined && params?.folder_id !== null) {
      queryParams.append('folder_id', String(params.folder_id));
    }
    if (params?.root_only) queryParams.append('root_only', 'true');
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', String(params.limit || 100));
    if (params?.offset) queryParams.append('offset', String(params.offset || 0));

    const response = await api.get(`/api/videos/?${queryParams.toString()}`);
    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    } else if (data && data.videos && Array.isArray(data.videos)) {
      return data.videos;
    } else if (data && data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      return [];
    }
  },



  // Delete video
  async deleteVideo(videoId: number) {
    const response = await api.delete(`/api/videos/${videoId}`);
    return response.data;
  },

  // Download original or translated video
  async downloadVideo(videoId: number, kind: "output" | "original" = "output"): Promise<Blob> {
    const response = await api.get(`/api/videos/${videoId}/download`, {
      params: { kind },
      responseType: "blob",
    });
    return response.data;
  },

  // Video Documents & Chapters
  async getVideoDocuments(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/documents`);
    return response.data;
  },

  async generateVideoDocument(videoId: number, docType: "markdown" | "summary" | "timeline" = "markdown") {
    const response = await api.post(`/api/videos/${videoId}/documents/generate`, null, {
      params: { doc_type: docType },
    });
    return response.data;
  },

  async getVideoChapters(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/chapters`);
    return response.data;
  },


  // Processing
  async startProcessing(videoId: number) {
    const response = await api.post(`/api/videos/${videoId}/process`);
    return response.data;
  },

  async getJobStatus(jobId: string) {
    const response = await api.get(`/api/videos/jobs/${jobId}/status`);
    return response.data;
  },

  // Transcript
  async getTranscript(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/transcription`);
    const data = response.data;
    if (data?.status === "not_available") {
      throw new Error("Transcript not available yet");
    }
    return data;
  },

  async startTranscription(videoId: number, enableDiarization: boolean = true, sync: boolean = false) {
    const response = await api.post(
      `/api/videos/${videoId}/transcription?enable_diarization=${enableDiarization}&sync=${sync}`,
      {},
      { timeout: sync ? 300000 : 30000 }
    );
    return response.data;
  },

  async getStepsSummary(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/steps-summary`);
    return response.data;
  },

  async updateTranscript(videoId: number, updates: { segment_id: number; text: string }) {
    const response = await api.put(`/api/videos/${videoId}/transcription`, updates);
    return response.data;
  },

  async exportTranscript(videoId: number, format: string): Promise<Blob> {
    const response = await api.get<Blob>(`/api/videos/${videoId}/export?export_type=transcript&format=${format}`, {
      responseType: "blob",
    });
    return response.data;
  },

  // Translation
  async getTranslation(videoId: number, language: string) {
    const response = await api.get(`/api/videos/${videoId}/translations/${language}`);
    return response.data;
  },

  async startTranslation(videoId: number, targetLanguage: string, model?: string, sync: boolean = false) {
    const params = new URLSearchParams({ target_language: targetLanguage, sync: String(sync) });
    if (model) params.append("model", model);
    const response = await api.post(
      `/api/videos/${videoId}/translations?${params.toString()}`,
      {},
      { timeout: sync ? 180000 : 30000 }
    );
    return response.data;
  },

  async updateTranslation(videoId: number, language: string, updates: { segment_id: number; translated_text: string }) {
    const response = await api.put(`/api/videos/${videoId}/translations/${language}`, updates);
    return response.data;
  },

  // Subtitles
  async getSubtitles(videoId: number, language: string, format?: string) {
    const query = format ? `?format=${encodeURIComponent(format)}` : "";
    const response = await api.get(`/api/videos/${videoId}/subtitles/${language}${query}`);
    return response.data;
  },

  async generateSubtitles(
    videoId: number,
    language: string,
    format: string,
    fontSize: number,
    position: string,
    options?: {
      fontName?: string;
      primaryColor?: string;
      outlineColor?: string;
      maxLines?: number;
      effect?: string;
      aspectRatio?: string;
      autoSplitChunks?: boolean;
      segments?: Array<{ start: number; end: number; text?: string; translated_text?: string }>;
      alignment?: string;
      positionY?: number;
      lineSpacing?: number;
    }
  ) {
    const params = new URLSearchParams({
      language,
      format,
      font_size: String(fontSize),
      position,
    });
    if (options?.fontName) params.append("font_name", options.fontName);
    if (options?.primaryColor) params.append("primary_color", options.primaryColor);
    if (options?.outlineColor) params.append("outline_color", options.outlineColor);
    if (options?.maxLines !== undefined) params.append("max_lines", String(options.maxLines));
    if (options?.effect) params.append("effect", options.effect);
    if (options?.aspectRatio) params.append("aspect_ratio", options.aspectRatio);
    if (options?.alignment) params.append("alignment", options.alignment);
    if (options?.positionY !== undefined) params.append("position_y", String(options.positionY));
    if (options?.lineSpacing !== undefined) params.append("line_spacing", String(options.lineSpacing));

    const bodyData: Record<string, any> = {};
    if (options?.segments && options.segments.length > 0) bodyData.segments = options.segments;
    if (options?.aspectRatio) bodyData.aspect_ratio = options.aspectRatio;
    if (options?.autoSplitChunks !== undefined) bodyData.auto_split_chunks = options.autoSplitChunks;
    if (options?.alignment) bodyData.alignment = options.alignment;
    if (options?.positionY !== undefined) bodyData.position_y = options.positionY;
    if (options?.lineSpacing !== undefined) bodyData.line_spacing = options.lineSpacing;

    const response = await api.post(`/api/videos/${videoId}/subtitles?${params.toString()}`, bodyData, {
      timeout: 180000,
    });
    return response.data;
  },

  async getSubtitleSegments(videoId: number, language: string) {
    const response = await api.get(`/api/videos/${videoId}/subtitles/${language}/segments`);
    return response.data;
  },

  async updateSubtitleSegments(
    videoId: number,
    language: string,
    segments: any[],
    style?: any
  ) {
    const response = await api.put(`/api/videos/${videoId}/subtitles/${language}/segments`, {
      segments,
      style,
    });
    return response.data;
  },

  async downloadSubtitles(videoId: number, language: string, format: string): Promise<Blob> {
    const response = await api.get<Blob>(
      `/api/videos/${videoId}/subtitles/${language}/download?format=${format}`,
      { responseType: "blob" }
    );
    return response.data;
  },

  // TTS / Voices
  async listVoices(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/voices`);
    return response.data;
  },

  async generateTTS(videoId: number, language: string, speakerId: number, style: string, speed: number, sync: boolean = false) {
    const response = await api.post(
      `/api/videos/${videoId}/tts?language=${language}&speaker_id=${speakerId}&style=${style}&speed=${speed}&sync=${sync}`,
      {},
      { timeout: sync ? 300000 : 30000 }
    );
    return response.data;
  },

  async getTTS(videoId: number, language: string, preview: boolean = false): Promise<any | Blob> {
    const url = preview
      ? `/api/videos/${videoId}/tts/${language}?preview=true`
      : `/api/videos/${videoId}/tts/${language}`;

    if (preview) {
      const response = await api.get<Blob>(url, { responseType: "blob" });
      if (response.data.size < 1024) {
        throw new Error(`TTS audio file is corrupted or empty (${response.data.size} bytes)`);
      }
      return response.data;
    }

    const response = await api.get(url);
    return response.data;
  },

  async getTTSBlob(videoId: number, language: string): Promise<Blob> {
    return this.getTTS(videoId, language, true) as Promise<Blob>;
  },

  async getSpeakerSampleBlob(videoId: number, speakerId?: number): Promise<Blob> {
    const url = speakerId
      ? `/api/videos/${videoId}/speakers/${speakerId}/sample`
      : `/api/videos/${videoId}/vocal/sample`;

    const response = await api.get<Blob>(url, { responseType: "blob" });
    return response.data;
  },

  // Dubbing
  async generateDubbedVideo(
    videoId: number,
    language: string,
    format: string,
    quality: string,
    burnSubtitles: boolean = true,
    aspectRatio?: string,
    sync: boolean = false
  ) {
    let url = `/api/videos/${videoId}/dub?language=${language}&video_format=${format}&quality=${quality}&burn_subtitles=${burnSubtitles}&sync=${sync}`;
    if (aspectRatio) {
      url += `&aspect_ratio=${encodeURIComponent(aspectRatio)}`;
    }
    const response = await api.post(url, {}, { timeout: sync ? 600000 : 30000 });
    return response.data;
  },

  async getSubtitleBlob(videoId: number, language: string, format: string = "vtt"): Promise<Blob> {
    const response = await api.get<Blob>(
      `/api/videos/${videoId}/subtitles/${language}/download?format=${format}`,
      { responseType: "blob" }
    );
    return response.data;
  },

  async getDubbingStatus(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/dub`);
    return response.data;
  },

  async downloadDubbedVideo(videoId: number, language: string, format: string = "mp4", quality: string = "1080p"): Promise<Blob> {
    const response = await api.get(`/api/videos/${videoId}/dub/${language}/download?format=${format}&quality=${encodeURIComponent(quality)}`);
    const data = response.data;

    if (data && data.url) {
      try {
        const fileResponse = await fetch(data.url, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'video/mp4,*/*',
          },
        });

        if (!fileResponse.ok) {
          throw new Error(`S3 download failed: ${fileResponse.status}`);
        }

        return fileResponse.blob();
      } catch (error) {
        console.error('S3 fetch error:', error);
        throw new Error('Failed to download from S3 storage');
      }
    }

    if (data instanceof Blob) {
      return data;
    }

    const blobResponse = await api.get<Blob>(`/api/videos/${videoId}/dub/${language}/download?format=${format}&quality=${encodeURIComponent(quality)}`, {
      responseType: "blob",
    });
    return blobResponse.data;
  },

  // Playback
  async getPlaybackInfo(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/play`);
    return response.data;
  },

  // Export
  async getExportOptions(videoId: number) {
    const response = await api.get(`/api/videos/${videoId}/export/options`);
    return response.data;
  },

  async getDubbedVideoPreview(videoId: number, language: string, quality: string = "1080p"): Promise<string> {
    try {
      const response = await api.get(
        `/api/videos/${videoId}/dub/${language}/download?format=mp4&preview=true&quality=${encodeURIComponent(quality)}`
      );
      const data = response.data;

      if (data && data.url) {
        return data.url;
      }
    } catch (e) {
      console.warn("Could not get presigned preview URL, falling back to stream endpoint:", e);
    }

    return this.getVideoStreamUrl(videoId, "output");
  },
  
  async exportVideo(videoId: number, type: string, format: string, quality?: string, language?: string): Promise<Blob> {
    let url = `/api/videos/${videoId}/export?export_type=${type}&format=${format}`;
    if (quality) url += `&quality=${quality}`;
    if (language) url += `&language=${language}`;

    const response = await api.get(url, { timeout: 600000 });
    const data = response.data;

    if (data && data.url) {
      try {
        const fileResponse = await fetch(data.url, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'video/mp4,audio/mpeg,text/plain,application/json,*/*',
          },
        });

        if (!fileResponse.ok) {
          throw new Error(`S3 download failed: ${fileResponse.status} ${fileResponse.statusText}`);
        }

        const blob = await fileResponse.blob();
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        return blob;
      } catch (error) {
        console.error('S3 fetch error:', error);
        if (type === "final_video") {
          try {
            const token = localStorage.getItem("access_token");
            const streamRes = await fetch(`/api/videos/${videoId}/stream?kind=output${token ? `&token=${encodeURIComponent(token)}` : ''}`);
            if (streamRes.ok) {
              const streamBlob = await streamRes.blob();
              if (streamBlob.size > 0) return streamBlob;
            }
          } catch (streamErr) {
            console.warn('Fallback stream download failed:', streamErr);
          }
        }
        throw new Error('Failed to download from S3 storage. Please try again.');
      }
    }

    if (data instanceof Blob) {
      return data;
    }

    const blobRes = await api.get<Blob>(url, { responseType: "blob", timeout: 600000 });
    return blobRes.data;
  },

  // =========================================================
  // Thumbnail CRUD & Streaming APIs
  // =========================================================
  getThumbnailUrl(videoId: number, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `/api/videos/${videoId}/thumbnail?t=${ts}`;
  },

  getVideoStreamUrl(videoId: number, kind: "output" | "original" = "output"): string {
    const token = localStorage.getItem("access_token");
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    return `/api/videos/${videoId}/stream?kind=${kind}${tokenParam}`;
  },

  async captureThumbnail(videoId: number, timestamp: number, source: "original" | "output" = "output") {
    const response = await api.post(`/api/videos/${videoId}/thumbnail/capture`, {
      timestamp,
      source,
    });
    return response.data;
  },

  async uploadThumbnail(videoId: number, file: File | Blob) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/api/videos/${videoId}/thumbnail/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async autoGenerateThumbnail(videoId: number) {
    const response = await api.post(`/api/videos/${videoId}/thumbnail/auto`);
    return response.data;
  },

  async deleteThumbnail(videoId: number) {
    const response = await api.delete(`/api/videos/${videoId}/thumbnail`);
    return response.data;
  },
};