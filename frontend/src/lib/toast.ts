import { sileo } from "sileo";

export const toast = {
  success: (title: string, description?: string) => {
    return sileo.success({
      title,
      description,
    });
  },

  error: (title: string, description?: string) => {
    return sileo.error({
      title,
      description,
    });
  },

  warning: (title: string, description?: string) => {
    return sileo.warning({
      title,
      description,
    });
  },

  info: (title: string, description?: string) => {
    return sileo.info({
      title,
      description,
    });
  },
};