import { IntegrationExchange } from "@/lib/exchanges/integration-exchange";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { loadItems, saveItems, mergeItemsWithChangeDetection } from "@/lib/utils/item-storage";
import type { WorkItem, PullRequest, Pipeline } from "@/lib/schema/item.schema";

export const createExchange = (instanceId: string): IntegrationExchange => {
  const instanceConfig = integrationStorage.loadInstance(instanceId);
  
  if (!instanceConfig || instanceConfig.instanceType !== 'ado') {
    throw new Error(`ADO instance ${instanceId} not found`);
  }

  // Local cache - initialize from localStorage if available
  const storedItems = loadItems(instanceId);
  let cachedWorkItems: WorkItem[] = storedItems?.workItems || [];
  let cachedPullRequests: PullRequest[] = storedItems?.pullRequests || [];
  let cachedPipelines: Pipeline[] = storedItems?.pipelines || [];

  // Helper to save items to localStorage
  const persistItems = () => {
    saveItems(instanceId, {
      workItems: cachedWorkItems,
      pullRequests: cachedPullRequests,
      pipelines: cachedPipelines,
    });
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
    
    getAllItems: async () => {
      return [
        ...cachedWorkItems,
        ...cachedPullRequests,
        ...cachedPipelines,
      ];
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
        
        // Merge with cached items, detecting changes
        const workItemsMerge = mergeItemsWithChangeDetection(cachedWorkItems, data.workItems || []);
        const pullRequestsMerge = mergeItemsWithChangeDetection(cachedPullRequests, data.pullRequests || []);
        const pipelinesMerge = mergeItemsWithChangeDetection(cachedPipelines, data.pipelines || []);
        
        cachedWorkItems = workItemsMerge.items;
        cachedPullRequests = pullRequestsMerge.items;
        cachedPipelines = pipelinesMerge.items;
        
        // Persist items to localStorage
        persistItems();

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
