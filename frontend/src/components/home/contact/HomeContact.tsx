import { Mail, MessageSquare, MapPin, Clock, MessageCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import ContactForm from "./ContactForm";
import { GithubIcon, LinkedinIcon } from "../../common/SocialIcons";

export default function HomeContact() {
  const { t } = useTranslation(["home"]);

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[var(--color-background)] px-5 py-20 transition-colors duration-200 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* Section Header */}
        <div className="mx-auto max-w-[840px] text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--color-primary)] shadow-sm">
            <MessageSquare size={14} />
            <span>{t("home:contact.badge")}</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
            {t("home:contact.title")}
          </h2>

          <p className="mx-auto mt-4 max-w-[620px] text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            {t("home:contact.subtitle")}
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Direct Info (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)] transition-colors">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                <Sparkles size={13} />
                <span>{t("home:contact.info.heading")}</span>
              </div>

              <h3 className="mt-4 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
                Let's connect
              </h3>

              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {t("home:contact.info.description")}
              </p>

              {/* Info Items List */}
              <div className="mt-6 space-y-4">
                {/* Email */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-[var(--color-text-muted)]">
                      {t("home:contact.info.emailLabel")}
                    </p>
                    <a
                      href={`mailto:${t("home:contact.info.emailValue")}`}
                      className="truncate font-bold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition"
                    >
                      {t("home:contact.info.emailValue")}
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-[var(--color-text-muted)]">
                      {t("home:contact.info.locationLabel")}
                    </p>
                    <p className="truncate font-bold text-[var(--color-text-primary)]">
                      {t("home:contact.info.locationValue")}
                    </p>
                  </div>
                </div>

                {/* Response Time */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-[var(--color-text-muted)]">
                      {t("home:contact.info.responseLabel")}
                    </p>
                    <p className="truncate font-bold text-[var(--color-text-primary)]">
                      {t("home:contact.info.responseValue")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="mt-8 border-t border-[var(--color-border)] pt-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Follow the project
                </p>
                <div className="flex items-center gap-2.5">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub Repository"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <GithubIcon size={16} />
                  </a>

                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <LinkedinIcon size={16} />
                  </a>

                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Discord Community"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <MessageCircle size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
