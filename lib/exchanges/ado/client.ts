import * as azdev from "azure-devops-node-api";
import type { TeamProjectReference } from "azure-devops-node-api/interfaces/CoreInterfaces";
import type {
  GitPullRequest,
  GitPullRequestSearchCriteria,
} from "azure-devops-node-api/interfaces/GitInterfaces";
import type {
  WorkItem,
  Wiql,
} from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import type { Build } from "azure-devops-node-api/interfaces/BuildInterfaces";

import type { AdoPipeline, AdoPipelineRun } from "./schema/pipeline.schema";
import type { AdoProject } from "./schema/project.schema";
import { AdoPullRequestSchema, type AdoPullRequest } from "./schema/pr.schema";
import type { AdoWorkItem } from "./schema/work-item.schema";
import type { AdoIntegrationInstance } from "./schema/config.schema";

export class AdoClient {
  private connection: azdev.WebApi;
  private baseUrl: string;
  private userId: string;
  private config?: AdoIntegrationInstance;

  constructor(instance: AdoIntegrationInstance) {
    this.baseUrl =
      instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
    this.userId = instance.userId;
    this.config = instance;

    if (!instance.personalAccessToken) {
      throw new Error('Personal access token is required for ADO client');
    }

    const authHandler = azdev.getPersonalAccessTokenHandler(
      instance.personalAccessToken
    );
    this.connection = new azdev.WebApi(this.baseUrl, authHandler);
  }

  /**
   * Fetch projects in batches
   * @param top Number of projects to fetch per batch (default: 50, max: 100)
   * @param skip Number of projects to skip
   */
  async getProjects(top: number = 50, skip: number = 0): Promise<AdoProject[]> {
    const coreApi = await this.connection.getCoreApi();
    const projects = await coreApi.getProjects(undefined, top, skip);

    return projects.map((p: TeamProjectReference) => ({
      id: p.id!,
      name: p.name!,
      description: p.description,
      url: p.url!,
      state: (p.state || "wellFormed") as
        | "wellFormed"
        | "createPending"
        | "deleting"
        | "new"
        | "all",
      visibility: (p.visibility === 0 ? "private" : "public") as
        | "private"
        | "public",
      lastUpdateTime: p.lastUpdateTime?.toISOString(),
    }));
  }

  /**
   * Fetch all projects (handles batching internally)
   * @param batchSize Number of projects to fetch per batch (default: 50)
   */
  async getAllProjects(batchSize: number = 50): Promise<AdoProject[]> {
    const allProjects: AdoProject[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getProjects(batchSize, skip);
      allProjects.push(...batch);
      
      // If we got fewer results than requested, we've reached the end
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        skip += batchSize;
      }
    }

