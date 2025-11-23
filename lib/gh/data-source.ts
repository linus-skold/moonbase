import { GhService } from './service';
import type { InboxDataSource } from '@/components/inbox/InboxProvider';
import type { GroupedInboxItems } from '@/lib/schema/inbox.schema';

import {create} from '@/lib/storage';
import { GhInstance } from './schema/instance.schema';

export function createGhDataSource(instanceId?: string): InboxDataSource {
  const storage = create<{ instances: GhInstance[] }>('gh-config', '1.0');
  return {
    id: 'github',
    name: 'GitHub',
    
    fetchInboxItems: async (): Promise<GroupedInboxItems> => {
      // Only run on client side
      if (typeof window === 'undefined') {
        return {};
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
        const instance = config.instances.find(inst => inst.id === instanceId);
        if (!instance) {
          return {};
        }
        filteredConfig = {
          ...config,
          instances: [instance]
        };
      }

      const service = new GhService(filteredConfig);
      return await service.fetchAndGroupInboxItems();
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
