import { IntegrationExchange } from "@/lib/exchanges/integration-exchange";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { loadUnreadState, saveUnreadState } from "@/lib/utils/unread-storage";
import type { WorkItem, PullRequest, Pipeline } from "@/lib/schema/item.schema";
import { GhClient } from "./client";
import { GhIntegrationInstance } from "./schema/config.schema";
import { transformToPullRequest, transformToWorkItem } from "./transforms";

export const createExchange = (instanceId: string): IntegrationExchange => {
  const instanceConfig = integrationStorage.loadInstance<GhIntegrationInstance>(instanceId);
  if(!instanceConfig || instanceConfig.instanceType !== "gh")
    throw new Error(`No GitHub integration instance found with ID ${instanceId}`);

  const client = new GhClient(instanceConfig);

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
        
        // Combine all PRs (assigned and created)
        const allPullRequests = [...pullRequestsAssigned, ...pullRequestsCreated];
  
        // Merge unread state from localStorage
        cachedWorkItems = mergeUnreadState(workItems);
        cachedPullRequests = mergeUnreadState(allPullRequests);
        cachedPipelines = mergeUnreadState([]);
        
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
