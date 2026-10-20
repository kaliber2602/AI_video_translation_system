import { useState, useEffect, useCallback } from "react";
import { getMyQuota } from "../services/subscription.service";
import type { EffectiveQuota } from "../types/subscription";

let cachedQuota: EffectiveQuota | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export function useSubscriptionPlan() {
  const [quota, setQuota] = useState<EffectiveQuota | null>(cachedQuota);
  const [loading, setLoading] = useState<boolean>(!cachedQuota);

  const fetchQuota = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedQuota && now - lastFetchTime < CACHE_TTL_MS) {
      setQuota(cachedQuota);
      setLoading(false);
      return;
    }

    try {
      const data = await getMyQuota();
      cachedQuota = data;
      lastFetchTime = now;
      setQuota(data);
    } catch (err) {
      console.warn("Failed to fetch effective subscription quota:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuota();

    const handleRefresh = () => {
      fetchQuota(true);
    };

    window.addEventListener("subscription-updated", handleRefresh);
    return () => {
      window.removeEventListener("subscription-updated", handleRefresh);
    };
  }, [fetchQuota]);

  const planCode = ((quota as any)?.plan_code || "free").toLowerCase();
  const isPro = planCode === "pro" || planCode === "enterprise";

  return {
    quota,
    loading,
    planCode,
    isPro,
    refreshQuota: () => fetchQuota(true),
  };
}
