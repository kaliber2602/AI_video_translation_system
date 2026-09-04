import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMySubscriptionSummary, getPricingCatalog } from "../../services/subscription.service";
import { getAccessToken } from "../../services/api/token";
import type {
  BillingCycle,
  Plan,
  StorageAddon,
  UserSubscriptionSummary,
} from "../../types/subscription";

import PricingHeader from "../pricing/PricingHeader";
import CurrentUsageWidget from "../pricing/CurrentUsageWidget";
import PlanCard from "../pricing/PlanCard";
import StorageAddonSection from "../pricing/StorageAddonSection";
import PricingComparisonTable from "../pricing/PricingComparisonTable";
import DemoCheckoutModal from "../pricing/DemoCheckoutModal";

// Fallback plans if backend is initializing
const FALLBACK_PLANS: Plan[] = [
  {
    id: 1,
    code: "free",
    name: "Free",
    description: "For trying the platform & personal projects",
    price_monthly: 0,
    price_yearly: 0,
    billing_cycle: "monthly",
    is_active: true,
    is_popular: false,
    display_order: 1,
    resources: [
      { id: 1, plan_id: 1, resource_type: "STORAGE", resource_key: "storage_bytes", limit_value: "5368709120", unit: "bytes" },
      { id: 2, plan_id: 1, resource_type: "CONSUMABLE", resource_key: "ai_credits_monthly", limit_value: "1000", unit: "credits" },
      { id: 3, plan_id: 1, resource_type: "LIMIT", resource_key: "max_file_size_bytes", limit_value: "524288000", unit: "bytes" },
      { id: 4, plan_id: 1, resource_type: "LIMIT", resource_key: "max_video_duration_seconds", limit_value: "1800", unit: "seconds" },
      { id: 5, plan_id: 1, resource_type: "LIMIT", resource_key: "max_upload_resolution", limit_value: "1080p", unit: "resolution" },
      { id: 6, plan_id: 1, resource_type: "LIMIT", resource_key: "max_processing_resolution", limit_value: "720p", unit: "resolution" },
      { id: 7, plan_id: 1, resource_type: "LIMIT", resource_key: "max_streaming_resolution", limit_value: "720p", unit: "resolution" },
      { id: 8, plan_id: 1, resource_type: "LIMIT", resource_key: "max_concurrent_jobs", limit_value: "1", unit: "count" },
      { id: 9, plan_id: 1, resource_type: "LIMIT", resource_key: "max_projects", limit_value: "5", unit: "count" },
    ],
  },
  {
    id: 2,
    code: "pro",
    name: "Pro",
    description: "For creators, freelancers & power users",
    price_monthly: 12,
    price_yearly: 120,
    billing_cycle: "monthly",
    is_active: true,
    is_popular: true,
    display_order: 2,
    resources: [
      { id: 10, plan_id: 2, resource_type: "STORAGE", resource_key: "storage_bytes", limit_value: "107374182400", unit: "bytes" },
      { id: 11, plan_id: 2, resource_type: "CONSUMABLE", resource_key: "ai_credits_monthly", limit_value: "10000", unit: "credits" },
      { id: 12, plan_id: 2, resource_type: "LIMIT", resource_key: "max_file_size_bytes", limit_value: "5368709120", unit: "bytes" },
      { id: 13, plan_id: 2, resource_type: "LIMIT", resource_key: "max_video_duration_seconds", limit_value: "14400", unit: "seconds" },
      { id: 14, plan_id: 2, resource_type: "LIMIT", resource_key: "max_upload_resolution", limit_value: "4K", unit: "resolution" },
      { id: 15, plan_id: 2, resource_type: "LIMIT", resource_key: "max_processing_resolution", limit_value: "1080p", unit: "resolution" },
      { id: 16, plan_id: 2, resource_type: "LIMIT", resource_key: "max_streaming_resolution", limit_value: "1080p", unit: "resolution" },
      { id: 17, plan_id: 2, resource_type: "LIMIT", resource_key: "max_concurrent_jobs", limit_value: "3", unit: "count" },
      { id: 18, plan_id: 2, resource_type: "LIMIT", resource_key: "max_projects", limit_value: "50", unit: "count" },
    ],
  },
  {
    id: 3,
    code: "business",
    name: "Business",
    description: "For teams, studios & scaling organizations",
    price_monthly: 49,
    price_yearly: 490,
    billing_cycle: "monthly",
    is_active: true,
    is_popular: false,
    display_order: 3,
    resources: [
      { id: 19, plan_id: 3, resource_type: "STORAGE", resource_key: "storage_bytes", limit_value: "1099511627776", unit: "bytes" },
      { id: 20, plan_id: 3, resource_type: "CONSUMABLE", resource_key: "ai_credits_monthly", limit_value: "100000", unit: "credits" },
      { id: 21, plan_id: 3, resource_type: "LIMIT", resource_key: "max_file_size_bytes", limit_value: "21474836480", unit: "bytes" },
      { id: 22, plan_id: 3, resource_type: "LIMIT", resource_key: "max_video_duration_seconds", limit_value: "43200", unit: "seconds" },
      { id: 23, plan_id: 3, resource_type: "LIMIT", resource_key: "max_upload_resolution", limit_value: "4K", unit: "resolution" },
      { id: 24, plan_id: 3, resource_type: "LIMIT", resource_key: "max_processing_resolution", limit_value: "4K", unit: "resolution" },
      { id: 25, plan_id: 3, resource_type: "LIMIT", resource_key: "max_streaming_resolution", limit_value: "4K", unit: "resolution" },
      { id: 26, plan_id: 3, resource_type: "LIMIT", resource_key: "max_concurrent_jobs", limit_value: "10", unit: "count" },
      { id: 27, plan_id: 3, resource_type: "LIMIT", resource_key: "max_projects", limit_value: "500", unit: "count" },
    ],
  },
];

