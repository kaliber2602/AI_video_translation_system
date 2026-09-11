import { useState, useEffect } from "react";
import {
  Key,
  HardDrive,
  Cpu,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  Link2,
  Unlink,
  Loader2,
  Settings as SettingsIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsBadge from "../common/SettingsBadge";
import SettingsModal from "../common/SettingsModal";
import SettingsInput from "../common/SettingsInput";
import SelectBox from "../SelectBox";
import { INITIAL_MOCK_SETTINGS } from "../mock/settingsMockData";
import type { IntegrationApp, ApiKeyItem } from "../../../types/integration";
import {
  getIntegrations,
  updateIntegration,
  getApiKeys,
  createApiKey,
  deleteApiKey,
} from "../../../services/integration.service";

export default function IntegrationsSection() {
  const { t } = useTranslation(["settings", "common"]);

  const [apps, setApps] = useState<IntegrationApp[]>(INITIAL_MOCK_SETTINGS.integrations.apps);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_MOCK_SETTINGS.integrations.apiKeys);

  // Modals
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"production" | "development">("production");
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // App Configuration Modal State
  const [selectedAppForConfig, setSelectedAppForConfig] = useState<IntegrationApp | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Fetch real integrations and API keys from backend
  useEffect(() => {
    const fetchIntegrationsData = async () => {
      try {
        const [loadedApps, loadedKeys] = await Promise.all([
          getIntegrations(),
          getApiKeys(),
        ]);
        if (loadedApps && loadedApps.length > 0) {
          setApps(loadedApps);
        }
        if (loadedKeys) {
          setApiKeys(loadedKeys);
        }
      } catch (err) {
        console.error("[IntegrationsSection] Failed to load from backend:", err);
      }
    };
    fetchIntegrationsData();
  }, []);

  const handleOpenConfigModal = (app: IntegrationApp) => {
    setSelectedAppForConfig(app);
    const initialConfig: Record<string, string> = {};
    if (app.config) {
      for (const [k, v] of Object.entries(app.config)) {
        if (v !== undefined && v !== null) {
          initialConfig[k] = String(v);
        }
      }
    }
    if (app.accountEmail) {
      initialConfig.accountEmail = app.accountEmail;
    }
    setConfigForm(initialConfig);
  };

  const renderModalContent = () => {
    if (!selectedAppForConfig) return null;
    const appId = selectedAppForConfig.id;

    if (appId === "openai") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3.5 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 font-bold text-purple-600 dark:text-purple-400 mb-1">
              <Cpu size={15} />
              <span>Bring Your Own OpenAI Quota (BYOK)</span>
            </div>
            Use your OpenAI API key for video subtitle translations and Whisper transcriptions with custom rate limits.
          </div>

          <SettingsInput
            label="OpenAI Secret API Key"
            type="password"
            placeholder="sk-proj-..."
            value={configForm.apiKey || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, apiKey: val }))}
            helperText="Stored securely in your private database. Masked for security."
          />

          <SettingsInput
            label="Organization ID (Optional)"
            placeholder="org-..."
            value={configForm.organization || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, organization: val }))}
            helperText="Optional OpenAI organization identifier for enterprise billing."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
              Default LLM Model for Translation
            </label>
            <SelectBox
              value={configForm.defaultModel || "gpt-4o"}
              onChange={(val) => setConfigForm((prev) => ({ ...prev, defaultModel: val }))}
            >
              <option value="gpt-4o">GPT-4o (Omni - Recommended for best translation fluency)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Ultra fast & cost-efficient)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (High capability)</option>
            </SelectBox>
          </div>
        </div>
      );
    }

    if (appId === "elevenlabs") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3.5 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 font-bold text-purple-600 dark:text-purple-400 mb-1">
              <Cpu size={15} />
              <span>ElevenLabs Multilingual Synthesis</span>
            </div>
            Connect your ElevenLabs API Key to generate AI voice dubbing with ultra-realistic emotional intonation and clone voices.
          </div>

          <SettingsInput
            label="ElevenLabs API Key"
            type="password"
            placeholder="xi-api-key-..."
            value={configForm.apiKey || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, apiKey: val }))}
            helperText="Found under Profile → API Keys in your ElevenLabs dashboard."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
              Voice Synthesis Model
            </label>
            <SelectBox
              value={configForm.modelId || "eleven_multilingual_v2"}
              onChange={(val) => setConfigForm((prev) => ({ ...prev, modelId: val }))}
            >
              <option value="eleven_multilingual_v2">Eleven Multilingual v2 (Recommended - 29+ languages)</option>
              <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (High speed, lowest latency)</option>
              <option value="eleven_flash_v2_5">Eleven Flash v2.5 (Fast turnaround)</option>
            </SelectBox>
          </div>

          <SettingsInput
            label="Default Voice ID (Optional)"
            placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
            value={configForm.voiceId || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, voiceId: val }))}
            helperText="Custom voice ID or cloned voice to default for new dubbing projects."
          />
        </div>
      );
    }

    if (appId === "slack") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 mb-1">
              <MessageSquare size={15} />
              <span>Slack Pipeline Notifications</span>
            </div>
            VidNova will automatically post real-time status updates when translation and dubbing jobs complete.
          </div>

          <SettingsInput
            label="Incoming Webhook URL"
            type="password"
            placeholder="https://hooks.slack.com/services/T.../B.../..."
            value={configForm.webhookUrl || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, webhookUrl: val }))}
            helperText="Generate an Incoming Webhook from Slack App Directory."
          />

          <SettingsInput
            label="Target Channel (Optional)"
            placeholder="#video-translations"
            value={configForm.channel || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, channel: val }))}
            helperText="Override channel name (e.g. #marketing, #localization)."
          />
        </div>
      );
    }

    if (appId === "discord") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 mb-1">
              <MessageSquare size={15} />
              <span>Discord Community Webhook</span>
            </div>
            Send video preview links and pipeline completion notices directly into your Discord community or server channel.
          </div>

          <SettingsInput
            label="Discord Webhook URL"
            type="password"
            placeholder="https://discord.com/api/webhooks/..."
            value={configForm.webhookUrl || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, webhookUrl: val }))}
            helperText="Found in Channel Settings → Integrations → Webhooks in Discord."
          />

          <SettingsInput
            label="Bot Display Name (Optional)"
            placeholder="VidNova Bot"
            value={configForm.botName || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, botName: val }))}
            helperText="Custom name shown as the message sender."
          />
        </div>
      );
    }

    if (appId === "s3") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              <HardDrive size={15} />
              <span>Object Storage (AWS S3 / Cloudflare R2 / MinIO)</span>
            </div>
            Automate primary storage and media archiving to your dedicated S3 or S3-compatible cloud bucket.
          </div>

          <SettingsInput
            label="S3 Bucket Name"
            placeholder="my-vidnova-production-bucket"
            value={configForm.bucket || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, bucket: val }))}
          />

          <SettingsInput
            label="AWS Region"
            placeholder="us-east-1 (or 'auto' for Cloudflare R2)"
            value={configForm.region || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, region: val }))}
          />

          <SettingsInput
            label="Access Key ID"
            placeholder="AKIA..."
            value={configForm.accessKeyId || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, accessKeyId: val }))}
          />

          <SettingsInput
            label="Secret Access Key"
            type="password"
            placeholder="••••••••"
            value={configForm.secretAccessKey || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, secretAccessKey: val }))}
          />

          <SettingsInput
            label="Custom Endpoint URL (Optional)"
            placeholder="https://<account_id>.r2.cloudflarestorage.com or http://minio:9000"
            value={configForm.endpointUrl || ""}
            onChange={(val) => setConfigForm((prev) => ({ ...prev, endpointUrl: val }))}
            helperText="Leave blank for standard AWS S3. Fill in for Cloudflare R2, Wasabi, or MinIO."
          />
        </div>
      );
    }

    // Google Drive / Dropbox / default storage
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] p-3.5 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2 font-bold text-[var(--color-primary)] mb-1">
            <HardDrive size={15} />
            <span>{selectedAppForConfig.name} Cloud Sync</span>
          </div>
          Synchronize raw input footage and auto-export translated videos to your cloud drive.
        </div>

        <SettingsInput
          label="Account Email"
          type="email"
          placeholder="your.email@domain.com"
          value={configForm.accountEmail || ""}
          onChange={(val) => setConfigForm((prev) => ({ ...prev, accountEmail: val }))}
          helperText={`The email address associated with your ${selectedAppForConfig.name} account.`}
        />

        <SettingsInput
          label="Sync Folder Path"
          placeholder={`/VidNova/${selectedAppForConfig.name}`}
          value={configForm.folderPath || ""}
          onChange={(val) => setConfigForm((prev) => ({ ...prev, folderPath: val }))}
          helperText="Path inside your cloud drive where project files will be deposited."
        />
      </div>
    );
  };

  const handleDisconnectApp = async (app: IntegrationApp) => {
    try {
      await updateIntegration(app.id, { is_connected: false });
      setApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, connected: false, badge: undefined } : a))
      );
      toast.warning("Integration Disconnected", `${app.name} link has been removed.`);
      if (selectedAppForConfig?.id === app.id) {
        setSelectedAppForConfig(null);
      }
    } catch (err: any) {
      console.error("[IntegrationsSection] Disconnect failed:", err);
      toast.error("Disconnection Failed", err?.response?.data?.detail || "Could not disconnect integration.");
    }
  };

  const handleSaveAppConfig = async () => {
    if (!selectedAppForConfig) return;

    try {
      setIsSavingConfig(true);
      const email = configForm.accountEmail || selectedAppForConfig.accountEmail || undefined;
      const { accountEmail: _, ...cleanConfig } = configForm;

      await updateIntegration(selectedAppForConfig.id, {
        is_connected: true,
        account_email: email,
        config: cleanConfig,
      });

      setApps((prev) =>
        prev.map((a) =>
          a.id === selectedAppForConfig.id
            ? {
                ...a,
                connected: true,
                badge: "Connected",
                accountEmail: email,
                config: { ...a.config, ...cleanConfig },
              }
            : a
        )
      );

      toast.success(
        "Integration Connected",
        `${selectedAppForConfig.name} configuration saved and activated.`
      );
      setSelectedAppForConfig(null);
    } catch (err: any) {
      console.error("[IntegrationsSection] Save config failed:", err);
      toast.error("Setup Failed", err?.response?.data?.detail || "Could not connect integration.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Invalid Key Name", "Please provide a name for this API key.");
      return;
    }

    try {
      setIsCreatingKey(true);
      const created = await createApiKey({
        name: newKeyName.trim(),
        environment: newKeyEnv,
      });

      setApiKeys((keys) => [created, ...keys]);
      if (created.secret) {
        setGeneratedSecret(created.secret);
      }
      toast.success("API Key Generated", `Key '${created.name}' is ready to use.`);
    } catch (err: any) {
      console.error("[IntegrationsSection] Key generation failed:", err);
      toast.error("Generation Failed", err?.response?.data?.detail || "Could not generate API key.");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    try {
      await deleteApiKey(keyId);
      setApiKeys((keys) => keys.filter((k) => k.id !== keyId));
      toast.warning("API Key Revoked", `API key '${keyName}' was deleted.`);
    } catch (err: any) {
      console.error("[IntegrationsSection] Revoke key failed:", err);
      toast.error("Revocation Failed", err?.response?.data?.detail || "Could not delete API key.");
    }
  };

  const storageApps = apps.filter((a) => a.category === "storage");
  const aiApps = apps.filter((a) => a.category === "ai");
  const productivityApps = apps.filter((a) => a.category === "productivity");

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title={t("settings:integrations.title", "Integrations & Developer API")}
        subtitle={t(
          "settings:integrations.subtitle",
          "Connect external cloud storage, third-party neural voice engines, communication channels, and developer tokens."
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CARD 1: CLOUD STORAGE */}
        <SettingCard
          title={t("settings:integrations.storageTitle", "Cloud Storage Connections")}
          description={t(
            "settings:integrations.storageDesc",
            "Auto-import source footage and export dubbed video outputs to your cloud storage."
          )}
        >
          <div className="space-y-3">
            {storageApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {app.name}
                      </span>
                      {app.connected && (
                        <SettingsBadge variant="success" size="sm" dot>
                          Connected
                        </SettingsBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                      {app.accountEmail || app.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenConfigModal(app)}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition"
                        title="Configure settings"
                      >
                        <SettingsIcon size={13} />
                        <span>Configure</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnectApp(app)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                        title="Disconnect"
                      >
                        <Unlink size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenConfigModal(app)}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] transition shadow-sm"
                    >
                      <Link2 size={13} />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SettingCard>

        {/* CARD 2: AI & VOICE PROVIDERS */}
        <SettingCard
          title={t("settings:integrations.aiProvidersTitle", "AI & Voice Providers")}
          description={t(
            "settings:integrations.aiProvidersDesc",
            "Bring your own API keys for custom ElevenLabs voice clones and OpenAI endpoints."
          )}
        >
          <div className="space-y-3">
            {aiApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {app.name}
                      </span>
                      {app.connected && (
                        <SettingsBadge variant="purple" size="sm" dot>
                          Active
                        </SettingsBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                      {app.accountEmail || app.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenConfigModal(app)}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition"
                        title="Configure settings"
                      >
                        <SettingsIcon size={13} />
                        <span>Configure</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnectApp(app)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                        title="Disconnect"
                      >
                        <Unlink size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenConfigModal(app)}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] transition shadow-sm"
                    >
                      <Link2 size={13} />
                      <span>Connect API</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SettingCard>

        {/* CARD 3: PRODUCTIVITY & WEBHOOKS */}
        <SettingCard
          title={t("settings:integrations.productivityTitle", "Productivity & Channels")}
          description={t(
            "settings:integrations.productivityDesc",
            "Send team alerts and trigger downstream automations via Slack & Discord."
          )}
        >
          <div className="space-y-3">
            {productivityApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {app.name}
                      </span>
                      {app.connected && (
                        <SettingsBadge variant="primary" size="sm">
                          {app.badge || "Connected"}
                        </SettingsBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                      {app.accountEmail || app.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenConfigModal(app)}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] transition"
                        title="Configure settings"
                      >
                        <SettingsIcon size={13} />
                        <span>Configure</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnectApp(app)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                        title="Disconnect"
                      >
                        <Unlink size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenConfigModal(app)}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] transition shadow-sm"
                    >
                      <Link2 size={13} />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SettingCard>

        {/* CARD 4: DEVELOPER API KEYS */}
        <SettingCard
          title={t("settings:integrations.apiKeysTitle", "Developer API Access")}
          description={t(
            "settings:integrations.apiKeysDesc",
            "Programmatically translate videos and query job transcripts via VidNova REST API."
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Active API Keys ({apiKeys.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setGeneratedSecret(null);
                  setNewKeyName("");
                  setIsNewKeyModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
              >
                <Plus size={13} />
                Generate New Key
              </button>
            </div>

            <div className="divide-y divide-[var(--color-border)]/60">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {key.name}
                      </span>
                      <SettingsBadge
                        variant={key.environment === "production" ? "primary" : "neutral"}
                        size="sm"
                      >
                        {key.environment.toUpperCase()}
                      </SettingsBadge>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--color-text-muted)]">
                      {key.prefix}••••••••••••
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      Created {key.createdDate} • Last used {key.lastUsed}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeKey(key.id, key.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-rose-500/10 hover:text-rose-600 transition"
                    title="Revoke Key"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--color-border)]/60 pt-3">
              <a
                href="#docs"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("API Documentation", "Opening developer docs at docs.vidnova.ai/api");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                <span>Read Developer API Docs</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* MODAL: APP CONFIGURATION (OpenAI, ElevenLabs, Slack, Discord, S3, GDrive, Dropbox) */}
      <SettingsModal
        isOpen={!!selectedAppForConfig}
        onClose={() => setSelectedAppForConfig(null)}
        title={
          selectedAppForConfig
            ? selectedAppForConfig.connected
              ? `Configure ${selectedAppForConfig.name}`
              : `Connect ${selectedAppForConfig.name}`
            : ""
        }
        subtitle={
          selectedAppForConfig?.connected
            ? "Modify your integration settings or update credentials."
            : "Enter your configuration credentials to activate this service."
        }
        icon={
          selectedAppForConfig?.category === "ai" ? (
            <Cpu size={20} />
          ) : selectedAppForConfig?.category === "productivity" ? (
            <MessageSquare size={20} />
          ) : (
            <HardDrive size={20} />
          )
        }
        maxWidth="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            {selectedAppForConfig?.connected ? (
              <button
                type="button"
                onClick={() => selectedAppForConfig && handleDisconnectApp(selectedAppForConfig)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
              >
                <Unlink size={13} />
                <span>Disconnect</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedAppForConfig(null)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAppConfig}
                disabled={isSavingConfig}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition"
              >
                {isSavingConfig && <Loader2 size={13} className="animate-spin" />}
                <span>
                  {isSavingConfig
                    ? "Saving..."
                    : selectedAppForConfig?.connected
                    ? "Update Settings"
                    : "Save & Connect"}
                </span>
              </button>
            </div>
          </div>
        }
      >
        {renderModalContent()}
      </SettingsModal>

      {/* MODAL: GENERATE API KEY */}
      <SettingsModal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
        title={generatedSecret ? "Save Your Secret API Key" : "Create New API Key"}
        subtitle={
          generatedSecret
            ? "Please copy your secret key now. You will not be able to see it again!"
            : "Generate a programmatic credential with full API access."
        }
        icon={<Key size={20} />}
        maxWidth="md"
        footer={
          generatedSecret ? (
            <button
              type="button"
              onClick={() => setIsNewKeyModalOpen(false)}
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white"
            >
              I Have Saved My Secret Key
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewKeyModalOpen(false)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateApiKey}
                disabled={isCreatingKey}
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCreatingKey && <Loader2 size={13} className="animate-spin" />}
                <span>{isCreatingKey ? "Generating..." : "Generate Key"}</span>
              </button>
            </div>
          )
        }
      >
        {generatedSecret ? (
          <div className="space-y-3">
            <SettingsInput
              label="Secret API Token"
              value={generatedSecret}
              allowCopy
              readOnly
            />
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ Store this secret in your environment variables. Never commit this token into public git repositories.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SettingsInput
              label="Key Name / Identifier"
              placeholder="e.g. Video Pipeline Worker Production"
              value={newKeyName}
              onChange={setNewKeyName}
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                Environment
              </label>
              <SelectBox
                value={newKeyEnv}
                onChange={(val) => setNewKeyEnv(val as any)}
              >
                <option value="production">Production (Standard rate limits)</option>
                <option value="development">Development / Staging Sandbox</option>
              </SelectBox>
            </div>
          </div>
        )}
      </SettingsModal>
    </div>
  );
}
