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
      for (const repo of repos) {
        const prs = await gitApi.getPullRequests(repo.id!, searchCriteria, projectId);
        pullRequests.push(...prs);
      }
    } else {
      const projects = await this.getProjects();
      for (const project of projects) {
        const repos = await gitApi.getRepositories(project.id);
        for (const repo of repos) {
          const prs = await gitApi.getPullRequests(repo.id!, searchCriteria, project.id);
          pullRequests.push(...prs);
        }
      }
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
