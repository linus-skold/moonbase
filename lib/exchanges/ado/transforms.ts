import AdoMappings from "./mappings";
import { AdoIntegrationInstance } from "./schema/config.schema";
import type { AdoPullRequest } from "./schema/pr.schema";
import type { AdoWorkItem } from "./schema/work-item.schema";
import type { AdoPipelineRun } from "./schema/pipeline.schema";
import type { PullRequest, WorkItem, Pipeline } from "@/lib/schema/item.schema";
import { createWorkItemClassifier } from "@/lib/utils/workItemClassifier";

/**
 * Transforms an Azure DevOps pull request into our internal PullRequest type
 */
export function transformToPullRequest(
  pr: AdoPullRequest,
  instance: AdoIntegrationInstance
): PullRequest {
  // Map ADO status to our internal status
  let status: "open" | "closed" | "merged" = "open";
  if (pr.status === "completed") {
    // ADO doesn't have a merged status, but completed PRs are typically merged
    status = "merged";
  } else if (pr.status === "abandoned") {
    status = "closed";
  }

  return {
    id: `ado-pr-${instance.id}-${pr.pullRequestId}`,
    type: "pullRequest",
    title: pr.title,
    description: pr.description ?? "",
    itemStatus: pr.status,
    status,
    createdTimestamp: new Date(pr.creationDate).getTime(),
    updateTimestamp: new Date(pr.creationDate).getTime(),
    prevUpdateTimestamp: null,
    unread: true, // Will be updated by the exchange
    url: pr.uiUrl,
    organization: instance.name, // Integration instance name
    repository: pr.repository.name,
    project: pr.repository.project.name, // ADO project name for grouping
  };
}

/**
 * Transforms an Azure DevOps work item into our internal WorkItem type
 */
export function transformToWorkItem(
  workItem: AdoWorkItem,
  instance: AdoIntegrationInstance,
  projectName: string
): WorkItem {
  const classifier = createWorkItemClassifier(AdoMappings);

  // Classify the work item kind based on ADO work item type
  const workItemType = workItem.fields["System.WorkItemType"];
  const workItemKind = classifier.classify({
    typeName: workItemType,
    title: workItem.fields["System.Title"],
  }).kind;

  // Build the work item URL
  const baseUrl = instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
  const workItemUrl =
    workItem._links?.html?.href ||
    `${baseUrl}/${projectName}/_workitems/edit/${workItem.id}`;

  return {
    id: `ado-wi-${instance.id}-${workItem.id}`,
    type: "workItem",
    title: workItem.fields["System.Title"],
    description: workItem.fields["System.Description"] ?? "",
    itemStatus: workItem.fields["System.State"],
    status: workItem.fields["System.State"],
    createdTimestamp: new Date(workItem.fields["System.CreatedDate"]).getTime(),
    updateTimestamp: new Date(workItem.fields["System.ChangedDate"]).getTime(),
    prevUpdateTimestamp: null,
    unread: true, // Will be updated by the exchange
    url: workItemUrl,
    organization: instance.name, // Integration instance name
    repository: projectName, // ADO doesn't have repositories for work items, use project name
    project: projectName, // ADO project name for grouping
    workItemKind,
    assignee: workItem.fields["System.AssignedTo"]
      ? {
          name: workItem.fields["System.AssignedTo"].displayName,
          displayName: workItem.fields["System.AssignedTo"].displayName,
          imageUrl: workItem.fields["System.AssignedTo"].imageUrl || "",
        }
      : undefined,
  };
}

/**
 * Transforms an Azure DevOps pipeline run into our internal Pipeline type
 */
export function transformToPipeline(
  run: AdoPipelineRun,
  instance: AdoIntegrationInstance,
  projectId: string,
  projectName: string
): Pipeline {
  // Map ADO pipeline state/result to our internal status
  let status: "running" | "completed" | "failed" | "queued" = "queued";
  if (run.state === "inProgress") {
    status = "running";
  } else if (run.state === "completed") {
    if (run.result === "failed") {
      status = "failed";
    } else {
      status = "completed";
    }
  } else if (run.state === "notStarted") {
    status = "queued";
  }

  // Determine item status
  const itemStatus = run.result || run.state;

  return {
    id: `ado-pipeline-${instance.id}-${run.id}`,
    type: "pipeline",
    title: `${run.pipeline.name} - ${run.name}`,
    description: "",
    itemStatus,
    status,
    createdTimestamp: new Date(run.createdDate).getTime(),
    updateTimestamp: new Date(run.finishedDate || run.createdDate).getTime(),
    prevUpdateTimestamp: null,
    unread: true, // Will be updated by the exchange
    url: run._links.web.href,
    organization: instance.name, // Integration instance name
    repository: projectName, // No specific repo for pipelines
    project: projectName, // ADO project name for grouping
  };
}
