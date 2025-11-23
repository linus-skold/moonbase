// Configuration and aggregation service for GitHub

import { GhClient } from './client';
import type { GhConfig } from './schema/config.schema';
import type { GhInstance } from './schema/instance.schema';
import type { GroupedInboxItems, InboxItem } from '../schema/inbox.schema';
import { createWorkItemClassifier, normalizeLabels } from '../utils/workItemClassifier';
import type { WorkItemKindMapping } from '../schema/workItemKind.schema';

/**
 * GitHub issue classification mappings
 * Based on common labeling conventions and title patterns
 */
export const GITHUB_WORK_ITEM_KIND_MAPPING: WorkItemKindMapping = {
  typeNameMap: {},
  labelPatterns: [
    // Bugs and defects (high priority)
    { pattern: /^bug$/i, kind: "bug", priority: 10 },
    { pattern: /^defect$/i, kind: "defect", priority: 10 },
    { pattern: /^regression$/i, kind: "bug", priority: 9 },
    { pattern: /bug:/i, kind: "bug", priority: 8 },

    // Features and enhancements
    { pattern: /^feature$/i, kind: "feature", priority: 10 },
    { pattern: /^enhancement$/i, kind: "enhancement", priority: 10 },
    { pattern: /^epic$/i, kind: "epic", priority: 10 },
    { pattern: /feature:/i, kind: "feature", priority: 8 },
    { pattern: /enhancement:/i, kind: "enhancement", priority: 8 },

    // User stories
    { pattern: /^user[- ]story$/i, kind: "userStory", priority: 10 },
    { pattern: /^story$/i, kind: "userStory", priority: 9 },

    // Documentation
    { pattern: /^documentation$/i, kind: "documentation", priority: 10 },
    { pattern: /^docs$/i, kind: "documentation", priority: 10 },
    { pattern: /documentation:/i, kind: "documentation", priority: 8 },

    // Improvement and refactor
    { pattern: /^improvement$/i, kind: "improvement", priority: 10 },
    { pattern: /^refactor$/i, kind: "refactor", priority: 10 },
    { pattern: /^tech[- ]debt$/i, kind: "techDebt", priority: 10 },
    { pattern: /^technical[- ]debt$/i, kind: "techDebt", priority: 10 },

    // Questions and research
    { pattern: /^question$/i, kind: "question", priority: 10 },
    { pattern: /^research$/i, kind: "research", priority: 10 },
    { pattern: /^spike$/i, kind: "spike", priority: 10 },

    // Tasks
    { pattern: /^task$/i, kind: "task", priority: 10 },
    { pattern: /^chore$/i, kind: "task", priority: 9 },

    // Tests
    { pattern: /^test$/i, kind: "test", priority: 10 },
    { pattern: /^testing$/i, kind: "test", priority: 10 },
  ],
  titlePatterns: [
    // Common title prefixes
    { pattern: /^\[bug\]/i, kind: "bug", priority: 5 },
    { pattern: /^\[feature\]/i, kind: "feature", priority: 5 },
    { pattern: /^\[enhancement\]/i, kind: "enhancement", priority: 5 },
    { pattern: /^\[docs\]/i, kind: "documentation", priority: 5 },
    { pattern: /^\[refactor\]/i, kind: "refactor", priority: 5 },
    { pattern: /^\[task\]/i, kind: "task", priority: 5 },
    { pattern: /^bug:/i, kind: "bug", priority: 5 },
    { pattern: /^feature:/i, kind: "feature", priority: 5 },
    { pattern: /^fix:/i, kind: "bug", priority: 5 },
    { pattern: /^feat:/i, kind: "feature", priority: 5 },
  ],
  defaultKind: "other",
};

export class GhService {
  private config: GhConfig;
  private workItemClassifier = createWorkItemClassifier(GITHUB_WORK_ITEM_KIND_MAPPING);

  constructor(config: GhConfig) {
    this.config = config;
  }

  private getEnabledInstances(): GhInstance[] {
    return this.config.instances.filter((instance) => instance.enabled);
  }

  private convertPullRequestToInboxItem(
    pr: any,
    instance: GhInstance,
    repositoryName: string
  ): InboxItem {
    // Extract owner and repo from html_url
    const urlParts = pr.html_url?.split('/') || [];
    const owner = urlParts[3] || '';
    const repo = urlParts[4] || '';

    return {
      id: `gh-pr-${instance.id}-${pr.id}`,
      type: 'pullRequest',
      title: pr.title || '',
      description: pr.body || undefined,
      status: pr.state || 'open',
      createdDate: pr.created_at || new Date().toISOString(),
      updatedDate: pr.updated_at || new Date().toISOString(),
      url: pr.html_url || '',
      project: {
        id: `${owner}/${repo}`,
        name: repositoryName || repo,
      },
      repository: {
        id: `${owner}/${repo}`,
        name: repo,
      },
      instance: instance,
      metadata: {
        number: pr.number,
        sourceRefName: (pr as any).head?.ref,
        targetRefName: (pr as any).base?.ref,
        isDraft: (pr as any).draft,
        createdBy: pr.user,
        reviewers: (pr as any).requested_reviewers,
        assignees: pr.assignees,
      },
    };
  }

