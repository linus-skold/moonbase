import { IntegrationExchange } from "@/lib/exchanges/integration-exchange";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { loadUnreadState, saveUnreadState } from "@/lib/utils/unread-storage";
import { GhService } from "./service";
import type { WorkItem, PullRequest, Pipeline } from "@/lib/schema/item.schema";

export const createExchange = (instanceId: string): IntegrationExchange => {
  const instanceConfig = integrationStorage.loadInstance(instanceId);
  
  if (!instanceConfig || instanceConfig.instanceType !== 'gh') {
    throw new Error(`GitHub instance ${instanceId} not found`);
  }

  // Create service with single instance config
  const service = new GhService({ 
    instances: [instanceConfig as any],
    pinnedRepositories: []
  });

  // Local cache
  let cachedWorkItems: WorkItem[] = [];
  let cachedPullRequests: PullRequest[] = [];
  let cachedPipelines: Pipeline[] = [];

  // Helper to merge unread state from localStorage
  const mergeUnreadState = <T extends { id: string; unread: boolean }>(newItems: T[]): T[] => {
    const unreadState = loadUnreadState(instanceId);
    
    return newItems.map(newItem => {
      // Check localStorage first for persisted state
      if (newItem.id in unreadState) {
        return { ...newItem, unread: unreadState[newItem.id] };
      }
      // New item - mark as unread by default
      return { ...newItem, unread: true };
    });
  };

  // Helper to save current unread state
  const persistUnreadState = () => {
    const allItems = [...cachedWorkItems, ...cachedPullRequests, ...cachedPipelines];
    const state: Record<string, boolean> = {};
    allItems.forEach(item => {
      state[item.id] = item.unread;
    });
    saveUnreadState(instanceId, state);
  };

  return {
    id: instanceId,
    name: instanceConfig.name,
    getConfigStatus: () => ({ isConfigured: true }),
    
    // Synchronous getters - return cached data
    getWorkItems: () => {
      return cachedWorkItems;
    },
    
    getPullRequests: () => {
      return cachedPullRequests;
    },
    
    getPipelines: () => {
      return cachedPipelines;
    },
    
    getUnreadCount: () => {
      return [
        ...cachedWorkItems,
        ...cachedPullRequests,
        ...cachedPipelines,
      ].filter(item => item.unread).length;
    },

    // Async fetcher - updates cache and returns fresh data
    fetchItems: async (options) => {
      try {
        // Fetch fresh data from service
        const items = await service.fetchAllInboxItems();
        
        // Separate by type
        const newWorkItems = items.filter((item): item is WorkItem => item.type === 'workItem');
        const newPullRequests = items.filter((item): item is PullRequest => item.type === 'pullRequest');
        const newPipelines = items.filter((item): item is Pipeline => item.type === 'pipeline');
        
        // Merge unread state from localStorage
        cachedWorkItems = mergeUnreadState(newWorkItems);
        cachedPullRequests = mergeUnreadState(newPullRequests);
        cachedPipelines = mergeUnreadState(newPipelines);
        
        // Persist unread state
        persistUnreadState();

        return {
          workItems: cachedWorkItems,
          pullRequests: cachedPullRequests,
          pipelines: cachedPipelines,
        };
      } catch (error) {
        console.error(`Error fetching items for GitHub instance ${instanceId}:`, error);
        throw error;
      }
    },
  };
};
