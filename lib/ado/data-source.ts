import type { InboxDataSource } from "@/components/inbox/InboxProvider";
import type { GroupedInboxItems } from "@/lib/schema/inbox.schema";

import { create } from "@/lib/storage";
import { AdoInstance } from "./schema/instance.schema";

export function createAdoDataSource(instanceId?: string): InboxDataSource {
  const storage = create<{ instances: AdoInstance[] }>("ado-config", "1.0");
  return {
    id: "ado",
    name: "Azure DevOps",

    fetchInboxItems: async (): Promise<GroupedInboxItems> => {
      // Only run on client side
      if (typeof window === "undefined") {
        return {};
      }

      const config = storage.load();
      if (!config || config.instances.length === 0) {
        return {};
      }

      // Filter for specific instance if instanceId is provided
      let filteredConfig = config;
      if (instanceId) {
        const instance = config.instances.find(
          (inst) => inst.id === instanceId
        );
        if (!instance) {
          return {};
        }
        filteredConfig = {
          ...config,
          instances: [instance],
        };
      }

      // Call the API route instead of using the service directly
      const response = await fetch("/api/ado/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filteredConfig),
      });

      if (!response.ok) {
        console.error(
          "Failed to fetch ADO inbox items:",
          await response.text()
        );
        return {};
      }

      return await response.json();
    },

    getConfigStatus: () => {
      // Only run on client side
      if (typeof window === "undefined") {
        return {
          isConfigured: false,
          configUrl: "/settings",
        };
      }

      const config = storage.load();

      // Check if specific instance exists and is configured
      if (instanceId) {
        const instance = config?.instances?.find(
          (inst) => inst.id === instanceId
        );
        const isConfigured = !!instance;
        return {
          isConfigured,
          configUrl: "/settings",
        };
      }

      const isConfigured = !!(config && config.instances.length > 0);

      return {
        isConfigured,
        configUrl: "/settings",
      };
    },
  };
}
