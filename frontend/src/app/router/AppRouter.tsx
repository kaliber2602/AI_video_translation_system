import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Home from "../../pages/Home";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import Workspace from "../../pages/Workspace";
import ProjectDetail from "../../pages/ProjectDetail";
import VideoPipeline from "../../pages/VideoPipeline";
import Setting from "../../pages/Settings";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Workspace */}
        <Route path="/workspace" element={<Workspace />} />

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

        {/* Settings */}
        <Route 
          path="/workspace/settings"
          element={<Setting />}
        />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}