import {
  Folder,
  Users,
  Star,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";

const navigationItems = [
  {
    label: "All Projects",
    icon: Folder,
    active: true,
  },
  {
    label: "Shared With Me",
    icon: Users,
  },
  {
    label: "Favorites",
    icon: Star,
  },
  {
    label: "Trash",
    icon: Trash2,
  },
];

const tags = [
  {
    label: "AI",
    color: "bg-[#45D2B7]",
    count: 12,
  },
  {
    label: "Education",
    color: "bg-[#4097ED]",
    count: 8,
  },
  {
    label: "Machine Learning",
    color: "bg-[#9C75E8]",
    count: 6,
  },
  {
    label: "NLP",
    color: "bg-[#F6A14A]",
    count: 5,
  },
  {
    label: "CUDA",
    color: "bg-[#3DBCB6]",
    count: 3,
  },
];

export default function WorkspaceSidebar() {
  return (
    <aside className="hidden min-h-[calc(100vh-84px)] w-[240px] shrink-0 border-r border-[#E5EFED] bg-white/65 px-5 py-9 lg:block">
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm transition ${
                item.active
                  ? "bg-[#E3F7F3] font-semibold text-[#13B49F]"
                  : "text-[#52616F] hover:bg-[#F1F8F7]"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-10">
        <p className="mb-5 px-3 text-xs font-semibold uppercase tracking-wide text-[#7A8992]">
          Tags
        </p>

        <div className="space-y-4">
          {tags.map((tag) => (
            <button
              key={tag.label}
              className="flex w-full items-center gap-3 px-3 text-sm text-[#53616D]"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${tag.color}`} />

              <span className="flex-1 text-left">{tag.label}</span>

              <span className="text-xs text-[#8B98A0]">{tag.count}</span>
            </button>
          ))}

          <button className="flex items-center gap-3 px-3 text-sm text-[#52616F]">
            <Plus size={17} />
            Add Tag
          </button>
        </div>
      </div>

      <div className="mt-36 rounded-2xl border border-[#D8EEEA] bg-gradient-to-br from-[#F1FCFA] to-[#E7F8F5] p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#13BFA8] shadow-sm">
          <Sparkles size={19} />
        </div>

        <h3 className="text-sm font-semibold text-[#273946]">
          Need more storage?
        </h3>

        <p className="mt-2 text-xs leading-5 text-[#71818B]">
          Upgrade your plan for unlimited projects and AI processing.
        </p>

        <button className="mt-4 w-full rounded-xl bg-[#15C2A8] py-2.5 text-xs font-semibold text-white transition hover:bg-[#0EAE97]">
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}