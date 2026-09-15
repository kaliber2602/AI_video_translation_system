import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function VideoEditor() {
  const navigate = useNavigate();
  const { projectId, videoId } = useParams<{ projectId?: string; videoId?: string }>();

  useEffect(() => {
    if (projectId && videoId) {
      navigate(`/workspace/project/${projectId}/video/${videoId}?step=subtitle`, { replace: true });
    } else {
      navigate("/workspace", { replace: true });
    }
  }, [projectId, videoId, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium text-zinc-400">Đang chuyển tiếp tới Studio Phụ Đề & Lồng Tiếng...</p>
      </div>
    </div>
  );
}
