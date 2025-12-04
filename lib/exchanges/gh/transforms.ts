import { GhIntegrationInstance } from "./schema";
import type { IssueSearchResultItem } from "./schema/api";
import type { PullRequest, WorkItem } from "@/lib/schema/item.schema";


const parseRepositoryName = (repositoryUrl: string): string => {
  const parts = repositoryUrl.split("/");
  return parts.slice(-1).join("/");
}

export function transformToPullRequest(
  item: IssueSearchResultItem,
  instance: GhIntegrationInstance
): PullRequest {
  const isPullRequest = !!item.pull_request;
  if (!isPullRequest) {
    throw new Error(`Item ${item.id} is not a pull request`);
  }

  // Determine PR status based on state and merge status
  let status: "open" | "closed" | "merged" = "open";
  if (item.state === "closed") {
    // Check if it was merged
    status = item.pull_request?.merged_at ? "merged" : "closed";
  }

  return {
    id: `gh-pr-${instance.id}-${crypto.randomUUID()}`,
    type: "pullRequest",
    title: item.title,
    description: item.body ?? "",
    itemStatus: item.state,
    status,
    createdTimestamp: new Date(item.created_at).getTime(),
    updateTimestamp: new Date(item.updated_at).getTime(),
    prevUpdateTimestamp: null,
    unread: true, // Will be updated by the exchange
    url: item.html_url,
    organization: instance.name || "GitHub",
    repository: parseRepositoryName(item.repository_url),
  };
}

/**
 * Transforms a GitHub issue search result into a WorkItem
 */
export function transformToWorkItem(
  item: IssueSearchResultItem,
  instance: GhIntegrationInstance
): WorkItem {
  const isPullRequest = !!item.pull_request;
  if (isPullRequest) {
    throw new Error(`Item ${item.id} is a pull request, not an issue`);
  }

  console.log({instance});

  return {
    id: `gh-issue-${instance.id}-${crypto.randomUUID()}`,
    type: "workItem",
    title: item.title,
    description: item.body ?? "",
    itemStatus: item.state,
    status: item.state,
    createdTimestamp: new Date(item.created_at).getTime(),
    updateTimestamp: new Date(item.updated_at).getTime(),
    prevUpdateTimestamp: null,
    unread: true, // Will be updated by the exchange
    url: item.html_url,
    repository: parseRepositoryName(item.repository_url),
    organization: instance.name || "GitHub",
  };
}
