import { ArrowLeft, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "../components/project/VideoCard";

const videos = [
  {
    id: 1,
    title: "NLP Introduction",
    filename: "nlp-introduction.mp4",
    duration: "12:15",
    size: "820 MB",
    updated: "May 25, 2024",
    status: "completed" as const,
  },
  {
    id: 2,
    title: "What is Natural Language Processing?",
    filename: "what-is-nlp.mp4",
    duration: "18:42",
    size: "1.2 GB",
    updated: "May 23, 2024",
    status: "editing" as const,
  },
  {
    id: 3,
    title: "NLP Tokenization Explained",
    filename: "tokenization.mp4",
    duration: "09:30",
    size: "650 MB",
    updated: "May 20, 2024",
    status: "processing" as const,
  },
  {
    id: 4,
    title: "NLP Applications",
    filename: "nlp-applications.mp4",
    duration: "14:20",
    size: "940 MB",
    updated: "May 18, 2024",
    status: "draft" as const,
  },
];

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const handleBackToProjects = () => {
    navigate("/workspace");
  };

  const handleOpenVideo = (videoId: number) => {
    navigate(`/workspace/project/${projectId}/video/${videoId}`);
  };

  return (
    <div className="min-h-screen bg-[#F7FBFA] text-[#152238]">
      <main className="mx-auto w-full max-w-[1600px] px-8 py-8">
        {/* Back to Workspace */}
        <button
          type="button"
          onClick={handleBackToProjects}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-[#718387] transition hover:text-[#18BFA7]"
        >
          <ArrowLeft size={17} />
          Back to Projects
        </button>

        {/* Project Header */}
        <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3D1] text-[#E5A52C]">
                <span className="text-2xl">📁</span>
              </div>

              <div>
                <h1 className="text-[28px] font-bold tracking-[-0.6px] text-[#152238]">
                  NLP Tutorials
                </h1>

                <p className="mt-1 text-sm text-[#819095]">
                  4 videos · 3.6 GB · Updated May 25, 2024
                </p>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-[#718387]">
              A collection of videos about Natural Language Processing,
              including translated content, subtitles, dubbing, and generated
              documents.
            </p>
          </div>

          {/* Project Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-xl border border-[#E1EBE9] bg-white px-4 text-sm font-semibold text-[#53666B] transition hover:border-[#18C3AA] hover:text-[#18BFA7]"
            >
              <MoreHorizontal size={18} />
              More
            </button>

            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-xl bg-[#18C3AA] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(24,195,170,0.22)] transition hover:-translate-y-0.5 hover:bg-[#12B49D]"
            >
              <Upload size={18} />
              Upload Video
            </button>
          </div>
        </section>

        {/* Search and Folder Toolbar */}
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#E5EFED] bg-white p-3 shadow-[0_8px_30px_rgba(30,70,80,0.04)] sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91A3A7]"
            />

            <input
              type="text"
              placeholder="Search videos in this project..."
              className="h-11 w-full rounded-xl border border-[#E4ECEB] bg-[#FBFDFC] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9AA8AC] focus:border-[#20C5AE] focus:bg-white focus:ring-4 focus:ring-[#20C5AE]/10"
            />
          </div>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E4ECEB] px-5 text-sm text-[#53666B] transition hover:border-[#20C5AE] hover:bg-[#F4FBFA]"
          >
            <Plus size={17} />
            New Folder
          </button>
        </section>

        {/* Video List */}
        <section className="grid gap-5 xl:grid-cols-2">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onOpen={() => handleOpenVideo(video.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}