import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getMe } from "../services/auth.service";
import { toast } from "../lib/toast";

import WorkspaceTopbar from "../components/workspace/WorkspaceTopbar";
import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader";
import ProjectToolbar from "../components/workspace/ProjectToolbar";
import ProjectTable from "../components/workspace/ProjectTable";
import ProjectPagination from "../components/workspace/ProjectPagination";

export default function WorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.showWelcome) {
      return;
    }

    const showWelcomeToast = async () => {
      try {
        const user = await getMe();

        toast.success(
          `Welcome back, ${user.full_name}!`,
          "Glad to see you again."
        );
      } catch (error) {
        console.error(
          "[WorkspaceLayout] Failed to get current user:",
          error
        );
      } finally {
        navigate(location.pathname, {
          replace: true,
          state: null,
        });
      }
    };

    showWelcomeToast();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-200">
      <WorkspaceTopbar />

      <div className="flex">
        <WorkspaceSidebar />

        <main className="min-w-0 flex-1 px-8 py-10">
          <WorkspaceHeader />
          <ProjectToolbar />
          <ProjectTable />
          <ProjectPagination />
        </main>
      </div>
    </div>
  );
}