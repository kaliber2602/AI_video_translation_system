// services/video.service.ts
import api from "./api/axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Add /api to the base URL
const API_URL = `${API_BASE}/api`;

export const videoService = {
  // Upload with real progress tracking and folder support
  async uploadVideo(
    file: File,
    targetLanguage: string,
    projectId?: number,
    folderId?: number,
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams({ target_language: targetLanguage });
    if (projectId) params.append("project_id", String(projectId));
    if (folderId) params.append("folder_id", String(folderId));

    const response = await api.post(`/api/videos/upload?${params.toString()}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
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
    const response = await fetch(`${API_URL}/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch video details: ${response.status}`);
    }
    return response.json();
  },

  // Audio extraction
  async extractAudio(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/audio/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to extract audio: ${response.status}`);
    }
    return response.json();
  },

  // Media Blobs (authenticated streams for in-browser playback)
  async getVideoBlob(videoId: number): Promise<Blob> {
    const response = await fetch(`${API_URL}/videos/${videoId}/original`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to load video file");
    }
    return response.blob();
  },

  async getAudioBlob(videoId: number, language: string): Promise<Blob> {
    const response = await fetch(`${API_URL}/videos/${videoId}/tts/${language}?preview=true`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to load audio preview: ${response.status}`);
    }
    const blob = await response.blob();
    if (blob.size < 1024) {
      throw new Error(`TTS audio file is corrupted or empty (${blob.size} bytes)`);
    }
    return blob;
  },

  async getDubbedVideoBlob(videoId: number, language: string, format = "mp4", quality = "1080p"): Promise<Blob> {
    const response = await fetch(`${API_URL}/videos/${videoId}/dub/${language}/download?format=${format}&quality=${encodeURIComponent(quality)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to load dubbed video");
    }
    return response.blob();
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

  // Update video (rename title, move folder)
  async updateVideo(videoId: number, data: { title?: string; folder_id?: number | null }) {
    const response = await api.patch(`/api/videos/${videoId}`, data);
    return response.data;
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
    const response = await fetch(`${API_URL}/videos/${videoId}/process?user_id=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
  },

  async getJobStatus(jobId: string) {
    const response = await fetch(`${API_URL}/videos/jobs/${jobId}/status`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
  },

  // Transcript
  async getTranscript(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/transcription`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Transcript not available (${response.status})`);
    }
    const data = await response.json();
    if (data.status === "not_available") {
      throw new Error("Transcript not available yet");
    }
    return data;
  },

  async startTranscription(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/transcription`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Transcription failed: ${response.status}`);
    }
    return response.json();
  },

  async updateTranscript(videoId: number, updates: { segment_id: number; text: string }) {
    const response = await fetch(`${API_URL}/videos/${videoId}/transcription`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update transcript: ${response.status}`);
    }
    return response.json();
  },

  async exportTranscript(videoId: number, format: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/export?export_type=transcript&format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to export transcript: ${response.status}`);
    }
    return response.blob();
  },

  // Translation
  async getTranslation(videoId: number, language: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/translations/${language}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Translation not found (${response.status})`);
    }
    return response.json();
  },

  async startTranslation(videoId: number, targetLanguage: string) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/translations?target_language=${targetLanguage}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Translation failed: ${response.status}`);
    }
    return response.json();
  },

  async updateTranslation(videoId: number, language: string, updates: { segment_id: number; translated_text: string }) {
    const response = await fetch(`${API_URL}/videos/${videoId}/translations/${language}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update translation: ${response.status}`);
    }
    return response.json();
  },

  // Subtitles
  async getSubtitles(videoId: number, language: string, format?: string) {
    let url = `${API_URL}/videos/${videoId}/subtitles/${language}`;
    if (format) {
      url += `?format=${encodeURIComponent(format)}`;
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Subtitles not found (${response.status})`);
    }
    return response.json();
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

    const bodyData: Record<string, any> = {};
    if (options?.segments && options.segments.length > 0) bodyData.segments = options.segments;
    if (options?.aspectRatio) bodyData.aspect_ratio = options.aspectRatio;
    if (options?.autoSplitChunks !== undefined) bodyData.auto_split_chunks = options.autoSplitChunks;
    const hasBody = Object.keys(bodyData).length > 0;

    const response = await fetch(`${API_URL}/videos/${videoId}/subtitles?${params.toString()}`, {
      method: "POST",
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      ...(hasBody ? { body: JSON.stringify(bodyData) } : {}),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Subtitle generation failed: ${response.status}`);
    }
    return response.json();
  },

  async getSubtitleSegments(videoId: number, language: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/subtitles/${language}/segments`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch subtitle segments: ${response.status}`);
    }
    return response.json();
  },

  async updateSubtitleSegments(
    videoId: number,
    language: string,
    segments: any[],
    style?: any
  ) {
    const response = await fetch(`${API_URL}/videos/${videoId}/subtitles/${language}/segments`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({ segments, style }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update subtitle segments: ${response.status}`);
    }
    return response.json();
  },

  async downloadSubtitles(videoId: number, language: string, format: string) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/subtitles/${language}/download?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to download subtitles");
    }
    return response.blob();
  },

  // TTS / Voices
  async listVoices(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/voices`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
  },

  async generateTTS(videoId: number, language: string, speakerId: number, style: string, speed: number) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/tts?language=${language}&speaker_id=${speakerId}&style=${style}&speed=${speed}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `TTS generation failed: ${response.status}`);
    }
    return response.json();
  },

  async getTTS(videoId: number, language: string, preview: boolean = false): Promise<any | Blob> {
    const url = preview
      ? `${API_URL}/videos/${videoId}/tts/${language}?preview=true`
      : `${API_URL}/videos/${videoId}/tts/${language}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to get TTS: ${response.status}`);
    }

    if (preview) {
      const blob = await response.blob();
      if (blob.size < 1024) {
        throw new Error(`TTS audio file is corrupted or empty (${blob.size} bytes)`);
      }
      const contentType = blob.type;
      if (!contentType.startsWith('audio/')) {
        console.warn(`Expected audio, got: ${contentType}`);
      }
      return blob;
    }

    return response.json();
  },

  async getTTSBlob(videoId: number, language: string): Promise<Blob> {
    return this.getTTS(videoId, language, true) as Promise<Blob>;
  },

  async getSpeakerSampleBlob(videoId: number, speakerId?: number): Promise<Blob> {
    const url = speakerId
      ? `${API_URL}/videos/${videoId}/speakers/${speakerId}/sample`
      : `${API_URL}/videos/${videoId}/vocal/sample`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to get speaker sample: ${response.status}`);
    }

    return response.blob();
  },

  // Dubbing
  async generateDubbedVideo(
    videoId: number,
    language: string,
    format: string,
    quality: string,
    burnSubtitles: boolean = true
  ) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub?language=${language}&video_format=${format}&quality=${quality}&burn_subtitles=${burnSubtitles}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorMsg = err.detail || `Dubbing generation failed: ${response.status}`;
      throw new Error(errorMsg);
    }
    return response.json();
  },

  async getSubtitleBlob(videoId: number, language: string, format: string = "vtt"): Promise<Blob> {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/subtitles/${language}/download?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to download subtitles: ${response.status}`);
    }
    return response.blob();
  },

  async getDubbingStatus(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/dub`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to get dubbing status: ${response.status}`);
    }
    return response.json();
  },

  async downloadDubbedVideo(videoId: number, language: string, format: string = "mp4", quality: string = "1080p"): Promise<Blob> {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub/${language}/download?format=${format}&quality=${encodeURIComponent(quality)}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to download dubbed video");
    }

    const data = await response.json();

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

    return response.blob();
  },

  // Playback
  async getPlaybackInfo(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/play`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
  },

  // Export
  async getExportOptions(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/export/options`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to load export options: ${response.status}`);
    }
    return response.json();
  },
  async getDubbedVideoPreview(videoId: number, language: string, quality: string = "1080p"): Promise<string> {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub/${language}/download?format=mp4&preview=true&quality=${encodeURIComponent(quality)}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to get video preview URL");
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data && data.url) {
        return data.url;
      }
      throw new Error('No preview URL received');
    }

    // Binary video stream (e.g. video/mp4 from FileResponse)
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
  
  async exportVideo(videoId: number, type: string, format: string, quality?: string, language?: string): Promise<Blob> {
    let url = `${API_URL}/videos/${videoId}/export?export_type=${type}&format=${format}`;
    if (quality) url += `&quality=${quality}`;
    if (language) url += `&language=${language}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Export failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.url) {
      try {
        // ✅ Fetch directly with CORS - no redirect expected with path-style URLs
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
        throw new Error('Failed to download from S3 storage. Please try again.');
      }
    }

    if (response.headers.get('content-type')?.includes('video') ||
      response.headers.get('content-type')?.includes('audio')) {
      return response.blob();
    }

    throw new Error('Unexpected response format');
  }
};