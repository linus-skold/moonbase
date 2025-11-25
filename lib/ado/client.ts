import * as azdev from "azure-devops-node-api";
import type { TeamProjectReference } from "azure-devops-node-api/interfaces/CoreInterfaces";
import type { GitPullRequest, GitPullRequestSearchCriteria } from "azure-devops-node-api/interfaces/GitInterfaces";
import type { WorkItem, Wiql } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import type { Build } from "azure-devops-node-api/interfaces/BuildInterfaces";

import type { AdoPipeline, AdoPipelineRun } from "./schema/pipeline.schema";
import type { AdoProject } from "./schema/project.schema";
import { AdoPullRequestSchema, type AdoPullRequest } from "./schema/pr.schema";
import type { AdoWorkItem } from "./schema/work-item.schema";
import type { AdoInstance } from "./schema/instance.schema";

export class AdoClient {
  private connection: azdev.WebApi;
  private baseUrl: string;
  private userId: string;

  constructor(instance: AdoInstance) {
    this.baseUrl =
      instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
    this.userId = instance.userId;

    const authHandler = azdev.getPersonalAccessTokenHandler(instance.personalAccessToken);
    this.connection = new azdev.WebApi(this.baseUrl, authHandler);
  }

  async getProjects(): Promise<AdoProject[]> {
    const coreApi = await this.connection.getCoreApi();
    const projects = await coreApi.getProjects();
    
    return projects.map((p: TeamProjectReference) => ({
      id: p.id!,
      name: p.name!,
      description: p.description,
      url: p.url!,
      state: (p.state || 'wellFormed') as 'wellFormed' | 'createPending' | 'deleting' | 'new' | 'all',
      visibility: (p.visibility === 0 ? 'private' : 'public') as 'private' | 'public',
    }));
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
      const promise = processor(item).then(result => {
        results.push(result);
      }).catch(err => {
        console.error('Error processing item:', err);
        return undefined;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        const completed = executing.filter(p => 
          Promise.race([p, Promise.resolve('__done__')]).then(r => r === '__done__')
        );
        completed.forEach(p => {
          const index = executing.indexOf(p);
          if (index > -1) executing.splice(index, 1);
        });
      }
    }

    await Promise.all(executing);
    return results.filter(r => r !== undefined);
  }

