export interface ContactCreateRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactResponse {
  id: number;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  status: string;
  created_at?: string;
}

export interface ContactSubmitSuccessResponse {
  success: boolean;
  message: string;
  data?: ContactResponse;
}
