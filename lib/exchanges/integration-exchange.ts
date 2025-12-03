import { PullRequest, WorkItem, Pipeline, TypedItem } from "../schema/item.schema";

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
  getAllItems(): Promise<(TypedItem)[]>;
  getWorkItems(): WorkItem[];
  getPullRequests(): PullRequest[];
  getPipelines(): Pipeline[];
  getUnreadCount(): number;


  fetchItems(options?: FetchItemsOptions): Promise<{
    workItems: WorkItem[];
    pullRequests: PullRequest[];
    pipelines: Pipeline[];
  }>;
}
