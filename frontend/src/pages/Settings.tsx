import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { toast } from "../lib/toast";
import { useTheme } from "../app/providers/ThemeProvider";

import {
  ArrowLeft,
  Bell,
  Bot,
  Check,
  ChevronDown,
  Globe,
  Lock,
  Palette,
  Save,
  Shield,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import type { Theme } from "../config/theme";

import {
  getMe,
  updateAvatar,
} from "../services/auth.service";

import type {
  UserResponse,
} from "../types/auth";


// =========================================================
// Settings Section
// =========================================================

type SettingsSection =
  | "account"
  | "general"
  | "workspace"
  | "ai"
  | "translation"
  | "billing"
  | "notifications"
  | "integrations"
  | "security"
  | "privacy";


// =========================================================
// Toggle
// =========================================================

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked
          ? "bg-[#16C3A8]"
          : "bg-[#CBD8D8]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--color-surface)] shadow-sm transition ${
          checked
            ? "left-6"
            : "left-1"
        }`}
      />
    </button>
  );
}


// =========================================================
// Select Box
// =========================================================

function SelectBox({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 pr-10 text-sm text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
      >
        {children}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
    </div>
  );
}


// =========================================================
// Setting Item
// =========================================================

function SettingItem({
  icon,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? "bg-[#E5F8F4] text-[#12B99F]"
          : "text-[#53636B] hover:bg-[#F5F9F8]"
      }`}
    >
      {icon}

      <span>
        {title}
      </span>
    </button>
  );
}


// =========================================================
// Setting Card
// =========================================================

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E3EBE9] bg-[var(--color-surface)] p-5 shadow-[0_8px_30px_rgba(30,70,80,0.035)]">
      <div className="mb-5">
        <h2 className="text-base font-bold text-[#263641]">
          {title}
        </h2>

        <p className="mt-1 text-xs text-[#87969A]">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}


// =========================================================
// Toggle Row
// =========================================================

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#53636B]">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-[#8B999D]">
          {description}
        </p>
      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
      />
    </div>
  );
}


// =========================================================
// Avatar Helper
// =========================================================
//
// Backend đang lưu avatar dưới dạng:
//    Base64 thuần
//
// Ví dụ:
//    /9j/4AAQSkZJRgABAQ...
//
// Vì vậy khi đưa vào <img src=""> phải chuyển thành:
//    data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...
//
// Nếu không thêm prefix, browser sẽ hiểu Base64
// là một URL tương đối và dẫn tới lỗi 414.
// =========================================================

const getAvatarSrc = (
  avatar?: string | null
): string | null => {
  if (!avatar) {
    return null;
  }

  // Trường hợp backend sau này trả về
  // data:image/... sẵn.
  if (avatar.startsWith("data:image/")) {
    return avatar;
  }

  // Backend hiện tại luôn convert ảnh thành JPEG.
  return `data:image/jpeg;base64,${avatar}`;
};


// =========================================================
// Main Setting Component
// =========================================================

