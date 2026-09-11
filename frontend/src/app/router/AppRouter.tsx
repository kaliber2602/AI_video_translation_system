import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Home from "../../pages/Home";
import PricingPage from "../../pages/PricingPage";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import Workspace from "../../pages/Workspace";
import ProjectDetail from "../../pages/ProjectDetail";
import VideoPipeline from "../../pages/VideoPipeline";
import VideoEditor from "../../pages/VideoEditor";
import Setting from "../../pages/Settings";
import NotificationsPage from "../../pages/NotificationsPage";
import ResetPasswordPage from "../../pages/ResetPasswordPage";
import VerifyOtpPage from "../../pages/VerifyOtpPage";
import ForgotPasswordPage from "../../pages/ForgotPasswordPage";
import VNPayReturnPage from "../../pages/VNPayReturnPage";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import AdminLayout from "../../layouts/AdminLayout";
import AdminDashboard from "../../pages/admin/AdminDashboard";
import AdminJobsPage from "../../pages/admin/AdminJobsPage";
import AdminModelsPage from "../../pages/admin/AdminModelsPage";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";
import AdminFinancePage from "../../pages/admin/AdminFinancePage";
import AdminLogsPage from "../../pages/admin/AdminLogsPage";
import AdminContactsPage from "../../pages/admin/AdminContactsPage";
import AdminToolsPage from "../../pages/admin/AdminToolsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
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

          {/* Dedicated Video & Subtitle Editor */}

          <Route
            path="/workspace/project/:projectId/video/:videoId/editor"
            element={<VideoEditor />}
          />

          <Route
            path="/workspace/video/:videoId/editor"
            element={<VideoEditor />}
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
    </BrowserRouter>
  );
}