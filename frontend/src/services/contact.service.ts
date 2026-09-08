import api from "./api/axios";
import type {
  ContactCreateRequest,
  ContactResponse,
  ContactSubmitSuccessResponse,
} from "../types/contact";

// =========================================================
// Submit Contact Message
// POST /api/contact
// =========================================================

export const submitContactMessage = async (
  data: ContactCreateRequest
): Promise<ContactSubmitSuccessResponse> => {
  const response = await api.post<ContactSubmitSuccessResponse>(
    "/api/contact",
    data
  );

  return response.data;
};

// =========================================================
// Get Contact Messages (Admin)
// GET /api/contact
// =========================================================

export const getContactMessages = async (
  limit = 50,
  offset = 0
): Promise<ContactResponse[]> => {
  const response = await api.get<ContactResponse[]>("/api/contact", {
    params: { limit, offset },
  });

  return response.data;
};
