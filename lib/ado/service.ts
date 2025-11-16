// Configuration and aggregation service for Azure DevOps

import { AdoClient } from './client';

import type { AdoConfig } from './schema/config.schema';
import type { AdoInstance } from './schema/instance.schema';
import type { AdoPullRequest } from './schema/pr.schema';
import type { AdoWorkItem } from './schema/work-item.schema';
import type { AdoPipelineRun } from './schema/pipeline.schema';
import type { GroupedInboxItems, InboxItem } from '../schema/inbox.schema';

export class AdoService {
  private config: AdoConfig;

  constructor(config: AdoConfig) {
    this.config = config;
  }

  private getEnabledInstances(): AdoInstance[] {
    return this.config.instances.filter((instance) => instance.enabled);
  }

  private convertPullRequestToInboxItem(
    pr: AdoPullRequest,
    instance: AdoInstance
  ): InboxItem {

    // Look into how we can improve this structure
    return {
      id: `pr-${instance.id}-${pr.pullRequestId}`,
      type: 'pullRequest',
      title: pr.title,
      description: pr.description,
      status: pr.status,
      createdDate: pr.creationDate,
      updatedDate: pr.creationDate,
      url: pr.uiUrl,
      project: {
        id: pr.repository.project.id,
        name: pr.repository.project.name,
      },
      repository: {
        id: pr.repository.id,
        name: pr.repository.name,
      },
      instance: {
        id: instance.id,
        name: instance.name,
      },
      metadata: {
        sourceRefName: pr.sourceRefName,
        targetRefName: pr.targetRefName,
        isDraft: pr.isDraft,
        createdBy: pr.createdBy,
        reviewers: pr.reviewers,
      },
    };
  }

  private convertWorkItemToInboxItem(
    workItem: AdoWorkItem,
    instance: AdoInstance,
    projectName: string
  ): InboxItem {
    const priority = this.getWorkItemPriority(workItem);
    
    // Construct URL from base URL and work item ID
    // Format: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
    const baseUrl = instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
    const workItemUrl = workItem._links?.html?.href || 
      `${baseUrl}/${projectName}/_workitems/edit/${workItem.id}`;

    return {
      id: `wi-${instance.id}-${workItem.id}`,
      type: 'workItem',
      title: workItem.fields['System.Title'],
      description: workItem.fields['System.Description'],
      status: workItem.fields['System.State'],
      createdDate: workItem.fields['System.CreatedDate'],
      updatedDate: workItem.fields['System.ChangedDate'],
      url: workItemUrl,
      project: {
        id: workItem.id.toString(),
        name: projectName,
      },
      instance: {
        id: instance.id,
        name: instance.name,
      },
      priority,
      assignedTo: workItem.fields['System.AssignedTo'],
      metadata: {
        workItemType: workItem.fields['System.WorkItemType'],
        areaPath: workItem.fields['System.AreaPath'],
        iterationPath: workItem.fields['System.IterationPath'],
        createdBy: workItem.fields['System.CreatedBy'],
      },
    };
  }

  private convertPipelineRunToInboxItem(
    run: AdoPipelineRun,
    instance: AdoInstance,
    projectId: string,
    projectName: string
  ): InboxItem {
    const status = run.result || run.state;
    const priority = run.result === 'failed' ? 'high' : 'low';

    return {
      id: `pipeline-${instance.id}-${run.id}`,
      type: 'pipeline',
      title: `${run.pipeline.name} - ${run.name}`,
      status,
      createdDate: run.createdDate,
      updatedDate: run.finishedDate || run.createdDate,
      url: run._links.web.href,
      project: {
        id: projectId,
        name: projectName,
      },
      instance: {
        id: instance.id,
        name: instance.name,
      },
      priority,
      metadata: {
        state: run.state,
        result: run.result,
        pipelineId: run.pipeline.id,
        pipelineName: run.pipeline.name,
      },
    };
  }

  private getWorkItemPriority(workItem: AdoWorkItem): InboxItem['priority'] {
    // This is a simple heuristic - you can customize based on your fields
    const state = workItem.fields['System.State'];
    const type = workItem.fields['System.WorkItemType'];

    if (type === 'Bug' && state === 'Active') return 'high';
    if (state === 'New') return 'medium';
    return 'low';
  }

  async fetchAllInboxItems(): Promise<InboxItem[]> {
    const instances = this.getEnabledInstances();
    const allItems: InboxItem[] = [];

    for (const instance of instances) {
      try {
        const client = new AdoClient(instance);
        const projects = await client.getProjects();

        // Fetch PRs assigned to me
        const prs = await client.getPullRequestsAssignedToMe();
        allItems.push(...prs.map((pr) => this.convertPullRequestToInboxItem(pr, instance)));

        // Fetch work items assigned to me!
        const workItems = await client.getWorkItemsAssignedToMe(
          undefined,
          this.config.userEmail
        );
        for (const wi of workItems) {
          const project = projects.find((p) => 
            wi.fields['System.AreaPath']?.startsWith(p.name)
          );
          if (project) {
            allItems.push(this.convertWorkItemToInboxItem(wi, instance, project.name));
          }
        }

        // Fetch pipeline runs for pinned projects
        const pinnedProjects = this.config.pinnedProjects || [];
        for (const projectId of pinnedProjects) {
          const project = projects.find((p) => p.id === projectId);
          if (!project) continue;

          try {
            const pipelineRuns = await client.getPipelineRuns(projectId, 10);
            allItems.push(
              ...pipelineRuns
                .filter((run) => run.state === 'inProgress' || run.state === 'completed')
                .slice(0, 5)
                .map((run) =>
                  this.convertPipelineRunToInboxItem(run, instance, projectId, project.name)
                )
            );

            // Fetch new tasks for pinned projects
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const newTasks = await client.getNewTasksForProject(projectId, oneDayAgo);
            allItems.push(
              ...newTasks.map((task) =>
                this.convertWorkItemToInboxItem(task, instance, project.name)
              )
            );
          } catch (error) {
            console.error(`Error fetching data for project ${projectId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching data from instance ${instance.name}:`, error);
      }
    }

    return allItems;
  }

  groupInboxItems(items: InboxItem[]): GroupedInboxItems {
    const grouped: GroupedInboxItems = {};

    for (const item of items) {
      const projectKey = `${item.instance.id}-${item.project.id}`;

      if (!grouped[projectKey]) {
        grouped[projectKey] = {
          project: item.project,
          instance: item.instance,
          items: [],
        };
      }

      grouped[projectKey].items.push(item);
    }

    return grouped;
  }

  async fetchAndGroupInboxItems(): Promise<GroupedInboxItems> {
    const items = await this.fetchAllInboxItems();
    return this.groupInboxItems(items);
  }
}

// Example configuration helper
export function createDefaultConfig(): AdoConfig {
  return {
    instances: [],
    environments: [],
    pinnedProjects: [],
  };
}

export function addInstance(
  config: AdoConfig,
  instance: Omit<AdoInstance, 'id'>
): AdoConfig {
  const id = `instance-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    ...config,
    instances: [...config.instances, { ...instance, id }],
  };
}
