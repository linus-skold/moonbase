interface StorageData {
  version: string;
  config: unknown;
  updatedAt: string;
}

export const create = <T>(storageKey: string, storageVersion: string) => ({
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

      return data.config as T;
    } catch (error) {
      console.error("Failed to load ADO configuration:", error);
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
        config,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Failed to save ADO configuration:", error);
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
      console.error("Failed to clear ADO configuration:", error);
      return false;
    }
  },
  export: (config: T): void => {
    // Remove sensitive data before export
    const sanitized = JSON.parse(JSON.stringify(config), (key, value) => {
      if (key === "personalAccessToken") {
        return "***REDACTED***";
      }
      return value;
    });

    const data = JSON.stringify(sanitized, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `ado-config-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  import: async (file: File): Promise<T | null> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Basic validation
      if (!parsed.instances || !Array.isArray(parsed.instances)) {
        throw new Error("Invalid configuration format");
      }

      return parsed as T;
    } catch (error) {
      console.error("Failed to import configuration:", error);
      return null;
    }
  },
});
