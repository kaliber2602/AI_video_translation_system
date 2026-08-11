import {
  Folder,
  MoreHorizontal,
  PlaySquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const projects = [
  {
    id: "machine-learning-course",
    name: "Machine Learning Course",
    videos: 8,
    recentProject: "Machine Learning Basics.mp4",
    duration: "16:30",
    updated: "May 25, 2024",
    size: "2.4 GB",
    tags: [
      {
        label: "AI",
        className: "bg-[#E8E8FF] text-[#6969D8]",
      },
      {
        label: "Education",
        className: "bg-[#E4F0FF] text-[#4C8CD8]",
      },
    ],
  },
  {
    id: "ai-translation-project",
    name: "AI Translation Project",
    videos: 5,
    recentProject: "AI Translation Demo.mp4",
    duration: "08:45",
    updated: "May 21, 2024",
    size: "1.1 GB",
    tags: [
      {
        label: "AI",
        className: "bg-[#E8E8FF] text-[#6969D8]",
      },
      {
        label: "Translation",
        className: "bg-[#F0E9FF] text-[#8A67C9]",
      },
    ],
  },
  {
    id: "cuda-installation-guide",
    name: "CUDA Installation Guide",
    videos: 3,
    recentProject: "CUDA Installation.mp4",
    duration: "07:20",
    updated: "May 18, 2024",
    size: "650 MB",
    tags: [
      {
        label: "CUDA",
        className: "bg-[#DFF8F5] text-[#24A99C]",
      },
      {
        label: "Setup",
        className: "bg-[#EEF2F4] text-[#6D7D83]",
      },
    ],
  },
  {
    id: "nlp",
    name: "NLP Tutorials",
    videos: 6,
    recentProject: "NLP Introduction.mp4",
    duration: "12:15",
    updated: "May 15, 2024",
    size: "1.8 GB",
    tags: [
      {
        label: "NLP",
        className: "bg-[#FFF0DF] text-[#E28A39]",
      },
      {
        label: "AI",
        className: "bg-[#E8E8FF] text-[#6969D8]",
      },
    ],
  },
  {
    id: "computer-vision",
    name: "Computer Vision",
    videos: 4,
    recentProject: "Object Detection.mp4",
    duration: "09:30",
    updated: "May 10, 2024",
    size: "920 MB",
    tags: [
      {
        label: "AI",
        className: "bg-[#E8E8FF] text-[#6969D8]",
      },
      {
        label: "CV",
        className: "bg-[#DFF8F5] text-[#24A99C]",
      },
    ],
  },
  {
    id: "project-notes",
    name: "Project Notes",
    videos: 1,
    recentProject: "Project Overview.md",
    duration: "—",
    updated: "May 08, 2024",
    size: "120 KB",
    tags: [
      {
        label: "Docs",
        className: "bg-[#EEF2F4] text-[#6D7D83]",
      },
    ],
  },
  {
    id: "presentation-slides",
    name: "Presentation Slides",
    videos: 2,
    recentProject: "ML Presentation.pptx",
    duration: "—",
    updated: "May 05, 2024",
    size: "3.2 MB",
    tags: [
      {
        label: "Docs",
        className: "bg-[#EEF2F4] text-[#6D7D83]",
      },
    ],
  },
];

export default function ProjectTable() {
  const navigate = useNavigate();

  const handleProjectClick = (projectId: string) => {
    navigate(`/workspace/project/${projectId}`);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E4ECEB] bg-white shadow-[0_10px_35px_rgba(30,70,80,0.04)]">
      {/* Table Header */}
      <div className="grid grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 border-b border-[#EDF2F1] px-5 py-4 text-xs font-semibold text-[#7B8B90]">
        <div>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#CBD8D7] accent-[#18C3AA]"
          />
        </div>

        <div>Name</div>
        <div>Recent Project</div>
        <div>Videos</div>
        <div>Updated</div>
        <div>Size</div>
        <div>Tags</div>
        <div />
      </div>

      {/* Table Rows */}
      {projects.map((project) => (
        <div
          key={project.id}
          role="button"
          tabIndex={0}
          onClick={() => handleProjectClick(project.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              handleProjectClick(project.id);
            }
          }}
          className="group grid w-full cursor-pointer grid-cols-[40px_1.4fr_1.5fr_100px_140px_100px_180px_40px] items-center gap-4 border-b border-[#EDF2F1] px-5 py-5 text-left transition hover:bg-[#F8FCFB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#18C3AA]"
        >
          {/* Checkbox */}
          <div>
            <input
              type="checkbox"
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4 rounded border-[#CBD8D7] accent-[#18C3AA]"
            />
          </div>

          {/* Project Name */}
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF5D8] text-[#E9A927]">
              <Folder size={21} fill="currentColor" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#263641]">
                {project.name}
              </div>

              <div className="mt-1 text-xs text-[#8B9A9E]">
                {project.videos} videos
              </div>
            </div>
          </div>

          {/* Recent Video */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#18202A] to-[#526474]">
              <PlaySquare size={18} className="text-white/80" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#34434B]">
                {project.recentProject}
              </div>

              <div className="mt-1 text-xs text-[#8B9A9E]">
                {project.duration}
              </div>
            </div>
          </div>

          {/* Videos */}
          <div className="text-sm text-[#53666B]">
            {project.videos}
          </div>

          {/* Updated */}
          <div className="text-sm text-[#53666B]">
            {project.updated}
          </div>

          {/* Size */}
          <div className="text-sm text-[#53666B]">
            {project.size}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag.label}
                className={`rounded-full px-3 py-1 text-xs font-medium ${tag.className}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          {/* More */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C9A9D] transition hover:bg-[#EAF8F5] hover:text-[#18BFA7]"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}