const FALLBACK_ADDONS: StorageAddon[] = [
  { id: 1, code: "addon_50gb", name: "+50 GB Storage", storage_bytes: 53687091200, storage_gb: 50, price_monthly: 2, price_yearly: 20, is_active: true, display_order: 1 },
  { id: 2, code: "addon_200gb", name: "+200 GB Storage", storage_bytes: 214748364800, storage_gb: 200, price_monthly: 6, price_yearly: 60, is_active: true, display_order: 2 },
  { id: 3, code: "addon_500gb", name: "+500 GB Storage", storage_bytes: 536870912000, storage_gb: 500, price_monthly: 10, price_yearly: 100, is_active: true, display_order: 3 },
  { id: 4, code: "addon_1tb", name: "+1 TB Storage", storage_bytes: 1099511627776, storage_gb: 1000, price_monthly: 15, price_yearly: 150, is_active: true, display_order: 4 },
];

export default function HomePricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [addons, setAddons] = useState<StorageAddon[]>(FALLBACK_ADDONS);
  const [userSummary, setUserSummary] = useState<UserSubscriptionSummary | null>(null);

  // Demo Checkout Modal State
  const [selectedProduct, setSelectedProduct] = useState<{
    type: "PLAN" | "STORAGE_ADDON";
    data: Plan | StorageAddon;
  } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const fetchUserSummary = async () => {
    const token = getAccessToken();
    if (token) {
      try {
        const summary = await getMySubscriptionSummary();
        setUserSummary(summary);
      } catch (err) {
        console.log("[HomePricing] User not authenticated or quota unavailable:", err);
      }
    }
  };

  useEffect(() => {
    // 1. Fetch Catalog
    const fetchCatalog = async () => {
      try {
        const catalog = await getPricingCatalog();
        if (catalog.plans && catalog.plans.length > 0) {
          setPlans(catalog.plans);
        }
        if (catalog.storage_addons && catalog.storage_addons.length > 0) {
          setAddons(catalog.storage_addons);
        }
      } catch (err) {
        console.warn("[HomePricing] Using fallback catalog:", err);
      }
    };

    fetchCatalog();
    fetchUserSummary();
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    const token = getAccessToken();
    if (!token) {
      navigate("/login");
      return;
    }
    setSelectedProduct({ type: "PLAN", data: plan });
    setIsCheckoutOpen(true);
  };

  const handleSelectAddon = (addon: StorageAddon) => {
    const token = getAccessToken();
    if (!token) {
      navigate("/login");
      return;
    }
    setSelectedProduct({ type: "STORAGE_ADDON", data: addon });
    setIsCheckoutOpen(true);
  };

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[var(--color-background)] px-5 py-20 transition-colors duration-200 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <PricingHeader
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
        />

        {/* Current Usage Widget (if logged in) */}
        {userSummary && (
          <div className="mt-12">
            <CurrentUsageWidget summary={userSummary} />
          </div>
        )}

        {/* 3 Plan Cards Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              billingCycle={billingCycle}
              isCurrentPlan={userSummary?.subscription?.plan_code === plan.code}
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>

        {/* Storage Add-ons Section */}
        <StorageAddonSection
          addons={addons}
          billingCycle={billingCycle}
          onSelectAddon={handleSelectAddon}
        />

        {/* Feature Comparison Matrix */}
        <PricingComparisonTable />
      </div>

      {/* Demo Checkout / Payment Modal */}
      <DemoCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        product={selectedProduct}
        billingCycle={billingCycle}
        onPaymentSuccess={() => {
          fetchUserSummary();
        }}
      />
    </section>
  );
}
