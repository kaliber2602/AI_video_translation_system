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
import Setting from "../../pages/Settings";
import ResetPasswordPage from "../../pages/ResetPasswordPage";
import VerifyOtpPage from "../../pages/VerifyOtpPage";
import ForgotPasswordPage from "../../pages/ForgotPasswordPage";
import { PipelineProvider } from "../../contexts/PipelineContext";

import ProtectedRoute from "./ProtectedRoute";

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
            element={
              <PipelineProvider>
                <VideoPipeline />
              </PipelineProvider>
            }
          />

          {/* Settings */}

          <Route
            path="/workspace/settings"
            element={<Setting />}
          />

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