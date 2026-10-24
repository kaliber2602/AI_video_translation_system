import { sileo } from "sileo";

function formatMessage(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, any>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.error === "string") return obj.error;
    try {
      return JSON.stringify(obj);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export const toast = {
  success: (title: unknown, description?: unknown) => {
    return sileo.success({
      title: formatMessage(title, "Success"),
      description: description ? formatMessage(description, "") : undefined,
    });
  },

  error: (title: unknown, description?: unknown) => {
    return sileo.error({
      title: formatMessage(title, "Error"),
      description: description ? formatMessage(description, "") : undefined,
    });
  },

  warning: (title: unknown, description?: unknown) => {
    return sileo.warning({
      title: formatMessage(title, "Warning"),
      description: description ? formatMessage(description, "") : undefined,
    });
  },

  info: (title: unknown, description?: unknown) => {
    return sileo.info({
      title: formatMessage(title, "Info"),
      description: description ? formatMessage(description, "") : undefined,
    });
  },
};
