import { Octokit } from "@octokit/rest";
import { GhIntegrationInstance } from "./schema/config.schema";
import { IssueSearchResultItem, IssueSearchResultItemSchema } from "./schema/api";

export class GhClient {
  private octokit: Octokit;
  private username: string;

  constructor(instance: GhIntegrationInstance) {
    this.octokit = new Octokit({
      auth: instance.personalAccessToken,
    });
    this.username = instance.username;
  }

  private async searchForItems(query: string): Promise<IssueSearchResultItem[]> {
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: query,
      per_page: 100,
    });
    return data.items.map(item => IssueSearchResultItemSchema.parse(item));
  }

  async getPullRequestsAssignedToMe(): Promise<IssueSearchResultItem[]> {
    // Search for PRs where the current user is assigned as a reviewer or assignee
    const searchQuery = `is:pr is:open review-requested:${this.username}`;
    return this.searchForItems(searchQuery);
  }

  async getPullRequestsCreatedByMe(): Promise<IssueSearchResultItem[]> {
    const searchQuery = `is:pr is:open author:${this.username}`;
    return this.searchForItems(searchQuery);
  }

  async getIssuesAssignedToMe(): Promise<IssueSearchResultItem[]> {
    // Search for issues (not PRs) assigned to the current user
    const searchQuery = `is:issue is:open assignee:${this.username}`;
    return this.searchForItems(searchQuery);
  }

}
