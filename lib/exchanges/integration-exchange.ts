import { PullRequest, WorkItem, Pipeline } from "../schema/item.schema";

export interface FetchItemsOptions {
  forceRefresh?: boolean;
  onProgress?: (
    data: {
      workItems: WorkItem[];
      pullRequests: PullRequest[];
      pipelines: Pipeline[];
    },
    progress: { current: number; total: number; stage: string }
  ) => void;
}

export interface IntegrationExchange {
  id: string;
  name: string;
  getConfigStatus: () => { isConfigured: boolean; configUrl?: string };
  getWorkItems(): WorkItem[];
  getPullRequests(): PullRequest[];
  getPipelines(): Pipeline[];

  fetchItems(options?: FetchItemsOptions): Promise<{
    workItems: WorkItem[];
    pullRequests: PullRequest[];
    pipelines: Pipeline[];
  }>;
}