export default function Setting() {
  const navigate = useNavigate();

  const {
    theme,
    setTheme,
  } = useTheme();


  // =========================================================
  // User
  // =========================================================

  const [user, setUser] =
    useState<UserResponse | null>(null);

  const [isLoadingUser, setIsLoadingUser] =
    useState(true);

  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);

  const avatarInputRef =
    useRef<HTMLInputElement>(null);


  // =========================================================
  // Settings
  // =========================================================

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

  const [isSaved, setIsSaved] =
    useState(true);

  const [autoSave, setAutoSave] =
    useState(true);

  const [showTranscripts, setShowTranscripts] =
    useState(true);

  const [aiSuggestions, setAiSuggestions] =
    useState(true);

  const [compactView, setCompactView] =
    useState(false);

  const [autoTranslation, setAutoTranslation] =
    useState(true);

  const [autoSummary, setAutoSummary] =
    useState(true);

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [processingUpdates, setProcessingUpdates] =
    useState(true);

  const [tipsNews, setTipsNews] =
    useState(true);

  const [profileEditing, setProfileEditing] =
    useState(false);


  // =========================================================
  // Load Current User
  // =========================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoadingUser(true);

        const currentUser =
          await getMe();

        setUser(currentUser);
      } catch (error) {
        console.error(
          "[SETTINGS] Failed to load current user:",
          error
        );
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);


  // =========================================================
  // Helpers
  // =========================================================

  const getInitials = (
    fullName: string
  ): string => {
    const initials = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return initials || "U";
  };


  const markChanged = () => {
    setIsSaved(false);
  };


  const handleSave = () => {
    setIsSaved(true);
  };


  const handleSectionChange = (
    section: SettingsSection
  ) => {
    setActiveSection(section);
  };


  // =========================================================
  // Avatar Upload
  // =========================================================

  const handleAvatarChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }


    // -------------------------------------------------------
    // Validate File Type
    // -------------------------------------------------------

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid image",
        "Please select a JPG, PNG, or WebP image."
      );

      event.target.value = "";

      return;
    }


    // -------------------------------------------------------
    // Validate File Size
    // -------------------------------------------------------

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        "Image too large",
        "Avatar image must be smaller than 5 MB."
      );

      event.target.value = "";

      return;
    }


    // -------------------------------------------------------
    // Upload
    // -------------------------------------------------------

    try {
      setIsUploadingAvatar(true);

      const updatedUser =
        await updateAvatar(file);


      console.log(
        "[SETTINGS] Avatar updated:",
        updatedUser
      );


      // -----------------------------------------------------
      // Update User State
      // -----------------------------------------------------

      setUser((previousUser) => {
        if (!previousUser) {
          return updatedUser;
        }

        return {
          ...previousUser,
          ...updatedUser,
          avatar: updatedUser.avatar,
        };
      });


      toast.success(
        "Avatar updated",
        "Your profile picture has been updated successfully."
      );

    } catch (error: any) {

      console.error(
        "[SETTINGS] Failed to update avatar:",
        error
      );


      const backendMessage =
        error?.response?.data?.detail;


      toast.error(
        "Update failed",
        backendMessage ||
          "Unable to update your avatar."
      );

    } finally {

      setIsUploadingAvatar(false);

      // Allow selecting same file again
      event.target.value = "";
    }
  };


  // =========================================================
  // Open Avatar Picker
  // =========================================================

  const handleOpenAvatarPicker = () => {
    if (isUploadingAvatar) {
      return;
    }

    avatarInputRef.current?.click();
  };


  // =========================================================
  // Avatar Source
  // =========================================================

  const avatarSrc =
    getAvatarSrc(user?.avatar);


  // =========================================================
  // Render
  // =========================================================

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">

      {/* =====================================================
          TOPBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 flex h-[84px] items-center border-b border-[#E7EFEE] bg-[var(--color-surface)]/90 px-6 backdrop-blur-xl lg:px-8">

        <div className="flex min-w-0 items-center gap-4">

          <button
            type="button"
            onClick={() =>
              navigate("/workspace")
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3EBEA] text-[#718387] transition hover:border-[#18C3AA] hover:text-[#18BFA7]"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
              Settings
            </h1>

            <p className="text-xs text-[#8A999D]">
              Manage your account and preferences
            </p>
          </div>

        </div>


        <div className="ml-auto flex items-center gap-3">

          <div className="hidden items-center gap-2 rounded-full border border-[#E3ECEB] bg-[#F8FBFB] px-4 py-2.5 md:flex">
            <span className="text-sm text-[#9AA7AA]">
              Search anything...
            </span>
          </div>


          <button
            type="button"
            onClick={() =>
              navigate("/workspace")
            }
            className="hidden items-center gap-2 rounded-xl bg-[#15C2A8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(21,194,168,.22)] transition hover:bg-[#0FB39B] sm:flex"
          >
            + New Project
          </button>


          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8EFEE] bg-[var(--color-surface)]"
          >
            <Bell
              size={18}
              className="text-[#52626F]"
            />
          </button>


          {/* Topbar Avatar */}

          <button
            type="button"
            onClick={() =>
              navigate("/workspace")
            }
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#D8F3EE] text-sm font-bold text-[#159C8B]"
          >

            {isLoadingUser ? (
              "U"
            ) : avatarSrc ? (
              <img
                src={avatarSrc}
                alt={`${user?.full_name ?? "User"} avatar`}
                className="h-full w-full object-cover"
              />
            ) : user ? (
              getInitials(user.full_name)
            ) : (
              "U"
            )}

          </button>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="mx-auto flex w-full max-w-[1600px]">

        {/* ===================================================
            SETTINGS SIDEBAR
        ==================================================== */}

        <aside className="hidden w-[215px] shrink-0 border-r border-[#E5ECEB] bg-[var(--color-surface)] px-4 py-5 lg:block">

          <nav className="space-y-1">

            <SettingItem
              icon={<User size={17} />}
              title="Account"
              active={
                activeSection === "account"
              }
              onClick={() =>
                handleSectionChange(
                  "account"
                )
              }
            />

            <SettingItem
              icon={
                <SlidersHorizontal
                  size={17}
                />
              }
              title="General"
              active={
                activeSection === "general"
              }
              onClick={() =>
                handleSectionChange(
                  "general"
                )
              }
            />

            <SettingItem
              icon={<Globe size={17} />}
              title="Workspace"
              active={
                activeSection === "workspace"
              }
              onClick={() =>
                handleSectionChange(
                  "workspace"
                )
              }
            />

            <SettingItem
              icon={<Bot size={17} />}
              title="AI & Processing"
              active={
                activeSection === "ai"
              }
              onClick={() =>
                handleSectionChange("ai")
              }
            />

            <SettingItem
              icon={<Globe size={17} />}
              title="Translation & Voice"
              active={
                activeSection ===
                "translation"
              }
              onClick={() =>
                handleSectionChange(
                  "translation"
                )
              }
            />

            <SettingItem
              icon={<Palette size={17} />}
              title="Billing & Subscription"
              active={
                activeSection === "billing"
              }
              onClick={() =>
                handleSectionChange(
                  "billing"
                )
              }
            />

            <SettingItem
              icon={<Bell size={17} />}
              title="Notifications"
              active={
                activeSection ===
                "notifications"
              }
              onClick={() =>
                handleSectionChange(
                  "notifications"
                )
              }
            />

            <SettingItem
              icon={
                <SlidersHorizontal
                  size={17}
                />
              }
              title="Integrations"
              active={
                activeSection ===
                "integrations"
              }
              onClick={() =>
                handleSectionChange(
                  "integrations"
                )
              }
            />

            <SettingItem
              icon={<Lock size={17} />}
              title="Security"
              active={
                activeSection === "security"
              }
              onClick={() =>
                handleSectionChange(
                  "security"
                )
              }
            />

            <SettingItem
              icon={<Shield size={17} />}
              title="Data & Privacy"
              active={
                activeSection === "privacy"
              }
              onClick={() =>
                handleSectionChange(
                  "privacy"
                )
              }
            />

          </nav>

        </aside>


        {/* ===================================================
            CONTENT
        ==================================================== */}

        <main className="min-w-0 flex-1 p-5 sm:p-7 lg:p-8">

          {/* =================================================
              ACCOUNT
          ================================================== */}

          {activeSection === "account" && (
            <>

              <div className="mb-6 flex items-center justify-between">

                <div>

                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Account Settings
                  </h2>

                  <p className="mt-1 text-sm text-[#819095]">
                    Manage your personal information
                    and preferences.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={handleSave}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    isSaved
                      ? "border border-[#DCE9E6] bg-[var(--color-surface)] text-[#53666B]"
                      : "bg-[#15C2A8] text-white"
                  }`}
                >

                  {isSaved ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}

                  {isSaved
                    ? "Saved"
                    : "Save Changes"}

                </button>

              </div>


              <div className="grid gap-5 xl:grid-cols-2">

                {/* =================================================
                    PROFILE
                ================================================== */}

                <SettingCard
                  title="Profile"
                  description="Manage your personal information"
                >

                  <div className="flex flex-col gap-5 sm:flex-row">

                    {/* =================================================
                        AVATAR
                    ================================================== */}

                    <div className="relative shrink-0">

                      <button
                        type="button"
                        onClick={
                          handleOpenAvatarPicker
                        }
                        disabled={
                          isUploadingAvatar
                        }
                        className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#D8F3EE] text-3xl font-bold text-[#159C8B] disabled:cursor-not-allowed disabled:opacity-60"
                      >

                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={`${user?.full_name ?? "User"} avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : user ? (
                          getInitials(
                            user.full_name
                          )
                        ) : (
                          "U"
                        )}

                      </button>


                      {/* Edit button */}

                      <button
                        type="button"
                        onClick={
                          handleOpenAvatarPicker
                        }
                        disabled={
                          isUploadingAvatar
                        }
                        className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#15C2A8] text-white transition hover:bg-[#0FB39B] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Change avatar"
                      >
                        ✎
                      </button>


                      {/* Hidden input */}

                      <input
                        ref={avatarInputRef}
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={
                          handleAvatarChange
                        }
                      />

                    </div>


                    {/* =================================================
                        PROFILE INFORMATION
                    ================================================== */}

                    <div className="min-w-0 flex-1 space-y-3">

                      {/* NAME */}

                      <div>

                        <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                          Name
                        </label>

                        <input
                          value={
                            user?.full_name ??
                            ""
                          }
                          disabled={
                            !profileEditing
                          }
                          onChange={markChanged}
                          className="h-10 w-full rounded-lg border border-[#DFE8E6] px-3 text-sm outline-none focus:border-[#19C3A9]"
                        />

                      </div>


                      {/* EMAIL */}

                      <div>

                        <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                          Email
                        </label>

                        <input
                          value={
                            user?.email ?? ""
                          }
                          disabled={
                            !profileEditing
                          }
                          onChange={markChanged}
                          className="h-10 w-full rounded-lg border border-[#DFE8E6] px-3 text-sm outline-none focus:border-[#19C3A9]"
                        />

                      </div>


                      {/* ROLE */}

                      <div>

                        <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                          Role
                        </label>

                        <input
                          value={
                            user?.role ?? ""
                          }
                          disabled
                          readOnly
                          className="h-10 w-full rounded-lg border border-[#DFE8E6] bg-[#F8FAFA] px-3 text-sm text-[#7D8B8F]"
                        />

                      </div>


                      {/* EDIT PROFILE */}

                      <button
                        type="button"
                        onClick={() =>
                          setProfileEditing(
                            !profileEditing
                          )
                        }
                        className="h-10 w-full rounded-lg border border-[#19C3A9] text-sm font-semibold text-[#16BFA7] transition hover:bg-[#EAF9F6]"
                      >
                        {profileEditing
                          ? "Done Editing"
                          : "Edit Profile"}
                      </button>

                    </div>

                  </div>

                </SettingCard>


                {/* =================================================
                    LANGUAGE
                ================================================== */}

                <SettingCard
                  title="Language & Theme"
                  description="Set your language and regional preferences"
                >

                  <div className="space-y-4">

                    <div>

                      <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                        Language
                      </label>

                      <SelectBox value="🇺🇸  English">

                        <option>
                          🇺🇸 English
                        </option>

                        <option>
                          🇻🇳 Vietnamese
                        </option>

                      </SelectBox>

                    </div>


                    <div>

                      <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                        Theme
                      </label>

                      <SelectBox
                        value={theme}
                        onChange={(value) => {
                          setTheme(
                            value as Theme
                          );

                          markChanged();
                        }}
                      >

                        <option value="system">
                          System
                        </option>

                        <option value="light">
                          Light
                        </option>

                        <option value="dark">
                          Dark
                        </option>

                      </SelectBox>

                    </div>


                    <div>

                      <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                        Date Format
                      </label>

                      <SelectBox value="DD/MM/YYYY">

                        <option>
                          DD/MM/YYYY
                        </option>

                        <option>
                          MM/DD/YYYY
                        </option>

                        <option>
                          YYYY-MM-DD
                        </option>

                      </SelectBox>

                    </div>


                    <button
                      type="button"
                      onClick={handleSave}
                      className="h-10 w-full rounded-lg bg-[#15C2A8] text-sm font-semibold text-white transition hover:bg-[#0FB39B]"
                    >
                      Save Changes
                    </button>

                  </div>

                </SettingCard>


                {/* =================================================
                    WORKSPACE
                ================================================== */}

                <SettingCard
                  title="Workspace Preferences"
                  description="Customize your workspace experience"
                >

                  <div className="divide-y divide-[#EEF2F1]">

                    <ToggleRow
                      title="Auto Save"
                      description="Automatically save your work"
                      checked={autoSave}
                      onChange={(value) => {
                        setAutoSave(value);
                        markChanged();
                      }}
                    />

                    <ToggleRow
                      title="Show Transcripts by Default"
                      description="Display transcripts in video workspace"
                      checked={
                        showTranscripts
                      }
                      onChange={(value) => {
                        setShowTranscripts(
                          value
                        );

                        markChanged();
                      }}
                    />

                    <ToggleRow
                      title="Enable AI Suggestions"
                      description="Get smart recommendations"
                      checked={
                        aiSuggestions
                      }
                      onChange={(value) => {
                        setAiSuggestions(
                          value
                        );

                        markChanged();
                      }}
                    />

                    <ToggleRow
                      title="Compact View"
                      description="Use compact layout in lists"
                      checked={
                        compactView
                      }
                      onChange={(value) => {
                        setCompactView(value);
                        markChanged();
                      }}
                    />

                  </div>

                </SettingCard>


                {/* =================================================
                    AI
                ================================================== */}

                <SettingCard
                  title="AI & Processing Settings"
                  description="Configure AI features and processing options"
                >

                  <div className="space-y-4">

                    <div>

                      <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                        Default AI Model
                      </label>

                      <SelectBox value="VidNova Smart (Recommended)">

                        <option>
                          VidNova Smart (Recommended)
                        </option>

                        <option>
                          Fast Translation
                        </option>

                        <option>
                          High Quality
                        </option>

                      </SelectBox>

                    </div>


                    <div>

                      <label className="mb-1.5 block text-xs font-medium text-[#69797E]">
                        Processing Priority
                      </label>

                      <SelectBox value="Balanced">

                        <option>
                          Balanced
                        </option>

                        <option>
                          Fast
                        </option>

                        <option>
                          Quality
                        </option>

                      </SelectBox>

                    </div>


                    <ToggleRow
                      title="Auto Translation"
                      description="Automatically translate new videos"
                      checked={
                        autoTranslation
                      }
                      onChange={(value) => {
                        setAutoTranslation(
                          value
                        );

                        markChanged();
                      }}
                    />

                    <ToggleRow
                      title="Auto Summary"
                      description="Generate summary for new videos"
                      checked={
                        autoSummary
                      }
                      onChange={(value) => {
                        setAutoSummary(
                          value
                        );

                        markChanged();
                      }}
                    />

                  </div>

                </SettingCard>


                {/* =================================================
                    STORAGE
                ================================================== */}

                <SettingCard
                  title="Storage & Usage"
                  description="Monitor your storage and usage"
                >

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-bold text-[#263641]">
                      72.4 GB / 500 GB
                    </span>

                    <span className="text-xs text-[#819095]">
                      14%
                    </span>

                  </div>


                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E4ECEA]">

                    <div className="h-full w-[14%] rounded-full bg-[#18C3AA]" />

                  </div>


                  <div className="mt-4 flex flex-wrap gap-5 text-xs text-[#75858A]">

                    <span>
                      <b className="text-[#16BFA7]">
                        ●
                      </b>{" "}
                      Videos 52.1 GB
                    </span>

                    <span>
                      <b className="text-[#4C94E8]">
                        ●
                      </b>{" "}
                      Documents 12.3 GB
                    </span>

                    <span>
                      <b className="text-[#9570D9]">
                        ●
                      </b>{" "}
                      Cache 8.0 GB
                    </span>

                  </div>


                  <button
                    type="button"
                    className="mt-5 h-10 w-full rounded-lg border border-[#18C3AA] text-sm font-semibold text-[#16BFA7] hover:bg-[#EAF9F6]"
                  >
                    Manage Storage
                  </button>

                </SettingCard>


                {/* =================================================
                    NOTIFICATIONS
                ================================================== */}

                <SettingCard
                  title="Notifications"
                  description="Manage how you receive updates"
                >

                  <div className="divide-y divide-[#EEF2F1]">

                    <ToggleRow
                      title="Email Notifications"
                      description="Receive important updates via email"
                      checked={
                        emailNotifications
                      }
                      onChange={(value) => {
                        setEmailNotifications(
                          value
                        );

                        markChanged();
                      }}
                    />

                    <ToggleRow
                      title="Processing Updates"
                      description="Get notified when processing is complete"
                      checked={
                        processingUpdates
                      }
                      onChange={(value) => {
                        setProcessingUpdates(
                          value
                        );

                        markChanged();
                      }}
                    />

                    <ToggleRow
                      title="Tips & News"
                      description="Receive product tips and new features"
                      checked={tipsNews}
                      onChange={(value) => {
                        setTipsNews(value);
                        markChanged();
                      }}
                    />

                  </div>

                </SettingCard>

              </div>

            </>
          )}


          {/* =====================================================
              OTHER SECTIONS
          ====================================================== */}

          {activeSection !== "account" && (
            <section className="rounded-xl border border-[#E3EBE9] bg-[var(--color-surface)] p-8 shadow-[0_8px_30px_rgba(30,70,80,0.035)]">

              <div className="flex h-[420px] flex-col items-center justify-center text-center">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F9F5] text-[#18BFA7]">
                  <SlidersHorizontal size={28} />
                </div>


                <h2 className="mt-5 text-xl font-bold text-[#263641]">

                  {activeSection === "ai" &&
                    "AI & Processing"}

                  {activeSection ===
                    "general" &&
                    "General Settings"}

                  {activeSection ===
                    "workspace" &&
                    "Workspace Preferences"}

                  {activeSection ===
                    "translation" &&
                    "Translation & Voice"}

                  {activeSection ===
                    "billing" &&
                    "Billing & Subscription"}

                  {activeSection ===
                    "notifications" &&
                    "Notifications"}

                  {activeSection ===
                    "integrations" &&
                    "Integrations"}

                  {activeSection ===
                    "security" &&
                    "Security"}

                  {activeSection ===
                    "privacy" &&
                    "Data & Privacy"}

                </h2>


                <p className="mt-2 max-w-md text-sm leading-6 text-[#819095]">
                  This settings section is ready
                  for configuration. The detailed
                  controls can be connected to the
                  backend later.
                </p>

              </div>

            </section>
          )}

        </main>

      </div>

    </div>
  );
}