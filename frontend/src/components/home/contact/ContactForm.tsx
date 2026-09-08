import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { submitContactMessage } from "../../../services/contact.service";
import { toast } from "../../../lib/toast";

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactForm() {
  const { t } = useTranslation(["home"]);

  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ContactFormData, string>> = {};

    if (!formData.name.trim()) {
      errs.name = t("home:contact.form.errors.nameRequired");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      errs.email = t("home:contact.form.errors.emailRequired");
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = t("home:contact.form.errors.messageRequired");
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim() || undefined,
        message: formData.message.trim(),
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setErrors({});
      setServerError(null);
      toast.success(
        t("home:contact.form.successTitle"),
        t("home:contact.form.successMessage")
      );
    } catch (err: any) {
      setIsSubmitting(false);
      const detailMsg =
        err?.response?.data?.detail ||
        (err?.message === "Network Error"
          ? t("home:contact.form.errors.networkError")
          : t("home:contact.form.errors.serverError"));

      setServerError(typeof detailMsg === "string" ? detailMsg : JSON.stringify(detailMsg));
      toast.error(
        t("home:contact.form.errors.serverError"),
        typeof detailMsg === "string" ? detailMsg : undefined
      );
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setServerError(null);
    setErrors({});
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--color-primary)]/40 bg-[var(--color-surface)] p-8 sm:p-12 text-center shadow-[var(--shadow-card)] transition-all">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm">
          <CheckCircle2 size={32} />
        </div>

        <h3 className="mt-5 text-xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
          {t("home:contact.form.successTitle")}
        </h3>

        <p className="mt-2 max-w-[420px] text-xs sm:text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {t("home:contact.form.successMessage")}
        </p>

        <button
          type="button"
          onClick={handleReset}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-6 py-2.5 text-xs font-bold text-[var(--color-text-primary)] shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          {t("home:contact.form.sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-10 shadow-[var(--shadow-card)] transition-colors"
    >
      <div className="space-y-5">
        {/* Server Error Alert Banner */}
        {serverError && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-500 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <p className="font-medium leading-relaxed">{serverError}</p>
          </div>
        )}

        {/* Name and Email in 2 columns on sm+ */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label
              htmlFor="contact-name"
              className="block text-xs font-bold text-[var(--color-text-primary)]"
            >
              {t("home:contact.form.nameLabel")} <span className="text-[var(--color-primary)]">*</span>
            </label>
            <div className="mt-1.5 relative">
              <input
                id="contact-name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                  if (serverError) setServerError(null);
                }}
                disabled={isSubmitting}
                placeholder={t("home:contact.form.namePlaceholder")}
                className={`w-full rounded-2xl border bg-[var(--color-background)] px-4 py-3 text-xs sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-rose-500/80 focus:ring-rose-500/20"
                    : "border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-500 font-medium">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="contact-email"
              className="block text-xs font-bold text-[var(--color-text-primary)]"
            >
              {t("home:contact.form.emailLabel")} <span className="text-[var(--color-primary)]">*</span>
            </label>
            <div className="mt-1.5 relative">
              <input
                id="contact-email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                  if (serverError) setServerError(null);
                }}
                disabled={isSubmitting}
                placeholder={t("home:contact.form.emailPlaceholder")}
                className={`w-full rounded-2xl border bg-[var(--color-background)] px-4 py-3 text-xs sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-rose-500/80 focus:ring-rose-500/20"
                    : "border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-500 font-medium">
                <AlertCircle size={12} /> {errors.email}
              </p>
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label
            htmlFor="contact-subject"
            className="block text-xs font-bold text-[var(--color-text-primary)]"
          >
            {t("home:contact.form.subjectLabel")}
          </label>
          <div className="mt-1.5">
            <input
              id="contact-subject"
              type="text"
              value={formData.subject}
              onChange={(e) => {
                setFormData({ ...formData, subject: e.target.value });
                if (serverError) setServerError(null);
              }}
              disabled={isSubmitting}
              placeholder={t("home:contact.form.subjectPlaceholder")}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-xs sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] shadow-sm transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="contact-message"
            className="block text-xs font-bold text-[var(--color-text-primary)]"
          >
            {t("home:contact.form.messageLabel")} <span className="text-[var(--color-primary)]">*</span>
          </label>
          <div className="mt-1.5">
            <textarea
              id="contact-message"
              rows={4}
              value={formData.message}
              onChange={(e) => {
                setFormData({ ...formData, message: e.target.value });
                if (errors.message) setErrors({ ...errors, message: undefined });
                if (serverError) setServerError(null);
              }}
              disabled={isSubmitting}
              placeholder={t("home:contact.form.messagePlaceholder")}
              className={`w-full rounded-2xl border bg-[var(--color-background)] p-4 text-xs sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] shadow-sm transition-all focus:outline-none focus:ring-2 ${
                errors.message
                  ? "border-rose-500/80 focus:ring-rose-500/20"
                  : "border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
              }`}
            />
          </div>
          {errors.message && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-500 font-medium">
              <AlertCircle size={12} /> {errors.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3.5 px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(21,194,168,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t("home:contact.form.submitting")}</span>
              </>
            ) : (
              <>
                <span>{t("home:contact.form.submitButton")}</span>
                <Send size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
