import {
  Captions,
  FileText,
  Languages,
  ListVideo,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Languages,
    title: "Dịch & Lồng tiếng AI",
    description:
      "Dịch hơn 100+ ngôn ngữ và lồng tiếng tự nhiên như người thật.",
  },
  {
    icon: Captions,
    title: "Phụ đề thông minh",
    description:
      "Tự động tạo phụ đề chính xác, chuẩn thời gian.",
  },
  {
    icon: FileText,
    title: "Trích xuất tài liệu",
    description:
      "Xuất TXT, DOCX, PDF, SRT, Markdown chỉ với 1 click.",
  },
  {
    icon: ListVideo,
    title: "Timeline & Chủ đề",
    description:
      "AI phân tích và chia video thành các phần theo chủ đề.",
  },
  {
    icon: Sparkles,
    title: "Tóm tắt & Insight",
    description:
      "Tóm tắt nội dung, tạo mindmap, quiz và flashcard.",
  },
];

export default function HomeFeatures() {
  return (
    <section
      id="features"
      className="bg-white px-5 py-8 lg:px-8"
    >
      <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-2 lg:grid-cols-5">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article
              key={feature.title}
              className="group rounded-2xl border border-[#E7EFED] bg-white p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-[#CDEDE6] hover:shadow-[0_15px_40px_rgba(30,80,75,0.08)]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5F9F4] text-[#18BFA7] transition group-hover:scale-105">
                <Icon size={22} />
              </div>

              <h3 className="mt-5 text-sm font-bold text-[#263641]">
                {feature.title}
              </h3>

              <p className="mt-3 text-xs leading-5 text-[#829196]">
                {feature.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}