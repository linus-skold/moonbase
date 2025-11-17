import type { AdoPipeline, AdoPipelineRun } from "./schema/pipeline.schema";
import type { AdoProject } from "./schema/project.schema";
import { AdoPullRequestSchema, type AdoPullRequest } from "./schema/pr.schema";
import type { AdoWorkItem } from "./schema/work-item.schema";
import type { AdoInstance } from "./schema/instance.schema";

export class AdoClient {
  private baseUrl: string;
  private organization: string;
  private token: string;
  private headers: HeadersInit;

  constructor(instance: AdoInstance) {
    this.organization = instance.organization;
    this.baseUrl =
      instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
    this.token = instance.personalAccessToken;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`:${this.token}`).toString(
        "base64"
      )}`,
    };
  }

  private async fetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `ADO API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getProjects(): Promise<AdoProject[]> {
    const url = `${this.baseUrl}/_apis/projects?api-version=7.1`;
    const data = await this.fetch<{ value: AdoProject[] }>(url);
    return data.value;
  }

  async getPullRequestsAssignedToMe(
    projectId?: string
  ): Promise<AdoPullRequest[]> {
    // Get pull requests where the current user is a reviewer
    const searchCriteria = new URLSearchParams({
      "searchCriteria.status": "active",
      "searchCriteria.reviewerId": "me",
      "searchCriteria.creatorId": "me",
      "api-version": "7.1",
    });

    let url: string;
    if (projectId) {
      url = `${this.baseUrl}/${projectId}/_apis/git/pullrequests?${searchCriteria}`;
    } else {
      url = `${this.baseUrl}/_apis/git/pullrequests?${searchCriteria}`;
    }

    const data = await this.fetch<{ value: AdoPullRequest[] }>(url);
    const pullRequests = data.value.map(pr => AdoPullRequestSchema.parse(pr));
    return pullRequests;
  }

  async getWorkItemsAssignedToMe(
    projectId?: string,
    userEmail?: string
  ): Promise<AdoWorkItem[]> {
    // WIQL query to get work items assigned to current user
    const wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate]
              FROM WorkItems
              WHERE [System.AssignedTo] = @Me
              AND [System.State] = 'Active'
              AND [System.State] = 'New'
              ORDER BY [System.ChangedDate] DESC`,
    };

    const wiqlUrl = projectId
      ? `${this.baseUrl}/${projectId}/_apis/wit/wiql?api-version=7.1`
      : `${this.baseUrl}/_apis/wit/wiql?api-version=7.1`;

    const wiqlResponse = await fetch(wiqlUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(wiql),
    });

    if (!wiqlResponse.ok) {
      throw new Error(`WIQL query failed: ${wiqlResponse.status}`);
    }

    const wiqlData = await wiqlResponse.json();
    const workItemIds = wiqlData.workItems?.map((wi: any) => wi.id) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    // Fetch work item details in batches of 200 (API limit)
    const batchSize = 200;
    const workItems: AdoWorkItem[] = [];

    for (let i = 0; i < workItemIds.length; i += batchSize) {
      const batch = workItemIds.slice(i, i + batchSize);
      const ids = batch.join(",");
      const url = `${this.baseUrl}/_apis/wit/workitems?ids=${ids}&$expand=links&api-version=7.1`;
      const data = await this.fetch<{ value: AdoWorkItem[] }>(url);
      workItems.push(...data.value);
    }

    return workItems;
  }

  async getWorkItemsMentioningMe(
    projectId?: string,
    userEmail?: string
  ): Promise<AdoWorkItem[]> {
    // This is a simplified version - ADO doesn't have a direct "mentions" API
    // In practice, you might need to search comments or descriptions
    // For now, we'll get recently updated items in the project
    const wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate]
              FROM WorkItems
              WHERE [System.TeamProject] = @Project
              AND [System.State] <> 'Closed'
              AND [System.State] <> 'Removed'
              ORDER BY [System.ChangedDate] DESC`,
    };

    if (!projectId) {
      return []; // Need project context for this query
    }

    const wiqlUrl = `${this.baseUrl}/${projectId}/_apis/wit/wiql?api-version=7.1`;

    const wiqlResponse = await fetch(wiqlUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(wiql),
    });

    if (!wiqlResponse.ok) {
      return [];
    }

    const wiqlData = await wiqlResponse.json();
    const workItemIds =
      wiqlData.workItems?.map((wi: any) => wi.id).slice(0, 50) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    const ids = workItemIds.join(",");
    const url = `${this.baseUrl}/_apis/wit/workitems?ids=${ids}&$expand=links&api-version=7.1`;
    const data = await this.fetch<{ value: AdoWorkItem[] }>(url);

    // TODO: Filter by mentions in comments/description
    return data.value;
  }

  async getPipelineRuns(
    projectId: string,
    top: number = 20
  ): Promise<AdoPipelineRun[]> {
    const url = `${this.baseUrl}/${projectId}/_apis/pipelines/runs?api-version=7.1&$top=${top}`;
    const data = await this.fetch<{ value: AdoPipelineRun[] }>(url);
    return data.value;
  }

  async getPipelines(projectId: string): Promise<AdoPipeline[]> {
    const url = `${this.baseUrl}/${projectId}/_apis/pipelines?api-version=7.1`;
    const data = await this.fetch<{ value: AdoPipeline[] }>(url);
    return data.value;
  }

  async getNewTasksForProject(
    projectId: string,
    sinceDate?: Date
  ): Promise<AdoWorkItem[]> {
    const dateFilter = sinceDate
      ? `AND [System.CreatedDate] >= '${sinceDate.toISOString()}'`
      : "";

    const wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate]
              FROM WorkItems
              WHERE [System.TeamProject] = @Project
              AND [System.WorkItemType] = 'Task'
              ${dateFilter}
              ORDER BY [System.CreatedDate] DESC`,
    };

    const wiqlUrl = `${this.baseUrl}/${projectId}/_apis/wit/wiql?api-version=7.1`;

    const wiqlResponse = await fetch(wiqlUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(wiql),
    });

    if (!wiqlResponse.ok) {
      return [];
    }

    const wiqlData = await wiqlResponse.json();
    const workItemIds =
      wiqlData.workItems?.map((wi: any) => wi.id).slice(0, 50) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    const ids = workItemIds.join(",");
    const url = `${this.baseUrl}/_apis/wit/workitems?ids=${ids}&$expand=links&api-version=7.1`;
    const data = await this.fetch<{ value: AdoWorkItem[] }>(url);
    return data.value;
  }
}
