import { AdoService } from '@/lib/ado/service';
import { loadConfig } from '@/lib/ado/storage';
import type { InboxDataSource } from '@/components/inbox/InboxProvider';
import type { GroupedInboxItems } from '@/lib/schema/inbox.schema';

export function createAdoDataSource(instanceId?: string): InboxDataSource {
  return {
    id: 'ado',
    name: 'Azure DevOps',
    
    fetchInboxItems: async (): Promise<GroupedInboxItems> => {
      // Only run on client side
      if (typeof window === 'undefined') {
        return {};
      }
      
      const config = loadConfig();
      if (!config || config.instances.length === 0) {
        return {};
      }

      // Filter for specific instance if instanceId is provided
      let filteredConfig = config;
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

      const service = new AdoService(filteredConfig);
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
      
      const config = loadConfig();
      
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
