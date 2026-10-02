import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";

// Code splitting with React.lazy
const Home = lazy(() => import("../../pages/Home"));
const PricingPage = lazy(() => import("../../pages/PricingPage"));
const Login = lazy(() => import("../../pages/Login"));
const Register = lazy(() => import("../../pages/Register"));
const Workspace = lazy(() => import("../../pages/Workspace"));
const ProjectDetail = lazy(() => import("../../pages/ProjectDetail"));
const VideoPipeline = lazy(() => import("../../pages/VideoPipeline"));
const Setting = lazy(() => import("../../pages/Settings"));
const NotificationsPage = lazy(() => import("../../pages/NotificationsPage"));
const ResetPasswordPage = lazy(() => import("../../pages/ResetPasswordPage"));
const VerifyOtpPage = lazy(() => import("../../pages/VerifyOtpPage"));
const ForgotPasswordPage = lazy(() => import("../../pages/ForgotPasswordPage"));
const VNPayReturnPage = lazy(() => import("../../pages/VNPayReturnPage"));

// Admin lazy routes
const AdminLayout = lazy(() => import("../../layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("../../pages/admin/AdminDashboard"));
const AdminJobsPage = lazy(() => import("../../pages/admin/AdminJobsPage"));
const AdminModelsPage = lazy(() => import("../../pages/admin/AdminModelsPage"));
const AdminUsersPage = lazy(() => import("../../pages/admin/AdminUsersPage"));
const AdminFinancePage = lazy(() => import("../../pages/admin/AdminFinancePage"));
const AdminLogsPage = lazy(() => import("../../pages/admin/AdminLogsPage"));
const AdminContactsPage = lazy(() => import("../../pages/admin/AdminContactsPage"));
const AdminToolsPage = lazy(() => import("../../pages/admin/AdminToolsPage"));

function VideoEditorRedirect() {
  const { projectId, videoId } = useParams<{ projectId?: string; videoId?: string }>();
  if (projectId && videoId) {
    return <Navigate to={`/workspace/project/${projectId}/video/${videoId}?step=subtitle`} replace />;
  }
  return <Navigate to="/workspace" replace />;
}

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import FloatingChatWidget from "../../components/chat/FloatingChatWidget";

function PageLoadingFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-background)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[var(--color-primary)] border-t-transparent" />
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Loading...</span>
      </div>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <FloatingChatWidget />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>

        {/* ================================================== */}
        {/* PUBLIC ROUTES */}
        {/* ================================================== */}

        {/* Landing Page */}

        <Route
          path="/"
          element={<Home />}
        />

        {/* Pricing Page */}

        <Route
          path="/pricing"
          element={<PricingPage />}
        />

        {/* VNPay Gateway Return Page */}

        <Route
          path="/payments/vnpay/return"
          element={<VNPayReturnPage />}
        />

        {/* Authentication */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/verify-otp"
          element={<VerifyOtpPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />


        {/* ================================================== */}
        {/* PROTECTED ROUTES */}
        {/* ================================================== */}

        <Route element={<ProtectedRoute />}>

          {/* Workspace */}

          <Route
            path="/workspace"
            element={<Workspace />}
          />

          {/* Project */}

          <Route
            path="/workspace/project/:projectId"
            element={<ProjectDetail />}
          />

          {/* Video Pipeline */}

          <Route
            path="/workspace/project/:projectId/video/:videoId"
            element={<VideoPipeline />}
          />

          {/* Video & Subtitle Studio (Redirects to Unified Pipeline) */}

          <Route
            path="/workspace/project/:projectId/video/:videoId/editor"
            element={<VideoEditorRedirect />}
          />

          <Route
            path="/workspace/video/:videoId/editor"
            element={<VideoEditorRedirect />}
          />

          {/* Settings */}

          <Route
            path="/workspace/settings"
            element={<Setting />}
          />

          <Route
            path="/settings"
            element={<Navigate to="/workspace/settings" replace />}
          />

          {/* Notifications */}

          <Route
            path="/workspace/notifications"
            element={<NotificationsPage />}
          />

          <Route
            path="/notifications"
            element={<Navigate to="/workspace/notifications" replace />}
          />

        </Route>

        {/* ================================================== */}
        {/* ADMIN ROUTES */}
        {/* ================================================== */}

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="jobs" element={<AdminJobsPage />} />
            <Route path="models" element={<AdminModelsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="contacts" element={<AdminContactsPage />} />
            <Route path="tools" element={<AdminToolsPage />} />
          </Route>
        </Route>

        {/* ================================================== */}
        {/* FALLBACK */}
        {/* ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </Suspense>
  </BrowserRouter>
);
}