  private convertIssueToInboxItem(
    issue: any,
    instance: GhInstance,
    repositoryName: string
  ): InboxItem {
    // Extract owner and repo from html_url
    const urlParts = issue.html_url?.split('/') || [];
    const owner = urlParts[3] || '';
    const repo = urlParts[4] || '';

    const priority = this.getIssuePriority(issue);

    // Classify the work item kind based on labels and title

    const labels = normalizeLabels(issue.labels || []);
    const workItemKind = this.workItemClassifier.classify({
      typeName: 'issue',
      labels,
      title: issue.title || '',
    }).kind;

    

    return {
      id: `gh-issue-${instance.id}-${issue.id}`,
      type: 'workItem',
      title: issue.title || '',
      description: issue.body || undefined,
      status: issue.state || 'open',
      createdDate: issue.created_at || new Date().toISOString(),
      updatedDate: issue.updated_at || new Date().toISOString(),
      url: issue.html_url || '',
      project: {
        id: `${owner}/${repo}`,
        name: repositoryName || repo,
      },
      instance: instance,
      priority,
      workItemKind,
      assignedTo: issue.assignees?.[0] ? {
        displayName: issue.assignees[0].login || '',
        imageUrl: issue.assignees[0].avatar_url,
      } : undefined,
      metadata: {
        number: issue.number,
        labels: issue.labels,
        createdBy: issue.user,
      },
    };
  }

  private getIssuePriority(issue: any): InboxItem['priority'] {
    // Check labels for priority indicators
    const labels = issue.labels?.map((l: any) => (typeof l === 'string' ? l : l.name)?.toLowerCase()) || [];
    
    if (labels.some((l: string) => l.includes('critical') || l.includes('urgent') || l.includes('high'))) {
      return 'high';
    }
    
    if (labels.some((l: string) => l.includes('bug') || l.includes('security'))) {
      return 'high';
    }
    
    if (labels.some((l: string) => l.includes('medium') || l.includes('enhancement'))) {
      return 'medium';
    }
    
    return 'low';
  }

  async fetchAllInboxItems(): Promise<InboxItem[]> {
    const instances = this.getEnabledInstances();
    const allItems: InboxItem[] = [];

    for (const instance of instances) {
      try {
        const client = new GhClient(instance);

        // Fetch PRs assigned to me (review requested)
        const reviewPRs = await client.getPullRequestsAssignedToMe();
        allItems.push(
          ...reviewPRs.map((pr) => 
            this.convertPullRequestToInboxItem(pr, instance, '')
          )
        );

        // Fetch PRs created by me
        const myPRs = await client.getPullRequestsCreatedByMe();
        allItems.push(
          ...myPRs.map((pr) => 
            this.convertPullRequestToInboxItem(pr, instance, '')
          )
        );

        // Fetch issues assigned to me
        const issues = await client.getIssuesAssignedToMe();
        allItems.push(
          ...issues.map((issue) => 
            this.convertIssueToInboxItem(issue, instance, '')
          )
        );

        // Fetch items from pinned repositories
        const pinnedRepos = this.config.pinnedRepositories || [];
        for (const repoFullName of pinnedRepos) {
          const [owner, repo] = repoFullName.split('/');
          if (!owner || !repo) continue;

          try {
            const repository = await client.getRepository(owner, repo);
            
            // Get open PRs for pinned repo
            const repoPRs = await client.getRepositoryPullRequests(owner, repo, 'open');
            allItems.push(
              ...repoPRs.slice(0, 10).map((pr) => 
                this.convertPullRequestToInboxItem(pr, instance, repository.name)
              )
            );

            // Get open issues for pinned repo
            const repoIssues = await client.getRepositoryIssues(owner, repo, 'open');
            allItems.push(
              ...repoIssues
                .filter(issue => !issue.pull_request) // Exclude PRs from issues
                .slice(0, 10)
                .map((issue) => 
                  this.convertIssueToInboxItem(issue, instance, repository.name)
                )
            );
          } catch (error) {
            console.error(`Error fetching data for repository ${repoFullName}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching data from GitHub instance ${instance.name}:`, error);
      }
    }

    return allItems;
  }

  groupInboxItems(items: InboxItem[]): GroupedInboxItems {
    const grouped: GroupedInboxItems = {};

    for (const item of items) {
      const projectKey = item.project.name;

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
export function createDefaultConfig(): GhConfig {
  return {
    instances: [],
    environments: [],
    pinnedRepositories: [],
  };
}

export function addInstance(
  config: GhConfig,
  instance: Omit<GhInstance, 'id'>
): GhConfig {
  const id = `gh-instance-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    ...config,
    instances: [...config.instances, { ...instance, id }],
  };
}
