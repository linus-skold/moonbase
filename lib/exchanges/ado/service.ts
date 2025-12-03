// Configuration and aggregation service for Azure DevOps

import { AdoClient } from './client';

import type { AdoConfig } from './schema/config.schema';
import type { AdoInstance } from './schema/instance.schema';
import type { AdoPullRequest } from './schema/pr.schema';
import type { AdoWorkItem } from './schema/work-item.schema';
import type { AdoPipelineRun } from './schema/pipeline.schema';
import type { GroupedInboxItems, InboxItem } from '../../schema/inbox.schema';
import { createWorkItemClassifier } from '../../utils/workItemClassifier';
import { WorkItemKindMapping } from '../../schema/workItemKind.schema';


const ADO_WORK_ITEM_KIND_MAPPING: WorkItemKindMapping = {
  typeNameMap: {
    // Bug/Defect types
    bug: "bug",
    defect: "defect",
    impediment: "bug",

    // Feature types
    epic: "epic",
    feature: "feature",
    "user story": "userStory",
    "product backlog item": "userStory",

    // Task types
    task: "task",
    "sub-task": "subTask",
    spike: "spike",

    // Test types
    "test case": "test",
    "test plan": "test",
    "test suite": "test",

    // Other types
    issue: "other",
    requirement: "userStory",
    "change request": "enhancement",
    risk: "other",
    review: "other",
  },
  labelPatterns: [],
  titlePatterns: [],
  defaultKind: "task",
};


export class AdoService {
  private config: AdoConfig;
  private workItemClassifier = createWorkItemClassifier(ADO_WORK_ITEM_KIND_MAPPING);

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
      instance: instance,
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
    
    const baseUrl = instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
    const workItemUrl = workItem._links?.html?.href || 
      `${baseUrl}/${projectName}/_workitems/edit/${workItem.id}`;
    // Classify the work item kind based on ADO work item type
    const workItemType = workItem.fields['System.WorkItemType'];
    const workItemKind = this.workItemClassifier.classify({
      typeName: workItemType,
      title: workItem.fields['System.Title'],
    }).kind;

      // TODO: Refactor to be parsed properly using zod schema transform
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
      instance: instance,
      priority,
      assignedTo: workItem.fields['System.AssignedTo'],
      workItemKind,
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
      instance: instance,
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

