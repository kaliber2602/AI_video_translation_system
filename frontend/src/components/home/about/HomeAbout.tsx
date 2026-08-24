import { Users, MapPin, Sparkles, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "../../common/SocialIcons";

export default function HomeAbout() {
  const { t } = useTranslation(["home"]);

  const members = [
    {
      id: "member1",
      name: t("home:about.members.member1.name"),
      role: t("home:about.members.member1.role"),
      bio: t("home:about.members.member1.bio"),
      location: t("home:about.members.member1.location"),
      initials: "AN",
      github: t("home:about.members.member1.github"),
      linkedin: t("home:about.members.member1.linkedin"),
      twitter: t("home:about.members.member1.twitter"),
      gradient: "from-teal-500/20 via-cyan-500/10 to-transparent",
      accentBg: "bg-gradient-to-tr from-teal-600 to-cyan-500",
    },
    {
      id: "member2",
      name: t("home:about.members.member2.name"),
      role: t("home:about.members.member2.role"),
      bio: t("home:about.members.member2.bio"),
      location: t("home:about.members.member2.location"),
      initials: "ET",
      github: t("home:about.members.member2.github"),
      linkedin: t("home:about.members.member2.linkedin"),
      twitter: t("home:about.members.member2.twitter"),
      gradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
      accentBg: "bg-gradient-to-tr from-indigo-600 to-purple-500",
    },
  ];

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[var(--color-background)] px-5 py-20 transition-colors duration-200 lg:px-8 lg:py-24"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--color-primary-soft)] opacity-40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1400px]">
        {/* Section Header */}
        <div className="mx-auto max-w-[840px] text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--color-primary)] shadow-sm">
            <Users size={14} />
            <span>{t("home:about.badge")}</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
            {t("home:about.title")}
          </h2>

          <p className="mx-auto mt-4 max-w-[620px] text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            {t("home:about.subtitle")}
          </p>
        </div>

        {/* Exactly 2 Profile Cards Grid */}
        <div className="mx-auto grid max-w-[1020px] gap-8 md:grid-cols-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="group relative flex flex-col justify-between rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10 shadow-[var(--shadow-card)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[var(--color-primary)]/60 hover:shadow-2xl"
            >
              {/* Subtle card top gradient */}
              <div
                className={`pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-b ${member.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              <div className="relative z-10">
                {/* Avatar Placeholder Area */}
                <div className="flex items-center justify-between">
                  <div className="relative">
                    {/* Stylized Apple-like Avatar Frame */}
                    <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${member.accentBg} text-xl font-black text-white shadow-lg transition-transform duration-300 ease-out group-hover:scale-105`}>
                      <span>{member.initials}</span>
                    </div>

                    {/* Online / Active Builder Indicator */}
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface)]">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-full px-3 py-1 bg-[var(--color-background)]">
                    <Terminal size={11} className="text-[var(--color-primary)]" />
                    <span>Core Contributor</span>
                  </div>
                </div>

                {/* Member Details */}
                <div className="mt-6">
                  <h3 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                    {member.name}
                  </h3>

                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                    <Sparkles size={12} />
                    <span>{member.role}</span>
                  </div>

                  <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[var(--color-text-secondary)] min-h-[54px]">
                    {member.bio}
                  </p>
                </div>
              </div>

              {/* Card Footer: Location & Social Links */}
              <div className="relative z-10 mt-8 flex items-center justify-between border-t border-[var(--color-border)] pt-5">
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
                  <MapPin size={13} className="text-[var(--color-primary)]" />
                  <span>{member.location}</span>
                </div>

                {/* Social Icon Links */}
                <div className="flex items-center gap-2">
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} GitHub`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <GithubIcon size={14} />
                  </a>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} LinkedIn`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <LinkedinIcon size={14} />
                  </a>

                  <a
                    href={member.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} X / Twitter`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <TwitterIcon size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
