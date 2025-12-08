import { IntegrationExchange } from "@/lib/exchanges/integration-exchange";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { loadItems, saveItems, mergeItemsWithChangeDetection } from "@/lib/utils/item-storage";
import type { WorkItem, PullRequest, Pipeline } from "@/lib/schema/item.schema";
import { GhClient } from "./client";
import { GhIntegrationInstance } from "./schema/config.schema";
import { transformToPullRequest, transformToWorkItem } from "./transforms";

export const createExchange = (instanceId: string): IntegrationExchange => {
  const instanceConfig = integrationStorage.loadInstance<GhIntegrationInstance>(instanceId);
  if(!instanceConfig || instanceConfig.instanceType !== "gh")
    throw new Error(`No GitHub integration instance found with ID ${instanceId}`);

  const client = new GhClient(instanceConfig);

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
    // Async fetcher - updates cache and returns fresh data
    fetchItems: async () => {
      try {
        
        const issueResults = await client.getIssuesAssignedToMe();
        const prAssignedResults = await client.getPullRequestsAssignedToMe();
        const prCreatedResults = await client.getPullRequestsCreatedByMe();

        // Transform GitHub API results to our internal item types
        const workItems = issueResults.map(item => transformToWorkItem(item, instanceConfig));
        const pullRequestsAssigned = prAssignedResults.map(item => transformToPullRequest(item, instanceConfig));
        const pullRequestsCreated = prCreatedResults.map(item => transformToPullRequest(item, instanceConfig));
        
        // Combine all PRs (assigned and created) and deduplicate by ID
        const allPullRequestsMap = new Map<string, PullRequest>();
        [...pullRequestsAssigned, ...pullRequestsCreated].forEach(pr => {
          allPullRequestsMap.set(pr.id, pr);
        });
        const allPullRequests = Array.from(allPullRequestsMap.values());
  
        // Merge with cached items, detecting changes
        const workItemsMerge = mergeItemsWithChangeDetection(cachedWorkItems, workItems);
        const pullRequestsMerge = mergeItemsWithChangeDetection(cachedPullRequests, allPullRequests);
        const pipelinesMerge = mergeItemsWithChangeDetection(cachedPipelines, []);
        
        console.log(`[GitHub ${instanceConfig.name}] Merge results:`, {
          workItems: { new: workItemsMerge.newCount, updated: workItemsMerge.updatedCount, total: workItemsMerge.items.length },
          pullRequests: { new: pullRequestsMerge.newCount, updated: pullRequestsMerge.updatedCount, total: pullRequestsMerge.items.length },
        });
        
        cachedWorkItems = workItemsMerge.items;
        cachedPullRequests = pullRequestsMerge.items;
        cachedPipelines = pipelinesMerge.items;
        
        // Persist items to localStorage
        persistItems();

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
