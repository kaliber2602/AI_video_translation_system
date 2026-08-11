import {
  Clock3,
  Globe2,
  Play,
  Users,
} from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "10,000+",
    label: "Người dùng tin tưởng",
  },
  {
    icon: Play,
    value: "50,000+",
    label: "Video đã xử lý",
  },
  {
    icon: Globe2,
    value: "100+",
    label: "Ngôn ngữ hỗ trợ",
  },
  {
    icon: Clock3,
    value: "98%",
    label: "Độ chính xác trung bình",
  },
];

export default function HomeStats() {
  return (
    <section className="px-5 py-6 lg:px-8">
      <div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-2xl border border-[#DDEFEA] bg-[#F3FBF9] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className={`flex items-center gap-4 px-7 py-5 ${
                index !== 0
                  ? "border-t border-[#DDEBE7] sm:border-t-0 sm:border-l"
                  : ""
              } ${
                index === 2
                  ? "lg:border-l"
                  : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#18BFA7] shadow-sm">
                <Icon size={20} />
              </div>

              <div>
                <p className="text-lg font-black text-[#18A991]">
                  {stat.value}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-[#77878B]">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}