import { AdoService } from '@/lib/ado/service';
import { loadConfig } from '@/lib/ado/storage';
import type { InboxDataSource } from '@/components/inbox/InboxProvider';
import type { GroupedInboxItems } from '@/lib/schema/inbox.schema';

export function createAdoDataSource(): InboxDataSource {
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

      const service = new AdoService(config);
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
      const isConfigured = !!(config && config.instances.length > 0);
      
      return {
        isConfigured,
        configUrl: '/settings',
      };
    },
  };
}
