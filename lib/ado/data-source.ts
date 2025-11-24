import type { InboxDataSource } from "@/components/inbox/InboxProvider";
import type { GroupedInboxItems } from "@/lib/schema/inbox.schema";

import { create } from "@/lib/storage";
import { type AdoInstance, AdoInstanceSchema, AdoConfigSchema } from "./schema/instance.schema";
import InboxCache from "@/lib/utils/inbox-cache";

export function createAdoDataSource(instanceId?: string): InboxDataSource {
  const storage = create("ado-config", "1.0", AdoConfigSchema);
  const dataSourceName = "ado";
  return {
    id: dataSourceName,
    name: "Azure DevOps",

    fetchInboxItems: async (options?: { forceRefresh?: boolean }): Promise<GroupedInboxItems> => {
      // Only run on client side
      if (typeof window === "undefined") {
        return {};
      }

      // Check cache first (unless force refresh)
      if (!options?.forceRefresh) {
        const cachedData = InboxCache.getCachedItems(dataSourceName, instanceId);
        if (cachedData) {
          return cachedData;
        }
      } else {
        // Clear cache when force refreshing
        InboxCache.clearCachedItems(dataSourceName, instanceId);
      }

      const config = storage.load();
      if (!config || config.instances.length === 0) {
        return {};
      }

      // Parse instances through schema to apply defaults (like instanceType)
      const parsedInstances = config.instances.map(inst => AdoInstanceSchema.parse(inst));

      // Filter for specific instance if instanceId is provided
      let filteredConfig = { ...config, instances: parsedInstances };
      if (instanceId) {
        const instance = parsedInstances.find(
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

      const data = await response.json();
      
      // Cache the fetched data
      InboxCache.setCachedItems(dataSourceName, data, instanceId);
      
      return data;
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
