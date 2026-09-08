import api from "./api/axios";
import type {
  CreatePaymentTransactionRequest,
  PaymentTransaction,
  PaymentTransactionListResponse,
  DemoPaymentSuccessResponse,
  DemoPaymentFailResponse,
} from "../types/payment";

// =========================================================
// Create Payment Transaction (Protected)
// POST /api/payments/transactions
// =========================================================

export const createPaymentTransaction = async (
  payload: CreatePaymentTransactionRequest
): Promise<PaymentTransaction> => {
  const response = await api.post<PaymentTransaction>("/api/payments/transactions", payload);
  return response.data;
};

// =========================================================
// List User's Payment Transactions (Protected)
// GET /api/payments/transactions
// =========================================================

export interface TransactionFilterParams {
  status?: string;
  product_type?: string;
  limit?: number;
  offset?: number;
}

export const getMyPaymentTransactions = async (
  params?: TransactionFilterParams
): Promise<PaymentTransactionListResponse> => {
  const response = await api.get<PaymentTransactionListResponse>("/api/payments/transactions", {
    params,
  });
  return response.data;
};

// =========================================================
// Get Single Payment Transaction (Protected)
// GET /api/payments/transactions/{id}
// =========================================================

export const getPaymentTransaction = async (
  transactionIdOrCode: string | number
): Promise<PaymentTransaction> => {
  const response = await api.get<PaymentTransaction>(`/api/payments/transactions/${transactionIdOrCode}`);
  return response.data;
};

// =========================================================
// Simulate Demo Payment Success (Protected)
// POST /api/payments/transactions/{id}/demo-success
// =========================================================

export const simulateDemoSuccess = async (
  transactionIdOrCode: string | number
): Promise<DemoPaymentSuccessResponse> => {
  const response = await api.post<DemoPaymentSuccessResponse>(
    `/api/payments/transactions/${transactionIdOrCode}/demo-success`
  );
  return response.data;
};

// =========================================================
// Simulate Demo Payment Fail (Protected)
// POST /api/payments/transactions/{id}/demo-fail
// =========================================================

export const simulateDemoFail = async (
  transactionIdOrCode: string | number
): Promise<DemoPaymentFailResponse> => {
  const response = await api.post<DemoPaymentFailResponse>(
    `/api/payments/transactions/${transactionIdOrCode}/demo-fail`
  );
  return response.data;
};
