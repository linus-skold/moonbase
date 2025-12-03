import { IntegrationExchange } from "@/lib/exchanges/integration-exchange";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { loadUnreadState, saveUnreadState } from "@/lib/utils/unread-storage";
import type { WorkItem, PullRequest, Pipeline } from "@/lib/schema/item.schema";

export const createExchange = (instanceId: string): IntegrationExchange => {
  const instanceConfig = integrationStorage.loadInstance(instanceId);
  
  if (!instanceConfig || instanceConfig.instanceType !== 'ado') {
    throw new Error(`ADO instance ${instanceId} not found`);
  }

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
    
    // Async fetcher - calls server-side API route
    fetchItems: async (options) => {
      try {
        // Fetch from server-side API route, sending instance config
        const response = await fetch(`/api/ado/${instanceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instance: instanceConfig,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch ADO items: ${response.statusText}${errorData.details ? ` - ${errorData.details}` : ''}`);
        }

        const data = await response.json();
        
        // Merge unread state from localStorage
        const workItemsWithUnread = mergeUnreadState(data.workItems || []);
        const pullRequestsWithUnread = mergeUnreadState(data.pullRequests || []);
        const pipelinesWithUnread = mergeUnreadState(data.pipelines || []);
        
        // Update cache with merged data
        cachedWorkItems = workItemsWithUnread;
        cachedPullRequests = pullRequestsWithUnread;
        cachedPipelines = pipelinesWithUnread;
        
        // Persist unread state
        persistUnreadState();

        // Report progress if callback provided
        if (options?.onProgress) {
          options.onProgress(
            {
              workItems: cachedWorkItems,
              pullRequests: cachedPullRequests,
              pipelines: cachedPipelines,
            },
            {
              current: 1,
              total: 1,
              stage: 'Complete'
            }
          );
        }

        return {
          workItems: cachedWorkItems,
          pullRequests: cachedPullRequests,
          pipelines: cachedPipelines,
        };
      } catch (error) {
        console.error(`Error fetching items for ADO instance ${instanceId}:`, error);
        throw error;
      }
    },
  };
};
