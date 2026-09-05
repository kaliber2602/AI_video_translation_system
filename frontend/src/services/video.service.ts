// services/video.service.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Add /api to the base URL
const API_URL = `${API_BASE}/api`;

export const videoService = {
  // Upload
  async uploadVideo(file: File, targetLanguage: string, projectId?: number) {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams({ target_language: targetLanguage });
    if (projectId) params.append("project_id", String(projectId));

    const response = await fetch(`${API_URL}/videos/upload?${params}`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
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

  async getDubbedVideoBlob(videoId: number, language: string, format = "mp4"): Promise<Blob> {
    const response = await fetch(`${API_URL}/videos/${videoId}/dub/${language}/download?video_format=${format}`, {
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
  async listVideos(params?: { project_id?: number; status?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.project_id) queryParams.append('project_id', String(params.project_id));
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', String(params.limit || 100));
    if (params?.offset) queryParams.append('offset', String(params.offset || 0));

    console.log("🔍 Fetching videos with params:", params);
    console.log("🔍 URL:", `${API_URL}/videos/?${queryParams.toString()}`);

    const response = await fetch(`${API_URL}/videos/?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      console.error("❌ Failed to fetch videos:", response.status, response.statusText);
      throw new Error(`Failed to fetch videos: ${response.status}`);
    }

    const data = await response.json();
    console.log("📦 Videos API Response:", data);

    if (Array.isArray(data)) {
      return data;
    } else if (data && data.videos && Array.isArray(data.videos)) {
      return data.videos;
    } else if (data && data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn("⚠️ Unexpected response format:", data);
      return [];
    }
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
  async getSubtitles(videoId: number, language: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/subtitles/${language}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Subtitles not found (${response.status})`);
    }
    return response.json();
  },

  async generateSubtitles(videoId: number, language: string, format: string, fontSize: number, position: string) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/subtitles?language=${language}&format=${format}&font_size=${fontSize}&position=${position}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Subtitle generation failed: ${response.status}`);
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

  // Dubbing
  async generateDubbedVideo(videoId: number, language: string, format: string, quality: string) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub?language=${language}&video_format=${format}&quality=${quality}`,
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

  async downloadDubbedVideo(videoId: number, language: string, format: string): Promise<Blob> {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub/${language}/download?format=${format}`,
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
  // Add this new method after downloadDubbedVideo
  async getDubbedVideoPreview(videoId: number, language: string): Promise<string> {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub/${language}/download?format=mp4&preview=true`,
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

    const data = await response.json();

    if (data && data.url) {
      return data.url;
    }

    throw new Error('No preview URL received');
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