import { useState } from "react";
import { ShieldCheck, Smartphone, Laptop, LogOut, KeyRound, Check, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsBadge from "../common/SettingsBadge";
import SettingsModal from "../common/SettingsModal";
import SettingsInput from "../common/SettingsInput";
import Toggle from "../Toggle";
import { INITIAL_MOCK_SETTINGS, type ActiveSession, type SecurityAuditItem } from "../mock/settingsMockData";

export default function SecuritySection() {
  const { t } = useTranslation(["settings", "common"]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(INITIAL_MOCK_SETTINGS.security.twoFactorEnabled);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>(INITIAL_MOCK_SETTINGS.security.activeSessions);
  const [auditLogs] = useState<SecurityAuditItem[]>(INITIAL_MOCK_SETTINGS.security.auditLogs);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-300" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-blue-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      toast.error("Current Password Required", "Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password Too Short", "New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords Do Not Match", "Confirmation password does not match new password.");
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password Updated", "Your account password has been changed successfully.");
    }, 600);
  };

  const handleVerify2FA = () => {
    if (verificationCode.length !== 6) {
      toast.error("Invalid Code", "Please enter a 6-digit authentication code.");
      return;
    }
    setTwoFactorEnabled(true);
    setIs2FAModalOpen(false);
    setVerificationCode("");
    toast.success("2FA Enabled", "Two-Factor Authentication is now active on your account.");
  };

  const handleRevokeSession = (sessionId: string, deviceName: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.warning("Session Terminated", `Signed out of ${deviceName}.`);
  };

  const handleSignOutAllOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.success("Sessions Cleared", "Signed out of all other devices.");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:security.title", "Security & Authentication")}
        subtitle={t(
          "settings:security.subtitle",
          "Manage account passwords, multi-factor authentication, active login sessions, and audit events."
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: PASSWORD MANAGEMENT */}
        <SettingCard
          title={t("settings:security.passwordTitle", "Change Password")}
          description={t(
            "settings:security.passwordDesc",
            "Update your account password. Use at least 8 characters with numbers and symbols."
          )}
        >
          <div className="space-y-3.5">
            <SettingsInput
              label="Current Password"
              type="password"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={setCurrentPassword}
            />

            <SettingsInput
              label="New Password"
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={setNewPassword}
            />

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--color-text-muted)]">Password Strength:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{strength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full rounded-full transition-all duration-300 ${
                        step <= strength.score ? strength.color : "bg-[var(--color-border)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <SettingsInput
              label="Confirm New Password"
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />

            <button
              type="button"
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword || !newPassword}
              className="mt-2 w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </SettingCard>

        {/* CARD 2: TWO-FACTOR AUTHENTICATION (2FA) */}
        <SettingCard
          title={t("settings:security.twoFactorTitle", "Two-Factor Authentication (2FA)")}
          description={t(
            "settings:security.twoFactorDesc",
            "Protect your video workspace by requiring a time-based TOTP code upon login."
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-[var(--color-text-primary)]">
                      Authenticator App (TOTP)
                    </h5>
                    <SettingsBadge variant={twoFactorEnabled ? "success" : "warning"} size="sm">
                      {twoFactorEnabled ? "ENABLED" : "DISABLED"}
                    </SettingsBadge>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    Google Authenticator, 1Password, or Authy
                  </p>
                </div>
              </div>

              <Toggle
                checked={twoFactorEnabled}
                onChange={(checked) => {
                  if (checked) {
                    setIs2FAModalOpen(true);
                  } else {
                    setTwoFactorEnabled(false);
                    toast.warning("2FA Disabled", "Multi-factor authentication was removed.");
                  }
                }}
              />
            </div>

            {!twoFactorEnabled ? (
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] py-2.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]/20"
              >
                <KeyRound size={14} />
                Set Up Authenticator App
              </button>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
                <Check size={16} className="shrink-0 mt-0.5" />
                <span>Your workspace account is protected with two-factor authentication.</span>
              </div>
            )}
          </div>
        </SettingCard>

        {/* CARD 3: ACTIVE SESSIONS */}
        <SettingCard
          title={t("settings:security.sessionsTitle", "Active Sessions & Devices")}
          description={t(
            "settings:security.sessionsDesc",
            "Devices currently logged into your VidNova account."
          )}
        >
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className={`flex items-center justify-between rounded-xl border p-3.5 ${
                  sess.isCurrent
                    ? "border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]">
                    {sess.iconType === "desktop" ? <Laptop size={18} /> : <Smartphone size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {sess.device}
                      </span>
                      {sess.isCurrent && (
                        <SettingsBadge variant="primary" size="sm">
                          Current Device
                        </SettingsBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {sess.location} • {sess.ipAddress}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {sess.lastActive}
                    </p>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id, sess.device)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-rose-500/10 hover:text-rose-600 transition"
                    title="Sign Out Device"
                  >
                    <LogOut size={15} />
                  </button>
                )}
              </div>
            ))}

            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleSignOutAllOtherSessions}
                className="mt-2 w-full rounded-xl border border-rose-500/30 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
              >
                Sign Out All Other Devices
              </button>
            )}
          </div>
        </SettingCard>

        {/* CARD 4: RECENT SECURITY AUDIT LOG */}
        <SettingCard
          title={t("settings:security.auditTitle", "Security Audit Log")}
          description={t(
            "settings:security.auditDesc",
            "Recent sensitive security events and authentication attempts."
          )}
        >
          <div className="divide-y divide-[var(--color-border)]/60">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {log.action}
                  </span>
                  <SettingsBadge
                    variant={log.status === "success" ? "success" : "warning"}
                    size="sm"
                  >
                    {log.status.toUpperCase()}
                  </SettingsBadge>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  {log.location} ({log.ipAddress}) • {log.timestamp}
                </p>
              </div>
            ))}
          </div>
        </SettingCard>
      </div>

      {/* MODAL: 2FA SETUP */}
      <SettingsModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        title="Set Up Two-Factor Authentication"
        subtitle="Scan the QR code with your authenticator app"
        icon={<QrCode size={20} />}
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIs2FAModalOpen(false)}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerify2FA}
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)]"
            >
              Verify & Enable
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-center">
          {/* Simulated QR Box */}
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <QrCode size={56} className="text-[var(--color-primary)]" />
              <span className="text-[10px] font-mono">VIDNOVA-2FA-QR</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Can't scan the QR code? Enter this secret manually:
            </p>
            <p className="mt-1 font-mono text-xs font-bold tracking-wider text-[var(--color-text-primary)]">
              {INITIAL_MOCK_SETTINGS.security.twoFactorSecret}
            </p>
          </div>

          <div className="pt-2 text-left">
            <SettingsInput
              label="6-Digit Verification Code"
              placeholder="e.g. 123456"
              value={verificationCode}
              onChange={setVerificationCode}
            />
          </div>
        </div>
      </SettingsModal>
    </div>
  );
}
