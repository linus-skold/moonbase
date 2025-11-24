import { z } from "zod";

interface StorageData {
  version: string;
  config: unknown;
  updatedAt: string;
}

export const create = <T>(storageKey: string, storageVersion: string, schema: z.ZodSchema<T>) => ({
  load: (): T | null => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      const data: StorageData = JSON.parse(raw);
      if (data.version !== storageVersion) {
        console.warn("Configuration version mismatch, migration may be needed");
      }
      return schema.parse(data.config);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      return null;
    }
  },
  save: (config: T): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const data: StorageData = {
        version: storageVersion,
        config: schema.parse(config),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Failed to save configuration:", error);
      return false;
    }
  },
  clear: (): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error("Failed to clear configuration:", error);
      return false;
    }
  },
});
