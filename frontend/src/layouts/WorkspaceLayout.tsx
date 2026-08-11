import WorkspaceTopbar from "../components/workspace/WorkspaceTopbar";
import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader";
import ProjectToolbar from "../components/workspace/ProjectToolbar";
import ProjectTable from "../components/workspace/ProjectTable";
import ProjectPagination from "../components/workspace/ProjectPagination";

export default function WorkspaceLayout() {
  return (
    <div className="min-h-screen bg-[#F7FBFA] text-[#152238]">
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