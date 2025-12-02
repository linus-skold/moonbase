import type { InboxDataSource } from "@/lib/broker/types";
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

    fetchInboxItems: async (options?: { 
      forceRefresh?: boolean;
      onProgress?: (data: GroupedInboxItems, progress: { current: number, total: number, stage: string }) => void;
    }): Promise<GroupedInboxItems> => {
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

      // Use streaming if onProgress callback is provided
      const useStreaming = !!options?.onProgress;
      
      if (useStreaming) {
        // Streaming mode: progressively load data
        const response = await fetch("/api/ado/inbox?streaming=true", {
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

        const reader = response.body?.getReader();
        if (!reader) {
          console.error("Failed to get response reader");
          return {};
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedData: GroupedInboxItems = {};

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const message = JSON.parse(line);
                
                if (message.type === 'progress') {
                  // Merge progressive data - properly merge items within each group
                  Object.entries(message.data).forEach(([key, newGroup]) => {
                    if (accumulatedData[key]) {
                      // Group exists, merge items
                      const existingItemIds = new Set(accumulatedData[key].items.map((item: any) => item.id));
                      const newItems = newGroup.items.filter((item: any) => !existingItemIds.has(item.id));
                      accumulatedData[key] = {
                        ...accumulatedData[key],
                        items: [...accumulatedData[key].items, ...newItems],
                      };
                    } else {
                      // New group
                      accumulatedData[key] = newGroup;
                    }
                  });
                  
                  // Notify progress with accumulated data
                  options.onProgress?.({ ...accumulatedData }, message.progress);
                } else if (message.type === 'complete') {
                  // Streaming complete
                  break;
                } else if (message.type === 'error') {
                  console.error('Streaming error:', message.error);
                  break;
                }
              } catch (parseError) {
                console.error('Failed to parse streaming message:', parseError);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Cache the final accumulated data
        InboxCache.setCachedItems(dataSourceName, accumulatedData, instanceId);
        
        return accumulatedData;
      } else {
        // Non-streaming mode: fetch all at once (backward compatible)
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
      }
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
