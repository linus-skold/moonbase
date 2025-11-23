import { GhService } from './service';
import type { InboxDataSource } from '@/components/inbox/InboxProvider';
import type { GroupedInboxItems } from '@/lib/schema/inbox.schema';

import {create} from '@/lib/storage';
import { GhInstance } from './schema/instance.schema';
import InboxCache from '@/lib/utils/inbox-cache';

export function createGhDataSource(instanceId?: string): InboxDataSource {
  const storage = create<{ instances: GhInstance[] }>('gh-config', '1.0');
  const dataSourceName = 'github';
  
  return {
    id: dataSourceName,
    name: 'GitHub',
    
    fetchInboxItems: async (options?: { forceRefresh?: boolean }): Promise<GroupedInboxItems> => {
      // Only run on client side
      if (typeof window === 'undefined') {
        return {};
      }
      
      // Check cache first (unless force refresh)
      if (!options?.forceRefresh) {
        const cachedData = InboxCache.getCachedItems(dataSourceName, instanceId);
        if (cachedData) {
          console.log('Using cached GitHub inbox data');
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
      const parsedInstances = config.instances.map(inst => GhInstance.parse(inst));

      // Filter for specific instance if instanceId is provided
      let filteredConfig = { ...config, instances: parsedInstances };
      if (instanceId) {
        const instance = parsedInstances.find(inst => inst.id === instanceId);
        if (!instance) {
          return {};
        }
        filteredConfig = {
          ...config,
          instances: [instance]
        };
      }

      const service = new GhService(filteredConfig);
      const data = await service.fetchAndGroupInboxItems();
      
      // Cache the fetched data
      InboxCache.setCachedItems(dataSourceName, data, instanceId);
      
      return data;
    },

    getConfigStatus: () => {
      // Only run on client side
      if (typeof window === 'undefined') {
        return {
          isConfigured: false,
          configUrl: '/settings',
        };
      }
      
      const config = storage.load();
      
      // Check if specific instance exists and is configured
      if (instanceId) {
        const instance = config?.instances?.find(inst => inst.id === instanceId);
        const isConfigured = !!(instance);
        return {
          isConfigured,
          configUrl: '/settings',
        };
      }
      
      const isConfigured = !!(config && config.instances.length > 0);
      
      return {
        isConfigured,
        configUrl: '/settings',
      };
    },
  };
}
