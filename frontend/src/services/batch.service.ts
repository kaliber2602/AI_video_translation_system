import api from "./api/axios";

export interface BatchJobItem {
  id: number;
  batch_id: string;
  video_id: number;
  job_id?: string | null;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  video_title?: string;
  duration?: number;
  thumbnail?: string;
  output_path?: string;
}

export interface BatchJobDetail {
  id: string;
  project_id: number;
  user_id: number;
  preset_id?: number | null;
  name: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  total_videos: number;
  completed_videos: number;
  failed_videos: number;
  progress: number;
  config_snapshot: Record<string, any>;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items: BatchJobItem[];
}

export interface BatchJobSummary {
  id: string;
  project_id: number;
  user_id: number;
  preset_id?: number | null;
  name: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  total_videos: number;
  completed_videos: number;
  failed_videos: number;
  progress: number;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateBatchPayload {
  name?: string;
  video_ids: number[];
  preset_id?: number;
  config_override?: Record<string, any>;
}

export async function createBatchJob(
  projectId: number,
  payload: CreateBatchPayload
): Promise<BatchJobDetail> {
  const response = await api.post<BatchJobDetail>(
    `/api/projects/${projectId}/batches`,
    payload
  );
  return response.data;
}

export async function getProjectBatches(
  projectId: number
): Promise<BatchJobSummary[]> {
  const response = await api.get<BatchJobSummary[]>(
    `/api/projects/${projectId}/batches`
  );
  return response.data;
}

export async function getBatchDetails(
  batchId: string
): Promise<BatchJobDetail> {
  const response = await api.get<BatchJobDetail>(`/api/batches/${batchId}`);
  return response.data;
}

export async function cancelBatchJob(batchId: string): Promise<void> {
  await api.post(`/api/batches/${batchId}/cancel`);
}