    return allProjects;
  }

  // Helper to process tasks with concurrency limit
  private async processConcurrently<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = processor(item)
        .then((result) => {
          results.push(result);
        })
        .catch((err) => {
          console.error("Error processing item:", err);
          return undefined;
        });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        const completed = executing.filter((p) =>
          Promise.race([p, Promise.resolve("__done__")]).then(
            (r) => r === "__done__"
          )
        );
        completed.forEach((p) => {
          const index = executing.indexOf(p);
          if (index > -1) executing.splice(index, 1);
        });
      }
    }

    await Promise.all(executing);
    return results.filter((r) => r !== undefined);
  }

  /**
   * Fetch pull requests assigned to the current user (as reviewer or creator)
   * @param projectIds Optional array of project IDs to filter by
   */
  async getPullRequestsAssignedToMe(projectIds?: string[]): Promise<AdoPullRequest[]> {
    const gitApi = await this.connection.getGitApi();

    // Check if userId is configured
    if (!this.userId) {
      console.warn(`[ADO Client] Warning: userId is not configured for this instance. Please set the userId field in your ADO instance configuration.`);
      return [];
    }

    // Get PRs where I'm a reviewer
    const reviewerCriteria: GitPullRequestSearchCriteria = {
      status: 1, // Active status
      reviewerId: this.userId,
    };

    // Get PRs I created
    const creatorCriteria: GitPullRequestSearchCriteria = {
      status: 1, // Active status
      creatorId: this.userId,
    };

    // Determine which projects to query
    let projects: AdoProject[];
    if (projectIds && projectIds.length > 0) {
      const allProjects = await this.getAllProjects(50);
      projects = allProjects.filter(p => projectIds.includes(p.id));
    } else {
      // Fetch all projects
      projects = await this.getAllProjects(50);
    }

    // Fetch PRs from projects in parallel (10 concurrent requests)
    // Query at project level instead of iterating through repos for better performance
    const prBatches = await this.processConcurrently(
      projects,
      async (project) => {
        try {
          // Fetch both reviewer PRs and created PRs at the project level
          const [reviewerPrs, creatorPrs] = await Promise.all([
            gitApi
              .getPullRequestsByProject(project.id, reviewerCriteria)
              .catch(() => []),
            gitApi
              .getPullRequestsByProject(project.id, creatorCriteria)
              .catch(() => []),
          ]);

          // Combine and deduplicate by PR ID
          const allPrs = [
            ...(reviewerPrs || []),
            ...(creatorPrs || []),
          ];
          const uniquePrs = Array.from(
            new Map(allPrs.map((pr) => [pr.pullRequestId, pr])).values()
          );

          return uniquePrs;
        } catch (error) {
          console.error(
            `Error fetching PRs for project ${project.name}:`,
            error
          );
          return [];
        }
      },
      10 // Process 10 projects concurrently
    );

    const pullRequests = prBatches.flat();

    // Filter PRs: Keep only those where we're the creator OR a reviewer
    const filteredPRs = pullRequests.filter((pr) => {
      // Include if we created it
      const isCreator = pr.createdBy?.id === this.userId;
      
      // Include if we're a reviewer (check the reviewers array)
      const isReviewer = pr.reviewers?.some((r) => r.id === this.userId) ?? false;
      
      return isCreator || isReviewer;
    });

    return filteredPRs.map((pr) => {
      const prData = {
        codeReviewId: pr.codeReviewId!,
        pullRequestId: pr.pullRequestId!,
        repository: {
          id: pr.repository!.id!,
          name: pr.repository!.name!,
          project: {
            id: pr.repository!.project!.id!,
            name: pr.repository!.project!.name!,
          },
        },
        title: pr.title!,
        description: pr.description,
        sourceRefName: pr.sourceRefName!,
        targetRefName: pr.targetRefName!,
        status:
          pr.status === 1
            ? "active"
            : pr.status === 2
            ? "abandoned"
            : "completed",
        createdBy: {
          displayName: pr.createdBy!.displayName!,
          imageUrl: pr.createdBy!.imageUrl,
        },
        creationDate: pr.creationDate!.toISOString(),
        url: pr.url!,
        isDraft: pr.isDraft,
        reviewers: pr.reviewers?.map((r) => ({
          displayName: r.displayName!,
          vote: r.vote!,
        })),
      };
      return AdoPullRequestSchema.parse(prData);
    });
  }

  /**
   * Fetch work items assigned to the current user
   * @param projectIds Optional array of project IDs to filter by
   */
  async getWorkItemsAssignedToMe(projectIds?: string[]): Promise<AdoWorkItem[]> {
    const witApi = await this.connection.getWorkItemTrackingApi();

    const customQuery = this.config?.customWorkItemQuery;
    const ignoredStates = this.config?.ignoredWorkItemStates || ['Closed', 'Removed'];

    const stateFilter = ignoredStates.length
      ? ignoredStates.map(state => `AND [System.State] <> '${state}'`).join(' ')
      : '';

    // If custom query is provided, use it
    if (customQuery) {
      const query: Wiql = { query: customQuery };
      const queryResult = await witApi.queryByWiql(query);
      const workItemIds = queryResult.workItems?.map((wi) => wi.id!) || [];

      if (workItemIds.length === 0) {
        return [];
      }

      return this.fetchWorkItemsByIds(workItemIds);
    }

    // Otherwise, build a standard query
    const projectFilter = projectIds && projectIds.length > 0
      ? `AND [System.TeamProject] IN (${projectIds.map(id => `'${id}'`).join(', ')})`
      : '';

    const wiql: Wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate]
          FROM WorkItems
          WHERE [System.AssignedTo] = @Me
          ${stateFilter}
          ${projectFilter}
          ORDER BY [System.ChangedDate] DESC`,
    };

    const queryResult = await witApi.queryByWiql(wiql);
    const workItemIds = queryResult.workItems?.map((wi) => wi.id!) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    return this.fetchWorkItemsByIds(workItemIds);
  }

  /**
   * Fetch work items by their IDs in batches
   * @param workItemIds Array of work item IDs
   * @param batchSize Number of items to fetch per batch (default: 200, max: 200)
   */
  private async fetchWorkItemsByIds(
    workItemIds: number[],
    batchSize: number = 200
  ): Promise<AdoWorkItem[]> {
    const witApi = await this.connection.getWorkItemTrackingApi();
    const workItems: AdoWorkItem[] = [];

    for (let i = 0; i < workItemIds.length; i += batchSize) {
      const batch = workItemIds.slice(i, i + batchSize);
      const items = await witApi.getWorkItems(batch, undefined, undefined, 1); // 1 = Links expand

      workItems.push(
        ...items.map((wi: WorkItem) => ({
          id: wi.id!,
          rev: wi.rev!,
          fields: {
            "System.Title": wi.fields!["System.Title"],
            "System.State": wi.fields!["System.State"],
            "System.WorkItemType": wi.fields!["System.WorkItemType"],
            "System.AssignedTo": wi.fields!["System.AssignedTo"],
            "System.CreatedDate": wi.fields!["System.CreatedDate"],
            "System.ChangedDate": wi.fields!["System.ChangedDate"],
            "System.CreatedBy": wi.fields!["System.CreatedBy"],
            "System.AreaPath": wi.fields!["System.AreaPath"],
            "System.IterationPath": wi.fields!["System.IterationPath"],
            "System.Description": wi.fields!["System.Description"],
          },
          url: wi.url!,
          _links: wi._links,
        }))
      );
    }

    return workItems;
  }

  /**
   * Fetch recent pipeline runs for specific projects
   * @param projectIds Array of project IDs to fetch pipeline runs for
   * @param top Number of runs to fetch per project (default: 10)
   */
  async getPipelineRuns(
    projectIds: string[],
    top: number = 10
  ): Promise<AdoPipelineRun[]> {
    const buildApi = await this.connection.getBuildApi();
    
    // Fetch pipeline runs for each project in parallel
    const runBatches = await this.processConcurrently(
      projectIds,
      async (projectId) => {
        try {
          const builds = await buildApi.getBuilds(
            projectId,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            top
          );

          return builds.map((build: Build) => ({
            id: build.id!,
            name: build.buildNumber!,
            state:
              build.status === 2
                ? "completed"
                : ("inProgress" as
                    | "completed"
                    | "inProgress"
                    | "canceling"
                    | "notStarted"),
            result:
              build.result === 2
                ? ("succeeded" as const)
                : build.result === 4
                ? ("failed" as const)
                : build.result === 8
                ? ("partiallySucceeded" as const)
                : build.result === 32
                ? ("canceled" as const)
                : undefined,
            createdDate: build.queueTime!.toISOString(),
            finishedDate: build.finishTime?.toISOString(),
            url:
              build.url ||
              `${this.baseUrl}/${projectId}/_build/results?buildId=${build.id}`,
            pipeline: {
              id: build.definition!.id!,
              name: build.definition!.name!,
            },
            _links: {
              web: {
                href:
                  build._links?.web?.href ||
                  `${this.baseUrl}/${projectId}/_build/results?buildId=${build.id}`,
              },
            },
          }));
        } catch (error) {
          console.error(`Error fetching pipeline runs for project ${projectId}:`, error);
          return [];
        }
      },
      3 // Process 3 projects concurrently
    );

    return runBatches.flat();
  }
}
