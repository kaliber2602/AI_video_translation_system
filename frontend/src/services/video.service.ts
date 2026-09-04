// services/videoService.ts
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

  // ✅ NEW: List videos with filtering
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
    
    // Handle different response formats
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
    return response.json();
  },

  async startTranscription(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/transcription`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
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
    return response.json();
  },

  async exportTranscript(videoId: number, format: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/export?export_type=transcript&format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.blob();
  },

  // Translation
  async getTranslation(videoId: number, language: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/translations/${language}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
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
    return response.json();
  },

  // Subtitles
  async getSubtitles(videoId: number, language: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/subtitles/${language}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
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
    return response.json();
  },

  async getTTS(videoId: number, language: string) {
    const response = await fetch(`${API_URL}/videos/${videoId}/tts/${language}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
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
    return response.json();
  },

  async getDubbingStatus(videoId: number) {
    const response = await fetch(`${API_URL}/videos/${videoId}/dub`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.json();
  },

  async downloadDubbedVideo(videoId: number, language: string, format: string) {
    const response = await fetch(
      `${API_URL}/videos/${videoId}/dub/${language}/download?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
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
    return response.json();
  },

  async exportVideo(videoId: number, type: string, format: string, quality?: string, language?: string) {
    let url = `${API_URL}/videos/${videoId}/export?export_type=${type}&format=${format}`;
    if (quality) url += `&quality=${quality}`;
    if (language) url += `&language=${language}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.url;
  },
};