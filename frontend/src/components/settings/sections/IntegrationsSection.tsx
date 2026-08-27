import { useState } from "react";
import { Key, HardDrive, Cpu, MessageSquare, Plus, Trash2, ExternalLink, Link2, Unlink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "../../../lib/toast";
import SettingCard from "../SettingCard";
import SettingsSectionHeader from "../common/SettingsSectionHeader";
import SettingsBadge from "../common/SettingsBadge";
import SettingsModal from "../common/SettingsModal";
import SettingsInput from "../common/SettingsInput";
import SelectBox from "../SelectBox";
import { INITIAL_MOCK_SETTINGS, type IntegrationApp, type ApiKeyItem } from "../mock/settingsMockData";

export default function IntegrationsSection() {
  const { t } = useTranslation(["settings", "common"]);

  const [apps, setApps] = useState<IntegrationApp[]>(INITIAL_MOCK_SETTINGS.integrations.apps);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_MOCK_SETTINGS.integrations.apiKeys);

  // Modals
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"production" | "development">("production");
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  const handleToggleApp = (appId: string) => {
    setApps((currentApps) =>
      currentApps.map((app) => {
        if (app.id === appId) {
          const nextState = !app.connected;
          if (nextState) {
            toast.success("Integration Connected", `${app.name} has been linked to your workspace.`);
          } else {
            toast.warning("Integration Disconnected", `${app.name} link has been removed.`);
          }
          return {
            ...app,
            connected: nextState,
            badge: nextState ? "Connected" : undefined,
          };
        }
        return app;
      })
    );
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Invalid Key Name", "Please provide a name for this API key.");
      return;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const prefix = `vn_${newKeyEnv === "production" ? "live" : "test"}_${randomSuffix.slice(0, 4)}`;
    const fullSecret = `${prefix}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;

    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      prefix,
      createdDate: "Just now",
      lastUsed: "Never",
      environment: newKeyEnv,
    };

    setApiKeys([newKey, ...apiKeys]);
    setGeneratedSecret(fullSecret);
    toast.success("API Key Generated", `Key '${newKey.name}' is ready to use.`);
  };

  const handleRevokeKey = (keyId: string, keyName: string) => {
    setApiKeys((keys) => keys.filter((k) => k.id !== keyId));
    toast.warning("API Key Revoked", `API key '${keyName}' was deleted.`);
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

                <button
                  type="button"
                  onClick={() => handleToggleApp(app.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    app.connected
                      ? "border border-[var(--color-border)] text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  }`}
                >
                  {app.connected ? <Unlink size={13} /> : <Link2 size={13} />}
                  <span>{app.connected ? "Disconnect" : "Connect"}</span>
                </button>
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

                <button
                  type="button"
                  onClick={() => handleToggleApp(app.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    app.connected
                      ? "border border-[var(--color-border)] text-rose-600 hover:bg-rose-500/10"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  }`}
                >
                  {app.connected ? "Configure" : "Connect API"}
                </button>
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

                <button
                  type="button"
                  onClick={() => handleToggleApp(app.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    app.connected
                      ? "border border-[var(--color-border)] text-rose-600 hover:bg-rose-500/10"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  }`}
                >
                  {app.connected ? "Disconnect" : "Connect"}
                </button>
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
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)]"
              >
                Generate Key
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
