export type PaymentMethod = "VNPAY";
export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled" | "expired";

export interface CreatePaymentTransactionRequest {
  product_type: "PLAN" | "STORAGE_ADDON";
  product_id: number;
  billing_cycle?: "monthly" | "yearly";
  payment_method?: PaymentMethod;
}

export interface PaymentTransaction {
  id: number;
  user_id: number;
  transaction_code: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | string;
  status: PaymentStatus | string;
  product_type?: "PLAN" | "STORAGE_ADDON";
  product_id?: number;
  product_name?: string;
  billing_cycle?: "monthly" | "yearly";
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionListResponse {
  transactions: PaymentTransaction[];
  total: number;
}