  async getPullRequestsAssignedToMe(
    projectId?: string
  ): Promise<AdoPullRequest[]> {
    const gitApi = await this.connection.getGitApi();
    
    const searchCriteria: GitPullRequestSearchCriteria = {
      status: 1, // Active status
      reviewerId: this.userId,
    };

    let pullRequests: GitPullRequest[] = [];
    
    if (projectId) {
      const repos = await gitApi.getRepositories(projectId);
      
      // Fetch PRs from all repos in parallel with concurrency control
      const prBatches = await this.processConcurrently(
        repos,
        async (repo) => {
          try {
            const prs = await gitApi.getPullRequests(repo.id!, searchCriteria, projectId);
            return prs && Array.isArray(prs) ? prs : [];
          } catch (error) {
            console.error(`Error fetching PRs for repo ${repo.name}:`, error);
            return [];
          }
        },
        10 // Process 10 repos concurrently
      );
      
      pullRequests = prBatches.flat();
    } else {
      const projects = await this.getProjects();
      
      // Fetch PRs from all projects in parallel with concurrency control
      const prBatches = await this.processConcurrently(
        projects,
        async (project) => {
          try {
            const repos = await gitApi.getRepositories(project.id);
            
            // Fetch PRs from all repos in this project in parallel
            const projectPrBatches = await this.processConcurrently(
              repos,
              async (repo) => {
                try {
                  const prs = await gitApi.getPullRequests(repo.id!, searchCriteria, project.id);
                  return prs && Array.isArray(prs) ? prs : [];
                } catch (error) {
                  console.error(`Error fetching PRs for repo ${repo.name} in project ${project.name}:`, error);
                  return [];
                }
              },
              5 // Process 5 repos per project concurrently
            );
            
            return projectPrBatches.flat();
          } catch (error) {
            console.error(`Error fetching repos for project ${project.name}:`, error);
            return [];
          }
        },
        3 // Process 3 projects concurrently
      );
      
      pullRequests = prBatches.flat();
    }

    return pullRequests.map(pr => {
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
        status: pr.status === 1 ? "active" : pr.status === 2 ? "abandoned" : "completed",
        createdBy: {
          displayName: pr.createdBy!.displayName!,
          imageUrl: pr.createdBy!.imageUrl,
        },
        creationDate: pr.creationDate!.toISOString(),
        url: pr.url!,
        isDraft: pr.isDraft,
        reviewers: pr.reviewers?.map(r => ({
          displayName: r.displayName!,
          vote: r.vote!,
        })),
      };
      return AdoPullRequestSchema.parse(prData);
    });
  }

  async getWorkItemsAssignedToMe(
    projectId?: string,
  ): Promise<AdoWorkItem[]> {
    const witApi = await this.connection.getWorkItemTrackingApi();
    
    const wiql: Wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate]
              FROM WorkItems
              WHERE [System.AssignedTo] = @Me
              AND ([System.State] = 'Active' 
                OR [System.State] = 'New' 
                OR [System.State] = 'In Progress' 
                OR [System.State] = 'Blocked'
                OR [System.State] = 'To Do'
                OR [System.State] = 'Doing'
              ) ORDER BY [System.ChangedDate] DESC`,
    };

    const queryResult = await witApi.queryByWiql(wiql, { project: projectId });
    const workItemIds = queryResult.workItems?.map(wi => wi.id!) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    // Fetch work item details in batches of 200 (API limit)
    const batchSize = 200;
    const workItems: AdoWorkItem[] = [];

    for (let i = 0; i < workItemIds.length; i += batchSize) {
      const batch = workItemIds.slice(i, i + batchSize);
      const items = await witApi.getWorkItems(batch, undefined, undefined, 1); // 1 = Links expand
      
      workItems.push(...items.map((wi: WorkItem) => ({
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
      })));
    }

    return workItems;
  }

  async getPipelineRuns(
    projectId: string,
    top: number = 20
  ): Promise<AdoPipelineRun[]> {
    const buildApi = await this.connection.getBuildApi();
    const builds = await buildApi.getBuilds(projectId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, top);

    return builds.map((build: Build) => ({
      id: build.id!,
      name: build.buildNumber!,
      state: build.status === 2 ? "completed" : "inProgress" as 'completed' | 'inProgress' | 'canceling' | 'notStarted',
      result: build.result === 2 ? "succeeded" : build.result === 4 ? "failed" : undefined,
      createdDate: build.queueTime!.toISOString(),
      finishedDate: build.finishTime?.toISOString(),
      url: build.url || `${this.baseUrl}/${projectId}/_build/results?buildId=${build.id}`,
      pipeline: {
        id: build.definition!.id!,
        name: build.definition!.name!,
      },
      _links: {
        web: {
          href: build._links?.web?.href || `${this.baseUrl}/${projectId}/_build/results?buildId=${build.id}`,
        },
      },
    }));
  }

  async getPipelines(projectId: string): Promise<AdoPipeline[]> {
    const buildApi = await this.connection.getBuildApi();
    const definitions = await buildApi.getDefinitions(projectId);

    return definitions.map(def => ({
      id: def.id!,
      name: def.name!,
      folder: def.path,
      revision: def.revision || 1,
    }));
  }

  async getNewTasksForProject(
    projectId: string,
    sinceDate?: Date
  ): Promise<AdoWorkItem[]> {
    const witApi = await this.connection.getWorkItemTrackingApi();
    
    const dateFilter = sinceDate
      ? `AND [System.CreatedDate] >= '${sinceDate.toISOString()}'`
      : "";

    const wiql: Wiql = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate]
              FROM WorkItems
              WHERE [System.TeamProject] = @Project
              AND [System.WorkItemType] = 'Task'
              ${dateFilter}
              ORDER BY [System.CreatedDate] DESC`,
    };

    const queryResult = await witApi.queryByWiql(wiql, { project: projectId });
    const workItemIds = queryResult.workItems?.map(wi => wi.id!).slice(0, 50) || [];

    if (workItemIds.length === 0) {
      return [];
    }

    const items = await witApi.getWorkItems(workItemIds, undefined, undefined, 1);
    
    return items.map((wi: WorkItem) => ({
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
    }));
  }
}