  // Async generator for progressive item fetching
  async *fetchInboxItemsProgressive(): AsyncGenerator<{ items: InboxItem[], progress: { current: number, total: number, stage: string } }> {
    const instances = this.getEnabledInstances();
    const pinnedProjectsCount = this.config.pinnedProjects?.length || 0;
    const totalStages = instances.reduce((sum, instance) => {
      return sum + 2 + pinnedProjectsCount; // PRs + Work Items + (1 per pinned project)
    }, 0);
    let currentStage = 0;

    for (const instance of instances) {
      try {
        const client = new AdoClient(instance);
        
        // Fetch projects first (needed for other queries)
        const projectsStart = Date.now();
        const allProjects = await client.getProjects();
        console.log(`[ADO] Fetched ${allProjects.length} projects from ${instance.name} in ${Date.now() - projectsStart}ms`);

        // Stage 1: Fetch PRs assigned to me
        currentStage++;
        try {
          const prFetchStart = Date.now();
          const prs = await client.getPullRequestsAssignedToMe();
          const prFetchTime = Date.now() - prFetchStart;
          console.log(`[ADO] Fetched ${prs.length} PRs from ${instance.name} in ${prFetchTime}ms`);
          
          const prItems = prs.map((pr) => this.convertPullRequestToInboxItem(pr, instance));
          yield {
            items: prItems,
            progress: { current: currentStage, total: totalStages, stage: `${instance.name}: Pull Requests` }
          };
        } catch (error) {
          console.error(`Error fetching PRs from instance ${instance.name}:`, error);
          yield {
            items: [],
            progress: { current: currentStage, total: totalStages, stage: `${instance.name}: Pull Requests (Error)` }
          };
        }

        // Stage 2: Fetch work items assigned to me
        currentStage++;
        try {
          const fetchStart = Date.now();
          const workItems = await client.getWorkItemsAssignedToMe(undefined);
          const fetchTime = Date.now() - fetchStart;
          console.log(`[ADO] Fetched ${workItems.length} work items from ${instance.name} in ${fetchTime}ms`);
          
          const processStart = Date.now();
          const wiItems: InboxItem[] = [];
          for (const wi of workItems) {
            const project = allProjects.find((p) => 
              wi.fields['System.AreaPath']?.startsWith(p.name)
            );
            if (project) {
              wiItems.push(this.convertWorkItemToInboxItem(wi, instance, project.name));
            }
          }
          const processTime = Date.now() - processStart;
          console.log(`[ADO] Processed ${wiItems.length} work items from ${instance.name} in ${processTime}ms`);
          
          yield {
            items: wiItems,
            progress: { current: currentStage, total: totalStages, stage: `${instance.name}: Work Items` }
          };
        } catch (error) {
          console.error(`Error fetching work items from instance ${instance.name}:`, error);
          yield {
            items: [],
            progress: { current: currentStage, total: totalStages, stage: `${instance.name}: Work Items (Error)` }
          };
        }

        // Stage 3+: Fetch pipeline runs and tasks for each pinned project individually
        const pinnedProjects = this.config.pinnedProjects || [];
        
        for (const projectId of pinnedProjects) {
          currentStage++;
          try {
            const pinnedStart = Date.now();
            const project = allProjects.find((p) => p.id === projectId);
            if (!project) {
              yield {
                items: [],
                progress: { current: currentStage, total: totalStages, stage: `${instance.name}: ${projectId} (Not Found)` }
              };
              continue;
            }

            const pinnedItems: InboxItem[] = [];
            
            // Fetch pipeline runs and new tasks in parallel
            const parallelStart = Date.now();
            const [pipelineRuns, newTasks] = await Promise.allSettled([
              client.getPipelineRuns(projectId, 10),
              (async () => {
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return client.getNewTasksForProject(projectId, oneDayAgo);
              })()
            ]);

            const parallelTime = Date.now() - parallelStart;
            console.log(`[ADO] Fetched pinned project data for ${project.name} in ${parallelTime}ms`);
            
            if (pipelineRuns.status === 'fulfilled') {
              pinnedItems.push(
                ...pipelineRuns.value
                  .filter((run) => run.state === 'inProgress' || run.state === 'completed')
                  .slice(0, 5)
                  .map((run) =>
                    this.convertPipelineRunToInboxItem(run, instance, projectId, project.name)
                  )
              );
            }

            if (newTasks.status === 'fulfilled') {
              pinnedItems.push(
                ...newTasks.value.map((task) =>
                  this.convertWorkItemToInboxItem(task, instance, project.name)
                )
              );
            }
            
            const pinnedTotalTime = Date.now() - pinnedStart;
            console.log(`[ADO] Completed pinned project ${project.name} in ${pinnedTotalTime}ms (${pinnedItems.length} items)`);
            
            yield {
              items: pinnedItems,
              progress: { current: currentStage, total: totalStages, stage: `${instance.name}: ${project.name}` }
            };
          } catch (error) {
            console.error(`Error fetching data for project ${projectId}:`, error);
            yield {
              items: [],
              progress: { current: currentStage, total: totalStages, stage: `${instance.name}: ${projectId} (Error)` }
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching data from instance ${instance.name}:`, error);
        // Skip remaining stages for this instance
        currentStage += 2 + pinnedProjectsCount;
      }
    }
  }

  async fetchAllInboxItems(): Promise<InboxItem[]> {
    const allItems: InboxItem[] = [];
    
    // Use the progressive fetcher but collect all results
    for await (const batch of this.fetchInboxItemsProgressive()) {
      allItems.push(...batch.items);
    }
    
    return allItems;
  }

  groupInboxItems(items: InboxItem[]): GroupedInboxItems {
    const grouped: GroupedInboxItems = {};

    for (const item of items) {
      const projectKey = `${item.project.name}`;

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
